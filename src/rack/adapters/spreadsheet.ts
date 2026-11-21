import { isJsonRecord, type Cell, type JsonValue, type RowData } from "../json.ts";
import type { ParsedListQuery } from "../query.ts";
import type { AdapterOptions, FieldDescriptor, FieldKind, JsonBody, ListResult } from "./index.ts";

export type SpreadsheetCell = Cell | undefined;

export interface SpreadsheetRecord {
  row: number; // 1-based sheet row
  data: RowData;
}

export function bodyRecord(body: JsonBody): Record<string, JsonValue> {
  return isJsonRecord(body) ? body : {};
}

export function isEmptyBody(body: JsonBody): boolean {
  const rec = bodyRecord(body);
  return Object.keys(rec).length === 0;
}

export function normalizeHeader(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function inferFieldKind(value: Cell | undefined): FieldKind {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (value instanceof Date) return "date";
  if (Array.isArray(value) || isJsonRecord(value)) return "json";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "true" || trimmed === "false") return "boolean";
    if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return "number";
    const date = new Date(trimmed);
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !Number.isNaN(date.getTime())) return "date";
  }
  return "text";
}

interface SchemaLike {
  properties?: Record<string, unknown>;
  required?: string[];
}

function schemaProperty(schema: unknown): SchemaLike | null {
  return isJsonRecord(schema) ? (schema as SchemaLike) : null;
}

function unwrapSchema(schema: unknown): unknown[] {
  if (!isJsonRecord(schema)) return [schema];
  const variants = [schema.anyOf, schema.oneOf, schema.allOf].find(Array.isArray);
  if (variants) return variants.flatMap(unwrapSchema);
  return [schema];
}

function kindFromSchema(schema: unknown): FieldKind | undefined {
  const variants = unwrapSchema(schema).filter((v) => isJsonRecord(v)) as Record<string, unknown>[];
  if (variants.length === 0) return undefined;
  const kinds = new Set<FieldKind>();
  for (const v of variants) {
    if ("const" in v && typeof v.const === "string") kinds.add("enum");
    const type = v.type;
    const format = v.format;
    if (type === "boolean") kinds.add("boolean");
    else if (type === "integer") kinds.add("integer");
    else if (type === "number") kinds.add("number");
    else if (type === "string") {
      if (format === "date" || format === "date-time") kinds.add("date");
      else kinds.add("text");
    } else if (type === "object" || type === "array") kinds.add("json");
    else if (format === "date" || format === "date-time") kinds.add("date");
  }
  if (kinds.size === 1) return [...kinds][0];
  if (kinds.has("enum") && kinds.size > 1) return "enum";
  if (kinds.has("text")) return "text";
  return [...kinds][0];
}

function enumValuesFromSchema(schema: unknown): readonly string[] | undefined {
  const values = unwrapSchema(schema)
    .filter((v) => isJsonRecord(v) && typeof v.const === "string")
    .map((v) => (v as { const: string }).const);
  return values.length > 0 ? [...new Set(values)] : undefined;
}

export function describeSchema(
  schema: unknown,
  primaryKey: string,
): FieldDescriptor[] {
  const s = schemaProperty(schema);
  const props = s?.properties;
  if (!props) return [];
  const required = new Set(s?.required ?? []);
  return Object.entries(props).map(([name, prop]) => ({
    name,
    kind: kindFromSchema(prop) ?? "text",
    primary: name === primaryKey,
    autoIncrement: false,
    nullable: name !== primaryKey && !required.has(name),
    enumValues: enumValuesFromSchema(prop),
  }));
}

export function describeHeaders(
  headers: string[],
  rows: RowData[],
  primaryKey: string,
  schema?: unknown,
): FieldDescriptor[] {
  const fromSchema = describeSchema(schema, primaryKey);
  if (fromSchema.length > 0) {
    const known = new Set(fromSchema.map((f) => f.name));
    for (const h of headers) {
      if (known.has(h)) continue;
      const sample = rows.find((r) => r[h] !== undefined && r[h] !== null)?.[h];
      fromSchema.push({ name: h, kind: inferFieldKind(sample), primary: h === primaryKey, autoIncrement: false, nullable: h !== primaryKey });
    }
    return fromSchema;
  }
  return headers.map((name) => {
    const sample = rows.find((r) => r[name] !== undefined && r[name] !== null)?.[name];
    return {
      name,
      kind: inferFieldKind(sample),
      primary: name === primaryKey,
      autoIncrement: false,
      nullable: name !== primaryKey,
    };
  });
}

function idEquals(a: Cell | undefined, b: string): boolean {
  if (a === null || a === undefined) return false;
  if (typeof a === "number") {
    const n = Number(b);
    return !Number.isNaN(n) && a === n;
  }
  return String(a) === b;
}

export function findRecordById(records: SpreadsheetRecord[], primaryKey: string, id: string): SpreadsheetRecord | null {
  return records.find((r) => idEquals(r.data[primaryKey], id)) ?? null;
}

export function ensurePrimaryKey(
  headers: string[],
  primaryKey: string,
  rows: RowData[],
  create: boolean,
): string[] {
  if (headers.includes(primaryKey)) return headers;
  if (!create) {
    throw spreadsheetError(
      "MISSING_PRIMARY_KEY",
      `Primary key column "${primaryKey}" was not found in spreadsheet headers`,
    );
  }
  const next = [primaryKey, ...headers];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]![primaryKey] === undefined) rows[i]![primaryKey] = i + 1;
  }
  return next;
}

