import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { Elysia } from "elysia";
import { rack } from "../../src/rack/index.ts";

let dir = "";
let file = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "rack-int-"));
  file = join(dir, "products.xlsx");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Products");
  ws.addRow(["id", "name", "price"]);
  ws.addRow([1, "Phone", 500]);
  ws.addRow([2, "Tablet", 300]);
  await wb.xlsx.writeFile(file);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function call(app: any, method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      ...(body !== undefined
        ? { body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }
        : { headers }),
    }),
  );
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

describe("rack() with exceljs provider", () => {
  it("exposes CRUD and list query through rack", async () => {
    const app = new Elysia().use(
      rack("/products", {
        model: { exceljs: { file, worksheet: "Products", primaryKey: "id" } },
        metadata: { id: "products", label: "Product" },
      }),
    );

    const list = await call(app, "QUERY", "/products/data");
    expect(list.status).toBe(200);
    expect(list.json.total).toBe(2);
    expect(list.json.adapter).toBe("exceljs");

    const created = await call(app, "POST", "/products", { name: "New", price: 1 }, { "Idempotency-Key": "k1" });
    expect(created.status).toBe(201);
    expect(created.json.data.name).toBe("New");

    const updated = await call(app, "PATCH", "/products/3", { price: 2 });
    expect(updated.status).toBe(200);
    expect(updated.json.data.price).toBe(2);

    const deleted = await call(app, "DELETE", "/products/3");
    expect(deleted.status).toBe(200);
  });
});
