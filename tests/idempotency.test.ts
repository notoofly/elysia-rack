import { beforeEach, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import {
  createMemoryIdempotencyStore,
  rack,
  type Rack,
} from "../src/rack/index";
import {
  countProducts,
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

function mount(path: string, options: Rack.RackOptions): App {
  return new Elysia().use(rack(path, options)) as App;
}

const model = () => drizzleModel(db);

async function call(
  app: App,
  path: string,
  body?: unknown,
  key?: string,
  header = "Idempotency-Key",
) {
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      ...(body !== undefined
        ? {
            body: JSON.stringify(body),
            headers: {
              "content-type": "application/json",
              ...(key !== undefined ? { [header]: key } : {}),
            },
          }
        : {
            ...(key !== undefined ? { headers: { [header]: key } } : {}),
          }),
    }),
  );
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json: json as any, headers: res.headers };
}

describe("POST idempotency key", () => {
  it("rejects POST without key by default", async () => {
    const app = mount("/items", { model: model() });
    const { status, json } = await call(app, "/items", { name: "X" });
    expect(status).toBe(400);
    expect(json).toEqual({
      error: "Idempotency-Key header is required",
      operation: "create",
    });
  });

  it("executes once and replays the stored response", async () => {
    const app = mount("/items", { model: model() });
    const first = await call(app, "/items", { name: "One" }, "k-1");
    expect(first.status).toBe(201);
    expect(first.headers.get("idempotent-replayed")).toBeNull();

    const replay = await call(app, "/items", { name: "Two" }, "k-1");
    expect(replay.status).toBe(201);
    expect(replay.json).toEqual(first.json);
    expect(replay.json.data.name).toBe("One");
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(await countProducts(db)).toBe(4);
  });

  it("treats different keys independently", async () => {
    const app = mount("/items", { model: model() });
    const a = await call(app, "/items", { name: "A" }, "k-a");
    const b = await call(app, "/items", { name: "B" }, "k-b");
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(b.json.data.name).toBe("B");
    expect(await countProducts(db)).toBe(5);
  });

  it("scopes keys per resource", async () => {
    const one = new Elysia().use(rack("/one", { model: model() })) as App;
    const two = new Elysia().use(rack("/two", { model: model() })) as App;
    expect((await call(one, "/one", { name: "A" }, "same")).status).toBe(201);
    const other = await call(two, "/two", { name: "B" }, "same");
    expect(other.status).toBe(201);
    expect(other.json.data.name).toBe("B");
  });

  it("runs auth before idempotency", async () => {
    const app = mount("/locked", {
      model: model(),
      authorization: { create: false },
    });
    expect((await call(app, "/locked", { name: "X" }, "k-auth")).status).toBe(
      403,
    );
  });

  it("allows keyless POST when required is false", async () => {
    const app = mount("/opt", {
      model: model(),
      idempotency: { required: false },
    });
    expect((await call(app, "/opt", { name: "X" })).status).toBe(201);
  });

  it("skips the store when disabled", async () => {
    let calls = 0;
    const store: Rack.CrudIdempotencyStore = {
      get() {
        calls++;
        return undefined;
      },
      set() {
        calls++;
      },
    };
    const app = mount("/off", {
      model: model(),
      idempotency: { enabled: false, store },
    });
    expect((await call(app, "/off", { name: "X" })).status).toBe(201);
    expect(calls).toBe(0);
  });

  it("supports a custom header name", async () => {
    const app = mount("/custom", {
      model: model(),
      idempotency: { header: "X-Idempotency-Key" },
    });
    const missing = await call(app, "/custom", { name: "X" }, undefined);
    expect(missing.status).toBe(400);
    expect(missing.json.error).toContain("X-Idempotency-Key");

    const first = await call(app, "/custom", { name: "A" }, "ck", "X-Idempotency-Key");
    const replay = await call(app, "/custom", { name: "B" }, "ck", "X-Idempotency-Key");
    expect(first.status).toBe(201);
    expect(replay.json.data.name).toBe("A");
  });

  it("uses the custom store with scoped keys and ttl", async () => {
    const seen: { op: string; key?: string; ttl?: number }[] = [];
    const data = new Map<string, Rack.CrudIdempotencyRecord>();
    const store: Rack.CrudIdempotencyStore = {
      get(key) {
        seen.push({ op: "get", key });
        return data.get(key);
      },
      set(key, record, ttlSeconds) {
        seen.push({ op: "set", key, ttl: ttlSeconds });
        data.set(key, record);
      },
    };
    const app = mount("/cs", {
      model: model(),
      idempotency: { store, ttl: 60 },
    });
    await call(app, "/cs", { name: "A" }, "k-custom");
    await call(app, "/cs", { name: "B" }, "k-custom");
    expect(seen).toEqual([
      { op: "get", key: "/cs::k-custom" },
      { op: "set", key: "/cs::k-custom", ttl: 60 },
      { op: "get", key: "/cs::k-custom" },
    ]);
  });

  it("deduplicates concurrent requests with the same key", async () => {
    const app = mount("/race", { model: model() });
    const [a, b] = await Promise.all([
      call(app, "/race", { name: "A" }, "k-race"),
      call(app, "/race", { name: "B" }, "k-race"),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.json.data).toEqual(b.json.data);
  });
});

describe("createMemoryIdempotencyStore", () => {
  it("returns undefined on miss and round-trips records", async () => {
    const store = createMemoryIdempotencyStore();
    expect(await store.get("nope")).toBeUndefined();
    await store.set("k", { status: 201, body: { a: 1 } });
    expect(await store.get("k")).toEqual({ status: 201, body: { a: 1 } });
  });

  it("expires entries past ttl", async () => {
    const store = createMemoryIdempotencyStore();
    await store.set("k", { status: 201, body: null }, 0);
    expect(await store.get("k")).toBeUndefined();
  });

  it("evicts oldest entries when full and overwrites in place", async () => {
    const store = createMemoryIdempotencyStore(1);
    await store.set("a", { status: 201, body: 1 });
    await store.set("b", { status: 201, body: 2 });
    expect(await store.get("a")).toBeUndefined();
    expect(await store.get("b")).toEqual({ status: 201, body: 2 });
    await store.set("b", { status: 201, body: 3 });
    expect(await store.get("b")).toEqual({ status: 201, body: 3 });
  });
});
