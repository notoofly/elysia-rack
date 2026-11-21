import { existsSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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

interface ExcelColumn {
  header?: string;
  key?: string;
}

interface ExcelCell {
  value: unknown;
  text?: string;
}

interface ExcelRow {
  values: unknown;
  getCell: (column: number) => ExcelCell;
  commit?: () => void;
}

interface ExcelWorksheet {
  name: string;
  rowCount: number;
  actualColumnCount?: number;
  columnCount?: number;
  columns: ExcelColumn[];
  getRow: (row: number) => ExcelRow;
  addRow: (values: unknown[] | Record<string, unknown>) => ExcelRow;
  spliceRows: (start: number, count: number, ...items: unknown[]) => void;
  eachRow?: (cb: (row: ExcelRow, rowNumber: number) => void) => void;
}

interface ExcelWorkbook {
  xlsx: {
    readFile: (path: string) => Promise<unknown>;
    writeFile: (path: string) => Promise<unknown>;
    writeBuffer: () => Promise<ArrayBuffer | Uint8Array>;
  };
  getWorksheet: (name: string) => ExcelWorksheet | undefined;
  addWorksheet: (name: string) => ExcelWorksheet;
}

interface ExcelJSModule {
  Workbook: new () => ExcelWorkbook;
}

type ExcelConfig = {
  file?: string;
  workbook?: ExcelWorkbook;
  worksheet: string;
  primaryKey?: string;
  headerRow?: number;
  persist?: boolean;
  createWorksheet?: boolean;
};

function configOf(model: Rack.CrudModel): ExcelConfig {
  return (model as { exceljs: ExcelConfig }).exceljs;
}

async function loadExcelJS(): Promise<ExcelJSModule> {
  try {
    const mod = (await import("exceljs")) as unknown as ExcelJSModule & { default?: ExcelJSModule };
    return (mod.default ?? mod) as ExcelJSModule;
  } catch (error) {
    throw spreadsheetError(
      "MISSING_DEPENDENCY",
      'ExcelJS provider requires "exceljs" to be installed: npm install exceljs',
      error,
    );
  }
}

const workbookCache = new WeakMap<object, ExcelWorkbook>();
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

function isRichText(value: unknown): value is { richText: Array<{ text?: string }> } {
  return isJsonRecord(value) && Array.isArray(value["richText"]);
}

function isFormula(value: unknown): value is { result?: unknown } {
  return isJsonRecord(value) && "result" in value;
}

function isHyperlink(value: unknown): value is { text?: string; hyperlink?: string } {
  return isJsonRecord(value) && typeof value["hyperlink"] === "string";
}

function cellToValue(value: unknown): Cell | undefined {
  if (value === null || value === undefined) return undefined;
  if (isRichText(value)) return value.richText.map((r) => r.text ?? "").join("");
  if (isFormula(value)) return asCellValue(value.result);
  if (isHyperlink(value)) return value.text ?? String(value.hyperlink ?? "");
  if (isJsonRecord(value) && "error" in value) return String(value["error"] ?? "#ERROR");
  return asCellValue(value);
}

function getWorksheet(workbook: ExcelWorkbook, config: ExcelConfig): ExcelWorksheet {
  const ws = workbook.getWorksheet(config.worksheet);
  if (ws) return ws;
  if (config.createWorksheet) return workbook.addWorksheet(config.worksheet);
  throw spreadsheetError("MISSING_WORKSHEET", `Worksheet "${config.worksheet}" was not found`);
}

function headerRowNumber(config: ExcelConfig): number {
  const row = config.headerRow ?? 1;
  if (!Number.isInteger(row) || row < 1) {
    throw spreadsheetError("INVALID_HEADER", "headerRow must be a positive integer");
  }
  return row;
}

function readHeaders(ws: ExcelWorksheet, headerRow: number): string[] {
  const row = ws.getRow(headerRow);
  const max = Math.max(ws.columnCount ?? 0, ws.actualColumnCount ?? 0, (row.values as unknown[] | undefined)?.length ?? 0);
  const headers: string[] = [];
  for (let i = 1; i <= max; i++) {
    const value = cellToValue(row.getCell(i).value);
    const header = normalizeHeader(value);
    if (header) headers[i - 1] = header;
  }
  const compact: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h) compact.push(h);
  }
  if (compact.length === 0)
    throw spreadsheetError("INVALID_HEADER", `No headers found at row ${headerRow}`);
  const seen = new Set<string>();
  for (const h of compact) {
    if (seen.has(h)) throw spreadsheetError("INVALID_HEADER", `Duplicate header "${h}"`);
    seen.add(h);
  }
  return compact;
}

function readRecords(ws: ExcelWorksheet, headers: string[], headerRow: number): SpreadsheetRecord[] {
  const records: SpreadsheetRecord[] = [];
  const start = headerRow + 1;
  const end = Math.max(ws.rowCount, start - 1);
  for (let r = start; r <= end; r++) {
    const row = ws.getRow(r);
    const data: RowData = {};
    let hasAny = false;
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c]!;
      const value = cellToValue(row.getCell(c + 1).value);
      if (value !== undefined) {
        data[header] = value;
        hasAny = true;
      } else {
        data[header] = null;
      }
    }
    if (!hasAny) continue;
    records.push({ row: r, data });
  }
  return records;
}

async function loadWorkbook(config: ExcelConfig): Promise<ExcelWorkbook> {
  if (config.workbook) return config.workbook;
  const Excel = await loadExcelJS();
  const workbook = workbookCache.get(config as object) ?? new Excel.Workbook();
  workbookCache.set(config as object, workbook);
  if (config.file) {
    if (!existsSync(config.file)) {
      if (!config.createWorksheet) {
        throw spreadsheetError("FILE_NOT_FOUND", `XLSX file "${config.file}" was not found`);
      }
      return workbook;
    }
    try {
      await workbook.xlsx.readFile(config.file);
    } catch (error) {
      throw spreadsheetError("INVALID_FILE", `Failed to read XLSX file "${config.file}"`, error);
    }
  }
  return workbook;
}

