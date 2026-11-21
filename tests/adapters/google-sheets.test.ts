import { describe, expect, it } from "bun:test";
import { googleSheetsAdapter } from "../../src/rack/adapters/google-sheets.ts";
import type { Rack } from "../../src/rack/index.ts";

type Values = unknown[][];

function makeApi(state: {
  sheetId: number;
  title: string;
  headers: string[];
  rows: Values;
  calls: Array<{ method: string; args: unknown }>;
}) {
  return {
    spreadsheets: {
      get: async (args: unknown) => {
        state.calls.push({ method: "get", args });
        return {
          data: {
            spreadsheetId: "sheet-1",
            sheets: [{ properties: { sheetId: state.sheetId, title: state.title, gridProperties: { rowCount: 100, columnCount: 26 } } }],
          },
        };
      },
      batchUpdate: async (args: unknown) => {
        state.calls.push({ method: "batchUpdate", args });
        const req = (args as any).requestBody.requests[0].deleteDimension.range;
        const idx = req.startIndex - 1; // data index, header row offset handled by adapter
        state.rows.splice(idx, 1);
        return {};
      },
      values: {
        get: async (args: unknown) => {
          state.calls.push({ method: "values.get", args });
          const range = String((args as any).range);
          if (range.includes("!A1:")) return { data: { values: [state.headers] } };
          return { data: { values: state.rows } };
        },
        batchGet: async (args: unknown) => {
          state.calls.push({ method: "values.batchGet", args });
          return { data: { valueRanges: [{ values: state.rows }] } };
        },
        update: async (args: unknown) => {
          state.calls.push({ method: "values.update", args });
          const a = args as any;
          const range = String(a.range);
          const values = a.requestBody.values as Values;
          if (range.includes("!A1:")) {
            state.headers = values[0]!.map(String);
            return {};
          }
          const match = range.match(/!([A-Z]+)(\d+):/);
          const rowNum = Number(match?.[2] ?? 0);
          const idx = rowNum - 2;
          if (idx >= 0 && idx < state.rows.length) state.rows[idx] = values[0]!;
          return {};
        },
        batchUpdate: async (args: unknown) => {
          state.calls.push({ method: "values.batchUpdate", args });
          return {};
        },
        append: async (args: unknown) => {
          state.calls.push({ method: "values.append", args });
          const values = (args as any).requestBody.values as Values;
          state.rows.push(values[0]!);
          return {};
        },
      },
    },
  };
}

const baseQuery = () => ({ search: undefined, filters: {}, sort: undefined, page: 1, limit: 20 });

describe("googleSheetsAdapter", () => {
  it("performs CRUD via Google Sheets API", async () => {
    const state = {
      sheetId: 7,
      title: "Products",
      headers: ["id", "name", "price", "active"],
      rows: [
        [1, "Phone", 500, true],
        [2, "Tablet", 300, false],
      ],
      calls: [] as Array<{ method: string; args: unknown }>,
    };
    const api = makeApi(state);
    const m = { googleSheets: { auth: {}, spreadsheetId: "sheet-1", worksheet: "Products", primaryKey: "id", sheetsApi: api } } as unknown as Rack.CrudModel;

    const listed = await googleSheetsAdapter.list(m, baseQuery(), { primaryKey: "id" });
    expect(listed.total).toBe(2);

    const detail = await googleSheetsAdapter.detail(m, "1", { primaryKey: "id" });
    expect(detail).toMatchObject({ name: "Phone" });

    const created = await googleSheetsAdapter.create(m, { name: "New", price: 1, active: true }, { primaryKey: "id" }) as any;
    expect(created.id).toBe(3);
    expect(state.rows).toHaveLength(3);

    const updated = await googleSheetsAdapter.update(m, "3", { price: 9 }, { primaryKey: "id" }) as any;
    expect(updated.price).toBe(9);

    const replaced = await googleSheetsAdapter.replace(m, "3", { name: "Rep", price: 10, active: false }, { primaryKey: "id" }) as any;
    expect(replaced.name).toBe("Rep");

    const removed = await googleSheetsAdapter.remove(m, "3", { primaryKey: "id" }) as any;
    expect(removed.id).toBe(3);
    expect(state.rows).toHaveLength(2);

    expect(state.calls.some((c) => c.method === "values.append")).toBe(true);
    expect(state.calls.some((c) => c.method === "batchUpdate")).toBe(true);
  });

  it("handles missing worksheet and API errors", async () => {
    const api = {
      spreadsheets: {
        get: async () => ({ data: { spreadsheetId: "s", sheets: [] } }),
        batchUpdate: async () => ({}),
        values: { get: async () => ({ data: { values: [] } }), batchGet: async () => ({ data: { valueRanges: [] } }), update: async () => ({}), batchUpdate: async () => ({}), append: async () => ({}) },
      },
    };
    const m = { googleSheets: { auth: {}, spreadsheetId: "sheet-1", worksheet: "Products", primaryKey: "id", sheetsApi: api } } as unknown as Rack.CrudModel;
    await expect(googleSheetsAdapter.list(m, baseQuery(), { primaryKey: "id" })).rejects.toMatchObject({ code: "MISSING_WORKSHEET" });
  });
});
