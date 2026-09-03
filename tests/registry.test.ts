import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import {
  clearRacks,
  listRacks,
  rack,
  type Rack,
} from "../src/rack/index";

const model = { drizzle: { db: {}, table: {} } } as Rack.CrudModel;

function mount(path: string, options: Rack.RackOptions) {
  return new Elysia().use(rack(path, options));
}

describe("rack registry", () => {
  it("starts empty after clear", () => {
    clearRacks();
    expect(listRacks()).toEqual([]);
  });

  it("registers metadata with path fallback id", () => {
    clearRacks();
    mount("/catalog/products", {
      model,
      metadata: { label: "Product", group: "Catalog", order: 2 },
    });
    mount("/orders", { model });
    expect(listRacks()).toEqual([
      {
        path: "/catalog/products",
        metadata: {
          label: "Product",
          group: "Catalog",
          order: 2,
          id: "/catalog/products",
        },
        operations: {
          list: true,
          detail: true,
          create: true,
          replace: true,
          update: true,
          delete: true,
        },
      },
      {
        path: "/orders",
        metadata: { id: "/orders" },
        operations: {
          list: true,
          detail: true,
          create: true,
          replace: true,
          update: true,
          delete: true,
        },
      },
    ]);
  });

  it("merges partial operations with defaults", () => {
    clearRacks();
    mount("/audit", { model, operations: { create: false } });
    expect(listRacks()[0]?.operations).toMatchObject({
      list: true,
      create: false,
      delete: true,
    });
  });

  it("replaces re-registered paths", () => {
    clearRacks();
    mount("/dup", { model, metadata: { label: "Old" } });
    mount("/dup", { model, metadata: { label: "New" } });
    const all = listRacks();
    expect(all).toHaveLength(1);
    expect(all[0]?.metadata.label).toBe("New");
  });
});
