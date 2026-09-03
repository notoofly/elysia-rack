import { PGlite } from "@electric-sql/pglite";
import { count, sql } from "drizzle-orm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { Rack } from "../src/rack/index";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0),
  status: text("status").notNull().default("active"),
  deletedAt: timestamp("deleted_at"),
});

export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
});

export type TestDb = ReturnType<typeof drizzlePglite>;

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzlePglite(client);
  await db.execute(sql`
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      deleted_at TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE categories (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL
    )
  `);
  return db;
}

export async function seedProducts(db: TestDb): Promise<void> {
  await db.execute(sql`TRUNCATE products RESTART IDENTITY`);
  await db.execute(sql`TRUNCATE categories`);
  await db.insert(products).values([
    { name: "Phone", price: 500, status: "active" },
    { name: "Tablet", price: 300, status: "active" },
    { name: "Obsolete", price: 100, status: "archived" },
  ]);
  await db.insert(categories).values([{ slug: "hello", title: "Hello" }]);
}

export function drizzleModel(db: TestDb): Rack.CrudModel {
  return { drizzle: { db, table: products } } as Rack.CrudModel;
}

export async function countProducts(db: TestDb): Promise<number> {
  const rows = await db.select({ n: count() }).from(products);
  return rows[0]?.n ?? 0;
}
