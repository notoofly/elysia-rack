# Getting started

This page walks through a complete first setup: install the package, create a small table, start a server, and use the panel and API.

The example uses Bun and its built-in SQLite driver. If you use Node.js or another database, keep the elysia-rack configuration and replace the database setup with your own Drizzle or Prisma setup.

## 1. Install the package

Create a new directory and install the dependencies:

```bash
mkdir my-shop
cd my-shop
bun init -y
bun add elysia-rack elysia react react-dom drizzle-orm
```

## 2. Create the application file

Create a file named `app.ts` with this content:

```ts
import { Elysia } from "elysia";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { dashboard, rack } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0),
  status: text("status").notNull().default("active"),
});

const sqlite = new Database("app.db");
sqlite.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active'
  )
`);

const db = drizzle(sqlite);

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "My Shop", path: "/" }))
  .use(
    rack("/catalog/products", {
      model: { drizzle: { db, table: products } },
      query: {
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
        icon: "package",
      },
    }),
  )
  .listen(3000);

console.log("Panel: http://localhost:3000/catalog/products");
console.log("Dashboard: http://localhost:3000/");
```

What the important parts do:

- `reactPlugin()` serves the panel assets and turns page descriptors into HTML.
- `dashboard()` mounts the dashboard at `/`.
- `rack("/catalog/products", ...)` mounts the resource at `/catalog/products`.
- `model` selects the Drizzle adapter and the table to use.
- `metadata` controls the display name, sidebar group, order, and icon.
- `query` controls which filters and sorts users can request.

Search is intentionally omitted from this example because the Drizzle adapter uses the PostgreSQL `ILIKE` operator, which SQLite does not support. See [Common issues](troubleshooting/common-issues.md).

## 3. Start the server

```bash
bun run app.ts
```

Expected output:

```text
Panel: http://localhost:3000/catalog/products
Dashboard: http://localhost:3000/
```

Keep the process running while you complete the next steps.

## 4. Open the dashboard

Visit `http://localhost:3000/` in a browser.

Expected result: a page titled `My Shop` with a sidebar and a resource table. The `Products` row links to the panel. The table also shows the resource path and enabled operations.

## 5. Open the panel

Visit `http://localhost:3000/catalog/products`.

Expected result: a page titled `Products` with:

- A search-free toolbar containing the `status` filter and sort controls.
- An empty table with the message `No records found.`
- A `New record` button.
- A `◐ Theme` button for dark and light mode.

## 6. Create the first record

Click `New record`. A dialog opens with fields derived from the table columns. The `id` field is optional because it is generated automatically.

Enter:

- `name`: `Keyboard`
- `price`: `850000`
- `status`: `active`

Click `Create`.

Expected result: the dialog closes and the table shows one row. The record count changes to `1 record`.

The panel sends the create request with an automatically generated `Idempotency-Key` header.

## 7. Verify the API

List the records:

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data'
```

Expected response:

```json
{
  "resource": "products",
  "operation": "list",
  "adapter": "drizzle",
  "metadata": {
    "id": "products",
    "label": "Product",
    "pluralLabel": "Products",
    "group": "Catalog",
    "order": 1,
    "icon": "package"
  },
  "via": "QUERY",
  "query": {
    "filters": {},
    "sort": {
      "field": "name",
      "direction": "asc"
    },
    "page": 1,
    "limit": 20
  },
  "data": [
    {
      "id": 1,
      "name": "Keyboard",
      "price": 850000,
      "status": "active"
    }
  ],
  "total": 1
}
```

Fetch one record:

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data/1'
```

Filter and sort:

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data?status=active&sort=price&order=desc&limit=10'
```

## 8. Create a record through the API

Create requests require an idempotency key by default:

```bash
curl -X POST 'http://localhost:3000/catalog/products' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: first-api-create' \
  -d '{"name":"Mouse","price":250000,"status":"active"}'
```

Expected status: `201`.

Expected response includes the created row:

```json
{
  "resource": "products",
  "operation": "create",
  "adapter": "drizzle",
  "metadata": {
    "id": "products",
    "label": "Product",
    "pluralLabel": "Products",
    "group": "Catalog",
    "order": 1,
    "icon": "package"
  },
  "data": {
    "id": 2,
    "name": "Mouse",
    "price": 250000,
    "status": "active"
  }
}
```

Sending the same request with the same idempotency key returns the stored response and the header `Idempotent-Replayed: true` instead of creating a second record.

## 9. Edit and delete records

In the panel:

1. Click `Edit` on a row. The edit dialog loads the current values.
2. Change a value and click `Save`. The panel sends a partial `PATCH` request.
3. Click `Delete` on a row and confirm. The record is removed.

Expected result: the table and record count update after each action.

## 10. Stop the server

Press `Ctrl+C` in the terminal where the server is running.

## Next steps

- [Basic usage](guides/basic-usage.md): day-to-day panel and API tasks.
- [Configuration reference](configuration/configuration-reference.md): every option and default.
- [Common workflows](guides/common-workflows.md): read-only resources, soft delete, and protection.
