# elysia-rack

Model-driven CRUD rack for [Elysia](https://elysiajs.com): declare a resource once, get REST + `QUERY` routes, validation, authorization, query engine, OpenAPI metadata, and a React panel — running on [Bun](https://bun.com) or Node.js 20+.

## Install

```bash
bun add elysia-rack elysia react react-dom
# or
npm i elysia-rack elysia react react-dom
```

`elysia`, `react`, and `react-dom` are peer dependencies.

## Usage

```ts
import { Elysia } from "elysia";
import { rack } from "elysia-rack";

const app = new Elysia().use(
  rack("/catalog/products", {
    model: { drizzle: { db, table: products } },

    validation: {
      create: CreateProductSchema,
      replace: ReplaceProductSchema,
      update: UpdateProductSchema,
      params: ProductParamsSchema,
      query: ProductQuerySchema,
    },

    authorization: {
      list: "products.view",
      create: "products.create",
      delete: async ({ request }) => canDelete(request),
    },

    query: {
      searchable: ["name", "sku"],
      filterable: ["status", "categoryId"],
      sortable: ["name", "price", "createdAt"],
      defaultSort: { field: "createdAt", direction: "desc" },
      pagination: { default: 20, max: 100 },
    },

    operations: { create: true, delete: false },

    metadata: {
      id: "products",
      label: "Product",
      pluralLabel: "Products",
      group: "Catalog",
    },

    openapi: { tags: ["Products"] },
    settings: { primaryKey: "id", returning: true },
  }),
);

app.listen(3000);
```

Generated routes (all gated by `operations`, default on):

| Operation | Method | Path |
|---|---|---|
| display panel | `GET` | `/` |
| list data | `QUERY` | `/data` |
| detail data | `QUERY` | `/data/:id` |
| create | `POST` | `/` |
| replace | `PUT` | `/:id` |
| update | `PATCH` | `/:id` |
| delete | `DELETE` | `/:id` |

`GET /` renders the React panel via `page("/panel")` (customize with the
`page` option, disable with `page: { enabled: false }`). All data reads go
through the `QUERY` method under `/data`. The panel UI calls the same
endpoint live via fetch (progressive enhancement — links and forms still
work through plain `GET` navigation without JavaScript).

## Panel actions

The panel ships create / edit / delete UI driven by the same API:

- `+ New` opens a create dialog (fields derived from row columns,
  primary key optional). Submit sends `POST /` with an auto-generated
  `Idempotency-Key`. Tables without known columns fall back to a raw
  JSON body field.
- Row `Edit` loads the row via `QUERY /data/:id` into a dialog and saves
  with `PATCH /:id`. Empty inputs are skipped (partial update).
- Row `Delete` confirms natively, then `DELETE /:id`.
- Checkbox selection enables the bulk bar: `Delete selected` loops
  `DELETE /:id`, and the field applier loops `PATCH /:id` with the
  chosen field/value. `Clear` resets the selection.

Action UI follows `operations`: disable `create`/`update`/`delete` and
the corresponding buttons, dialogs and bulk controls disappear.

## Idempotency (POST)

`POST /` requires an idempotency key by default. Send a client-generated
key per create attempt:

```bash
curl -X POST localhost:3000/catalog/products \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000' \
  -d '{"name":"Keyboard"}'
```

Replays with the same key return the stored `201` response with an
`Idempotent-Replayed: true` header instead of re-executing. Missing keys
are rejected with `400`. Tune via the `idempotency` option:

```ts
rack("/catalog/products", {
  model: { drizzle: { db, table: products } },
  idempotency: {
    required: false,          // allow keyless POST (default true)
    header: "X-Idempotency-Key",
    ttl: 3600,                // replay window in seconds (default 86400)
    store: myRedisStore,      // shared store for multi-instance deploys
  },
});
```

## ORM adapters

`model` selects the adapter. Drizzle needs `drizzle-orm` installed
(optional peer); Prisma needs no extra dependency — pass any client
delegate (e.g. `prisma.product`):

```ts
// Drizzle (Postgres, SQLite, ...)
import { drizzle } from "drizzle-orm/node-postgres";
model: { drizzle: { db: drizzle(client), table: products } },

// Prisma
model: { prisma: { client: prisma, model: prisma.product } },
```

Conventions:

- String route ids are coerced to numbers for integer columns
  (e.g. `serial`); anything else passes through. Malformed ids resolve
  to `404`, missing rows to `404`.
- `searchable` fields use SQL `LIKE` (case-sensitivity follows the DB).
- `settings.softDelete: true` writes a timestamp to `deletedAt`
  (override with `settings.deletedAtField`) instead of deleting, and
  reads skip soft-deleted rows.
- `settings.returning: false` omits `data` from mutation responses.

## Dashboard (sidebar, breadcrumb, iframe)

Every `rack()` call registers its path, metadata and operations in a
registry (`listRacks()` / `clearRacks()` from `elysia-rack`). The default
`/dashboard` page builds a sidebar (grouped by `metadata.group`, ordered
by `metadata.order`, skipping `hidden`), a breadcrumb
(Dashboard / Group / Label), and shows the selected resource's `GET`
panel inside an `<iframe>`:

```ts
import { page, pages, reactPlugin } from "elysia-rack/react";

const app = new Elysia()
  .use(reactPlugin({ pages }))
  .use(rack("/catalog/products", { model, metadata: { ... } }))
  .get("/", ({ query }) =>
    page("/dashboard", {
      name: "My Shop",
      resource: typeof query.resource === "string" ? query.resource : undefined,
    }),
  );
```

Sidebar links navigate with `?resource=<id>` (full reload, no JavaScript
needed). Without a selection the first registered resource is shown.

React panel rendering via the `./react` subpath:

```ts
import { page, pages, reactPlugin } from "elysia-rack/react";

const app = new Elysia()
  .use(reactPlugin({ pages }))
  .get("/", () => page("/dashboard", { name: "Ada" }));
```

## Panel assets (Vite)

CSS, Tailwind and browser JavaScript go through Vite (`vite.config.ts`,
`bun run build:assets`):

- `src/react/page/panel.css` — stylesheet entry (Tailwind v4) → `dist/panel.css`
- `src/react/page/client/theme.ts` — dark/light toggle → `dist/panel-theme.js`
- `src/react/page/client/panel.ts` — live query + actions → `dist/panel-app.js`
  (imports shared `components/href.ts` and `components/panelForm.ts`)

Pages reference `/__rack/panel.css`, `/__rack/panel-theme.js` and
`/__rack/panel-app.js`, served by `reactPlugin` from `dist/` (run the
build before `dev`; CI and `prepublishOnly` already chain it).

## Panel theme

`src/react/page/panel.css` is the stylesheet entry:

- `theme/tokens.css` — full semantic tokens (surface, text, status,
  chart, selection, focus, overlay, navigation, table, form, sidebar),
  shadcn/Tailwind compatible, mapped via `@theme inline`.
- `theme/dark.css` — `.dark` overrides.
- `theme/koran.css` — default newspaper theme (warm paper, serif
  headlines). Remove its import for the neutral look.
- `theme/components.css` — newspaper component classes + base styles.

Dark mode flips automatically: stored choice (`localStorage`), else
`prefers-color-scheme`. The `◐ Tema` button in the masthead toggles it.
Components must only use semantic utilities (`bg-background`,
`text-foreground`, `bg-table-row-hover`, …) so themes swap without
touching React code.

## Release (maintainer)

1. Setup sekali: npmjs.com → package → Settings → Trusted Publisher → GitHub Actions (`notoofly/elysia-rack`, workflow `publish.yml`).
2. Naikkan `version` di `package.json`.
3. Buat GitHub Release dengan tag `v<version>` (mis. `v0.1.0`).
4. Workflow `publish` jalan otomatis: install, typecheck, build aset, test, build, cek tag = versi, `npm publish --provenance`.

## Scripts

```bash
bun install        # install dependencies
bun run dev        # run src/playground.ts
bun test           # unit tests with full coverage (bun:test)
bun run typecheck  # tsc --noEmit
bun run build      # dist/ (js via bun build + .d.ts via tsc)
```

## License

MIT © notoofly
