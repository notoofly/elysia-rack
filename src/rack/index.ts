import { Elysia, status, type AnySchema } from "elysia";
import { resolveAdapter } from "./adapter.ts";
import {
  getAdapter,
  type AdapterOptions,
  type CrudAdapter,
  type FieldDescriptor,
  type FieldKind,
  type JsonBody,
  type ListResult,
} from "./adapters/index.ts";
import { drizzleAdapter } from "./adapters/drizzle.ts";
import { prismaAdapter } from "./adapters/prisma.ts";
import { exceljsAdapter } from "./adapters/exceljs.ts";
import { googleSheetsAdapter } from "./adapters/google-sheets.ts";
import { authorize, type AuthCheck } from "./authorization.ts";
import { isJsonRecord, isJsonValue, type JsonValue, type RowData } from "./json.ts";
import { createMemoryIdempotencyStore } from "./idempotency.ts";
import { detailFor } from "./openapi.ts";
import { panelPage, type PanelPageProps } from "./page.ts";
import { parseListQuery } from "./query.ts";
import {
  getAuthorizedRackTree,
  registerRack,
  type RackTreeAuthContext,
} from "./registry.ts";
import type { Rack } from "./types/index.ts";

export type { Rack } from "./types/index.ts";
export type * from "./models/index.ts";
export {
  buildRackTree,
  clearRacks,
  flatRackTree,
  getAuthorizedRackTree,
  getRack,
  getRackTree,
  listRacks,
  registerRack,
  type RackRegistration,
  type RackTreeAuthContext,
  type RackTreeNode,
} from "./registry.ts";
export { dashboard, type DashboardOptions } from "./dashboard.ts";
export { resolveAdapter } from "./adapter.ts";
export {
  getAdapter,
  drizzleAdapter,
  prismaAdapter,
  exceljsAdapter,
  googleSheetsAdapter,
  type AdapterOptions,
  type CrudAdapter,
  type FieldDescriptor,
  type FieldKind,
  type ListResult,
} from "./adapters/index.ts";
export { authorize, type AuthCheck } from "./authorization.ts";
export { createMemoryIdempotencyStore } from "./idempotency.ts";
export { detailFor } from "./openapi.ts";
export { panelPage, PANEL_PAGE_KEY, type PanelPageProps } from "./page.ts";
export { parseListQuery } from "./query.ts";

const DEFAULT_OPERATIONS: Required<Rack.CrudOperationsOptions> = {
  list: true,
  detail: true,
  create: true,
  replace: true,
  update: true,
  delete: true,
};

/**
 * The slice of the Elysia route context the auth check relies on.
 * The full Elysia `Context` is assignable to this shape; request bodies
 * are read from the inferred context and validated with `isJsonRecord`.
 */
interface RackContext {
  request: Request;
  params?: Record<string, string>;
  query?: Record<string, string>;
  store?: Record<string, JsonValue>;
  permissions?: readonly string[];
  set?: { headers?: Record<string, string | number | string[]> };
}

