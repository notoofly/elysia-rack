import Elysia, { status } from "elysia";
import { resolveAdapter } from "./adapter";
import {
  getAdapter,
  type AdapterOptions,
  type CrudAdapter,
  type FieldDescriptor,
  type FieldKind,
  type ListResult,
} from "./adapters/index";
import { drizzleAdapter } from "./adapters/drizzle";
import { prismaAdapter } from "./adapters/prisma";
import { authorize, type AuthCheck } from "./authorization";
import { createMemoryIdempotencyStore } from "./idempotency";
import { detailFor } from "./openapi";
import { panelPage, type PanelPageProps } from "./page";
import { parseListQuery } from "./query";
import { registerRack } from "./registry";
import type { Rack } from "./types";

export type { Rack } from "./types";
export type * from "./models";
export {
  buildRackTree,
  clearRacks,
  flatRackTree,
  getRack,
  getRackTree,
  listRacks,
  registerRack,
  type RackRegistration,
  type RackTreeNode,
} from "./registry";
export { dashboard, type DashboardOptions } from "./dashboard";
export { resolveAdapter } from "./adapter";
export {
  getAdapter,
  drizzleAdapter,
  prismaAdapter,
  type AdapterOptions,
  type CrudAdapter,
  type FieldDescriptor,
  type FieldKind,
  type ListResult,
} from "./adapters/index";
export { authorize, type AuthCheck } from "./authorization";
export { createMemoryIdempotencyStore } from "./idempotency";
export { detailFor } from "./openapi";
export { panelPage, PANEL_PAGE_KEY, type PanelPageProps } from "./page";
export { parseListQuery } from "./query";

const DEFAULT_OPERATIONS: Required<Rack.CrudOperationsOptions> = {
  list: true,
  detail: true,
  create: true,
  replace: true,
  update: true,
  delete: true,
};

