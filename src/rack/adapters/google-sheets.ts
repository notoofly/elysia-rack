import { isJsonRecord, type Cell, type RowData } from "../json.ts";
import type { ParsedListQuery } from "../query.ts";
import type { Rack } from "../types/index.ts";
import type { AdapterOptions, CrudAdapter, FieldDescriptor, JsonBody, ListResult } from "./index.ts";
import {
  applyUpdateRow,
  asCellValue,
  assertUniquePrimaryKeys,
  bodyRecord,
  buildCreatedRow,
  describeHeaders,
  ensurePrimaryKey,
  findRecordById,
  isEmptyBody,
  normalizeHeader,
  queryRows,
  spreadsheetError,
  type SpreadsheetRecord,
} from "./spreadsheet.ts";

interface SheetsValuesResponse { data: { values?: unknown[][] } }
interface SheetsBatchGetResponse { data: { valueRanges?: Array<{ values?: unknown[][] }> } }
interface SheetsSpreadsheetResponse {
  data: {
    spreadsheetId?: string;
    sheets?: Array<{ properties?: { sheetId?: number; title?: string; gridProperties?: { rowCount?: number; columnCount?: number } } }>;
  };
}

interface SheetsApi {
  spreadsheets: {
    get: (params: Record<string, unknown>) => Promise<SheetsSpreadsheetResponse>;
    batchUpdate: (params: Record<string, unknown>) => Promise<unknown>;
    values: {
      get: (params: Record<string, unknown>) => Promise<SheetsValuesResponse>;
      batchGet: (params: Record<string, unknown>) => Promise<SheetsBatchGetResponse>;
      update: (params: Record<string, unknown>) => Promise<unknown>;
      batchUpdate: (params: Record<string, unknown>) => Promise<unknown>;
      append: (params: Record<string, unknown>) => Promise<unknown>;
    };
  };
}

interface GoogleApisModule {
  google: { sheets: (args: { version: "v4"; auth: unknown }) => SheetsApi };
}

type GoogleSheetsConfig = {
  auth: unknown;
  spreadsheetId: string;
  worksheet: string;
  primaryKey?: string;
  headerRow?: number;
  metadataCacheTtl?: number;
  /** @internal test/advanced override */
  sheetsApi?: SheetsApi;
};

type SheetMeta = {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  fetchedAt: number;
};

function configOf(model: Rack.CrudModel): GoogleSheetsConfig {
  return (model as { googleSheets: GoogleSheetsConfig }).googleSheets;
}

async function loadGoogleApis(): Promise<GoogleApisModule> {
  try {
    const mod = (await import("googleapis")) as unknown as GoogleApisModule & { default?: GoogleApisModule };
    return (mod.default ?? mod) as GoogleApisModule;
  } catch (error) {
    throw spreadsheetError(
      "MISSING_DEPENDENCY",
      'Google Sheets provider requires "googleapis" to be installed: npm install googleapis',
      error,
    );
  }
}

const sheetsCache = new WeakMap<object, SheetsApi>();
const metaCache = new WeakMap<object, SheetMeta>();
const writeLocks = new WeakMap<object, Promise<void>>();

async function withWriteLock<T>(key: object, fn: () => Promise<T>): Promise<T> {
  const prev = writeLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeLocks.set(key, prev.then(() => current));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (writeLocks.get(key) === current) writeLocks.delete(key);
  }
}

function headerRowNumber(config: GoogleSheetsConfig): number {
  const row = config.headerRow ?? 1;
  if (!Number.isInteger(row) || row < 1)
    throw spreadsheetError("INVALID_HEADER", "headerRow must be a positive integer");
  return row;
}

function escapeSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function a1(title: string, startCol: number, startRow: number, endCol: number, endRow: number): string {
  const sheet = escapeSheetTitle(title);
  return `${sheet}!${columnLetter(startCol)}${startRow}:${columnLetter(endCol)}${endRow}`;
}