export function assertUniquePrimaryKeys(rows: RowData[], primaryKey: string): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row[primaryKey];
    if (value === null || value === undefined || value === "") continue;
    const key = String(value);
    if (seen.has(key)) {
      throw spreadsheetError("DUPLICATE_PRIMARY_KEY", `Duplicate primary key "${key}" in column "${primaryKey}"`);
    }
    seen.add(key);
  }
}

export function nextPrimaryKey(rows: RowData[], primaryKey: string): number | string {
  let max = 0;
  let numeric = true;
  let seen = false;
  for (const row of rows) {
    const value = row[primaryKey];
    if (value === null || value === undefined || value === "") continue;
    seen = true;
    if (typeof value === "number" && Number.isFinite(value)) {
      if (value > max) max = value;
      continue;
    }
    const n = Number(String(value));
    if (String(value).trim() !== "" && !Number.isNaN(n) && Number.isFinite(n)) {
      if (n > max) max = n;
      continue;
    }
    numeric = false;
  }
  if (!seen || numeric) return max + 1;
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isAlive(row: RowData, opts: AdapterOptions, withSoftDelete: boolean): boolean {
  if (!withSoftDelete) return true;
  const field = opts.deletedAtField ?? "deletedAt";
  return row[field] === null || row[field] === undefined;
}

function matchesFilter(value: Cell | undefined, expected: JsonValue): boolean {
  if (Array.isArray(expected)) return expected.some((v) => matchesFilter(value, v as JsonValue));
  if (value === null || value === undefined) return expected === null;
  if (typeof value === "number" && typeof expected === "string") {
    const n = Number(expected);
    if (!Number.isNaN(n)) return value === n;
  }
  if (typeof value === "string" && typeof expected === "number") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n === expected;
  }
  if (value instanceof Date) return value.toISOString() === String(expected);
  return String(value) === String(expected);
}

function searchableText(value: Cell | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function compareCells(a: Cell | undefined, b: Cell | undefined): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const an = Number(a as string | number);
  const bn = Number(b as string | number);
  if (!Number.isNaN(an) && !Number.isNaN(bn) && String(a).trim() !== "" && String(b).trim() !== "")
    return an - bn;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function queryRows(
  rows: RowData[],
  query: ParsedListQuery,
  opts: AdapterOptions,
): ListResult {
  const withSoftDelete = (opts.softDelete ?? false) && !query.includeDeleted;
  let out = rows.filter((row) => isAlive(row, opts, withSoftDelete));

  for (const [key, value] of Object.entries(query.filters)) {
    out = out.filter((row) => matchesFilter(row[key], value));
  }

  if (query.search && query.search.fields.length > 0) {
    const needle = query.search.value.toLowerCase();
    out = out.filter((row) =>
      query.search!.fields.some((field) => searchableText(row[field]).toLowerCase().includes(needle)),
    );
  }

  if (query.sort) {
    const { field, direction } = query.sort;
    out = [...out].sort((a, b) => {
      const cmp = compareCells(a[field], b[field]);
      return direction === "desc" ? -cmp : cmp;
    });
  }

  const total = out.length;
  const start = (query.page - 1) * query.limit;
  return { data: out.slice(start, start + query.limit), total };
}

export function coerceMutationValue(value: JsonValue | undefined): Cell | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return value;
  if (Array.isArray(value) || isJsonRecord(value)) return value;
  return String(value);
}

export function buildCreatedRow(
  headers: string[],
  existing: RowData[],
  body: JsonBody,
  opts: AdapterOptions,
): RowData {
  const rec = bodyRecord(body);
  const row: RowData = {};
  for (const h of headers) row[h] = null;
  for (const [k, v] of Object.entries(rec)) {
    if (!headers.includes(k)) headers.push(k);
    row[k] = coerceMutationValue(v) as Cell;
  }
  const pk = opts.primaryKey;
  if (row[pk] === null || row[pk] === undefined || row[pk] === "") {
    row[pk] = nextPrimaryKey(existing, pk);
  }
  return row;
}

export function applyUpdateRow(
  headers: string[],
  current: RowData,
  body: JsonBody,
  replace: boolean,
): RowData {
  const rec = bodyRecord(body);
  const next: RowData = replace ? {} : { ...current };
  if (replace) for (const h of headers) next[h] = null;
  for (const [k, v] of Object.entries(rec)) {
    if (!headers.includes(k)) headers.push(k);
    next[k] = coerceMutationValue(v) as Cell;
  }
  return next;
}

export type SpreadsheetErrorCode =
  | "MISSING_DEPENDENCY"
  | "FILE_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "INVALID_FILE"
  | "MISSING_WORKSHEET"
  | "INVALID_HEADER"
  | "DUPLICATE_PRIMARY_KEY"
  | "MISSING_PRIMARY_KEY"
  | "INVALID_CELL_VALUE"
  | "CONCURRENT_WRITE"
  | "PERSISTENCE_FAILED"
  | "AUTH_FAILURE"
  | "SPREADSHEET_NOT_FOUND"
  | "INVALID_RANGE"
  | "API_QUOTA"
  | "NETWORK_TIMEOUT"
  | "INVALID_REQUEST"
  | "CONCURRENT_MODIFICATION";

export class SpreadsheetAdapterError extends Error {
  readonly code: SpreadsheetErrorCode;
  override readonly cause: unknown;
  constructor(code: SpreadsheetErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "SpreadsheetAdapterError";
    this.code = code;
    this.cause = cause;
  }
}

export function spreadsheetError(
  code: SpreadsheetErrorCode,
  message: string,
  cause?: unknown,
): SpreadsheetAdapterError {
  return new SpreadsheetAdapterError(code, message, cause);
}

export function asCellValue(value: unknown): Cell {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value) || isJsonRecord(value)) return value as JsonValue;
  if (value === undefined) return null;
  return String(value);
}
