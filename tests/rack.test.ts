import { beforeEach, describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";
import { panelPage, rack, type Rack } from "../src/rack/index";
import { ReactRack } from "../src/react/types";
import {
  categories,
  createTestDb,
  drizzleModel,
  seedProducts,
  type TestDb,
} from "./helpers";

type App = Elysia<any, any, any, any, any, any, any>;

let db!: TestDb;

beforeEach(async () => {
  db ??= await createTestDb();
  await seedProducts(db);
});

const drizzle = () => drizzleModel(db);

function mount(
  path: string,
  options: Rack.RackOptions,
  decorate?: (app: App) => App,
): App {
  let app = new Elysia() as App;
  if (decorate) app = decorate(app);
  return app.use(rack(path, options)) as App;
}

async function call(
  app: App,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      ...(body !== undefined
        ? {
            body: JSON.stringify(body),
            headers: { "content-type": "application/json", ...headers },
          }
        : { headers }),
    }),
  );
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json: json as any };
}

function detailOf(app: App, method: string, path: string): any {
  const route = (app.routes as any[]).find(
    (r) => r.method === method && r.path === path,
  );
  expect(route).toBeDefined();
  return route.hooks.detail;
}

describe("rack data routes", () => {
  const cases = [
    { method: "QUERY", path: "/items/data", op: "list", status: 200 },
    { method: "POST", path: "/items", op: "create", status: 201 },
    { method: "QUERY", path: "/items/data/1", op: "detail", status: 200 },
    { method: "PUT", path: "/items/1", op: "replace", status: 200 },
    { method: "PATCH", path: "/items/1", op: "update", status: 200 },
    { method: "DELETE", path: "/items/1", op: "delete", status: 200 },
  ] as const;

  for (const c of cases) {
    it(`${c.method} ${c.path} -> ${c.op} (${c.status})`, async () => {
      const app = mount("/items", { model: drizzle() });
      const { status, json } = await call(
        app,
        c.method,
        c.path,
        { name: "Matrix", price: 1 },
        c.method === "POST" ? { "Idempotency-Key": "case-key" } : undefined,
      );
      expect(status).toBe(c.status);
      expect(json.operation).toBe(c.op);
      expect(json.resource).toBe("/items");
      expect(json.adapter).toBe("drizzle");
    });
  }

  it("uses prisma adapter when prisma model given", async () => {
    const delegate = {
      findMany: async () => [{ id: 1, name: "Mock" }],
      count: async () => 1,
    };
    const app = mount("/things", {
      model: { prisma: { client: {}, model: delegate } } as Rack.CrudModel,
    });
    const { status, json } = await call(app, "QUERY", "/things/data");
    expect(status).toBe(200);
    expect(json.adapter).toBe("prisma");
    expect(json.data).toEqual([{ id: 1, name: "Mock" }]);
    expect(json.total).toBe(1);
  });

  it("resource falls back to path without metadata, metadata echoed when set", async () => {
    const bare = mount("/bare", { model: drizzle() });
    expect((await call(bare, "QUERY", "/bare/data")).json.resource).toBe("/bare");
    expect((await call(bare, "QUERY", "/bare/data")).json.metadata).toBeUndefined();

    const meta = mount("/m", {
      model: drizzle(),
      metadata: { id: "products", label: "Product" },
    });
    const { json } = await call(meta, "QUERY", "/m/data");
    expect(json.resource).toBe("products");
    expect(json.metadata).toEqual({ id: "products", label: "Product" });
  });

  it("disables operations individually", async () => {
    const app = mount("/gated", {
      model: drizzle(),
      operations: {
        list: false,
        detail: false,
        create: false,
        replace: false,
        update: false,
        delete: false,
      },
    });
    for (const [method, path] of [
      ["GET", "/gated"],
      ["QUERY", "/gated/data"],
      ["POST", "/gated"],
      ["QUERY", "/gated/data/1"],
      ["PUT", "/gated/1"],
      ["PATCH", "/gated/1"],
      ["DELETE", "/gated/1"],
    ] as const) {
      expect((await call(app, method, path, {})).status).toBe(404);
    }
  });

  it("supports custom primaryKey", async () => {
    const app = mount("/c", {
      model: { drizzle: { db, table: categories } } as Rack.CrudModel,
      settings: { primaryKey: "slug" },
    });
    const { status, json } = await call(app, "QUERY", "/c/data/hello");
    expect(status).toBe(200);
    expect(json.id).toBe("hello");
    expect(json.data).toMatchObject({ slug: "hello", title: "Hello" });
  });
});

