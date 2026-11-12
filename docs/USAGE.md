# elysia-rack Usage Guide

Complete guide for building CRUD resources and admin panels with `elysia-rack`.

For the short overview see the [README](../README.md). This guide covers the
runtime behavior, every configuration option, and the panel/dashboard workflow.

- [1. What it does](#1-what-it-does)
- [2. Requirements](#2-requirements)
- [3. Install](#3-install)
- [4. Quick start](#4-quick-start)
- [5. How the pieces fit together](#5-how-the-pieces-fit-together)
- [6. Generated routes](#6-generated-routes)
- [7. Request and response reference](#7-request-and-response-reference)
- [8. Configuration reference](#8-configuration-reference)
- [9. Querying data](#9-querying-data)
- [10. Panel](#10-panel)
- [11. Dashboard and navigation](#11-dashboard-and-navigation)
- [12. React plugin, pages, and styling](#12-react-plugin-pages-and-styling)
- [13. ORM adapters](#13-orm-adapters)
- [14. Errors and status codes](#14-errors-and-status-codes)
- [15. Production notes](#15-production-notes)
- [16. Development](#16-development)
- [17. Troubleshooting](#17-troubleshooting)

## 1. What it does

`rack()` turns one ORM model into a complete resource:

- REST routes for list, detail, create, replace, update, and delete
- a non-standard `QUERY` read API under `/data`
- per-operation validation and authorization
- search, filtering, sorting, and pagination
- idempotent creates
- OpenAPI operation metadata
- a server-rendered React panel with live table, create/edit/delete, and bulk
  actions
- a dashboard and sidebar built from the resources you registered

You declare a resource once; the API and the UI stay in sync.

## 2. Requirements

- Bun `>= 1.0.0` or Node.js `>= 20.0.0`
- Elysia `^1.4.0`
- React and React DOM `>= 18` (only needed when you use the panel)
- `drizzle-orm` `^0.45.0` when using the Drizzle adapter
- No extra dependency for Prisma

`QUERY` is a custom HTTP method. The panel uses it for live reads, so the runtime
and any proxy in front of the app must accept it.

## 3. Install

```bash
bun add elysia-rack elysia react react-dom
# or
npm i elysia-rack elysia react react-dom
```

If you use Drizzle, install it too:

```bash
bun add drizzle-orm
```

The published package already contains the built panel assets in `dist/`. If
you run the source checkout directly, run `bun run build` once so the panel
assets exist.

## 4. Quick start

```ts
import { Elysia } from "elysia";
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

const db = drizzle(process.env.DATABASE_URL ?? "app.db");

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "My Shop", path: "/" }))
  .use(
    rack("/catalog/products", {
      model: { drizzle: { db, table: products } },
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
        icon: "package",
      },
    }),
  )
  .listen(3000);

console.log("Panel: http://localhost:3000/catalog/products");
```

Open `/catalog/products` for the panel and `/` for the dashboard. The JSON API
lives under `/catalog/products` and `/catalog/products/data`.

## 5. How the pieces fit together

| Piece | Import | Role |
|---|---|---|
| `rack(path, options)` | `elysia-rack` | Registers a resource, mounts its routes, stores navigation metadata |
| `dashboard(options)` | `elysia-rack` | Mounts a page that lists registered resources |
| `reactPlugin(options)` | `elysia-rack/react` | Serves panel assets and renders `page()` descriptors to HTML |
| `page(path, props)` | `elysia-rack/react` | Describes which React page to render |
| registry helpers | `elysia-rack` | Read the in-memory resource tree |

Recommended plugin order:

```ts
new Elysia()
  .use(reactPlugin()) // UI engine and static assets
  .use(dashboard())   // optional dashboard
  .use(rack("/a", ...))
  .use(rack("/b", ...));
```

`reactPlugin()` is required for any panel or dashboard page to render. Without
it, `GET {rack path}` returns the page descriptor as JSON instead of HTML.

`rack()` registers each resource in a process-wide in-memory registry at startup.
The dashboard and panel sidebar read that registry on every render.

## 6. Generated routes

All routes are mounted under the `path` passed to `rack()`. Every route is
controlled by its entry in `operations`; all operations are enabled by default.

| Operation | Method | Path | Enabled by |
|---|---|---|---|
| Panel | `GET` | `{path}` | `operations.list` and `page.enabled !== false` |
| List | `QUERY` | `{path}/data` | `operations.list` |
| Detail | `QUERY` | `{path}/data/:{primaryKey}` | `operations.detail` |
| Create | `POST` | `{path}` | `operations.create` |
| Replace | `PUT` | `{path}/:{primaryKey}` | `operations.replace` |
| Update | `PATCH` | `{path}/:{primaryKey}` | `operations.update` |
| Delete | `DELETE` | `{path}/:{primaryKey}` | `operations.delete` |

The route parameter name follows `settings.primaryKey` (default `id`). With
`primaryKey: "slug"`, item routes become `/{path}/:slug`.
`settings.primaryKey` is not read from the ORM schema automatically; set it when
your key is not named `id`.

Disabling an operation removes the route, so it returns Elysia's normal `404`.

## 7. Request and response reference

### Envelope

Data responses share a common envelope:

```json
{
  "resource": "products",
  "operation": "list",
  "adapter": "drizzle"
}
```

- `resource` is `metadata.id` when set, otherwise the mount path.
- `metadata` is echoed when `metadata` was passed to `rack()`.
- `adapter` is `"drizzle"` or `"prisma"`.
- `data` is omitted when `settings.returning` is `false`, or when the adapter
  produced no row representation.

### List

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data?status=active&sort=price&order=desc&limit=10'
```

You can also send a JSON body; body values override URL query values:

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data?page=2' \
  -H 'Content-Type: application/json' \
  -d '{"search":"keyboard","limit":5}'
```

Response:

```json
{
  "resource": "products",
  "operation": "list",
  "adapter": "drizzle",
  "via": "QUERY",
  "query": {
    "search": { "value": "keyboard", "fields": ["name", "sku"] },
    "filters": { "status": "active" },
    "sort": { "field": "price", "direction": "desc" },
    "page": 2,
    "limit": 5
  },
  "data": [],
  "total": 0
}
```

`query` echoes the normalized query actually used. `total` is the count before
pagination.

### Detail

```bash
curl -X QUERY http://localhost:3000/catalog/products/data/42
```

```json
{
  "resource": "products",
  "operation": "detail",
  "adapter": "drizzle",
  "id": "42",
  "data": { "id": 42, "name": "Keyboard" }
}
```

A missing row or an id that cannot match the key column returns `404`.

### Create

`POST` requires an idempotency key by default.

```bash
curl -X POST http://localhost:3000/catalog/products \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000' \
  -d '{"name":"Keyboard","price":850000}'
```

Response (`201`):

```json
{
  "resource": "products",
  "operation": "create",
  "adapter": "drizzle",
  "data": { "id": 1, "name": "Keyboard", "price": 850000 }
}
```

Reusing the same key returns the stored response with
`Idempotent-Replayed: true` instead of inserting again. A missing key returns
`400` while `idempotency.required` is `true`.

### Replace

`PUT` is a full replacement. The body is applied as-is.

```bash
curl -X PUT http://localhost:3000/catalog/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Keyboard v2","price":900000,"status":"active"}'
```

With the Drizzle adapter, an empty JSON object is a no-op and returns the
existing row.

### Update

`PATCH` is a partial update. Send only the fields that change.

```bash
curl -X PATCH http://localhost:3000/catalog/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"price":950000}'
```

### Delete

```bash
curl -X DELETE http://localhost:3000/catalog/products/1
```

With `settings.softDelete: true`, the row is timestamped in
`settings.deletedAtField` (default `deletedAt`) instead of being removed, reads
skip it, and the response includes `"softDelete": true`.

### Response fields by operation

| Operation | Always | Optional |
|---|---|---|
| `list` | `resource`, `operation`, `adapter`, `via`, `query`, `data`, `total` | `metadata` |
| `detail` | `resource`, `operation`, `adapter`, `id`, `data` | `metadata` |
| `create` | `resource`, `operation`, `adapter` | `metadata`, `data`, `returning` |
| `replace` / `update` | `resource`, `operation`, `adapter`, `id` | `metadata`, `data`, `returning` |
| `delete` | `resource`, `operation`, `adapter`, `id` | `metadata`, `data`, `softDelete` |

## 8. Configuration reference

`rack(path, options)` accepts these top-level keys. Only `model` is required.

### `model`

Selects the ORM adapter. The two shapes are mutually exclusive.

```ts
// Drizzle
model: { drizzle: { db, table: products } }

// Prisma
model: { prisma: { client: prisma, model: prisma.product } }
```

See [ORM adapters](#13-orm-adapters) for adapter-specific behavior.

### `settings`

```ts
settings: {
  primaryKey: "id",        // default "id"
  returning: true,         // default: return row data
  softDelete: false,       // default false
  deletedAtField: "deletedAt",
}
```

- `primaryKey` changes the item route parameter and the key used by every
  adapter call.
- `returning: false` omits `data` from mutation responses. `true` (or leaving it
  unset) returns the row.
- `softDelete: true` requires a nullable timestamp column named by
  `deletedAtField`.

### `operations`

```ts
operations: {
  list: true,
  detail: true,
  create: true,
  replace: true,
  update: true,
  delete: true,
}
```

Omitted keys default to `true`. Set one to `false` to remove that route and its
panel controls.

Notes:

- `operations.list` also gates the panel page.
- The panel edit dialog uses `PATCH`; keep `update` enabled if you want editing
  from the UI.
- `operations.detail` is needed by the panel's edit dialog.

### `validation`

Values are Elysia/TypeBox schemas (or any schema Elysia accepts). They are
attached to the corresponding routes.

```ts
import { t } from "elysia";

validation: {
  create: t.Object({
    name: t.String({ minLength: 3 }),
    price: t.Numeric({ minimum: 0 }),
  }),
  replace: t.Object({
    name: t.String({ minLength: 3 }),
    price: t.Numeric({ minimum: 0 }),
  }),
  update: t.Partial(t.Object({
    name: t.String(),
    price: t.Numeric({ minimum: 0 }),
  })),
  params: t.Object({ id: t.String() }),
  query: t.Optional(t.Object({
    search: t.Optional(t.String()),
    page: t.Optional(t.Numeric()),
    limit: t.Optional(t.Numeric()),
  })),
}
```

| Key | Applied to |
|---|---|
| `create` | `POST` body |
| `replace` | `PUT` body |
| `update` | `PATCH` body |
| `params` | Item routes (`PUT`, `PATCH`, `DELETE`, detail) |
| `query` | `QUERY /data` request body |

Validation failures return Elysia's `422` response.

### `authorization`

One rule per operation. Rules are resolved independently.

```ts
authorization: {
  list: true,
  detail: "products.view",
  create: "products.create",
  update: "products.update",
  delete: async ({ request }) => request.headers.get("x-api-key") === "secret",
}
```

A rule can be:

| Rule | Behavior |
|---|---|
| `undefined` or `true` | Allow |
| `false` | Deny with `403` |
| `string` | Treat as a required permission |
| function | Call it, allow on truthy result |

String permissions are checked against, in order:

1. `permissions` decorated on the Elysia context (e.g. `app.decorate("permissions", [...])`)
2. `permissions` stored with `app.state("permissions", [...])`
3. the `x-permissions` request header, comma-separated

If none of those sources exist, the current implementation allows the request.
Wire a permissions source before relying on string rules in production.

Function rules receive:

```ts
{
  operation: "delete",
  request: Request,
  id?: string,       // item routes only
  resource: model,
}
```

The panel's `GET {path}` page uses the `list` rule.

### `query`

Controls what clients can search, filter, sort, and paginate.

```ts
query: {
  searchable: ["name", "sku"],
  filterable: ["status", "categoryId"],
  sortable: ["name", "price", "createdAt"],
  defaultSort: { field: "createdAt", direction: "desc" },
  pagination: { default: 20, max: 100 },
}
```

- Omitting `searchable` makes `search` a no-op (no fields are searched).
- Omitting `filterable` allows any non-reserved parameter as a filter.
- Omitting `sortable` allows any field name as `sort`.
- Omitting `defaultSort` means no sorting unless a valid `sort` is requested.
- Pagination defaults: `default: 20`, `max: 100`.

See [Querying data](#9-querying-data) for the parsing rules.

### `metadata`

Navigation and response metadata. Also used to build the sidebar tree.

```ts
metadata: {
  id: "products",          // defaults to the mount path
  label: "Product",
  pluralLabel: "Products",
  group: "Catalog",
  parent: "catalog-root",  // nest under another metadata.id
  icon: "package",         // Lucide icon name
  order: 1,                // lower comes first
  hidden: false,
}
```

- `id` is the registry key and the `resource` value in responses.
- `group` becomes a sidebar group; resources without a group appear in
  `"General"`.
- `parent` creates a hierarchy in the sidebar and dashboard.
- `icon` accepts a Lucide name such as `package`, `tags`, or `ShoppingCart`.
- `hidden` removes the resource from the sidebar and dashboard, but its routes
  still work.

### `page`

Controls the panel page mounted at `GET {path}`.

```ts
page: {
  path: "/panel",   // React page registry key, default "/panel"
  enabled: true,    // false removes the panel route
}
```

`page.path` is a key in the `reactPlugin` page registry, not an extra URL. The
panel itself is always mounted at `GET {path}`. To render a custom panel
component, register a page under a new key and point `page.path` at it.

### `idempotency`

Controls idempotency for `POST`.

```ts
idempotency: {
  enabled: true,                    // default true
  required: true,                   // default true
  header: "Idempotency-Key",        // default "Idempotency-Key"
  ttl: 86400,                       // replay window in seconds
  store: myStore,                   // defaults to an in-memory store
}
```

- Keys are scoped per resource as `<resource>::<client key>`, so the same key
  can be reused on different resources.
- A replay returns the stored status and body plus `Idempotent-Replayed: true`.
- Concurrent requests with the same key in one process share a single insert.
- The default memory store holds up to 1000 entries and evicts the oldest.
- Use a shared store when running more than one process or instance.
- `enabled: false` skips the store entirely.
- `required: false` allows keyless creates.

Custom store contract:

```ts
import type { Rack } from "elysia-rack";

const store: Rack.CrudIdempotencyStore = {
  async get(key) {
    return redis.get(key).then((v) => (v ? JSON.parse(v) : undefined));
  },
  async set(key, record, ttlSeconds) {
    await redis.set(key, JSON.stringify(record), { EX: ttlSeconds });
  },
};
```

The store receives already-scoped keys and must honor the TTL when provided.

### `openapi`

Adds Elysia route `detail` metadata. It does not generate a spec by itself; use
an OpenAPI plugin such as `@elysiajs/swagger` to expose one.

```ts
openapi: {
  tags: ["Catalog"],
  description: "Product catalog",
  operations: {
    list: { summary: "List products", operationId: "listProducts" },
    create: { summary: "Create product", deprecated: false },
    detail: { description: "Fetch one product" },
  },
}
```

Tag fallback order: `openapi.tags`, then `metadata.label`, then `metadata.id`.
Per-operation `tags` and `description` override the resource-level values.

## 9. Querying data

All reads use the `QUERY` method under `/data`. URL query parameters and a JSON
body are merged; body values win.

### Supported parameters

| Parameter | Meaning |
|---|---|
| `search` | Text search across `query.searchable` fields |
| `sort` | Field name to sort by |
| `order` or `direction` | `asc` or `desc` |
| `page` | 1-based page number |
| `limit` or `perPage` | Page size |
| any other key | Filter (subject to `query.filterable`) |

Reserved keys are `search`, `sort`, `order`, `direction`, `page`, `limit`, and
`perPage`. Everything else is treated as a filter.

### Parsing rules

- `page` defaults to `1`. Invalid or missing values become `1`.
- `limit` comes from `limit` or `perPage`, defaults to
  `pagination.default`, and is clamped between `1` and `pagination.max`.
- `search` is applied only when it is a non-empty string **and**
  `query.searchable` is a non-empty list.
- `sort` is accepted when `query.sortable` is omitted or contains the field.
  If it is rejected, `defaultSort` is used instead.
- `direction` comes from `order` or `direction`, then `defaultSort.direction`,
  then `asc`.
- Filters are included only when `query.filterable` is omitted or contains the
  key.
- Array filter values become SQL `IN` / Prisma `in`. Send them in the JSON body
  when you need multi-value filters.

### Adapter-specific behavior

| Behavior | Drizzle | Prisma |
|---|---|---|
| Search | SQL `ILIKE` where supported | `contains` with `mode: "insensitive"` |
| Filters | `eq` or `inArray` | direct value or `{ in: [...] }` |
| Sort | column `asc` / `desc` | `orderBy` field |
| Count | `count()` | `count()` |

Soft-deleted rows are excluded from list and detail reads when `softDelete` is
enabled.

## 10. Panel

The panel is a server-rendered React page mounted at `GET {path}`. It is
rendered only when `operations.list` is enabled and `page.enabled` is not
`false`. It uses the `list` authorization rule.

### What it shows

- sidebar built from the full registry tree, grouped and nested by metadata
- breadcrumb
- search, filter, and sort controls, but only for the fields declared in
  `query`
- sortable table headers
- pagination
- create, edit, delete, and bulk actions based on `operations`

### Actions

| Action | How it works |
|---|---|
| Create | Opens a dialog; sends `POST {path}` with an auto-generated `Idempotency-Key` |
| Edit | Loads the row with `QUERY {path}/data/:id`; saves with `PATCH {path}/:id` |
| Delete | Confirms, then sends `DELETE {path}/:id` |
| Bulk delete | Loops `DELETE` over selected rows |
| Bulk apply | Loops `PATCH` with one field/value over selected rows |
| Clear | Clears the selection |

Create fields come from the adapter's column introspection. Drizzle exposes
column names, types, enums, nullability, and auto-increment. Prisma delegates
expose no schema, so Prisma-backed panels fall back to the row columns and,
for an empty table, a raw JSON body field.

### Progressive enhancement

The first render is server-side and loads data through the adapter directly.
`/__rack/panel-app.js` then takes over for live `QUERY` reads and actions.
Without JavaScript, table links, GET pagination, and the toolbar form still
work.

### Disabling controls

- `operations.create: false` hides the create button and dialog.
- `operations.update: false` and `operations.replace: false` together hide edit
  controls. Saving uses `PATCH`, so keep `update` enabled for usable editing.
- `operations.delete: false` hides delete and bulk delete.
- `operations.detail: false` prevents the edit dialog from loading a row.
- `page: { enabled: false }` removes the panel page while keeping the data API.

## 11. Dashboard and navigation

```ts
import { dashboard } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "My Panel", path: "/" }))
  .use(rack("/catalog/products", { model, metadata: { id: "products", group: "Catalog" } }));
```

### `dashboard(options)`

| Option | Default | Meaning |
|---|---|---|
| `path` | `"/"` | URL where the dashboard is mounted |
| `title` | `"Panel"` | Dashboard title |
| `pagePath` | `"/dashboard"` | React page registry key to render |
| `donate` | `true` | Show or hide the Ko-fi link |

The dashboard renders the registered resource tree as a table with a sidebar.
It is a normal Elysia route; it has no built-in authorization, so protect it
yourself if it should not be public.

### Registry helpers

The registry is in-memory and process-wide. Registration happens when `rack()`
is called.

```ts
import {
  listRacks,
  getRack,
  getRackTree,
  flatRackTree,
  buildRackTree,
  clearRacks,
} from "elysia-rack";

listRacks();              // RackRegistration[] in registration order
getRack("products");      // RackRegistration | undefined
getRackTree();            // RackTreeNode[] sorted by order then label
flatRackTree();           // depth-first RackRegistration[]
buildRackTree(racks);     // pure tree builder for an explicit list
clearRacks();             // mainly for tests
```

Tree rules:

- a node with no `metadata.parent` is a root
- a node whose parent is not registered is a root
- children are sorted by `metadata.order`, then plural label/label/id
- `hidden` resources are filtered out by the panel and dashboard

## 12. React plugin, pages, and styling

`reactPlugin()` is the bridge between Elysia and the server-rendered React
pages.

```ts
import { reactPlugin } from "elysia-rack/react";

new Elysia().use(reactPlugin());
```

### Defaults

The plugin always includes these pages and merges any pages you pass:

```ts
{
  "/dashboard": () => import("./page/Dashboard"),
  "/panel": () => import("./page/Panel"),
}
```

Later registries win on key collisions.

### Custom pages

```ts
import { page, pages, reactPlugin } from "elysia-rack/react";

const myPages = {
  "/hello": () => import("./Hello"),
};

new Elysia()
  .use(reactPlugin({ pages: myPages })) // merged with defaults
  .get("/hello", () => page("/hello", { name: "Ada" }));
```

A page module must default-export a React component. Pages are rendered with
`react-dom/server` and streamed into the HTML shell. Only the panel ships a
client bundle; custom pages are server-rendered.

Multiple registries can be merged explicitly:

```ts
reactPlugin({ pages: [pages, myPages] });
```

### Styling

Override `panel.css` without forking:

```ts
reactPlugin({ css: "./my-panel.css" });
reactPlugin({ css: { path: "./my-panel.css" } });
reactPlugin({ css: { content: ":root{--color-primary:#c00}" } });
reactPlugin({ panelCss: "body{padding:0}" }); // alias
```

Resolution rules:

- a string is used as a file path if that file exists
- otherwise it is served as raw CSS when it looks like CSS
- `{ path }` forces file mode, `{ content }` forces raw mode
- fallback is `dist/panel.css`

The panel stylesheet lives at
`src/react/page/panel.css` and imports semantic theme files. Override tokens
rather than component rules to keep dark mode working.

### Assets

`reactPlugin()` serves:

| URL | File |
|---|---|
| `/__rack/panel.css` | `dist/panel.css` or your override |
| `/__rack/panel-theme.js` | `dist/panel-theme.js` |
| `/__rack/panel-app.js` | `dist/panel-app.js` |

Static assets are cached for one hour. If an asset is missing, the route returns
`404`; run the build in a source checkout.

### HTML shell

The server renders into `src/react/app.html` (shipped as `dist/app.html`):

```html
<!doctype html>
<html>
  <head>
    <title>{{title}}</title>
    <link rel="stylesheet" href="/__rack/panel.css" />
    <!--app-head-->
  </head>
  <body>
    <!--app-->
  </body>
</html>
```

- `{{title}}` is replaced per page and HTML-escaped.
- `<!--app-->`, `{{body}}`, or `<!--app-html-->` marks the React stream.
- A built-in fallback shell is used if the file is missing.

### Donate link

The Ko-fi link is shown in the dashboard and panel footer by default. Disable
it per plugin or per dashboard:

```ts
reactPlugin({ donate: false });
dashboard({ donate: false });
```

## 13. ORM adapters

### Drizzle

```ts
model: {
  drizzle: {
    db,                  // drizzle(...) database instance
    table: products,     // drizzle table object
  },
}
```

- `drizzle-orm` is an optional peer dependency.
- The adapter introspects table columns for panel forms.
- String route ids are coerced for integer columns (`serial`, `integer`,
  `bigint`, etc.). A non-numeric id on an integer column resolves to `404`
  instead of throwing.
- Search uses `ILIKE` where the dialect supports it.
- `softDelete` requires a `deletedAt`-style column.
- `replace` and `update` with an empty body return the existing row without
  writing.

### Prisma

```ts
model: {
  prisma: {
    client: prisma,          // required by the type
    model: prisma.product,   // delegate used for queries
  },
}
```

- No extra dependency is needed.
- The adapter uses the delegate, not the client, for operations.
- `describe()` returns `[]` because Prisma exposes no runtime schema. The panel
  falls back to row columns and a raw JSON create form.
- Delete errors with code `P2025` become `404`.
- ID coercion treats unknown column types as numeric-friendly: numeric strings
  become numbers, everything else passes through.
- Soft delete updates the configured timestamp column and reads filter
  `{ [deletedAtField]: null }`.

## 14. Errors and status codes

| Status | When | Body |
|---|---|---|
| `400` | `POST` without the required idempotency header | `{ "error": "<Header> header is required", "operation": "create" }` |
| `403` | Authorization denied | `{ "error": "Forbidden", "operation": "...", "requiredPermission"?: "..." }` |
| `404` | Missing row or unmatched id | `{ "error": "Not Found", "operation": "...", "id": "..." }` |
| `404` | Disabled operation or unknown route | Elysia's default `404` response |
| `422` | Elysia validation failed | Elysia's validation response |
| `201` | Successful create | Create envelope |
| `200` | Successful list, detail, replace, update, delete | Operation envelope |

## 15. Production notes

- **QUERY method:** allow it through proxies, load balancers, and CDNs. Some
  infrastructure rejects non-standard methods.
- **Idempotency store:** the default store is per process and in-memory. Use a
  shared store backed by Redis or your database for multi-instance deployments.
- **Registry:** resources are registered in memory when `rack()` runs. Register
  them during startup; the registry is not persisted.
- **Panel authorization:** the panel reuses the `list` rule. Dashboard and
  custom pages have no authorization unless you add it.
- **Validation:** schemas validate shape, not business rules. Enforce ownership
  and tenancy inside authorization functions or the ORM layer.
- **String permissions:** currently allow when no permission source is present.
  Wire `permissions` before depending on them.
- **Returning:** leaving `settings.returning` unset returns row data. Set it to
  `false` if mutation responses should omit `data`.

## 16. Development

```bash
bun install          # install dependencies
bun run dev          # run src/playground.ts
bun test             # unit tests (bun:test)
bun run typecheck    # tsc --noEmit
bun run build        # dist: CSS, JS bundles, .d.ts, browser client
```

Build sub-steps:

```bash
bun run build:css     # Tailwind stylesheet
bun run build:js      # rack + react entry points
bun run build:dts     # declaration files
bun run build:client  # browser panel assets and app.html
```

## 17. Troubleshooting

**`GET /my-resource` returns JSON instead of a panel.**
`reactPlugin()` is not mounted, or the panel is disabled. Add
`.use(reactPlugin())` and check `operations.list` and `page.enabled`.

**Panel loads but CSS/JS returns 404.**
Run `bun run build` so `dist/panel.css`, `dist/panel-app.js`, and
`dist/panel-theme.js` exist.

**`POST` returns `400`.**
Send an `Idempotency-Key` header, or set
`idempotency: { required: false }`.

**A filter is ignored.**
`query.filterable` is set and does not include that field. Filters are silently
dropped by design.

**Search does nothing.**
Set `query.searchable`; an empty or missing list disables search.

**An item route returns `404` for a valid row.**
Check the id type. A non-numeric id cannot match an integer key column, and
`settings.primaryKey` may not match the real key name.

**The panel shows a raw JSON field instead of a form.**
The adapter returned no field descriptors. This is expected for Prisma; for
Drizzle, confirm the `table` is a Drizzle table object.

**The edit dialog is empty or fails to open.**
`operations.detail` must be enabled. Saving uses `PATCH`, so
`operations.update` must be enabled too.

**Resources do not appear in the sidebar.**
They are registered with `metadata.hidden: true`, or `rack()` was called after
the page was rendered, or the parent id in `metadata.parent` does not exist.