export function rack<TModel extends Rack.CrudModel>(
  path: string,
  options: Rack.RackOptions<TModel>,
) {
  const operations = { ...DEFAULT_OPERATIONS, ...options.operations };
  const primaryKey = options.settings?.primaryKey ?? "id";
  const itemPath = `/:${primaryKey}`;
  const resource = options.metadata?.id ?? path;
  const adapter = resolveAdapter(options.model);
  const canList = async (ctx: RackTreeAuthContext) => {
    const rule = options.authorization?.list;
    return (
      rule === undefined ||
      (await authorize("list", rule, {
        request: ctx.request,
        resource: options.model,
        permissions: ctx.permissions,
        store: ctx.store,
      })) === null
    );
  };
  registerRack(
    {
      path,
      metadata: { ...options.metadata, id: resource },
      operations,
    },
    canList,
  );
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
    context: RackContext,
    operation: Rack.CrudOperation,
  ): AuthCheck<TModel> => ({
    request: context.request,
    id:
      context.params?.[primaryKey] !== undefined
        ? String(context.params[primaryKey])
        : undefined,
    resource: options.model,
    permissions: context.permissions,
    store: context.store,
  });

  /** Route bodies arrive untyped from the platform; validate to JSON. */
  const jsonBodyOf = (value: unknown): JsonBody =>
    isJsonValue(value) ? value : undefined;

  const maybeBody = (schema?: AnySchema) =>
    schema !== undefined ? { body: schema } : {};
  const maybeParams = () =>
    options.validation?.params !== undefined
      ? { params: options.validation.params }
      : {};

  // -- PANEL: GET / displays the React panel, not data ----------------------
  if (operations.list && options.page?.enabled !== false)
    app.get(
      "/",
      async (context) => {
        const denied = await authorize(
          "list",
          options.authorization?.list,
          authContext(context, "list"),
        );
        if (denied) return denied;
        return panelPage(options.page?.path ?? "/panel", {
          racks: await getAuthorizedRackTree(context),
          resource,
          metadata: options.metadata,
          actions: options.actions,
          query: options.query,
          operations,
          primaryKey,
          params: { ...(context.query ?? {}) },
          queryUrl: `${path.replace(/\/$/, "")}/data`,
          fields: await dataAdapter.describe(options.model),
          softDelete: options.settings?.softDelete ?? false,
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
      { detail: detailFor(options, "list") },
    );

  // -- LIST: QUERY /data (custom method, body-driven list) -------------------
  if (operations.list)
    app.route(
      "QUERY",
      "/data",
      async (context) => {
        const denied = await authorize(
          "list",
          options.authorization?.list,
          authContext(context, "list"),
        );
        if (denied) return denied;
        const body = isJsonRecord(context.body) ? context.body : {};
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
        detail: detailFor(options, "list"),
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

    const buildCreatedBody = (
      context: RackContext,
      row: RowData | null | undefined,
    ) => ({
      ...envelope("create"),
      ...(row !== undefined && row !== null ? { data: row } : {}),
      ...(options.settings?.returning !== undefined
        ? { returning: options.settings.returning }
        : {}),
    });

    const replay = (context: RackContext, record: Rack.CrudIdempotencyRecord) => {
      if (context.set) {
        context.set.headers = {
          ...context.set.headers,
          "Idempotent-Replayed": "true",
        };
      }
      return status(record.status, record.body);
    };

    app.post(
      "/",
      async (context) => {
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
            const scope = idem?.scope?.(authContext(context, "create")) ?? "";
            const scoped = `${resource}::${scope !== "" ? `${scope}::` : ""}${clientKey}`;

            const stored = await idemStore.get(scoped);
            if (stored !== undefined) return replay(context, stored);

            let pending = idemInflight.get(scoped);
            if (pending === undefined) {
              pending = (async () => {
                const row = await dataAdapter.create(
                  options.model,
                  jsonBodyOf(context.body),
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
          jsonBodyOf(context.body),
          adapterOpts,
        );
        return status(201, buildCreatedBody(context, row));
      },
      {
        ...maybeBody(options.validation?.create),
        detail: detailFor(options, "create"),
      },
    );
  }

  // -- DETAIL: QUERY /data/:pk (single-row data via custom method) ---------
  if (operations.detail)
    app.route(
      "QUERY",
      `/data${itemPath}`,
      async (context) => {
        const denied = await authorize(
          "detail",
          options.authorization?.detail,
          authContext(context, "detail"),
        );
        if (denied) return denied;
        const id = String(context.params?.[primaryKey]);
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
        detail: detailFor(options, "detail"),
      },
    );

  // -- REPLACE: PUT /:pk (full replacement) ----------------------------------
  if (operations.replace)
    app.put(
      itemPath,
      async (context) => {
        const denied = await authorize(
          "replace",
          options.authorization?.replace,
          authContext(context, "replace"),
        );
        if (denied) return denied;
        const id = String(context.params?.[primaryKey]);
        const row = await dataAdapter.replace(
          options.model,
          id,
          jsonBodyOf(context.body),
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
        detail: detailFor(options, "replace"),
      },
    );

  // -- UPDATE: PATCH /:pk (partial update) -----------------------------------
  if (operations.update)
    app.patch(
      itemPath,
      async (context) => {
        const denied = await authorize(
          "update",
          options.authorization?.update,
          authContext(context, "update"),
        );
        if (denied) return denied;
        const id = String(context.params?.[primaryKey]);
        const row = await dataAdapter.update(
          options.model,
          id,
          jsonBodyOf(context.body),
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
        detail: detailFor(options, "update"),
      },
    );

  // -- DELETE: DELETE /:pk ---------------------------------------------------
  if (operations.delete)
    app.delete(
      itemPath,
      async (context) => {
        const denied = await authorize(
          "delete",
          options.authorization?.delete,
          authContext(context, "delete"),
        );
        if (denied) return denied;
        const id = String(context.params?.[primaryKey]);
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
        detail: detailFor(options, "delete"),
      },
    );

  return app;
}