export function rack(path: string, options: Rack.RackOptions) {
  const operations = { ...DEFAULT_OPERATIONS, ...options.operations };
  const primaryKey = options.settings?.primaryKey ?? "id";
  const itemPath = `/:${primaryKey}`;
  const resource = options.metadata?.id ?? path;
  const adapter = resolveAdapter(options.model);
  registerRack({
    path,
    metadata: { ...options.metadata, id: resource },
    operations,
  });
  const dataAdapter = getAdapter(options.model);
  const adapterOpts: AdapterOptions = {
    primaryKey,
    deletedAtField: options.settings?.deletedAtField,
    returning: options.settings?.returning,
    softDelete: options.settings?.softDelete,
  };

  const app = new Elysia({ name: `rack:${path}`, prefix: path });

  const notFound = (operation: Rack.CrudOperation, id: string) =>
    status(404, { error: "Not Found", operation, id });

  const envelope = (operation: Rack.CrudOperation) => ({
    resource,
    operation,
    adapter,
    ...(options.metadata !== undefined
      ? { metadata: options.metadata }
      : {}),
  });

  const authContext = (
    context: any,
    operation: Rack.CrudOperation,
  ): AuthCheck => ({
    request: context.request as Request,
    id:
      context.params?.[primaryKey] !== undefined
        ? String(context.params[primaryKey])
        : undefined,
    resource: options.model,
    permissions: context.permissions,
    store: context.store,
  });

  const maybeBody = (schema: unknown) =>
    schema !== undefined ? { body: schema as any } : {};
  const maybeParams = () =>
    options.validation?.params !== undefined
      ? { params: options.validation.params as any }
      : {};

  // -- PANEL: GET / displays the React panel, not data ----------------------
  if (operations.list && options.page?.enabled !== false)
    app.get(
      "/",
      async (context: any) => {
        const denied = await authorize(
          "list",
          options.authorization?.list,
          authContext(context, "list"),
        );
        if (denied) return denied;
        return panelPage(options.page?.path ?? "/panel", {
          resource,
          metadata: options.metadata,
          query: options.query,
          operations,
          primaryKey,
          params: { ...(context.query ?? {}) },
          queryUrl: `${path.replace(/\/$/, "")}/data`,
          fields: dataAdapter.describe(options.model),
          deletedAtField: options.settings?.deletedAtField ?? "deletedAt",
          load: (input) =>
            dataAdapter
              .list(
                options.model,
                parseListQuery(input, options.query),
                adapterOpts,
              )
              .then(({ data, total }) => ({ data, total })),
        });
      },
      { detail: detailFor(options, "list") as any },
    );

  // -- LIST: QUERY /data (custom method, body-driven list) -------------------
  if (operations.list)
    app.route(
      "QUERY",
      "/data",
      async (context: any) => {
        const denied = await authorize(
          "list",
          options.authorization?.list,
          authContext(context, "list"),
        );
        if (denied) return denied;
        const body =
          typeof context.body === "object" && context.body !== null
            ? (context.body as Record<string, unknown>)
            : {};
        const parsed = parseListQuery(
          { ...(context.query ?? {}), ...body },
          options.query,
        );
        const result = await dataAdapter.list(
          options.model,
          parsed,
          adapterOpts,
        );
        return {
          ...envelope("list"),
          via: "QUERY",
          query: parsed,
          data: result.data,
          total: result.total,
        };
      },
      {
        ...maybeBody(options.validation?.query),
        detail: detailFor(options, "list") as any,
      },
    );

  // -- CREATE: POST / (idempotency key required by default) ------------------
  if (operations.create) {
    const idem = options.idempotency;
    const idemStore =
      idem?.enabled !== false
        ? (idem?.store ?? createMemoryIdempotencyStore())
        : undefined;
    const idemHeader = idem?.header ?? "Idempotency-Key";
    const idemRequired = idem?.required ?? true;
    const idemTtl = idem?.ttl ?? 86400;
    const idemInflight = new Map<string, Promise<Rack.CrudIdempotencyRecord>>();

    const buildCreatedBody = (context: any, row: unknown) => ({
      ...envelope("create"),
      ...(row !== undefined ? { data: row } : {}),
      ...(options.settings?.returning !== undefined
        ? { returning: options.settings.returning }
        : {}),
    });

    const replay = (context: any, record: Rack.CrudIdempotencyRecord) => {
      (context.set.headers ??= {})["Idempotent-Replayed"] = "true";
      return status(record.status, record.body);
    };

    app.post(
      "/",
      async (context: any) => {
        const denied = await authorize(
          "create",
          options.authorization?.create,
          authContext(context, "create"),
        );
        if (denied) return denied;

        if (idemStore !== undefined) {
          const clientKey = context.request.headers.get(idemHeader);
          if (!clientKey) {
            if (idemRequired)
              return status(400, {
                error: `${idemHeader} header is required`,
                operation: "create" as const,
              });
          } else {
            const scoped = `${resource}::${clientKey}`;

            const stored = await idemStore.get(scoped);
            if (stored !== undefined) return replay(context, stored);

            let pending = idemInflight.get(scoped);
            if (pending === undefined) {
              pending = (async () => {
                const row = await dataAdapter.create(
                  options.model,
                  context.body,
                  adapterOpts,
                );
                const record: Rack.CrudIdempotencyRecord = {
                  status: 201,
                  body: buildCreatedBody(context, row),
                };
                await idemStore.set(scoped, record, idemTtl);
                return record;
              })();
              idemInflight.set(scoped, pending);
              try {
                return status(201, (await pending).body);
              } finally {
                idemInflight.delete(scoped);
              }
            }

            return replay(context, await pending);
          }
        }

        const row = await dataAdapter.create(
          options.model,
          context.body,
          adapterOpts,
        );
        return status(201, buildCreatedBody(context, row));
      },
      {
        ...maybeBody(options.validation?.create),
        detail: detailFor(options, "create") as any,
      },
    );
  }

  // -- DETAIL: QUERY /data/:pk (single-row data via custom method) ---------
  if (operations.detail)
    app.route(
      "QUERY",
      `/data${itemPath}`,
      async (context: any) => {
        const denied = await authorize(
          "detail",
          options.authorization?.detail,
          authContext(context, "detail"),
        );
        if (denied) return denied;
        const id = String(context.params[primaryKey]);
        const row = await dataAdapter.detail(
          options.model,
          id,
          adapterOpts,
        );
        if (row == null) return notFound("detail", id);
        return {
          ...envelope("detail"),
          id,
          data: row,
        };
      },
      {
        ...maybeParams(),
        detail: detailFor(options, "detail") as any,
      },
    );

  // -- REPLACE: PUT /:pk (full replacement) ----------------------------------
  if (operations.replace)
    app.put(
      itemPath,
      async (context: any) => {
        const denied = await authorize(
          "replace",
          options.authorization?.replace,
          authContext(context, "replace"),
        );
        if (denied) return denied;
        const id = String(context.params[primaryKey]);
        const row = await dataAdapter.replace(
          options.model,
          id,
          context.body,
          adapterOpts,
        );
        if (row == null) return notFound("replace", id);
        return {
          ...envelope("replace"),
          id,
          ...(row !== undefined ? { data: row } : {}),
          ...(options.settings?.returning !== undefined
            ? { returning: options.settings.returning }
            : {}),
        };
      },
      {
        ...maybeBody(options.validation?.replace),
        ...maybeParams(),
        detail: detailFor(options, "replace") as any,
      },
    );

  // -- UPDATE: PATCH /:pk (partial update) -----------------------------------
  if (operations.update)
    app.patch(
      itemPath,
      async (context: any) => {
        const denied = await authorize(
          "update",
          options.authorization?.update,
          authContext(context, "update"),
        );
        if (denied) return denied;
        const id = String(context.params[primaryKey]);
        const row = await dataAdapter.update(
          options.model,
          id,
          context.body,
          adapterOpts,
        );
        if (row == null) return notFound("update", id);
        return {
          ...envelope("update"),
          id,
          ...(row !== undefined ? { data: row } : {}),
          ...(options.settings?.returning !== undefined
            ? { returning: options.settings.returning }
            : {}),
        };
      },
      {
        ...maybeBody(options.validation?.update),
        ...maybeParams(),
        detail: detailFor(options, "update") as any,
      },
    );

  // -- DELETE: DELETE /:pk ---------------------------------------------------
  if (operations.delete)
    app.delete(
      itemPath,
      async (context: any) => {
        const denied = await authorize(
          "delete",
          options.authorization?.delete,
          authContext(context, "delete"),
        );
        if (denied) return denied;
        const id = String(context.params[primaryKey]);
        const row = await dataAdapter.remove(
          options.model,
          id,
          adapterOpts,
        );
        if (row == null) return notFound("delete", id);
        return {
          ...envelope("delete"),
          id,
          ...(row !== undefined ? { data: row } : {}),
          ...(options.settings?.softDelete !== undefined
            ? { softDelete: options.settings.softDelete }
            : {}),
        };
      },
      {
        ...maybeParams(),
        detail: detailFor(options, "delete") as any,
      },
    );

  return app;
}
