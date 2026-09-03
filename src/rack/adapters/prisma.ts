import type { ParsedListQuery } from "../query";
import type { Rack } from "../types";
import { coerceIdValue, type AdapterOptions, type CrudAdapter, type FieldDescriptor, type ListResult } from "./index";

function delegateOf(model: Rack.CrudModel): any {
  return (model as { prisma: Rack.CrudPrismaModel }).prisma.model as any;
}

function deletedAtFilter(opts: AdapterOptions): Record<string, unknown> {
  return opts.softDelete ? { [opts.deletedAtField ?? "deletedAt"]: null } : {};
}

function whereFor(
  query: ParsedListQuery,
  opts: AdapterOptions,
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    ...deletedAtFilter(opts),
  };

  for (const [key, value] of Object.entries(query.filters)) {
    where[key] = Array.isArray(value) ? { in: value } : value;
  }

  if (query.search && query.search.fields.length > 0) {
    where["OR"] = query.search.fields.map((field) => ({
      [field]: { contains: query.search!.value, mode: "insensitive" },
    }));
  }

  return where;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2025"
  );
}

async function applyUpdate(
  delegate: any,
  primaryKey: string,
  id: string,
  body: unknown,
  returning?: boolean,
): Promise<unknown | null> {
  try {
    const row = await delegate.update({
      where: { [primaryKey]: coerceIdValue(id) },
      data: body,
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
    const row = await delegate.create({ data: body });
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
