import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import {
  buildRackTree,
  clearRacks,
  flatRackTree,
  getRack,
  listRacks,
  rack,
  type Rack,
} from "../src/rack/index.ts";
import { dashboard } from "../src/rack/dashboard.ts";

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

  describe("getRack", () => {
    it("returns undefined when not found", () => {
      clearRacks();
      expect(getRack("nonexistent")).toBeUndefined();
    });

    it("returns registration by metadata.id", () => {
      clearRacks();
      mount("/products", { model, metadata: { id: "products" } });
      const found = getRack("products");
      expect(found).toBeDefined();
      expect(found?.path).toBe("/products");
    });
  });

  describe("buildRackTree", () => {
    it("sorts by order then label", () => {
      clearRacks();
      mount("/zebra", { model, metadata: { id: "z", label: "Zebra", order: 2 } });
      mount("/apple", { model, metadata: { id: "a", label: "Apple", order: 1 } });
      mount("/mango", { model, metadata: { id: "m", label: "Mango", order: 1 } });
      const tree = buildRackTree(listRacks());
      expect(tree.map((n) => n.metadata.id)).toEqual(["a", "m", "z"]);
    });

    it("nests children under parent", () => {
      clearRacks();
      mount("/cat", { model, metadata: { id: "cat" } });
      mount("/sub", { model, metadata: { id: "sub", parent: "cat" } });
      const tree = buildRackTree(listRacks());
      expect(tree).toHaveLength(1);
      expect(tree[0]!.metadata.id).toBe("cat");
      expect(tree[0]!.children).toHaveLength(1);
      expect(tree[0]!.children![0]!.metadata.id).toBe("sub");
    });
  });

  describe("flatRackTree", () => {
    it("flattens nested tree depth-first", () => {
      clearRacks();
      mount("/root", { model, metadata: { id: "root" } });
      mount("/child", { model, metadata: { id: "child", parent: "root" } });
      const flat = flatRackTree();
      expect(flat.map((r) => r.metadata.id)).toEqual(["root", "child"]);
    });
  });

  describe("dashboard", () => {
    it("creates Elysia app with default options", () => {
      clearRacks();
      const app = dashboard({ title: "Test", donate: true });
      expect(app).toBeDefined();
    });

    it("creates Elysia app with no options", () => {
      clearRacks();
      const app = dashboard();
      expect(app).toBeDefined();
    });

    it("handles GET request and returns page descriptor", async () => {
      clearRacks();
      const app = dashboard({ path: "/dash" });
      const res = await app.handle(new Request("http://localhost/dash"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { path: string; props: unknown };
      expect(body.path).toBe("/dashboard");
      expect(body.props).toBeDefined();
    });

    it("passes query resource to props", async () => {
      clearRacks();
      const app = dashboard();
      const res = await app.handle(
        new Request("http://localhost/?resource=products"),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { props: { resource: string } };
      expect(body.props.resource).toBe("products");
    });
  });
});