describe("rack panel page", () => {
  it("GET / returns a panel page descriptor, not data", async () => {
    const app = mount("/items", {
      model: drizzle(),
      metadata: { id: "products", label: "Product" },
    });
    const { status, json } = await call(app, "GET", "/items");
    expect(status).toBe(200);
    expect(json.path).toBe("/panel");
    expect(json.operation).toBeUndefined();
    expect(json.props.resource).toBe("products");
    expect(json.props.metadata).toEqual({ id: "products", label: "Product" });
    expect(json.props.primaryKey).toBe("id");
    expect(json.props.queryUrl).toBe("/items/data");
    expect(json.props.fields).toHaveLength(5);
    expect(json.props.fields[0]).toMatchObject({
      name: "id",
      kind: "integer",
      primary: true,
      autoIncrement: true,
      nullable: false,
    });
    expect(json.props.fields[1]).toMatchObject({
      name: "name",
      kind: "text",
      autoIncrement: false,
    });
  });

  it("panelPage() uses the same symbol as ReactRack.PAGE", async () => {
    const d = panelPage("/panel", { resource: "x" });
    expect(d[ReactRack.PAGE]).toBe(true);
    expect(d.path).toBe("/panel");
  });

  it("supports custom page.path", async () => {
    const app = mount("/items", {
      model: drizzle(),
      page: { path: "/custom" },
    });
    expect((await call(app, "GET", "/items")).json.path).toBe("/custom");
  });

  it("skips the panel when page.enabled is false", async () => {
    const app = mount("/items", {
      model: drizzle(),
      page: { enabled: false },
    });
    expect((await call(app, "GET", "/items")).status).toBe(404);
    expect((await call(app, "QUERY", "/items/data")).status).toBe(200);
  });

  it("denies the panel via the list authorization rule", async () => {
    const app = mount("/items", {
      model: drizzle(),
      authorization: { list: false },
    });
    const { status, json } = await call(app, "GET", "/items");
    expect(status).toBe(403);
    expect(json.operation).toBe("list");
  });
});

