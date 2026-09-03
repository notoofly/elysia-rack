import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { Elysia, t } from "elysia";
import { rack } from "./rack/index";
import { page, pages, reactPlugin } from "./react/index";

// ---------------------------------------------------------------------------
// Schema (drizzle pg-core, berjalan di PGlite in-memory)
// ---------------------------------------------------------------------------

export const productStatus = pgEnum("product_status", [
  "active",
  "archived",
]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0),
  status: productStatus("status").notNull().default("active"),
  deletedAt: timestamp("deleted_at"),
});

export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
});

// ---------------------------------------------------------------------------
// Database + seed
// ---------------------------------------------------------------------------

const client = new PGlite();
const db = drizzle(client);

await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE product_status AS ENUM ('active', 'archived');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
`);
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    status product_status NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP
  )
`);
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS categories (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL
  )
`);
await db.execute(sql`TRUNCATE products RESTART IDENTITY`);
await db.execute(sql`TRUNCATE categories`);
await db.insert(products).values([
  { name: "Keyboard", price: 850_000, status: "active" },
  { name: "Mouse", price: 250_000, status: "active" },
  { name: "CRT Monitor", price: 100_000, status: "archived" },
]);
await db.insert(categories).values([
  { slug: "peripherals", title: "Peripherals" },
  { slug: "display", title: "Display" },
]);

// ---------------------------------------------------------------------------
// Validation schemas (TypeBox via elysia)
// ---------------------------------------------------------------------------

const CreateProduct = t.Object({
  name: t.String({ minLength: 3 }),
  price: t.Numeric({ minimum: 0 }),
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("archived")])),
});
const UpdateProduct = t.Partial(CreateProduct);
const ProductParams = t.Object({ id: t.String() });
const ProductQuery = t.Optional(
  t.Object({
    search: t.Optional(t.String()),
    status: t.Optional(t.String()),
    sort: t.Optional(t.String()),
    page: t.Optional(t.Numeric()),
    limit: t.Optional(t.Numeric()),
  }),
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Elysia()
  .use(reactPlugin({ pages }))
  .use(
    rack("/catalog/products", {
      model: { drizzle: { db, table: products } },

      validation: {
        create: CreateProduct,
        replace: CreateProduct,
        update: UpdateProduct,
        params: ProductParams,
        query: ProductQuery,
      },

      // Example string-permission (needs x-permissions header) or function:
      // delete: "products.delete",
      // delete: async ({ request }) =>
      //   request.headers.get("x-api-key") === "secret",
      authorization: {
        list: true,
        detail: true,
        create: true,
        replace: true,
        update: true,
        delete: true,
      },

      query: {
        searchable: ["name"],
        filterable: ["status"],
        sortable: ["name", "price"],
        defaultSort: { field: "name", direction: "asc" },
        pagination: { default: 20, max: 100 },
      },

      metadata: {
        id: "products",
        label: "Product",
        pluralLabel: "Products",
        group: "Catalog",
        order: 1,
      },

      openapi: {
        tags: ["Catalog"],
        description: "Product catalog resources",
        operations: {
          list: { summary: "List products" },
          create: { summary: "Create product" },
          delete: { summary: "Delete product" },
        },
      },

      settings: {
        primaryKey: "id",
        returning: true,
        softDelete: true,
      },
    }),
  )
  .use(
    rack("/catalog/categories", {
      model: { drizzle: { db, table: categories } },

      validation: {
        params: t.Object({ slug: t.String({ minLength: 1 }) }),
      },

      // Read-only: only list + detail are enabled.
      operations: {
        create: false,
        replace: false,
        update: false,
        delete: false,
      },

      metadata: {
        id: "categories",
        label: "Category",
        pluralLabel: "Categories",
        group: "Catalog",
        order: 2,
      },

      openapi: { tags: ["Catalog"] },

      settings: { primaryKey: "slug", returning: true },
    }),
  )
  .get("/", ({ query }) =>
    page("/dashboard", {
      name: "Elysia Rack",
      resource:
        typeof query.resource === "string" ? query.resource : undefined,
    }),
  )
  .listen(5000);

console.log("Playground ready:");
console.log("  Panel (products)   GET   http://localhost:5000/catalog/products");
console.log("  List data          QUERY http://localhost:5000/catalog/products/data?status=active");
console.log("  Detail data        QUERY http://localhost:5000/catalog/products/data/1");
console.log("  Create (needs Idempotency-Key header) POST http://localhost:5000/catalog/products");
console.log("  Categories (read-only) QUERY http://localhost:5000/catalog/categories/data");
console.log("  Dashboard          GET   http://localhost:5000/");

export type App = typeof app;
