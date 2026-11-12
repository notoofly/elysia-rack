# Configuration reference

This page lists every user-facing option. All options are passed in TypeScript code. Restart the application after any change.

## `rack(path, options)`

`path` is the URL prefix for the resource, for example `/catalog/products`. `options` accepts the keys below. Only `model` is required.

| Option | Type | Default | Purpose |
|---|---|---|---|
| `model` | Drizzle or Prisma model object | Required | Selects the adapter and the table or model |
| `settings` | object | See below | Primary key, soft delete, and response data |
| `operations` | object | All enabled | Turns individual routes on or off |
| `validation` | object | None | Elysia or TypeBox schemas per operation |
| `authorization` | object | Allow all | Access rules per operation |
| `query` | object | See below | Search, filter, sort, and pagination rules |
| `metadata` | object | Path as ID | Labels, icons, grouping, and navigation |
| `page` | object | Panel enabled | Panel page behavior |
| `idempotency` | object | Keys required | Create request replay protection |
| `openapi` | object | None | Route metadata for an OpenAPI generator |

## `model`

The two shapes are mutually exclusive.

Drizzle:

```ts
model: {
  drizzle: {
    db,                 // drizzle(...) database instance
    table: products,    // Drizzle table object
  },
}
```

Prisma:

```ts
model: {
  prisma: {
    client: prisma,        // Prisma client
    model: prisma.product, // model delegate used for queries
  },
}
```

The Drizzle adapter inspects the table columns to build panel forms. The Prisma adapter cannot inspect its schema at runtime, so Prisma forms fall back to the columns in existing rows or a raw JSON field for an empty table.

## `settings`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `primaryKey` | string | `"id"` | Column used for item routes and lookups |
| `returning` | boolean | Not set | Whether mutations include the row in `data` |
| `softDelete` | boolean | `false` | Timestamp rows instead of deleting them |
| `deletedAtField` | string | `"deletedAt"` | Column used for the soft delete timestamp |

### `primaryKey`

The primary key is not detected from the ORM schema. Set it when the key column is not named `id`.

Example with a slug primary key:

```ts
rack("/catalog/categories", {
  model: { drizzle: { db, table: categories } },
  settings: { primaryKey: "slug" },
});
```

Item routes become `/catalog/categories/:slug`, and detail requests use the same key.

### `returning`

When `returning` is not set, mutation responses include the affected row in `data`.

When `returning` is `false`, responses omit `data`. When `returning` is `true`, responses include `"returning": true`.

### `softDelete`

When `softDelete` is `true`, delete requests write a timestamp to `deletedAtField` instead of removing the row. List and detail requests skip rows that have a non-null value in that column.

The table must have a nullable timestamp column with the configured name. This option does not add the column for you.

```ts
settings: {
  softDelete: true,
  deletedAtField: "deletedAt",
}
```

## `operations`

Every operation is enabled by default. Set an operation to `false` to remove its route and its panel control.

| Key | Route | Default |
|---|---|---|
| `list` | `QUERY {path}/data` and the panel page | `true` |
| `detail` | `QUERY {path}/data/:id` | `true` |
| `create` | `POST {path}` | `true` |
| `replace` | `PUT {path}/:id` | `true` |
| `update` | `PATCH {path}/:id` | `true` |
| `delete` | `DELETE {path}/:id` | `true` |

Example, read-only resource:

```ts
operations: {
  create: false,
  replace: false,
  update: false,
  delete: false,
}
```

Notes:

- Disabling `list` also disables the panel page.
- The edit dialog loads data through the `detail` route.
- The edit dialog saves with `PATCH`. Keep `update` enabled if users should be able to edit from the panel.
- Disabling an operation makes its route return `404`.

## `validation`

Values are Elysia or TypeBox schemas. Validation failures return HTTP `422`.

| Key | Applied to |
|---|---|
| `create` | `POST` request body |
| `replace` | `PUT` request body |
| `update` | `PATCH` request body |
| `params` | Item routes, including detail, replace, update, and delete |
| `query` | `QUERY /data` request body |

Example:

```ts
import { t } from "elysia";

validation: {
  create: t.Object({
    name: t.String({ minLength: 3 }),
    price: t.Numeric({ minimum: 0 }),
  }),
  update: t.Partial(t.Object({
    name: t.String(),
    price: t.Numeric({ minimum: 0 }),
  })),
  params: t.Object({ id: t.String() }),
}
```

Validation checks the shape of the data. It does not enforce ownership or business rules. Implement those in authorization functions or your database layer.

## `authorization`

Each operation accepts a rule. Rules are evaluated independently.

```ts
authorization: {
  list: true,
  detail: "products.view",
  create: "products.create",
  update: "products.update",
  delete: async ({ request }) => request.headers.get("x-api-key") === "secret",
}
```