function normalizeSheetsError(error: unknown): never {
  const e = error as { code?: number | string; status?: number; message?: string; errors?: unknown; response?: { status?: number; data?: unknown } };
  const status = Number(e?.response?.status ?? e?.status ?? e?.code);
  const message = String(e?.message ?? "Google Sheets API error");
  if (status === 401 || status === 403) throw spreadsheetError("AUTH_FAILURE", message, safeCause(error));
  if (status === 404) throw spreadsheetError("SPREADSHEET_NOT_FOUND", message, safeCause(error));
  if (status === 429) throw spreadsheetError("API_QUOTA", message, safeCause(error));
  if (status === 400) throw spreadsheetError("INVALID_REQUEST", message, safeCause(error));
  if (status === 408 || /timeout/i.test(message)) throw spreadsheetError("NETWORK_TIMEOUT", message, safeCause(error));
  throw spreadsheetError("INVALID_REQUEST", message, safeCause(error));
}

function safeCause(error: unknown): unknown {
  if (!isJsonRecord(error)) return String(error);
  const out: Record<string, unknown> = {};
  for (const k of ["code", "status", "message"]) if (k in error) out[k] = error[k];
  const resp = error["response"];
  if (isJsonRecord(resp) && isJsonRecord(resp["data"])) out["responseData"] = resp["data"];
  return out;
}

async function getSheetsApi(config: GoogleSheetsConfig): Promise<SheetsApi> {
  if (config.sheetsApi) return config.sheetsApi;
  const cached = sheetsCache.get(config as object);
  if (cached) return cached;
  const { google } = await loadGoogleApis();
  const api = google.sheets({ version: "v4", auth: config.auth });
  sheetsCache.set(config as object, api);
  return api;
}

async function fetchMeta(config: GoogleSheetsConfig, api: SheetsApi): Promise<SheetMeta> {
  const ttl = config.metadataCacheTtl ?? 30_000;
  const cached = metaCache.get(config as object);
  if (cached && ttl > 0 && Date.now() - cached.fetchedAt < ttl) return cached;
  const hr = headerRowNumber(config);
  let res: SheetsSpreadsheetResponse;
  try {
    res = await api.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
      fields: "spreadsheetId,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))",
    });
  } catch (error) {
    normalizeSheetsError(error);
  }
  const sheet = res.data.sheets?.find((s) => s.properties?.title === config.worksheet);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw spreadsheetError("MISSING_WORKSHEET", `Worksheet "${config.worksheet}" was not found`);
  }
  const props = sheet.properties ?? {};
  const rowCount = props.gridProperties?.rowCount ?? 1000;
  const columnCount = props.gridProperties?.columnCount ?? 26;
  let headerValues: unknown[][] = [[]];
  try {
    const headerRes = await api.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: a1(config.worksheet, 0, hr, Math.max(columnCount - 1, 0), hr),
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    headerValues = headerRes.data.values ?? [[]];
  } catch (error) {
    normalizeSheetsError(error);
  }
  const rawHeaders = (headerValues[0] ?? []).map(normalizeHeader);
  const headers = rawHeaders.filter((h): h is string => Boolean(h));
  if (headers.length === 0)
    throw spreadsheetError("INVALID_HEADER", `No headers found at row ${hr}`);
  const seen = new Set<string>();
  for (const h of headers) {
    if (seen.has(h)) throw spreadsheetError("INVALID_HEADER", `Duplicate header "${h}"`);
    seen.add(h);
  }
  const meta: SheetMeta = {
    sheetId: props.sheetId as number,
    title: config.worksheet,
    rowCount,
    columnCount,
    headers,
    fetchedAt: Date.now(),
  };
  metaCache.set(config as object, meta);
  return meta;
}

function invalidateMeta(config: GoogleSheetsConfig): void {
  metaCache.delete(config as object);
}