function shouldPersist(config: ExcelConfig): boolean {
  return config.persist ?? Boolean(config.file);
}

async function persistWorkbook(config: ExcelConfig, workbook: ExcelWorkbook): Promise<void> {
  if (!config.file) return;
  const dir = dirname(config.file);
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    await writeFile(tmp, Buffer.from(buffer as ArrayBuffer));
    await rename(tmp, config.file);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => undefined);
    throw spreadsheetError("PERSISTENCE_FAILED", `Failed to persist workbook "${config.file}"`, error);
  }
}

function writeRow(ws: ExcelWorksheet, rowNumber: number, headers: string[], data: RowData): void {
  const row = ws.getRow(rowNumber);
  for (let c = 0; c < headers.length; c++) {
    const header = headers[c]!;
    const value = data[header];
    row.getCell(c + 1).value = value === undefined ? null : (value as unknown);
  }
  row.commit?.();
}

function ensureHeaders(ws: ExcelWorksheet, headerRow: number, headers: string[]): void {
  const row = ws.getRow(headerRow);
  for (let c = 0; c < headers.length; c++) row.getCell(c + 1).value = headers[c]!;
  row.commit?.();
}

async function readState(model: Rack.CrudModel, opts: AdapterOptions) {
  const config = configOf(model);
  const workbook = await loadWorkbook(config);
  const hr = headerRowNumber(config);
  const ws = getWorksheet(workbook, config);
  let headers = readHeaders(ws, hr);
  const records = readRecords(ws, headers, hr);
  const rows = records.map((r) => r.data);
  headers = ensurePrimaryKey(headers, opts.primaryKey, rows, false);
  assertUniquePrimaryKeys(rows, opts.primaryKey);
  return { config, workbook, ws, headers, records, rows, headerRow: hr };
}

function withPrimaryKey(opts: AdapterOptions, config: ExcelConfig): AdapterOptions {
  return config.primaryKey ? { ...opts, primaryKey: config.primaryKey } : opts;
}

export const exceljsAdapter: CrudAdapter = {
  name: "exceljs",

  async describe(model): Promise<FieldDescriptor[]> {
    const config = configOf(model);
    const o = withPrimaryKey({ primaryKey: config.primaryKey ?? "id" }, config);
    try {
      const { headers, rows } = await readState(model, o);
      return describeHeaders(headers, rows, o.primaryKey);
    } catch {
      return [];
    }
  },

  async list(model, query, opts): Promise<ListResult> {
    const config = configOf(model);
    const o = withPrimaryKey(opts, config);
    const { rows } = await readState(model, o);
    return queryRows(rows, query, o);
  },

  async detail(model, id, opts) {
    const config = configOf(model);
    const o = withPrimaryKey(opts, config);
    const { records } = await readState(model, o);
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
    const lockKey = config.workbook ?? (config as object);
    return withWriteLock(lockKey, async () => {
      const workbook = await loadWorkbook(config);
      const hr = headerRowNumber(config);
      const ws = getWorksheet(workbook, config);
      let headers = ws.rowCount >= hr ? readHeaders(ws, hr) : [o.primaryKey];
      const records = readRecords(ws, headers, hr);
      const rows = records.map((r) => r.data);
      headers = ensurePrimaryKey(headers, o.primaryKey, rows, true);
      const row = buildCreatedRow(headers, rows, body, o);
      assertUniquePrimaryKeys([...rows, row], o.primaryKey);
      ensureHeaders(ws, hr, headers);
      const rowNumber = Math.max(ws.rowCount + 1, hr + 1);
      writeRow(ws, rowNumber, headers, row);
      if (shouldPersist(config)) await persistWorkbook(config, workbook);
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
    const lockKey = config.workbook ?? (config as object);
    return withWriteLock(lockKey, async () => {
      const workbook = await loadWorkbook(config);
      const hr = headerRowNumber(config);
      const ws = getWorksheet(workbook, config);
      let headers = readHeaders(ws, hr);
      const records = readRecords(ws, headers, hr);
      const rows = records.map((r) => r.data);
      headers = ensurePrimaryKey(headers, o.primaryKey, rows, false);
      const rec = findRecordById(records, o.primaryKey, id);
      if (!rec) return null;
      if (opts.softDelete) {
        const deletedAt = opts.deletedAtField ?? "deletedAt";
        if (!headers.includes(deletedAt)) headers.push(deletedAt);
        const next = { ...rec.data, [deletedAt]: new Date().toISOString() };
        ensureHeaders(ws, hr, headers);
        writeRow(ws, rec.row, headers, next);
        if (shouldPersist(config)) await persistWorkbook(config, workbook);
        return opts.returning === false ? undefined : next;
      }
      ws.spliceRows(rec.row, 1);
      if (shouldPersist(config)) await persistWorkbook(config, workbook);
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
  const lockKey = config.workbook ?? (config as object);
  return withWriteLock(lockKey, async () => {
    const workbook = await loadWorkbook(config);
    const hr = headerRowNumber(config);
    const ws = getWorksheet(workbook, config);
    let headers = readHeaders(ws, hr);
    const records = readRecords(ws, headers, hr);
    const rows = records.map((r) => r.data);
    headers = ensurePrimaryKey(headers, o.primaryKey, rows, false);
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
    ensureHeaders(ws, hr, headers);
    writeRow(ws, rec.row, headers, next);
    if (shouldPersist(config)) await persistWorkbook(config, workbook);
    return o.returning === false ? undefined : next;
  });
}
