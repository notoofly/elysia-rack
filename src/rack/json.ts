/**
 * Precise contracts for dynamic data crossing the HTTP/ORM boundary.
 *
 * Instead of `unknown` (which erases all structure) or `any` (which disables
 * checking), these types describe exactly what may appear in parsed JSON
 * payloads, database rows, and query maps — while still accepting any
 * runtime payload.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | readonly JsonValue[];

/**
 * Row/request cell: JSON plus `Date`, which drizzle timestamp columns
 * return and which Elysia serializes back to ISO strings.
 */
export type Cell = JsonValue | Date;

/** A stored row or dynamic record (panel data, adapter rows, bodies). */
export type RowData = { [key: string]: Cell };

/**
 * Validate untrusted input as JSON. The single entry point for values
 * typed `unknown` by the platform (Elysia request bodies, `JSON.parse`
 * output, `Response.json()`).
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

/** Narrow to a JSON object record (bodies, row maps, parsed envelopes). */
export function isJsonRecord(value: unknown): value is Record<string, JsonValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    isJsonValue(value)
  );
}

/**
 * Parse a JSON string (attributes, request payloads). Returns `undefined`
 * for invalid input instead of throwing.
 */
export function parseJson(raw: string | null | undefined): JsonValue | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  try {
    const value: JsonValue = JSON.parse(raw);
    return value;
  } catch {
    return undefined;
  }
}
