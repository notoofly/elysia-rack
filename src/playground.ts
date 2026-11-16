import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import {
  boolean,
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

export const userRole = pgEnum("user_role", ["admin", "user"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("user"),
  deletedAt: timestamp("deleted_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  type: text("type").notNull().default("income"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  processedAt: timestamp("processed_at"),
  processedByAdmin: boolean("processed_by_admin").default(false),
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
  DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
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
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    deleted_at TIMESTAMP
  )
`);
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    type TEXT NOT NULL DEFAULT 'income',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by_admin BOOLEAN DEFAULT FALSE
  )
`);

await db.execute(sql`TRUNCATE products RESTART IDENTITY`);
await db.execute(sql`TRUNCATE categories`);
await db.execute(sql`TRUNCATE transactions RESTART IDENTITY CASCADE`);
await db.execute(sql`TRUNCATE users RESTART IDENTITY CASCADE`);

await db.insert(products).values([
  { name: "Keyboard", price: 850_000, status: "active", categorySlug: "peripherals" },
  { name: "Mouse", price: 250_000, status: "active", categorySlug: "peripherals" },
  { name: "CRT Monitor", price: 100_000, status: "archived", categorySlug: "display" },
]);
await db.insert(categories).values([
  { slug: "peripherals", title: "Peripherals" },
  { slug: "display", title: "Display" },
]);

const crypto = await import("crypto");
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

await db.insert(users).values([
  { email: "admin@example.com", passwordHash: hashPassword("admin123"), role: "admin" },
  { email: "user@example.com", passwordHash: hashPassword("user123"), role: "user" },
]);

await db.insert(transactions).values([
  { userId: 1, amount: 100000, description: "Sales #001", status: "completed", type: "income", processedAt: new Date(), processedByAdmin: true },
  { userId: 2, amount: 50000, description: "Payment", status: "pending", type: "income" },
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

const CreateTransaction = t.Object({
  userId: t.Numeric(),
  amount: t.Numeric({ minimum: 1 }),
  description: t.Optional(t.String()),
  type: t.Optional(t.Union([t.Literal("income"), t.Literal("expense")])),
});
const UpdateTransaction = t.Partial(CreateTransaction);
const TransactionParams = t.Object({ id: t.String() });
const TransactionQuery = t.Optional(
  t.Object({
    search: t.Optional(t.String()),
    status: t.Optional(t.String()),
    type: t.Optional(t.String()),
    sort: t.Optional(t.String()),
    page: t.Optional(t.Numeric()),
    limit: t.Optional(t.Numeric()),
  }),
);

const LoginSchema = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 1 }),
});
const SessionSchema = t.Object({
  sessionId: t.String(),
});

// ---------------------------------------------------------------------------
// Session store (in-memory)
// ---------------------------------------------------------------------------

type Session = { sessionId: string; email: string; role: "admin" | "user"; createdAt: number };
const sessions = new Map<string, Session>();

function createSession(email: string, role: "admin" | "user"): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, { sessionId, email, role, createdAt: Date.now() });
  return sessionId;
}

function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Auth plugin
// ---------------------------------------------------------------------------

type AuthPayload = { role: "admin" | "user"; email: string };

function getAuthPayload(request: Request): AuthPayload | null {
  const sessionId = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  return { role: session.role, email: session.email };
}

const authPlugin = () =>
  new Elysia({ name: "authPlugin" })
    .decorate({ permissions: undefined as AuthPayload | undefined })
    .decorate("permissions", (ctx: any) => {
      const payload = getAuthPayload(ctx.request);
      if (payload) return payload;
      return undefined;
    });

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "Elysia Rack", path: "/" }))
  .use(authPlugin())
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

      authorization: {
        list: true,
        detail: true,
        create: async (ctx) => {
          return ctx.permissions?.role === "admin";
        },
        replace: async (ctx) => {
          return ctx.permissions?.role === "admin";
        },
        update: async (ctx) => {
          return ctx.permissions?.role === "admin";
        },
        delete: async (ctx) => {
          return ctx.permissions?.role === "admin";
        },
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
  .use(
    rack("/finance/transactions", {
      model: { drizzle: { db, table: transactions } },

      validation: {
        create: CreateTransaction,
        replace: CreateTransaction,
        update: UpdateTransaction,
        params: TransactionParams,
        query: TransactionQuery,
      },

      authorization: {
        list: true,
        detail: true,
        create: async (ctx) => {
          return ctx.permissions?.role === "admin" || ctx.permissions?.role === "user";
        },
        replace: async (ctx) => {
          if (ctx.permissions?.role === "admin") return true;
          if (ctx.permissions?.role === "user") {
            const t = ctx.id ? await db.select().from(transactions).where(eq(transactions.id, Number(ctx.id))).then(r => r[0]) : null;
            return t?.userId !== undefined;
          }
          return false;
        },
        update: async (ctx) => {
          if (ctx.permissions?.role === "admin") return true;
          if (ctx.permissions?.role === "user") {
            const t = ctx.id ? await db.select().from(transactions).where(eq(transactions.id, Number(ctx.id))).then(r => r[0]) : null;
            return t?.userId !== undefined;
          }
          return false;
        },
        delete: async (ctx) => {
          return ctx.permissions?.role === "admin";
        },
      },

      query: {
        searchable: ["description"],
        filterable: ["status", "type", "processedByAdmin"],
        sortable: ["amount", "createdAt"],
        defaultSort: { field: "createdAt", direction: "desc" },
        pagination: { default: 20, max: 100 },
      },

      metadata: {
        id: "transactions",
        label: "Transaction",
        pluralLabel: "Transactions",
        group: "Finance",
        order: 1,
        icon: "receipt",
        fields: {
          id: { label: "ID", order: 0 },
          userId: { label: "User ID", order: 1, hideInTable: true },
          amount: { label: "Amount", format: "currency", currency: "IDR", order: 2 },
          description: { label: "Description", order: 3 },
          status: { label: "Status", format: "badge", order: 4 },
          type: { label: "Type", order: 5 },
          processedByAdmin: { label: "Processed by Admin", format: "badge", order: 6, readOnly: true },
        },
      },

      openapi: {
        tags: ["Finance"],
        description: "Financial transactions",
        operations: {
          list: { summary: "List transactions" },
          create: { summary: "Create transaction" },
        },
      },

      settings: {
        primaryKey: "id",
        returning: true,
      },
    }),
  )
  .post("/auth/login", async ({ body, status }) => {
    const { email, password } = body as { email: string; password: string };
    const results = await db.select().from(users).where(eq(users.email, email));
    const user = results[0];
    if (!user) return status(401, { error: "Invalid credentials" });
    if (user.passwordHash !== hashPassword(password))
      return status(401, { error: "Invalid credentials" });
    const sessionId = createSession(email, user.role as "admin" | "user");
    return { sessionId, role: user.role };
  }, { body: LoginSchema })
  .post("/auth/logout", async (ctx) => {
    const sessionId = ctx.request.headers.get("Authorization")?.replace("Bearer ", "");
    if (sessionId) deleteSession(sessionId);
    return { ok: true };
  })
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
console.log("  Login              POST  http://localhost:5000/auth/login (email: admin@example.com / admin123 atau user@example.com / user123)");
console.log("  Logout             POST  http://localhost:5000/auth/logout");
console.log("  Transactions         GET   http://localhost:5000/finance/transactions");

export type App = typeof app;