async function readRecords(config: GoogleSheetsConfig, api: SheetsApi, opts: AdapterOptions): Promise<{ meta: SheetMeta; headers: string[]; records: SpreadsheetRecord[] }> {
  const meta = await fetchMeta(config, api);
  const hr = headerRowNumber(config);
  const startRow = hr + 1;
  const endRow = Math.max(meta.rowCount, startRow);
  const endCol = Math.max(meta.headers.length - 1, 0);
  let values: unknown[][] = [];
  if (endRow >= startRow) {
    try {
      const res = await api.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: a1(config.worksheet, 0, startRow, endCol, endRow),
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      values = res.data.values ?? [];
    } catch (error) {
      normalizeSheetsError(error);
    }
  }
  let headers = [...meta.headers];
  const records: SpreadsheetRecord[] = [];
  for (let i = 0; i < values.length; i++) {
    const rowValues = values[i] ?? [];
    const data: RowData = {};
    let hasAny = false;
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c]!;
      const raw = rowValues[c];
      const value = raw === "" || raw === undefined ? undefined : asCellValue(raw);
      if (value !== undefined && value !== null) {
        data[h] = value;
        hasAny = true;
      } else {
        data[h] = null;
      }
    }
    if (!hasAny) continue;
    records.push({ row: startRow + i, data });
  }
  const rows = records.map((r) => r.data);
  headers = ensurePrimaryKey(headers, opts.primaryKey, rows, false);
  assertUniquePrimaryKeys(rows, opts.primaryKey);
  return { meta, headers, records };
}

function valuesForRow(headers: string[], row: RowData): unknown[] {
  return headers.map((h) => {
    const value = row[h];
    return value === undefined ? null : value;
  });
}

async function ensureHeaderRow(config: GoogleSheetsConfig, api: SheetsApi, headers: string[]): Promise<void> {
  const hr = headerRowNumber(config);
  try {
    await api.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: a1(config.worksheet, 0, hr, Math.max(headers.length - 1, 0), hr),
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  } catch (error) {
    normalizeSheetsError(error);
  }
  invalidateMeta(config);
}

function withPrimaryKey(opts: AdapterOptions, config: GoogleSheetsConfig): AdapterOptions {
  return config.primaryKey ? { ...opts, primaryKey: config.primaryKey } : opts;
}