| Rule | Effect |
|---|---|
| Omitted or `true` | Allow |
| `false` | Deny with `403` |
| String | Require the named permission |
| Function | Call it and allow when the result is truthy |

### String permissions

A string rule is checked against these sources, in order:

1. `permissions` decorated on the Elysia context, for example `app.decorate("permissions", ["products.view"])`.
2. `permissions` stored with `app.state("permissions", ["products.view"])`.
3. The `x-permissions` request header, as a comma-separated list such as `products.view, products.create`.

If none of these sources is present, the request is allowed. This is a development convenience and a security limitation. Configure a permission source before relying on string rules in production.

### Function rules

A function rule receives an object with:

| Field | Meaning |
|---|---|
| `operation` | The operation being checked |
| `request` | The incoming `Request` object |
| `id` | The item ID for item routes, otherwise `undefined` |
| `resource` | The model object passed to `rack()` |

Return `true` or a truthy value to allow, and `false` to deny with `403`.

### Panel access

The panel page uses the `list` rule. The dashboard and custom pages have no built-in authorization.

## `query`

Controls what clients may search, filter, sort, and paginate.

```ts
query: {
  searchable: ["name", "sku"],
  filterable: ["status", "categoryId"],
  sortable: ["name", "price", "createdAt"],
  defaultSort: { field: "createdAt", direction: "desc" },
  pagination: { default: 20, max: 100 },
}
```

| Key | Type | Default | Meaning |
|---|---|---|---|
| `searchable` | string array | Not set | Fields used by the `search` parameter |
| `filterable` | string array | Not set | Fields allowed as filters |
| `sortable` | string array | Not set | Fields allowed in `sort` |
| `defaultSort` | object | Not set | Sort used when no valid sort is requested |
| `pagination.default` | number | `20` | Records per page when `limit` is omitted |
| `pagination.max` | number | `100` | Maximum allowed page size |

Behavior:

- If `searchable` is omitted or empty, the `search` parameter has no effect.
- If `filterable` is omitted, any non-reserved parameter is accepted as a filter. If it is set, unlisted filters are silently ignored.
- If `sortable` is omitted, any field name is accepted as a sort field.
- If a requested sort is not allowed, `defaultSort` is used instead.
- If `defaultSort` is omitted, no sorting is applied unless a valid sort is requested.
- Page numbers start at 1. Invalid values fall back to page 1.
- Page size is clamped between 1 and `pagination.max`. A non-numeric `limit` becomes 1.

### List parameters

| Parameter | Meaning |
|---|---|
| `search` | Text search across `searchable` fields |
| `sort` | Field to sort by |
| `order` or `direction` | `asc` or `desc` |
| `page` | Page number, starting at 1 |
| `limit` or `perPage` | Page size |
| Any other key | A filter, subject to `filterable` |

Reserved keys are `search`, `sort`, `order`, `direction`, `page`, `limit`, and `perPage`. Every other key is a filter candidate.

When a filter value is an array, it is treated as a multi-value filter. Send arrays in the JSON request body, not in the URL.

## `metadata`

Controls labels, icons, and navigation.

```ts
metadata: {
  id: "products",
  label: "Product",
  pluralLabel: "Products",
  group: "Catalog",
  parent: "catalog-root",
  icon: "package",
  order: 1,
  hidden: false,
}
```

| Key | Type | Default | Meaning |
|---|---|---|---|
| `id` | string | Mount path | Unique resource ID and response `resource` value |
| `label` | string | None | Singular display name |
| `pluralLabel` | string | None | Plural display name used in the sidebar |
| `group` | string | `"General"` | Sidebar group name |
| `parent` | string | None | ID of another resource to nest under |
| `icon` | string | None | Lucide icon name such as `package` or `ShoppingCart` |
| `order` | number | `0` | Sort order within the group, lower first |
| `hidden` | boolean | `false` | Hide from the sidebar and dashboard |

Behavior:

- Resources with the same `group` appear together. Groups are sorted by name.
- A `parent` that is not registered makes the resource a root item.
- Children are sorted by `order`, then by label.
- `hidden` removes a resource from navigation, but its routes continue to work.
- Unknown icon names render as text instead of an icon.

## `page`

Controls the panel page mounted at `GET {path}`.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `path` | string | `"/panel"` | React page registry key to render |
| `enabled` | boolean | `true` | Set to `false` to remove the panel page |

`page.path` is a key in the React page registry, not an additional URL. The panel is always mounted at the resource path. To render a custom component, register a page under a new key and point `page.path` at it.

Disabling the panel keeps the data API available.

## `idempotency`

