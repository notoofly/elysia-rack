import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
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
import { dashboard, rack } from "./rack/index";
import { reactPlugin } from "./react/index";

// ---------------------------------------------------------------------------
// Schema (drizzle pg-core, PGlite in-memory)
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
  categorySlug: text("category_slug"),
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
    category_slug TEXT,
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
  { name: "Keyboard", price: 850_000, status: "active", categorySlug: "peripherals" },
  { name: "Mouse", price: 250_000, status: "active", categorySlug: "peripherals" },
  { name: "CRT Monitor", price: 100_000, status: "archived", categorySlug: "display" },
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
  categorySlug: t.Optional(t.Union([t.String(), t.Null()])),
});
const UpdateProduct = t.Partial(CreateProduct);
const ProductParams = t.Object({ id: t.String() });
const ProductQuery = t.Optional(
  t.Object({
    search: t.Optional(t.String()),
    status: t.Optional(t.String()),
    categorySlug: t.Optional(t.String()),
    includeDeleted: t.Optional(t.String()),
    sort: t.Optional(t.String()),
    page: t.Optional(t.Numeric()),
    limit: t.Optional(t.Numeric()),
  }),
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Elysia()
  // Recommended setup: react() -> dashboard() -> rack()
  // - react() pages are optional (defaults to dashboard + panel) and can be merged:
  //   reactPlugin() // uses default pages
  //   reactPlugin({ pages: myPages }) // merged with defaults
  //   reactPlugin({ pages: [pages, myPages] }) // array will be merged
  // - rack() stores tree metadata in memory; panel now shows sidebar + breadcrumb
  // - dashboard() is now Coming Soon
  // Override panel.css via react config (see README: "Panel CSS override"):
  //   reactPlugin({ css: "./my-panel.css" })
  //   reactPlugin({ css: { path: "./my-panel.css" } })
  //   reactPlugin({ css: { content: ":root{--color-primary:red}" } })
  .use(reactPlugin())
  .use(dashboard({ title: "Elysia Rack", path: "/" }))
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
        filterable: ["status", "categorySlug"],
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
        icon: "package",
        fields: {
          name: { label: "Product name", order: 1 },
          price: { label: "Price", format: "currency", currency: "IDR", order: 2 },
          status: { label: "Status", format: "badge", order: 3 },
          categorySlug: {
            label: "Category",
            order: 4,
            relation: {
              load: async () =>
                db
                  .select({ value: categories.slug, label: categories.title })
                  .from(categories),
            },
          },
        },
      },

      actions: [
        {
          label: "Duplicate",
          href: "/catalog/products/:id/duplicate",
          method: "POST",
          confirm: "Duplicate this product?",
        },
        {
          label: "Export CSV",
          href: "/catalog/products/export",
          scope: "toolbar",
          icon: "download",
        },
      ],

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
        icon: "tags",
        fields: {
          slug: { label: "Slug", order: 1 },
          title: { label: "Title", order: 2 },
        },
      },

      openapi: { tags: ["Catalog"] },

      settings: { primaryKey: "slug", returning: true },
    }),
  )
  // Custom action: export products as CSV (toolbar action).
  .get("/catalog/products/export", async () => {
    const rows = await db.select().from(products);
    const header = ["id", "name", "price", "status", "category_slug"];
    const lines = rows.map((row) =>
      [row.id, row.name, row.price, row.status, row.categorySlug ?? ""]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    return new Response([header.join(","), ...lines].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="products.csv"',
      },
    });
  })
  // Custom action: duplicate a product (row action, POST + refresh).
  .post("/catalog/products/:id/duplicate", async ({ params, status }) => {
    const [source] = await db
      .select()
      .from(products)
      .where(eq(products.id, Number(params.id)));
    if (!source) return status(404, "Not found");
    const { id: _id, ...rest } = source;
    const [created] = await db
      .insert(products)
      .values({ ...rest, name: `${rest.name} (copy)`, deletedAt: null })
      .returning();
    return { data: created };
  })
  // legacy manual: .get("/", ({ query }) => page("/dashboard", { name: "Elysia Rack", resource: query.resource }))
  .listen(5000);

console.log("Playground ready:");
console.log("  Panel (products)   GET   http://localhost:5000/catalog/products");
console.log("  List data          QUERY http://localhost:5000/catalog/products/data?status=active");
console.log("  Show deleted       QUERY http://localhost:5000/catalog/products/data?includeDeleted=true");
console.log("  Detail data        QUERY http://localhost:5000/catalog/products/data/1");
console.log("  Create (needs Idempotency-Key header) POST http://localhost:5000/catalog/products");
console.log("  Duplicate action   POST  http://localhost:5000/catalog/products/1/duplicate");
console.log("  Export action      GET   http://localhost:5000/catalog/products/export");
console.log("  Categories (read-only) QUERY http://localhost:5000/catalog/categories/data");
console.log("  Dashboard          GET   http://localhost:5000/");

export type App = typeof app;