describe("rack authorization", () => {
  it("allows undefined and true rules", async () => {
    const app = mount("/open", {
      model: drizzle(),
      authorization: { list: true, create: true },
    });
    expect((await call(app, "QUERY", "/open/data")).status).toBe(200);
    expect(
      (
        await call(
          app,
          "POST",
          "/open",
          { name: "Open" },
          { "Idempotency-Key": "open-key" },
        )
      ).status,
    ).toBe(201);
  });

  it("denies false rules with 403 envelope", async () => {
    const app = mount("/locked", {
      model: drizzle(),
      authorization: { delete: false },
    });
    const { status, json } = await call(app, "DELETE", "/locked/1");
    expect(status).toBe(403);
    expect(json).toEqual({ error: "Forbidden", operation: "delete" });
  });

  it("awaits sync and async function rules", async () => {
    const app = mount("/fn", {
      model: drizzle(),
      authorization: {
        list: () => true,
        detail: () => false,
        create: async () => true,
        delete: async () => false,
      },
    });
    expect((await call(app, "QUERY", "/fn/data")).status).toBe(200);
    expect((await call(app, "QUERY", "/fn/data/1")).status).toBe(403);
    expect(
      (
        await call(
          app,
          "POST",
          "/fn",
          { name: "Fn" },
          { "Idempotency-Key": "fn-key" },
        )
      ).status,
    ).toBe(201);
    expect((await call(app, "DELETE", "/fn/1")).status).toBe(403);
  });

  it("passes operation, id, resource and request to function rules", async () => {
    let seen: any = null;
    const model = drizzle();
    const app = mount("/ctx", {
      model,
      authorization: {
        delete: async (ctx) => {
          seen = ctx;
          return true;
        },
      },
    });
    expect((await call(app, "DELETE", "/ctx/1")).status).toBe(200);
    expect(seen.operation).toBe("delete");
    expect(seen.id).toBe("1");
    expect(seen.resource).toBe(model);
    expect(seen.request).toBeInstanceOf(Request);
  });

  it("allows string rule when no auth source is wired", async () => {
    const app = mount("/dev", {
      model: drizzle(),
      authorization: { list: "products.view" },
    });
    expect((await call(app, "QUERY", "/dev/data")).status).toBe(200);
  });

  it("enforces string rule against x-permissions header", async () => {
    const app = mount("/perm", {
      model: drizzle(),
      authorization: { list: "products.view" },
    });
    expect(
      (await call(app, "QUERY", "/perm/data", undefined, { "x-permissions": "a, products.view " }))
        .status,
    ).toBe(200);

    const denied = await call(app, "QUERY", "/perm/data", undefined, {
      "x-permissions": "other",
    });
    expect(denied.status).toBe(403);
    expect(denied.json).toEqual({
      error: "Forbidden",
      operation: "list",
      requiredPermission: "products.view",
    });
  });

  it("enforces string rule against decorated permissions", async () => {
    const allow = mount(
      "/d",
      { model: drizzle(), authorization: { list: "products.view" } },
      (app) => app.decorate("permissions", ["products.view"]),
    );
    expect((await call(allow, "QUERY", "/d/data")).status).toBe(200);

    const deny = mount(
      "/d",
      { model: drizzle(), authorization: { list: "products.view" } },
      (app) => app.decorate("permissions", ["other"]),
    );
    const { status, json } = await call(deny, "QUERY", "/d/data");
    expect(status).toBe(403);
    expect(json.requiredPermission).toBe("products.view");
  });

  it("enforces string rule against store permissions", async () => {
    const deny = mount(
      "/s",
      { model: drizzle(), authorization: { list: "products.view" } },
      (app) => app.state("permissions", ["other"]),
    );
    const { status, json } = await call(deny, "QUERY", "/s/data");
    expect(status).toBe(403);
    expect(json.requiredPermission).toBe("products.view");

    const allow = mount(
      "/s",
      { model: drizzle(), authorization: { list: "products.view" } },
      (app) => app.state("permissions", ["products.view"]),
    );
    expect((await call(allow, "QUERY", "/s/data")).status).toBe(200);
  });
});

describe("rack query parsing", () => {
  const query: Rack.CrudQueryOptions = {
    searchable: ["name"],
    filterable: ["status"],
    sortable: ["price"],
    defaultSort: { field: "createdAt", direction: "desc" },
    pagination: { default: 10, max: 50 },
  };

  async function list(qs: string) {
    const app = mount("/q", { model: drizzle(), query });
    return (await call(app, "QUERY", `/q/data${qs}`)).json.query;
  }

  it("clamps limit to max and defaults page/limit", async () => {
    expect(await list("?limit=200")).toMatchObject({ limit: 50, page: 1 });
    expect(await list("")).toMatchObject({ limit: 10, page: 1 });
    expect(await list("?perPage=5")).toMatchObject({ limit: 5 });
    expect(await list("?limit=abc")).toMatchObject({ limit: 1 });
    expect(await list("?page=3")).toMatchObject({ page: 3 });
    expect(await list("?page=xyz")).toMatchObject({ page: 1 });
  });

  it("echoes search with searchable fields", async () => {
    expect(await list("?search=phone")).toEqual(
      expect.objectContaining({
        search: { value: "phone", fields: ["name"] },
      }),
    );
    expect((await list("?search=")).search).toBeUndefined();
    expect((await list("")).search).toBeUndefined();
  });

  it("sorts by whitelist, direction params, and defaultSort fallback", async () => {
    expect((await list("?sort=price")).sort).toEqual({
      field: "price",
      direction: "desc",
    });
    expect((await list("?sort=price&order=asc")).sort).toEqual({
      field: "price",
      direction: "asc",
    });
    expect((await list("?sort=price&direction=desc")).sort).toEqual({
      field: "price",
      direction: "desc",
    });
    expect((await list("?sort=name")).sort).toEqual({
      field: "createdAt",
      direction: "desc",
    });
    expect(await list("")).toEqual(
      expect.objectContaining({
        sort: { field: "createdAt", direction: "desc" },
      }),
    );
  });

  it("allows any sort without whitelist and defaults direction to asc", async () => {
    const app = mount("/q2", { model: drizzle() });
    const { json } = await call(app, "QUERY", "/q2/data?sort=name");
    expect(json.query.sort).toEqual({ field: "name", direction: "asc" });
    const bare = await call(app, "QUERY", "/q2/data");
    expect(bare.json.query.sort).toBeUndefined();
  });

  it("filters by whitelist and skips reserved keys", async () => {
    const q = await list("?status=active&secret=1&search=x&page=1&limit=5");
    expect(q.filters).toEqual({ status: "active" });
  });

  it("passes all filters without whitelist", async () => {
    const app = mount("/q3", { model: drizzle() });
    const { json } = await call(app, "QUERY", "/q3/data?a=1&search=x");
    expect(json.query.filters).toEqual({ a: "1" });
  });
});

