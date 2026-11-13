import { describe, expect, it } from "bun:test";
import type { FieldDescriptor } from "../src/rack/adapters/index";
import { parseListQuery } from "../src/rack/query";
import {
  buildPanelFields,
  coerceFieldValue,
  displayValue,
} from "../src/react/page/components/panelFields";

const descriptors: FieldDescriptor[] = [
  { name: "id", kind: "integer", primary: true, autoIncrement: true, nullable: false },
  { name: "name", kind: "text", primary: false, autoIncrement: false, nullable: false },
  { name: "price", kind: "number", primary: false, autoIncrement: false, nullable: true },
  { name: "status", kind: "enum", primary: false, autoIncrement: false, nullable: true, enumValues: ["active", "archived"] },
  { name: "categoryId", kind: "integer", primary: false, autoIncrement: false, nullable: true },
  { name: "deletedAt", kind: "date", primary: false, autoIncrement: false, nullable: true },
];

type BuildInput = Parameters<typeof buildPanelFields>[0];

function build(overrides: Partial<BuildInput> = {}) {
  return buildPanelFields({
    fields: descriptors,
    columns: [],
    primaryKey: "id",
    deletedAtField: "deletedAt",
    ...overrides,
  });
}

describe("buildPanelFields", () => {
  it("applies labels, formats, order, and visibility", async () => {
    const fields = await build({
      config: {
        name: { label: "Product", order: 2 },
        price: { format: "currency", currency: "EUR", hideInTable: true },
        categoryId: {
          label: "Category",
          order: 1,
          relation: { options: [{ value: 1, label: "Shoes" }] },
        },
      },
    });
    const byName = new Map(fields.map((f) => [f.name, f]));
    expect(byName.get("name")?.label).toBe("Product");
    expect(byName.get("price")?.format).toBe("currency");
    expect(byName.get("price")?.currency).toBe("EUR");
    expect(byName.get("price")?.hideInTable).toBe(true);
    expect(byName.get("categoryId")?.relation).toEqual([
      { value: 1, label: "Shoes" },
    ]);
    expect(fields.map((f) => f.name)).toEqual(["id", "categoryId", "name", "price", "status"]);
    expect(byName.has("deletedAt")).toBe(false);
  });

  it("resolves relation options from an async loader", async () => {
    const fields = await build({
      config: {
        categoryId: {
          relation: { load: async () => [{ value: 2, label: "Hats" }] },
        },
      },
    });
    expect(fields.find((f) => f.name === "categoryId")?.relation).toEqual([
      { value: 2, label: "Hats" },
    ]);
  });

  it("treats hiddenFields as hidden in table and form", async () => {
    const fields = await build({ hiddenFields: ["name"] });
    const name = fields.find((f) => f.name === "name");
    expect(name?.hideInTable).toBe(true);
    expect(name?.hideInForm).toBe(true);
  });

  it("readOnly hides a field from forms but keeps it in the table", async () => {
    const fields = await build({ config: { name: { readOnly: true } } });
    const name = fields.find((f) => f.name === "name");
    expect(name?.hideInForm).toBe(true);
    expect(name?.hideInTable).toBe(false);
  });
});

describe("displayValue", () => {
  it("formats numbers, currency, booleans, and relation labels", async () => {
    const fields = await build({
      config: {
        price: { format: "currency", currency: "USD" },
        categoryId: { relation: { options: [{ value: 3, label: "Shoes" }] } },
      },
    });
    const byName = new Map(fields.map((f) => [f.name, f]));
    expect(displayValue(byName.get("price"), 1234.5)).toBe("$1,234.50");
    expect(displayValue(byName.get("categoryId"), 3)).toBe("Shoes");
    expect(displayValue(byName.get("status"), "active")).toBe("active");
    expect(displayValue(byName.get("name"), null)).toBe("");
  });
});

describe("coerceFieldValue", () => {
  it("coerces numbers, booleans, and JSON with validation", async () => {
    const fields = await build();
    const byName = new Map(fields.map((f) => [f.name, f]));
    expect(coerceFieldValue(byName.get("price"), "12.5")).toEqual({ value: 12.5 });
    expect(coerceFieldValue(byName.get("price"), "abc").error).toBeDefined();
    expect(coerceFieldValue(byName.get("categoryId"), "7")).toEqual({ value: 7 });
    expect(coerceFieldValue(byName.get("name"), "shirt")).toEqual({ value: "shirt" });
  });
});

describe("parseListQuery includeDeleted", () => {
  it("extracts includeDeleted and keeps it out of filters", () => {
    const query = parseListQuery({ includeDeleted: "true", status: "active" });
    expect(query.includeDeleted).toBe(true);
    expect(query.filters).toEqual({ status: "active" });
  });

  it("omits includeDeleted by default", () => {
    expect(parseListQuery({}).includeDeleted).toBeUndefined();
  });
});
