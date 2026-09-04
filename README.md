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

## Dashboard

Recommended setup uses `react()`, `dashboard()`, and `rack()`. Each `rack()`
stores its metadata tree in memory (registry) and `dashboard()` loads it at
render time via `getRackTree()`.

```ts
import { dashboard, rack } from "elysia-rack";
import { pages, reactPlugin } from "elysia-rack/react";

const app = new Elysia()
  .use(reactPlugin({ pages }))
  .use(dashboard({ title: "My Panel", path: "/" }))
  .use(rack("/catalog/products", { model, metadata: { id: "products", group: "Catalog", order: 1 } }))
  .use(rack("/catalog/variants", { model, metadata: { id: "variants", group: "Catalog", order: 2, parent: "products" } }));
```

### Tree metadata

`metadata.parent` builds a hierarchy. Children are rendered nested under their
parent in the sidebar and kept ordered by `order` then label.

```ts
rack("/catalog/products", { metadata: { id: "products", group: "Catalog", order: 1 } });
rack("/catalog/variants", { metadata: { id: "variants", parent: "products", group: "Catalog", order: 2 } });
```

Helpers: `listRacks()`, `getRack(id)`, `getRackTree()`, `flatRackTree()`, `buildRackTree(racks)`, `clearRacks()` from `elysia-rack`.

The dashboard page itself can also be used manually:

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

The sidebar groups by `metadata.group`, sorts by `order`, skips `hidden`,
and shows the selected resource's panel inside an `<iframe>`. Links use
`?resource=<id>` (no JavaScript required).

## HTML template

SSR uses `src/react/app.html` as the shell. It is read at runtime, cached,
and streamed with the React output.

```html
<!doctype html>
<html><head>
  <title>{{title}}</title>
  <link rel="stylesheet" href="/__rack/panel.css" />
  <!--app-head-->
</head><body>
  <!--app-->
</body></html>
```

- `{{title}}` is replaced (escaped) per page.
- `<!--app-->` (also `{{body}}`, `<!--app-html-->`) marks where the React stream is injected.
- Fallback shell is used if the file is missing. `dist/app.html` is a static copy of `src/react/app.html` included in the package.

Override the template by editing `src/react/app.html` (and `dist/app.html` for the published package).

## Panel CSS override

Override `panel.css` at `react()` config without forking:

```ts
import { pages, reactPlugin } from "elysia-rack/react";

// file path (resolved from cwd/dist), raw string, or object
reactPlugin({ pages, css: "./my-panel.css" });
reactPlugin({ pages, css: { path: "./my-panel.css" } });
reactPlugin({ pages, css: { content: ":root{--color-primary:red}" } });
reactPlugin({ pages, panelCss: "body{...}" }); // alias
```

If a file path exists it is served; otherwise a raw CSS string is served.
Fallback is `dist/panel.css`.

## Panel assets

Static assets are served under `/__rack/*`:

- `dist/panel.css` — panel stylesheet (prebuilt)
- `dist/panel-theme.js` — dark/light toggle
- `dist/panel-app.js` — live query + actions (imports `components/href.ts`, `components/panelForm.ts`)

Pages reference `/__rack/panel.css`, `/__rack/panel-theme.js` and
`/__rack/panel-app.js` via `reactPlugin`. No build step required — assets are
static and included in the published package.

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
`prefers-color-scheme`. The `◐ Theme` button in the masthead toggles it.
Components must only use semantic utilities (`bg-background`,
`text-foreground`, `bg-table-row-hover`, …) so themes swap without
touching React code.

## Release (maintainer)

1. One-time setup: npmjs.com → package → Settings → Trusted Publisher → GitHub Actions (`notoofly/elysia-rack`, workflow `publish.yml`).
2. Bump `version` in `package.json`.
3. Create a GitHub Release with tag `v<version>` (e.g. `v0.1.0`).
4. The `publish` workflow runs automatically: install, typecheck, test, build, tag-vs-version check, `npm publish --provenance`.

## Scripts

```bash
bun install        # install dependencies
bun run dev        # run src/playground.ts
bun test           # unit tests (bun:test)
bun run typecheck  # tsc --noEmit
bun run build      # dist/ (js via bun build + .d.ts via tsc)
```

## License

MIT © notoofly
