import type { JsonValue, RowData } from "../json.ts";
import type { ParsedListQuery } from "../query.ts";
import type { Rack } from "../types/index.ts";
import { drizzleAdapter } from "./drizzle.ts";
import { prismaAdapter } from "./prisma.ts";

export { drizzleAdapter } from "./drizzle.ts";
export { prismaAdapter } from "./prisma.ts";

/** A parsed request body: JSON value, or `undefined` when absent. */
export type JsonBody = JsonValue | undefined;

export interface AdapterOptions {
  primaryKey: string;
  deletedAtField?: string;
  returning?: boolean;
  softDelete?: boolean;
}

export interface ListResult {
  data: RowData[];
  total: number;
}

export type FieldKind =
  | "text"
  | "integer"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "json";

export interface FieldDescriptor {
  name: string;
  kind: FieldKind;
  primary: boolean;
  autoIncrement: boolean;
  nullable: boolean;
  enumValues?: readonly string[];
}

/**
 * ORM adapter contract. Each method returns `null` when the target
 * row does not exist (handlers map it to 404), or `undefined` data
 * when `returning` is disabled.
 */
export interface CrudAdapter {
  readonly name: "drizzle" | "prisma";

  /**
   * Introspect writable fields for smart forms.
   * Returns `[]` when the ORM exposes no schema (e.g. Prisma delegates);
   * callers then fall back to text inputs derived from row data.
   */
  describe(model: Rack.CrudModel): FieldDescriptor[];

  list(
    model: Rack.CrudModel,
    query: ParsedListQuery,
    opts: AdapterOptions,
  ): Promise<ListResult>;

  detail(
    model: Rack.CrudModel,
    id: string,
    opts: AdapterOptions,
  ): Promise<RowData | null>;

  create(
    model: Rack.CrudModel,
    body: JsonBody,
    opts: AdapterOptions,
  ): Promise<RowData | null | undefined>;

  replace(
    model: Rack.CrudModel,
    id: string,
    body: JsonBody,
    opts: AdapterOptions,
  ): Promise<RowData | null | undefined>;

  update(
    model: Rack.CrudModel,
    id: string,
    body: JsonBody,
    opts: AdapterOptions,
  ): Promise<RowData | null | undefined>;

  remove(
    model: Rack.CrudModel,
    id: string,
    opts: AdapterOptions & { softDelete?: boolean },
  ): Promise<RowData | null | undefined>;
}

export function getAdapter(model: Rack.CrudModel): CrudAdapter {
  return "drizzle" in model && model.drizzle !== undefined
    ? drizzleAdapter
    : prismaAdapter;
}

/**
 * Whether a column type holds integers.
 *
 * Unknown columns (e.g. Prisma delegates) are treated as numeric-friendly.
 */
export function isNumericColumn(columnType?: string): boolean {
  return (
    columnType === undefined ||
    /serial|smallint|integer|bigint|int8|^(number|bigint)$/i.test(columnType)
  );
}

/**
 * Coerce a string route id to the column type.
 *
 * Integer-like columns (or unknown columns, e.g. Prisma delegates)
 * turn numeric strings into numbers; everything else passes through.
 */
export function coerceIdValue(id: string, columnType?: string): string | number {
  if (!isNumericColumn(columnType)) return id;
  if (id.trim() === "") return id;
  const n = Number(id);
  return Number.isNaN(n) ? id : n;
}
