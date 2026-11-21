import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { exceljsAdapter } from "../../src/rack/adapters/exceljs.ts";
import type { Rack } from "../../src/rack/index.ts";

let dir = "";
let file = "";

const baseQuery = () => ({
  search: undefined,
  filters: {},
  sort: undefined,
  page: 1,
  limit: 20,
});

async function makeWorkbook(path: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Products");
  ws.addRow(["id", "name", "price", "active", "createdAt", "meta"]);
  ws.addRow([1, "Phone", 500, true, new Date("2026-01-01T00:00:00.000Z"), { sku: "p1" }]);
  ws.addRow([2, "Tablet", 300, false, new Date("2026-01-02T00:00:00.000Z"), { sku: "p2" }]);
  ws.addRow([3, "Obsolete", 100, true, new Date("2026-01-03T00:00:00.000Z"), { sku: "p3" }]);
  await wb.xlsx.writeFile(path);
}

function model(overrides: Record<string, unknown> = {}): Rack.CrudModel {
  return {
    exceljs: {
      file,
      worksheet: "Products",
      primaryKey: "id",
      ...overrides,
    },
  } as Rack.CrudModel;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "rack-excel-"));
  file = join(dir, "products.xlsx");
  await makeWorkbook(file);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("exceljsAdapter", () => {
  it("describes headers and infers types", async () => {
    const fields = await exceljsAdapter.describe(model());
    expect(fields.find((f) => f.name === "id")).toMatchObject({ kind: "integer", primary: true });
    expect(fields.find((f) => f.name === "active")).toMatchObject({ kind: "boolean" });
  });

  it("lists, filters, searches, sorts and paginates", async () => {
    const listed = await exceljsAdapter.list(model(), baseQuery(), { primaryKey: "id" });
    expect(listed.total).toBe(3);

    const filtered = await exceljsAdapter.list(
      model(),
      { ...baseQuery(), filters: { active: true } },
      { primaryKey: "id" },
    );
    expect(filtered.total).toBe(2);

    const searched = await exceljsAdapter.list(
      model(),
      { ...baseQuery(), search: { value: "tab", fields: ["name"] } },
      { primaryKey: "id" },
    );
    expect(searched.total).toBe(1);

    const sorted = await exceljsAdapter.list(
      model(),
      { ...baseQuery(), sort: { field: "price", direction: "asc" } },
      { primaryKey: "id" },
    );
    expect((sorted.data[0] as any).name).toBe("Obsolete");

    const page = await exceljsAdapter.list(
      model(),
      { ...baseQuery(), page: 2, limit: 2 },
      { primaryKey: "id" },
    );
    expect(page.data).toHaveLength(1);
  });

  it("details by primary key and returns null for missing", async () => {
    expect(await exceljsAdapter.detail(model(), "2", { primaryKey: "id" })).toMatchObject({ name: "Tablet" });
    expect(await exceljsAdapter.detail(model(), "999", { primaryKey: "id" })).toBeNull();
  });

  it("creates, updates, replaces and deletes rows with persistence", async () => {
    const created = (await exceljsAdapter.create(
      model(),
      { name: "New", price: 10, active: true },
      { primaryKey: "id" },
    )) as any;
    expect(created.id).toBe(4);

    const updated = (await exceljsAdapter.update(
      model(),
      "4",
      { price: 11 },
      { primaryKey: "id" },
    )) as any;
    expect(updated).toMatchObject({ id: 4, name: "New", price: 11 });

    const replaced = (await exceljsAdapter.replace(
      model(),
      "4",
      { name: "Replaced", price: 12, active: false },
      { primaryKey: "id" },
    )) as any;
    expect(replaced.name).toBe("Replaced");

    const removed = (await exceljsAdapter.remove(model(), "4", { primaryKey: "id" })) as any;
    expect(removed.id).toBe(4);
    expect(await exceljsAdapter.detail(model(), "4", { primaryKey: "id" })).toBeNull();

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.getWorksheet("Products")!;
    expect(ws.rowCount).toBe(4); // header + 3 rows
  });

  it("supports soft delete and restore semantics", async () => {
    const opts = { primaryKey: "id", softDelete: true, deletedAtField: "deletedAt" };
    await exceljsAdapter.remove(model(), "1", opts);
    expect(await exceljsAdapter.detail(model(), "1", opts)).toBeNull();
    const restored = await exceljsAdapter.update(model(), "1", { deletedAt: null }, opts);
    expect(restored).toMatchObject({ id: 1, name: "Phone" });
  });

  it("handles in-memory workbook and missing worksheet creation", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");
    ws.addRow(["id", "name"]);
    ws.addRow([1, "A"]);
    const memModel = { exceljs: { workbook: wb, worksheet: "Products", primaryKey: "id" } } as Rack.CrudModel;
    const row = await exceljsAdapter.create(memModel, { name: "B" }, { primaryKey: "id" });
    expect(row).toMatchObject({ id: 2, name: "B" });

    const createdWsModel = {
      exceljs: { workbook: new ExcelJS.Workbook(), worksheet: "NewSheet", primaryKey: "id", createWorksheet: true },
    } as Rack.CrudModel;
    const created = await exceljsAdapter.create(createdWsModel, { name: "X" }, { primaryKey: "id" });
    expect(created).toMatchObject({ id: 1, name: "X" });
  });

  it("reports missing worksheet/file and duplicate keys", async () => {
    await expect(
      exceljsAdapter.list({ exceljs: { file, worksheet: "Nope", primaryKey: "id" } } as Rack.CrudModel, baseQuery(), { primaryKey: "id" }),
    ).rejects.toMatchObject({ code: "MISSING_WORKSHEET" });

    await expect(
      exceljsAdapter.list({ exceljs: { file: join(dir, "missing.xlsx"), worksheet: "Products", primaryKey: "id" } } as Rack.CrudModel, baseQuery(), { primaryKey: "id" }),
    ).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });

    const badFile = join(dir, "bad.xlsx");
    await writeFile(badFile, "not-xlsx");
    await expect(
      exceljsAdapter.list({ exceljs: { file: badFile, worksheet: "Products", primaryKey: "id" } } as Rack.CrudModel, baseQuery(), { primaryKey: "id" }),
    ).rejects.toMatchObject({ code: "INVALID_FILE" });

    const dupFile = join(dir, "dup.xlsx");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");
    ws.addRow(["id", "name"]);
    ws.addRow([1, "A"]);
    ws.addRow([1, "B"]);
    await wb.xlsx.writeFile(dupFile);
    await expect(
      exceljsAdapter.list({ exceljs: { file: dupFile, worksheet: "Products", primaryKey: "id" } } as Rack.CrudModel, baseQuery(), { primaryKey: "id" }),
    ).rejects.toMatchObject({ code: "DUPLICATE_PRIMARY_KEY" });
  });

  it("serializes concurrent writes", async () => {
    const m = model();
    await Promise.all([
      exceljsAdapter.create(m, { name: "C1", price: 1 }, { primaryKey: "id" }),
      exceljsAdapter.create(m, { name: "C2", price: 2 }, { primaryKey: "id" }),
    ]);
    const listed = await exceljsAdapter.list(m, baseQuery(), { primaryKey: "id" });
    expect(listed.total).toBe(5);
  });
});
