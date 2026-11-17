import {
  and,
  asc,
  Column,
  count,
  desc,
  eq,
  ilike,
  inArray,
  is,
  isNull,
  like,
  or,
  type SQL,
} from "drizzle-orm";
import type { ParsedListQuery } from "../query.ts";
import type { Rack } from "../types/index.ts";
import {
  coerceIdValue,
  isNumericColumn,
  type AdapterOptions,
  type CrudAdapter,
  type FieldDescriptor,
  type FieldKind,
  type ListResult,
} from "./index.ts";

/**
 * Drizzle `Column` (default generic instantiation) carries every property
 * the adapter relies on — columnType, dataType, primary, notNull,
 * enumValues — and satisfies all drizzle operators directly.
 */
type DrizzleTable = Record<string, Column | undefined>;

/** The column is expected to exist; missing keys surface drizzle's own error. */
function columnOf(table: DrizzleTable, name: string): Column {
  return table[name] as Column;
}

type DrizzleRow = Record<string, unknown>;

/**
 * Minimal query-builder surface the adapter uses. Drizzle's real builders
 * are structurally compatible (and thenable), so they satisfy this at
 * runtime without importing drizzle's heavyweight generics.
 */
interface DrizzleExec extends PromiseLike<DrizzleRow[]> {
  where(condition?: SQL | undefined): DrizzleExec;
  orderBy(...order: SQL[]): DrizzleExec;
  limit(n: number): DrizzleExec;
  offset(n: number): DrizzleExec;
  returning(): DrizzleExec;
}

interface DrizzleDb {
  select(...fields: unknown[]): { from(table: DrizzleTable): DrizzleExec };
  insert(
    table: DrizzleTable,
  ): { values(values: Record<string, unknown>): DrizzleExec };
  update(
    table: DrizzleTable,
  ): { set(values: Record<string, unknown>): DrizzleExec };
  delete(table: DrizzleTable): DrizzleExec;
}

function tableOf(model: Rack.CrudModel): DrizzleTable {
  return (model as { drizzle: { table: object } }).drizzle.table as DrizzleTable;
}

function dbOf(model: Rack.CrudModel): DrizzleDb {
  return (model as { drizzle: { db: object } }).drizzle.db as DrizzleDb;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function searchCondition(col: Column, pattern: string): SQL {
  // SQLite and MySQL use `LIKE` (case-insensitive for ASCII); `ILIKE` is Postgres-only.
  const columnType = typeof col?.columnType === "string" ? col.columnType : "";
  return columnType.startsWith("Pg") ? ilike(col, pattern) : like(col, pattern);
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

function isAutoIncrement(col: Column, columnType: string | undefined): boolean {
  if (columnType && /serial/i.test(columnType)) return true;
  if (col.generated !== undefined && col.generated !== null) return true;
  // SQLite `INTEGER PRIMARY KEY` is a rowid alias (auto-increment).
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
  table: DrizzleTable,
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
  table: DrizzleTable,
  opts: AdapterOptions,
  withSoftDelete: boolean,
): SQL | undefined {
  if (!withSoftDelete) return undefined;
  const col = table[opts.deletedAtField ?? "deletedAt"];
  return col ? isNull(col) : undefined;
}

function whereFor(
  table: DrizzleTable,
  query: ParsedListQuery,
  opts: AdapterOptions,
  withSoftDelete: boolean,
): SQL | undefined {
  const conds: SQL[] = [];
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
    // SQL: WHERE col LIKE '%query%' (escaped, wrapped with %)
    const pattern = `%${escapeLike(query.search.value)}%`;
    const ors = query.search.fields
      .map((f) => {
        const col = table[f];
        if (!col) return undefined;
        return searchCondition(col, pattern);
      })
      .filter((c): c is SQL => c !== undefined);
    const combined = ors.length > 0 ? or(...ors) : undefined;
    if (combined) conds.push(combined);
  }

  return conds.length > 0 ? and(...conds) : undefined;
}

function orderFor(table: DrizzleTable, query: ParsedListQuery): SQL | undefined {
  if (!query.sort) return undefined;
  const col = table[query.sort.field];
  if (!col) return undefined;
  return query.sort.direction === "desc" ? desc(col) : asc(col);
}

async function firstRow(
  promise: PromiseLike<DrizzleRow[]>,
): Promise<DrizzleRow | null> {
  const rows = await promise;
  return Array.isArray(rows) ? (rows[0] ?? null) : null;
}

async function applyUpdate(
  db: DrizzleDb,
  table: DrizzleTable,
  cond: SQL | undefined,
  body: Record<string, unknown>,
): Promise<DrizzleRow | null> {
  return firstRow(
    db
      .update(table)
      .set(body)
      .where(cond)
      .returning(),
  );
}

function keyCondition(
  table: DrizzleTable,
  opts: AdapterOptions,
  key: unknown,
  body?: unknown,
): SQL | undefined {
  const cond = eq(columnOf(table, opts.primaryKey), key);
  // An explicit `deletedAt: null` write is the restore path and must reach
  // tombstoned rows; every other write is confined to live rows.
  const restoring =
    opts.softDelete === true &&
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>)[opts.deletedAtField ?? "deletedAt"] ===
      null;
  const alive = restoring
    ? undefined
    : aliveCondition(table, opts, opts.softDelete ?? false);
  return alive ? and(cond, alive) : cond;
}

