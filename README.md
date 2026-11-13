# elysia-rack

[![npm version](https://img.shields.io/npm/v/elysia-rack)](https://www.npmjs.com/package/elysia-rack) [![license: MIT](https://img.shields.io/npm/l/elysia-rack)](LICENSE) [![Ko-fi Donate](https://img.shields.io/badge/Ko--fi-Donate-ff5e5b?logo=ko-fi&logoColor=white)](https://ko-fi.com/notoofly_manu)

Model-driven CRUD rack for [Elysia](https://elysiajs.com): declare a database model once and get REST routes, a `QUERY` read API, validation, authorization, OpenAPI metadata, and a React admin panel — running on [Bun](https://bun.com) or Node.js 20+.

End-user documentation covers installation, configuration, daily usage, and troubleshooting: [docs/index.md](docs/index.md).

## What it does

elysia-rack turns a single database table or model into a complete admin resource. You describe the model once with `rack()` and you get:

- **Routes**: `GET /` (panel), `QUERY /data` (list), `QUERY /data/:id` (detail), `POST /` (create), `PUT /:id` (replace), `PATCH /:id` (update), `DELETE /:id` (delete).
- **A React panel**: table, create/edit/detail dialogs, soft-delete restore, bulk delete and field updates, search, filtering, sorting, and pagination.
- **Safety**: per-operation validation (TypeBox via Elysia), per-operation authorization, idempotent creates, and OpenAPI metadata for generated routes.
- **ORM support**: Drizzle (Postgres, SQLite, …) or Prisma. Panel assets are served under `/__rack/*` after `bun run build`.

The panel reads and writes through the custom `QUERY` HTTP method, so reverse proxies, load balancers, and CDNs must allow it. There is no built-in login system — you add authentication and authorization rules yourself.

## Install

```bash
bun add elysia-rack elysia react react-dom
# or
npm i elysia-rack elysia react react-dom
```

`elysia`, `react`, and `react-dom` are peer dependencies. `drizzle-orm` is an optional peer (only needed for the Drizzle adapter).

Supported runtimes: Bun >= 1.0.0, or Node.js >= 20.0.0. Elysia >= 1.4.0 and React >= 18 are required.

## Quick start

```ts
import { Elysia } from "elysia";
import { rack } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

// `db` is your Drizzle instance; `products` is your drizzle-orm table.
const app = new Elysia()
  .use(reactPlugin())
  .use(
    rack("/catalog/products", {
      model: { drizzle: { db, table: products } },
      metadata: {
        id: "products",
        label: "Product",
        pluralLabel: "Products",
        group: "Catalog",
        icon: "package",
      },
      settings: { primaryKey: "id", returning: true },
    }),
  )
  .listen(3000);
```

That gives you `GET /catalog/products` (panel), `QUERY /catalog/products/data` (list), `POST /catalog/products` (create), and `PUT/PATCH/DELETE /catalog/products/:id`.

## Routes

| Operation | Method | Path | Gated by |
|---|---|---|---|
| Panel | `GET` | `/` | `operations.list` + `page.enabled` |
| List | `QUERY` | `/data` | `operations.list` |
| Detail | `QUERY` | `/data/:id` | `operations.detail` |
| Create | `POST` | `/` | `operations.create` |
| Replace | `PUT` | `/:id` | `operations.replace` |
| Update | `PATCH` | `/:id` | `operations.update` |
| Delete | `DELETE` | `/:id` | `operations.delete` |

All operations default to `true`. Turn any off with `operations: { create: false }`, etc.

## Configuration

`rack(path, options)` accepts:

| Option | Purpose |
|---|---|
| `model` | `{ drizzle: { db, table } }` or `{ prisma: { client, model } }` |
| `validation` | TypeBox schemas for `create`, `replace`, `update`, `params`, `query` |
| `authorization` | Per-operation rule: `true`/`false`/permission string/function |
| `query` | `searchable`, `filterable`, `sortable`, `defaultSort`, `pagination` |
| `operations` | Which CRUD operations to enable (all on by default) |
| `metadata` | `id`, `label`, `pluralLabel`, `group`, `icon`, `order`, `parent`, `hidden`, `hiddenFields`, `fields` |
| `actions` | Custom row/toolbar buttons (`label`, `href` with `:id`, `method`, `confirm`, `icon`, `scope`) |
| `settings` | `primaryKey` (default `"id"`), `softDelete`, `deletedAtField` (default `"deletedAt"`), `returning` |
| `page` | Panel route: `{ enabled?: boolean, path?: string }` (default path `"/panel"`) |
| `openapi` | `tags`, `description`, per-operation summaries |
| `idempotency` | `required` (default `true`), `header` (default `"Idempotency-Key"`), `ttl` seconds (default `86400`), `store` |

### Fields and relations

`metadata.fields` configures per-field display:

```ts
metadata: {
  fields: {
    name: { label: "Product name", order: 1 },
    price: { format: "currency", currency: "USD", order: 2 },
    status: { format: "badge", order: 3 },
    categoryId: {
      label: "Category",
      order: 4,
      relation: {
        load: async () => loadCategories(), // or static options: [...]
      },
    },
    cost: { hideInTable: true }, // editable in forms, not listed
  },
}
```

Supported `format` values: `text`, `number`, `currency`, `date`, `datetime`, `boolean`, `badge`, `json`. A `relation` renders a `<select>` in forms and shows the related label in the table and detail view. `hiddenFields` hides a field from table columns, forms, and the bulk picker.

### Custom actions

Add extra buttons to the panel:

```ts
actions: [
  {
    label: "Duplicate",
    href: "/catalog/products/:id/duplicate",
    method: "POST",
    confirm: "Duplicate this product?",
  },
  { label: "Export CSV", href: "/catalog/products/export", scope: "toolbar", icon: "download" },
]
```

`:id` in `href` is replaced with the row primary key. Row actions (`scope: "row"`, the default) sit next to Edit/Delete; `scope: "toolbar"` actions sit in the page header. Without `method` the button is a plain link; with `method` the panel calls it via `fetch` and refreshes the table. `confirm` shows a native confirmation first.

Custom action endpoints are yours to protect — the rack's `authorization` rules do not apply to them. Guard the route that handles the action URL yourself.

### Idempotency (create)

`POST /` requires an idempotency key by default:

```bash
curl -X POST localhost:3000/catalog/products \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000' \
  -d '{"name":"Keyboard"}'
```

Replays with the same key return the stored `201` with an `Idempotent-Replayed: true` header instead of re-executing. Missing keys are rejected with `400`. Tune with `idempotency: { required, header, ttl, store }` — pass a shared store (e.g. Redis) for multi-instance deploys; the default is an in-memory store bounded to 1,000 entries.

### Soft delete

`settings: { softDelete: true }` writes a timestamp to `deletedAt` (override `deletedAtField`) instead of removing rows, and reads skip soft-deleted rows. The panel adds a `Show deleted` toggle and a `Restore` button (`PATCH` clearing `deletedAt`), available when `operations.update` is not disabled.

## ORM adapters

- **Drizzle** (Postgres, SQLite, …): `model: { drizzle: { db, table } }`. Requires `drizzle-orm` installed. Search uses SQL `ILIKE`, so it works on databases that support it (e.g. PostgreSQL) and fails on SQLite.
- **Prisma**: `model: { prisma: { client, model: prisma.product } }`. No extra dependency. Prisma does not expose schema info at runtime, so panels fall back to row columns and a raw JSON form body.

## Authorization

`authorization` is per operation. Rules:

- `true` / `undefined` — allow
- `false` — 403
- A permission string such as `"products.delete"` — checked against `x-permissions` (comma-separated header) or context permissions; allowed when no auth source is wired yet
- A function receiving `{ operation, request, id, resource }` — return truthy to allow, falsy for 403

```ts
authorization: {
  list: true,
  delete: async ({ request }) =>
    request.headers.get("x-api-key") === "secret",
  // or: delete: "products.delete",
}
```

## Dashboard and panels

`dashboard()` renders a navigation overview of every resource registered with `rack()`:

```ts
import { dashboard, rack } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "My Shop", path: "/" }))
  .use(
    rack("/catalog/products", {
      model,
      metadata: { id: "products", group: "Catalog", order: 1 },
    }),
  )
  .use(
    rack("/catalog/variants", {
      model,
      metadata: {
        id: "variants",
        parent: "products",
        group: "Catalog",
        order: 2,
      },
    }),
  )
  .listen(3000);
```

`metadata.parent` nests resources under another id; children render nested in the sidebar, ordered by `order` then label. The panel also shows the full tree sidebar and breadcrumb.

Dashboard options: `path` (default `"/"`), `title` (default `"Panel"`), `pagePath` (default `"/dashboard"`), `donate` (default `true` — shows the Ko-fi link in the footer; set `false` to hide).

Tree helpers exported from `elysia-rack`: `listRacks()`, `getRack(id)`, `getRackTree()`, `flatRackTree()`, `buildRackTree(racks)`, `clearRacks()`.

## Pages and theming (`elysia-rack/react`)

`reactPlugin()` bridges Elysia and React and serves panel assets under `/__rack/*` (`panel.css`, `panel-theme.js`, `panel-app.js`). Default pages are `"/dashboard"` and `"/panel"`; custom pages are merged in.

```ts
import { lazyPage, pages, reactPlugin, page } from "elysia-rack/react";

new Elysia().use(reactPlugin()); // defaults only

// extend defaults with your own page
const myPages = { "/hello": lazyPage(() => import("./Hello")) };
new Elysia().use(reactPlugin({ pages: myPages }));

// auto-mount a component at a path (no page() call needed)
new Elysia().use(
  reactPlugin({
    views: [{ path: "/hello", component: Hello, props: { name: "Ada" } }],
  }),
);

// override panel.css (file path, raw CSS string, or { path } / { content })
new Elysia().use(reactPlugin({ css: "./my-panel.css" }));
```

Use `page(path, props)` to return a rendered page from a route, e.g. `.get("/", () => page("/dashboard", { name: "My Shop" }))`.

Dark mode follows `localStorage` or `prefers-color-scheme`, with a theme toggle in the masthead. Components use semantic utilities (`bg-background`, `text-foreground`, …) so themes swap without touching React code.

## Documentation

- [docs/index.md](docs/index.md) — documentation index
- [docs/configuration/configuration-reference.md](docs/configuration/configuration-reference.md) — every user-facing option with defaults
- [docs/getting-started.md](docs/getting-started.md) — install, configure, first operation
- [docs/guides/basic-usage.md](docs/guides/basic-usage.md) and [docs/guides/common-workflows.md](docs/guides/common-workflows.md) — daily usage
- [docs/installation/index.md](docs/installation/index.md) — install and remove with Bun or npm
- [docs/faq.md](docs/faq.md) and [docs/troubleshooting/common-issues.md](docs/troubleshooting/common-issues.md) — common issues

## Contributing

```bash
bun install        # install dependencies
bun run dev        # run src/playground.ts
bun test           # unit tests (bun:test)
bun run typecheck  # tsc --noEmit
bun run build      # dist/ (js via bun build + .d.ts via tsc)
```

Open an issue or pull request at [github.com/notoofly/elysia-rack](https://github.com/notoofly/elysia-rack).

## License

MIT © notoofly

## Additional resources

- Package: [npmjs.com/package/elysia-rack](https://www.npmjs.com/package/elysia-rack)
- Issues: [github.com/notoofly/elysia-rack/issues](https://github.com/notoofly/elysia-rack/issues)
- Support: [ko-fi.com/notoofly_manu](https://ko-fi.com/notoofly_manu)