describe("rack QUERY method", () => {
  it("merges url query and body, body wins", async () => {
    const app = mount("/qy", { model: drizzle() });
    const { status, json } = await call(app, "QUERY", "/qy/data?limit=5", {
      search: "tab",
      limit: 7,
    });
    expect(status).toBe(200);
    expect(json.via).toBe("QUERY");
    expect(json.query).toMatchObject({
      limit: 7,
      search: expect.objectContaining({ value: "tab" }),
    });
  });

  it("works without body", async () => {
    const app = mount("/qy", { model: drizzle() });
    expect((await call(app, "QUERY", "/qy/data")).status).toBe(200);
  });

  it("enforces validation.query", async () => {
    const app = mount("/qv", {
      model: drizzle(),
      validation: { query: t.Object({ limit: t.Number() }) },
    });
    expect((await call(app, "QUERY", "/qv/data", { limit: 5 })).status).toBe(200);
    expect((await call(app, "QUERY", "/qv/data", { limit: "x" })).status).toBe(422);
  });
});

describe("rack mutations and settings", () => {
  it("echoes returning and softDelete when configured", async () => {
    const app = mount("/s", {
      model: drizzle(),
      settings: { returning: true, softDelete: true },
    });
    expect(
      (
        await call(
          app,
          "POST",
          "/s",
          { name: "S", price: 1 },
          { "Idempotency-Key": "s-key" },
        )
      ).json.returning,
    ).toBe(true);
    expect(
      (await call(app, "PUT", "/s/1", { name: "S", price: 2 })).json.returning,
    ).toBe(true);
    expect((await call(app, "PATCH", "/s/1", { price: 3 })).json.returning).toBe(
      true,
    );
    expect((await call(app, "DELETE", "/s/1")).json.softDelete).toBe(true);
  });

  it("omits returning and softDelete when not configured", async () => {
    const app = mount("/ns", { model: drizzle() });
    const created = (
      await call(
        app,
        "POST",
        "/ns",
        { name: "NoRet" },
        { "Idempotency-Key": "ns-key" },
      )
    ).json;
    expect("returning" in created).toBe(false);
    expect("softDelete" in (await call(app, "DELETE", "/ns/1")).json).toBe(
      false,
    );
  });

  it("returns updated rows on replace/update", async () => {
    const app = mount("/m", { model: drizzle() });
    const put = (
      await call(app, "PUT", "/m/1", { name: "Renamed", price: 1 })
    ).json;
    expect(put).toMatchObject({ id: "1", data: { name: "Renamed", price: 1 } });
    const patch = (await call(app, "PATCH", "/m/1", { price: 111 })).json;
    expect(patch).toMatchObject({
      id: "1",
      data: { name: "Renamed", price: 111 },
    });
  });

  it("returns 404 for missing rows", async () => {
    const app = mount("/nf", { model: drizzle() });
    expect((await call(app, "QUERY", "/nf/data/999")).status).toBe(404);
    expect((await call(app, "PUT", "/nf/999", { name: "X" })).status).toBe(404);
    expect((await call(app, "PATCH", "/nf/999", { price: 1 })).status).toBe(
      404,
    );
    expect((await call(app, "DELETE", "/nf/999")).status).toBe(404);
  });

  it("lists rows with total and details a single row", async () => {
    const app = mount("/rows", { model: drizzle() });
    const list = (await call(app, "QUERY", "/rows/data")).json;
    expect(list.total).toBe(3);
    expect(list.data).toHaveLength(3);
    const detail = (await call(app, "QUERY", "/rows/data/1")).json;
    expect(detail.data).toMatchObject({ id: 1, name: "Phone" });
  });

  it("omits data when returning is disabled", async () => {
    const app = mount("/nr", {
      model: drizzle(),
      settings: { returning: false },
    });
    const created = (
      await call(
        app,
        "POST",
        "/nr",
        { name: "NoData" },
        { "Idempotency-Key": "nr-key" },
      )
    ).json;
    expect("data" in created).toBe(false);
  });

  it("soft-deletes and hides rows when enabled", async () => {
    const app = mount("/sd", {
      model: drizzle(),
      settings: { softDelete: true },
    });
    const deleted = (await call(app, "DELETE", "/sd/1")).json;
    expect(deleted.softDelete).toBe(true);
    expect(deleted.data.deletedAt).toBeDefined();
    expect((await call(app, "QUERY", "/sd/data")).json.total).toBe(2);
    expect((await call(app, "QUERY", "/sd/data/1")).status).toBe(404);
  });

  it("enforces validation schemas with 422", async () => {
    const schema = t.Object({ name: t.String({ minLength: 3 }) });
    const app = mount("/v", {
      model: drizzle(),
      validation: {
        create: schema,
        replace: schema,
        update: schema,
        params: t.Object({ id: t.String({ minLength: 5 }) }),
      },
    });
    expect(
      (
        await call(
          app,
          "POST",
          "/v",
          { name: "ok-name" },
          { "Idempotency-Key": "v-valid" },
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await call(
          app,
          "POST",
          "/v",
          { name: "x" },
          { "Idempotency-Key": "v-invalid" },
        )
      ).status,
    ).toBe(422);
    expect((await call(app, "PUT", "/v/abcde", { name: "x" })).status).toBe(
      422,
    );
    expect((await call(app, "PATCH", "/v/abcde", { name: "x" })).status).toBe(
      422,
    );
    expect((await call(app, "QUERY", "/v/data/abc")).status).toBe(422);
    expect((await call(app, "QUERY", "/v/data/12345")).status).toBe(404);
  });
});

describe("rack openapi detail", () => {
  it("uses openapi.tags for all operations", async () => {
    const app = mount("/o", {
      model: drizzle(),
      openapi: { tags: ["Catalog"] },
    });
    expect(detailOf(app, "GET", "/o/").tags).toEqual(["Catalog"]);
  });

  it("falls back to metadata label, then id, then nothing", async () => {
    const byLabel = mount("/l", {
      model: drizzle(),
      metadata: { label: "Product" },
    });
    expect(detailOf(byLabel, "GET", "/l/").tags).toEqual(["Product"]);

    const byId = mount("/i", { model: drizzle(), metadata: { id: "items" } });
    expect(detailOf(byId, "GET", "/i/").tags).toEqual(["items"]);

    const none = mount("/n", { model: drizzle() });
    expect(detailOf(none, "GET", "/n/")).toEqual({});
  });

  it("merges resource description with per-operation overrides", async () => {
    const app = mount("/d", {
      model: drizzle(),
      openapi: {
        description: "Resource desc",
        operations: {
          list: {
            summary: "List them",
            operationId: "listThings",
            deprecated: true,
            tags: ["Custom"],
          },
          detail: { description: "Detail desc" },
        },
      },
    });
    expect(detailOf(app, "GET", "/d/")).toEqual({
      tags: ["Custom"],
      description: "Resource desc",
      summary: "List them",
      operationId: "listThings",
      deprecated: true,
    });
    expect(detailOf(app, "QUERY", "/d/data").summary).toBe("List them");
    expect(detailOf(app, "QUERY", "/d/data/:id").description).toBe("Detail desc");
  });
});
