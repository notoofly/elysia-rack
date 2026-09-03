import { beforeEach, describe, expect, it } from "bun:test";
import { drizzleAdapter } from "../../src/rack/adapters/drizzle";
import {
  createTestDb,
  drizzleModel,
  seedProducts,
  type TestDb,
} from "../helpers";

let db!: TestDb;

beforeEach(async () => {
  db ??= await createTestDb();
  await seedProducts(db);
});

const model = () => drizzleModel(db);
const opts = { primaryKey: "id" };
const baseQuery = () => ({
  search: undefined,
  filters: {},
  sort: undefined,
  page: 1,
  limit: 20,
});

describe("drizzleAdapter.list", () => {
  it("returns rows with total", async () => {
    const res = await drizzleAdapter.list(model(), baseQuery(), opts);
    expect(res.total).toBe(3);
    expect(res.data).toHaveLength(3);
  });

  it("filters, skipping unknown columns, with inArray for arrays", async () => {
    const filtered = await drizzleAdapter.list(
      model(),
      { ...baseQuery(), filters: { status: "active", nope: 1 } },
      opts,
    );
    expect(filtered.total).toBe(2);

    const all = await drizzleAdapter.list(
      model(),
      { ...baseQuery(), filters: { status: ["active", "archived"] } },
      opts,
    );
    expect(all.total).toBe(3);
  });

  it("searches text fields and escapes wildcards", async () => {
    const found = await drizzleAdapter.list(
      model(),
      {
        ...baseQuery(),
        search: { value: "Tab", fields: ["name"] },
      },
      opts,
    );
    expect(found.total).toBe(1);

    const escaped = await drizzleAdapter.list(
      model(),
      {
        ...baseQuery(),
        search: { value: "Phone%", fields: ["name", "nope"] },
      },
      opts,
    );
    expect(escaped.total).toBe(0);
  });

  it("sorts and paginates", async () => {
    const sorted = await drizzleAdapter.list(
      model(),
      {
        ...baseQuery(),
        sort: { field: "price", direction: "asc" as const },
      },
      opts,
    );
    expect((sorted.data as any[]).map((r) => r.name)).toEqual([
      "Obsolete",
      "Tablet",
      "Phone",
    ]);

    const unknownSort = await drizzleAdapter.list(
      model(),
      {
        ...baseQuery(),
        sort: { field: "nope", direction: "desc" as const },
      },
      opts,
    );
    expect(unknownSort.total).toBe(3);

    const page2 = await drizzleAdapter.list(
      model(),
      { ...baseQuery(), page: 2, limit: 2 },
      opts,
    );
    expect(page2.data).toHaveLength(1);
    expect(page2.total).toBe(3);
  });
});

describe("drizzleAdapter.detail", () => {
  it("finds by string id with coercion", async () => {
    const row = (await drizzleAdapter.detail(model(), "1", opts)) as any;
    expect(row.name).toBe("Phone");
  });

  it("returns null for missing and malformed ids", async () => {
    expect(await drizzleAdapter.detail(model(), "999", opts)).toBeNull();
    expect(await drizzleAdapter.detail(model(), "abc", opts)).toBeNull();
  });

  it("hides soft-deleted rows", async () => {
    await drizzleAdapter.remove(model(), "1", { ...opts, softDelete: true });
    expect(await drizzleAdapter.detail(model(), "1", { ...opts, softDelete: true })).toBeNull();
    const visible = (await drizzleAdapter.detail(model(), "1", opts)) as any;
    expect(visible.id).toBe(1);
  });
});

describe("drizzleAdapter mutations", () => {
  it("creates and returns the row", async () => {
    const row = (await drizzleAdapter.create(
      model(),
      { name: "New", price: 10 },
      opts,
    )) as any;
    expect(row.id).toBeDefined();
    expect(row.name).toBe("New");
  });

  it("creates without returning when disabled", async () => {
    const row = await drizzleAdapter.create(
      model(),
      { name: "Quiet" },
      { ...opts, returning: false },
    );
    expect(row).toBeUndefined();
    expect(
      await drizzleAdapter.detail(model(), "4", opts),
    ).toMatchObject({ name: "Quiet" });
  });

  it("replaces and updates, 404 on missing", async () => {
    const replaced = (await drizzleAdapter.replace(
      model(),
      "1",
      { name: "R", price: 1, status: "active" },
      opts,
    )) as any;
    expect(replaced.name).toBe("R");
    expect(await drizzleAdapter.replace(model(), "999", { name: "X" }, opts)).toBeNull();

    const updated = (await drizzleAdapter.update(
      model(),
      "2",
      { price: 321 },
      opts,
    )) as any;
    expect(updated).toMatchObject({ name: "Tablet", price: 321 });
    expect(await drizzleAdapter.update(model(), "999", {}, opts)).toBeNull();
    expect(
      await drizzleAdapter.update(model(), "2", { price: 1 }, { ...opts, returning: false }),
    ).toBeUndefined();
  });

  it("hard-deletes and soft-deletes", async () => {
    const hard = (await drizzleAdapter.remove(model(), "3", opts)) as any;
    expect(hard.id).toBe(3);
    expect(await drizzleAdapter.detail(model(), "3", opts)).toBeNull();
    expect(await drizzleAdapter.remove(model(), "3", opts)).toBeNull();

    const soft = (await drizzleAdapter.remove(model(), "1", {
      ...opts,
      softDelete: true,
    })) as any;
    expect(soft.deletedAt).toBeInstanceOf(Date);
    const listed = await drizzleAdapter.list(model(), baseQuery(), {
      ...opts,
      softDelete: true,
    });
    expect(listed.total).toBe(1);
  });
});