export const googleSheetsAdapter: CrudAdapter = {
  name: "google-sheets",

  async describe(model): Promise<FieldDescriptor[]> {
    const config = configOf(model);
    const o = withPrimaryKey({ primaryKey: config.primaryKey ?? "id" }, config);
    try {
      const api = await getSheetsApi(config);
      const { headers, records } = await readRecords(config, api, o);
      return describeHeaders(headers, records.map((r) => r.data), o.primaryKey);
    } catch {
      return [];
    }
  },

  async list(model, query, opts): Promise<ListResult> {
    const config = configOf(model);
    const o = withPrimaryKey(opts, config);
    const api = await getSheetsApi(config);
    const { records } = await readRecords(config, api, o);
    return queryRows(records.map((r) => r.data), query, o);
  },

  async detail(model, id, opts) {
    const config = configOf(model);
    const o = withPrimaryKey(opts, config);
    const api = await getSheetsApi(config);
    const { records } = await readRecords(config, api, o);
    const row = findRecordById(records, o.primaryKey, id)?.data ?? null;
    if (!row) return null;
    if (opts.softDelete) {
      const del = row[opts.deletedAtField ?? "deletedAt"];
      if (del !== null && del !== undefined) return null;
    }
    return row;
  },

  async create(model, body, opts) {
    const config = configOf(model);
    const o = withPrimaryKey(opts, config);
    return withWriteLock(config as object, async () => {
      const api = await getSheetsApi(config);
      const { meta, headers: initialHeaders, records } = await readRecords(config, api, o);
      const headers = [...initialHeaders];
      const rows = records.map((r) => r.data);
      const row = buildCreatedRow(headers, rows, body, o);
      assertUniquePrimaryKeys([...rows, row], o.primaryKey);
      if (headers.length !== initialHeaders.length || headers.some((h, i) => h !== initialHeaders[i])) {
        await ensureHeaderRow(config, api, headers);
      }
      // Append after last known row; append API handles table growth.
      try {
        await api.spreadsheets.values.append({
          spreadsheetId: config.spreadsheetId,
          range: a1(config.worksheet, 0, headerRowNumber(config) + 1, Math.max(headers.length - 1, 0), headerRowNumber(config) + 1),
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [valuesForRow(headers, row)] },
        });
      } catch (error) {
        normalizeSheetsError(error);
      }
      invalidateMeta(config);
      void meta;
      return o.returning === false ? undefined : row;
    });
  },

  async replace(model, id, body, opts) {
    return mutate(model, id, body, opts, true);
  },

  async update(model, id, body, opts) {
    return mutate(model, id, body, opts, false);
  },

  async remove(model, id, opts) {
    const config = configOf(model);
    const o = withPrimaryKey(opts, config);
    return withWriteLock(config as object, async () => {
      const api = await getSheetsApi(config);
      const { meta, headers, records } = await readRecords(config, api, o);
      const rec = findRecordById(records, o.primaryKey, id);
      if (!rec) return null;
      if (opts.softDelete) {
        const deletedAt = opts.deletedAtField ?? "deletedAt";
        const nextHeaders = headers.includes(deletedAt) ? headers : [...headers, deletedAt];
        const next = { ...rec.data, [deletedAt]: new Date().toISOString() };
        if (nextHeaders.length !== headers.length) await ensureHeaderRow(config, api, nextHeaders);
        try {
          await api.spreadsheets.values.update({
            spreadsheetId: config.spreadsheetId,
            range: a1(config.worksheet, 0, rec.row, Math.max(nextHeaders.length - 1, 0), rec.row),
            valueInputOption: "RAW",
            requestBody: { values: [valuesForRow(nextHeaders, next)] },
          });
        } catch (error) {
          normalizeSheetsError(error);
        }
        invalidateMeta(config);
        return opts.returning === false ? undefined : next;
      }
      try {
        await api.spreadsheets.batchUpdate({
          spreadsheetId: config.spreadsheetId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: meta.sheetId,
                    dimension: "ROWS",
                    startIndex: rec.row - 1,
                    endIndex: rec.row,
                  },
                },
              },
            ],
          },
        });
      } catch (error) {
        normalizeSheetsError(error);
      }
      invalidateMeta(config);
      return opts.returning === false ? undefined : rec.data;
    });
  },
};

async function mutate(
  model: Rack.CrudModel,
  id: string,
  body: JsonBody,
  opts: AdapterOptions,
  replace: boolean,
): Promise<RowData | null | undefined> {
  const config = configOf(model);
  const o = withPrimaryKey(opts, config);
  return withWriteLock(config as object, async () => {
    const api = await getSheetsApi(config);
    const { headers: initialHeaders, records } = await readRecords(config, api, o);
    const headers = [...initialHeaders];
    const rec = findRecordById(records, o.primaryKey, id);
    if (!rec) return null;
    const isRestore =
      o.softDelete === true &&
      bodyRecord(body)[o.deletedAtField ?? "deletedAt"] === null;
    const alive = rec.data[o.deletedAtField ?? "deletedAt"] == null;
    if (o.softDelete === true && !alive && !isRestore) return null;
    if (isEmptyBody(body)) return o.returning === false ? undefined : rec.data;
    const next = applyUpdateRow(headers, rec.data, body, replace);
    next[o.primaryKey] = rec.data[o.primaryKey] as Cell;
    assertUniquePrimaryKeys(
      records.map((r) => (r.row === rec.row ? next : r.data)),
      o.primaryKey,
    );
    if (headers.length !== initialHeaders.length || headers.some((h, i) => h !== initialHeaders[i])) {
      await ensureHeaderRow(config, api, headers);
    }
    try {
      await api.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: a1(config.worksheet, 0, rec.row, Math.max(headers.length - 1, 0), rec.row),
        valueInputOption: "RAW",
        requestBody: { values: [valuesForRow(headers, next)] },
      });
    } catch (error) {
      normalizeSheetsError(error);
    }
    invalidateMeta(config);
    return o.returning === false ? undefined : next;
  });
}
