import { beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { drizzleAdapter } from "../../src/rack/adapters/drizzle";
import type { Rack } from "../../src/rack/index";

const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0),
  status: text("status").notNull().default("active"),
});

let db!: ReturnType<typeof createDb>["db"];

function createDb() {
  const client = new Database(":memory:");
  client.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `);
  const db = drizzle(client);
  db.insert(products)
    .values([
      { name: "Alpha", price: 500 },
      { name: "Beta", price: 300 },
    ])
    .run();
  return { client, db };
}

beforeEach(() => {
  db = createDb().db;
});

const model = () => ({ drizzle: { db, table: products } }) as Rack.CrudModel;
const opts = { primaryKey: "id" };
const baseQuery = () => ({
  search: undefined,
  filters: {},
  sort: undefined,
  page: 1,
  limit: 20,
});

describe("drizzleAdapter.list on SQLite", () => {
  it("searches case-insensitively without ILIKE", async () => {
    const found = await drizzleAdapter.list(
      model(),
      { ...baseQuery(), search: { value: "ALP", fields: ["name"] } },
      opts,
    );
    expect(found.total).toBe(1);
    expect((found.data[0] as { name: string }).name).toBe("Alpha");
  });
});
