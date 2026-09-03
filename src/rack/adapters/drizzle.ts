import {
  and,
  asc,
  Column,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
} from "drizzle-orm";
import type { ParsedListQuery } from "../query";
import type { Rack } from "../types";
import {
  coerceIdValue,
  isNumericColumn,
  type AdapterOptions,
  type CrudAdapter,
  type FieldDescriptor,
  type FieldKind,
  type ListResult,
} from "./index";

function tableOf(model: Rack.CrudModel): any {
  return (model as { drizzle: Rack.CrudDrizzleModel }).drizzle.table as any;
}

function dbOf(model: Rack.CrudModel): any {
  return (model as { drizzle: Rack.CrudDrizzleModel }).drizzle.db as any;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function fieldKind(
  columnType: string | undefined,
  dataType: string | undefined,
  enumValues: readonly string[] | undefined,
): FieldKind {
  if (enumValues && enumValues.length > 0) return "enum";
  if (columnType && /serial|smallint|integer|bigint|int8/i.test(columnType))
    return "integer";
  if (columnType && /numeric|decimal|real|double|float/i.test(columnType))
    return "number";
  if (dataType === "boolean") return "boolean";
  if (dataType === "date") return "date";
  if (dataType === "json") return "json";
  if (dataType === "bigint" || dataType === "number") return "integer";
  return "text";
}

function isAutoIncrement(col: any, columnType: string | undefined): boolean {
  if (columnType && /serial/i.test(columnType)) return true;
  if (col.generated !== undefined && col.generated !== null) return true;
  // SQLite `INTEGER PRIMARY KEY` adalah alias rowid (auto-increment).
  if (col.primary && columnType && /sqliteinteger/i.test(columnType))
    return true;
  return false;
}

/**
 * Coerce a route id for the primary-key column.
 * Returns `null` when no row can possibly match
 * (e.g. a non-numeric id on an integer column) so callers
 * can short-circuit to a 404 instead of erroring the query.
 */
function resolvableId(
  table: any,
  primaryKey: string,
  id: string,
): unknown {
  const col = table?.[primaryKey];
  const columnType = col?.columnType ?? col?.dataType;
  const value = coerceIdValue(id, columnType);
  if (col && isNumericColumn(columnType) && typeof value !== "number")
    return null;
  return value;
}

function aliveCondition(
  table: any,
  opts: AdapterOptions,
  withSoftDelete: boolean,
) {
  if (!withSoftDelete) return undefined;
  const col = table[opts.deletedAtField ?? "deletedAt"];
  return col ? isNull(col) : undefined;
}

function whereFor(
  table: any,
  query: ParsedListQuery,
  opts: AdapterOptions,
  withSoftDelete: boolean,
) {
  const conds: any[] = [];
  const alive = aliveCondition(table, opts, withSoftDelete);
  if (alive) conds.push(alive);

  for (const [key, value] of Object.entries(query.filters)) {
    const col = table[key];
    if (!col) continue;
    conds.push(
      Array.isArray(value) ? inArray(col, value) : eq(col, value),
    );
  }

  if (query.search && query.search.fields.length > 0) {
    const pattern = `%${escapeLike(query.search.value)}%`;
    const ors = query.search.fields
      .map((f) => (table[f] ? like(table[f], pattern) : undefined))
      .filter((c) => c !== undefined);
    if (ors.length > 0) conds.push(or(...ors));
  }

  return conds.length > 0 ? and(...conds) : undefined;
}

function orderFor(table: any, query: ParsedListQuery) {
  if (!query.sort) return undefined;
  const col = table[query.sort.field];
  if (!col) return undefined;
  return query.sort.direction === "desc" ? desc(col) : asc(col);
}

async function firstRow(promise: Promise<unknown>): Promise<any | null> {
  const rows = (await promise) as any[];
  return Array.isArray(rows) ? (rows[0] ?? null) : null;
}

async function applyUpdate(
  db: any,
  table: any,
  cond: any,
  body: unknown,
): Promise<any | null> {
  return firstRow(
    db
      .update(table)
      .set(body as any)
      .where(cond)
      .returning(),
  );
}

async function findByKey(
  db: any,
  table: any,
  opts: AdapterOptions,
  key: unknown,
): Promise<any | null> {
  const cond = eq(table[opts.primaryKey], key);
  const alive = aliveCondition(table, opts, opts.softDelete ?? false);
  return firstRow(
    db
      .select()
      .from(table)
      .where(alive ? and(cond, alive) : cond)
      .limit(1),
  );
}

function isEmptyBody(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    Object.keys(body).length === 0
  );
}

export const drizzleAdapter: CrudAdapter = {
  name: "drizzle",

  describe(model): FieldDescriptor[] {
    const table = tableOf(model);
    const out: FieldDescriptor[] = [];
    for (const [name, col] of Object.entries(table)) {
      if (!(col instanceof Column)) continue;
      const column = col as unknown as Record<string, unknown>;
      const columnType =
        typeof column["columnType"] === "string"
          ? (column["columnType"] as string)
          : undefined;
      const dataType =
        typeof column["dataType"] === "string"
          ? (column["dataType"] as string)
          : undefined;
      const enumValues = Array.isArray(column["enumValues"])
        ? ([...(column["enumValues"] as unknown[])] as string[])
        : undefined;
      out.push({
        name,
        kind: fieldKind(columnType, dataType, enumValues),
        primary: column["primary"] === true,
        autoIncrement: isAutoIncrement(column, columnType),
        nullable: column["notNull"] !== true,
        ...(enumValues ? { enumValues } : {}),
      });
    }
    return out;
  },

  async list(model, query, opts): Promise<ListResult> {
    const db = dbOf(model);
    const table = tableOf(model);
    const where = whereFor(table, query, opts, opts.softDelete ?? false);
    const order = orderFor(table, query);

    let select: any = db.select().from(table);
    if (where) select = select.where(where);
    if (order) select = select.orderBy(order);
    const data = (await select
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)) as unknown[];

    let counted: any = db.select({ n: count() }).from(table);
    if (where) counted = counted.where(where);
    const totalRows = (await counted) as { n: number }[];
    return { data, total: totalRows[0]?.n ?? 0 };
  },

  async detail(model, id, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null) return null;
    return findByKey(db, table, opts, key);
  },

  async create(model, body, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    if (opts.returning === false) {
      await db.insert(table).values(body as any);
      return undefined;
    }
    return firstRow(db.insert(table).values(body as any).returning());
  },

  async replace(model, id, body, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null) return null;
    if (isEmptyBody(body)) return findByKey(db, table, opts, key);
    const row = await applyUpdate(
      db,
      table,
      eq(table[opts.primaryKey], key),
      body,
    );
    if (row === null) return null;
    return opts.returning === false ? undefined : row;
  },

  async update(model, id, body, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null) return null;
    if (isEmptyBody(body)) return findByKey(db, table, opts, key);
    const row = await applyUpdate(
      db,
      table,
      eq(table[opts.primaryKey], key),
      body,
    );
    if (row === null) return null;
    return opts.returning === false ? undefined : row;
  },

  async remove(model, id, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null) return null;
    const cond = eq(table[opts.primaryKey], key);
    const row = await firstRow(
      opts.softDelete
        ? db
            .update(table)
            .set({ [opts.deletedAtField ?? "deletedAt"]: new Date() } as any)
            .where(cond)
            .returning()
        : db.delete(table).where(cond).returning(),
    );
    if (row === null) return null;
    return opts.returning === false ? undefined : row;
  },
};