Controls replay protection for `POST` create requests.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `enabled` | boolean | `true` | Enable or disable idempotency handling |
| `required` | boolean | `true` | Reject creates that have no key |
| `header` | string | `"Idempotency-Key"` | Header that carries the client key |
| `ttl` | number | `86400` | Replay window in seconds |
| `store` | object | In-memory store | Custom shared store |

Behavior:

- Keys are scoped per resource, so the same key can be used on different resources.
- A replay returns the stored status and body with the header `Idempotent-Replayed: true`.
- Concurrent requests with the same key in one process share a single insert.
- The default memory store holds up to 1000 entries and evicts the oldest.
- The default store is per process. Use a shared store when running more than one instance.

Custom store contract:

```ts
import type { Rack } from "elysia-rack";

const store: Rack.CrudIdempotencyStore = {
  async get(key) {
    return undefined; // return the stored record or undefined
  },
  async set(key, record, ttlSeconds) {
    // store the record and honor ttlSeconds
  },
};
```

The store receives keys that are already scoped to the resource. It must honor the TTL when one is provided.

## `openapi`

Adds metadata to the generated Elysia routes. It does not generate an OpenAPI document by itself. Use an OpenAPI plugin such as `@elysiajs/swagger` to expose one.

```ts
openapi: {
  tags: ["Catalog"],
  description: "Product catalog",
  operations: {
    list: { summary: "List products", operationId: "listProducts" },
    create: { summary: "Create product" },
    detail: { description: "Fetch one product" },
  },
}
```

| Key | Meaning |
|---|---|
| `tags` | Tags applied to all routes for the resource |
| `description` | Resource-level description |
| `operations` | Per-operation overrides |

Per-operation values override the resource-level values. If `openapi.tags` is omitted, the adapter falls back to `metadata.label`, then `metadata.id`, then no tag.

## `dashboard(options)`

| Option | Type | Default | Meaning |
|---|---|---|---|
| `path` | string | `"/"` | URL where the dashboard is mounted |
| `title` | string | `"Panel"` | Title shown in the dashboard header and sidebar |
| `pagePath` | string | `"/dashboard"` | React page registry key to render |
| `donate` | boolean | `true` | Show or hide the Ko-fi link |

The dashboard renders every registered resource as a table with a sidebar. It reads the registry when the page is rendered, so resources can be registered before or after the dashboard is mounted.

The dashboard has no built-in authorization. Protect its path in your application if it should not be public.

## `reactPlugin(options)`

| Option | Type | Default | Meaning |
|---|---|---|---|
| `pages` | object or array | Built-in pages | Additional React pages, merged with the defaults |
| `css` | string or object | `dist/panel.css` | Override the panel stylesheet |
| `panelCss` | string or object | None | Alias for `css` |
| `donate` | boolean | `true` | Show or hide the Ko-fi link globally |

The built-in page keys are:

- `"/dashboard"`
- `"/panel"`

Custom pages are merged with these defaults. If a custom page uses the same key, the custom page wins.

The plugin serves these assets:

| URL | Source |
|---|---|
| `/__rack/panel.css` | `dist/panel.css` or your override |
| `/__rack/panel-app.js` | `dist/panel-app.js` |
| `/__rack/panel-theme.js` | `dist/panel-theme.js` |

Static assets are cached by the browser for one hour. If an asset is missing, the route returns `404`.

### CSS override forms

```ts
reactPlugin({ css: "./my-panel.css" });
reactPlugin({ css: { path: "./my-panel.css" } });
reactPlugin({ css: { content: ":root{--color-primary:#c00}" } });
reactPlugin({ panelCss: "body{padding:0}" });
```

| Form | Behavior |
|---|---|
| Plain string | Used as a file if the file exists, otherwise served as raw CSS when it contains `{` or a newline |
| `{ path }` | Always treated as a file path |
| `{ content }` | Always treated as raw CSS |
| Missing or unreadable file | Falls back to the default stylesheet |

## `page(path, props)`

`page()` describes a page for `reactPlugin()` to render. Custom routes can return it:

```ts
import { page } from "elysia-rack/react";

new Elysia()
  .use(reactPlugin())
  .get("/hello", () => page("/hello", { name: "Ada" }));
```

The first argument is a key in the page registry. The second argument is passed to the React component as props.

## Registry helpers

These helpers expose the in-memory resource registry. They are useful for custom navigation and custom pages.

| Helper | Returns |
|---|---|
| `listRacks()` | All registrations in registration order |
| `getRack(id)` | One registration by `metadata.id`, or `undefined` |
| `getRackTree()` | Nested tree sorted by `order` then label |
| `flatRackTree()` | Depth-first list of registrations |
| `buildRackTree(racks)` | Tree built from an explicit registration list |
| `clearRacks()` | Clears the registry, mainly for tests |

The registry lives in memory and is filled when `rack()` runs during startup. It is not persisted.
