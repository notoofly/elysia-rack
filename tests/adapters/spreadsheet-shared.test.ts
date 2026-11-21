import { describe, expect, it } from "bun:test";
import {
  assertUniquePrimaryKeys,
  buildCreatedRow,
  describeHeaders,
  nextPrimaryKey,
  queryRows,
} from "../../src/rack/adapters/spreadsheet.ts";

describe("spreadsheet shared helpers", () => {
  it("describes headers and infers kinds", () => {
    const fields = describeHeaders(["id", "name", "active", "count"], [
      { id: 1, name: "A", active: true, count: 2 },
    ], "id");
    expect(fields).toEqual([
      { name: "id", kind: "integer", primary: true, autoIncrement: false, nullable: false },
      { name: "name", kind: "text", primary: false, autoIncrement: false, nullable: true },
      { name: "active", kind: "boolean", primary: false, autoIncrement: false, nullable: true },
      { name: "count", kind: "integer", primary: false, autoIncrement: false, nullable: true },
    ]);
  });

  it("prefers TypeBox schema when provided", async () => {
    const { t } = await import("elysia");
    const schema = t.Object({ id: t.Integer(), status: t.Union([t.Literal("active"), t.Literal("archived")]) });
    const fields = describeHeaders(["id", "status"], [{ id: 1, status: "active" }], "id", schema);
    expect(fields.find((f) => f.name === "status")).toMatchObject({ kind: "enum", enumValues: ["active", "archived"] });
  });

  it("filters, searches, sorts and paginates", () => {
    const rows = [
      { id: 1, name: "Phone", status: "active", price: 500 },
      { id: 2, name: "Tablet", status: "active", price: 300 },
      { id: 3, name: "Obsolete", status: "archived", price: 100 },
    ];
    const res = queryRows(
      rows,
      {
        search: { value: "tab", fields: ["name"] },
        filters: { status: "active" },
        sort: { field: "price", direction: "desc" },
        page: 1,
        limit: 10,
      },
      { primaryKey: "id" },
    );
    expect(res.total).toBe(1);
    expect(res.data[0]?.name).toBe("Tablet");
  });

  it("generates next numeric primary key and detects duplicates", () => {
    expect(nextPrimaryKey([{ id: 1 }, { id: 3 }], "id")).toBe(4);
    expect(() => assertUniquePrimaryKeys([{ id: 1 }, { id: 1 }], "id")).toThrow(
      /Duplicate primary key/,
    );
  });

  it("builds created row and fills missing pk", () => {
    const headers = ["id", "name"];
    const row = buildCreatedRow(headers, [{ id: 1, name: "A" }], { name: "B" }, { primaryKey: "id" });
    expect(row).toMatchObject({ id: 2, name: "B" });
  });
});