async function findByKey(
  db: DrizzleDb,
  table: DrizzleTable,
  opts: AdapterOptions,
  key: unknown,
): Promise<DrizzleRow | null> {
  const cond = eq(columnOf(table, opts.primaryKey), key);
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

// Date-kind columns (e.g. `integer(..., { mode: "timestamp" })`) map with
// `value.getTime()`, so string bodies from JSON/forms must become `Date`.
function coerceBodyValues(
  table: DrizzleTable,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    const col = table[key];
    if (col && col.dataType === "date" && typeof value === "string") {
      const date = new Date(value);
      out[key] = Number.isNaN(date.getTime()) ? value : date;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export const drizzleAdapter: CrudAdapter = {
  name: "drizzle",

  describe(model): FieldDescriptor[] {
    const table = tableOf(model);
    const out: FieldDescriptor[] = [];
    for (const [name, col] of Object.entries(table)) {
      // `is` compares drizzle's global entityKind symbol, so it still works
      // when the app and this package resolve separate drizzle-orm copies.
      if (!col || !is(col, Column)) continue;
      const enumValues = col.enumValues
        ? ([...col.enumValues] as string[])
        : undefined;
      out.push({
        name,
        kind: fieldKind(
          col.columnType as string | undefined,
          col.dataType as string | undefined,
          enumValues,
        ),
        primary: col.primary === true,
        autoIncrement: isAutoIncrement(col, col.columnType as string | undefined),
        nullable: col.notNull !== true,
        ...(enumValues ? { enumValues } : {}),
      });
    }
    return out;
  },

  async list(model, query, opts): Promise<ListResult> {
    const db = dbOf(model);
    const table = tableOf(model);
    const where = whereFor(
      table,
      query,
      opts,
      (opts.softDelete ?? false) && !query.includeDeleted,
    );
    const order = orderFor(table, query);

    let select = db.select().from(table);
    if (where) select = select.where(where);
    if (order) select = select.orderBy(order);
    const data = await select
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    let counted = db.select({ n: count() }).from(table);
    if (where) counted = counted.where(where);
    const totalRows = await counted;
    const first = totalRows[0] as { n?: number } | undefined;
    return { data, total: first?.n ?? 0 };
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
    const values = coerceBodyValues(table, body as Record<string, unknown>);
    if (opts.returning === false) {
      await db.insert(table).values(values);
      return undefined;
    }
    return firstRow(db.insert(table).values(values).returning());
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
      keyCondition(table, opts, key, body),
      coerceBodyValues(table, body as Record<string, unknown>),
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
      keyCondition(table, opts, key, body),
      coerceBodyValues(table, body as Record<string, unknown>),
    );
    if (row === null) return null;
    return opts.returning === false ? undefined : row;
  },

  async remove(model, id, opts) {
    const db = dbOf(model);
    const table = tableOf(model);
    const key = resolvableId(table, opts.primaryKey, id);
    if (key === null) return null;
    const cond = eq(columnOf(table, opts.primaryKey), key);
    const row = await firstRow(
      opts.softDelete
        ? db
            .update(table)
            .set({ [opts.deletedAtField ?? "deletedAt"]: new Date() })
            .where(cond)
            .returning()
        : db.delete(table).where(cond).returning(),
    );
    if (row === null) return null;
    return opts.returning === false ? undefined : row;
  },
};
