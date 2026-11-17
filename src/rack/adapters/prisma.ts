import { isJsonRecord, type Cell, type JsonValue, type RowData } from "../json.ts";
import type { ParsedListQuery } from "../query.ts";
import type { Rack } from "../types/index.ts";
import { coerceIdValue, type AdapterOptions, type CrudAdapter, type FieldDescriptor, type JsonBody, type ListResult } from "./index.ts";

/**
 * Minimal Prisma delegate surface used by the adapter. Prisma's generated
 * delegates are structurally compatible with these call shapes.
 */
/**
 * Prisma delegate arguments: where/data objects may carry `Date` cells
 * (drizzle- and prisma-native values) alongside JSON scalars.
 */
type PrismaArgs = { [key: string]: JsonValue | Date | PrismaArgs };

interface PrismaDelegate {
  findMany(args: PrismaArgs): PromiseLike<RowData[]>;
  count(args: PrismaArgs): PromiseLike<number>;
  findFirst(args: PrismaArgs): PromiseLike<RowData | null>;
  create(args: PrismaArgs): PromiseLike<RowData>;
  update(args: PrismaArgs): PromiseLike<RowData>;
  delete(args: PrismaArgs): PromiseLike<RowData>;
}

function delegateOf(model: Rack.CrudModel): PrismaDelegate {
  return (model as { prisma: { model: object } }).prisma
    .model as PrismaDelegate;
}

function deletedAtFilter(
  opts: AdapterOptions,
  includeDeleted = false,
): Record<string, JsonValue> {
  return opts.softDelete && !includeDeleted
    ? { [opts.deletedAtField ?? "deletedAt"]: null }
    : {};
}

function whereFor(
  query: ParsedListQuery,
  opts: AdapterOptions,
): Record<string, JsonValue> {
  const hideDeleted = opts.softDelete === true && !query.includeDeleted;
  const deletedField = opts.deletedAtField ?? "deletedAt";
  const where: Record<string, JsonValue> = {
    ...deletedAtFilter(opts, query.includeDeleted),
  };

  for (const [key, value] of Object.entries(query.filters)) {
    if (hideDeleted && key === deletedField) continue;
    where[key] = Array.isArray(value) ? { in: value } : value;
  }

  if (query.search && query.search.fields.length > 0) {
    where["OR"] = query.search.fields.map((field) => ({
      [field]: { contains: query.search!.value, mode: "insensitive" },
    }));
  }

  return where;
}

/** Prisma's not-found error (P2025) — plain-object stand-ins included. */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}

async function applyUpdate(
  delegate: PrismaDelegate,
  primaryKey: string,
  id: string,
  body: JsonBody,
  returning?: boolean,
): Promise<RowData | null | undefined> {
  try {
    const row = await delegate.update({
      where: { [primaryKey]: coerceIdValue(id) },
      data: isJsonRecord(body) ? body : {},
    });
    return returning === false ? undefined : row;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export const prismaAdapter: CrudAdapter = {
  name: "prisma",

  describe(): FieldDescriptor[] {
    // Prisma delegates expose no runtime schema.
    return [];
  },

  async list(model, query, opts): Promise<ListResult> {
    const delegate = delegateOf(model);
    const where = whereFor(query, opts);
    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        ...(query.sort
          ? { orderBy: { [query.sort.field]: query.sort.direction } }
          : {}),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      delegate.count({ where }),
    ]);
    return { data, total };
  },

  async detail(model, id, opts) {
    const delegate = delegateOf(model);
    return delegate.findFirst({
      where: {
        [opts.primaryKey]: coerceIdValue(id),
        ...deletedAtFilter(opts),
      },
    });
  },

  async create(model, body, opts) {
    const delegate = delegateOf(model);
    const row = await delegate.create({ data: isJsonRecord(body) ? body : {} });
    return opts.returning === false ? undefined : row;
  },

  async replace(model, id, body, opts) {
    return applyUpdate(
      delegateOf(model),
      opts.primaryKey,
      id,
      body,
      opts.returning,
    );
  },

  async update(model, id, body, opts) {
    return applyUpdate(
      delegateOf(model),
      opts.primaryKey,
      id,
      body,
      opts.returning,
    );
  },

  async remove(model, id, opts) {
    const delegate = delegateOf(model);
    const where = { [opts.primaryKey]: coerceIdValue(id) };
    try {
      const row = opts.softDelete
        ? await delegate.update({
            where,
            data: { [opts.deletedAtField ?? "deletedAt"]: new Date() },
          })
        : await delegate.delete({ where });
      return opts.returning === false ? undefined : row;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  },
};
