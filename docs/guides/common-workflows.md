# Common workflows

Each section on this page solves one practical task. Apply the change in your application code, restart the server, and verify the result.

## Make a resource read-only

**Objective:** allow users to browse and read records without creating, editing, or deleting them.

**Prerequisites:** a working `rack()` resource.

**Steps:**

1. Set the write operations to `false`:

```ts
rack("/catalog/categories", {
  model: { drizzle: { db, table: categories } },
  operations: {
    create: false,
    replace: false,
    update: false,
    delete: false,
  },
});
```

2. Restart the server.

**Expected result:** the panel shows the table and `New record` disappears. Row edit and delete controls and the bulk bar are hidden. `POST`, `PUT`, `PATCH`, and `DELETE` return `404`.

**Common mistake:** disabling `list` as well. That also removes the panel and the `QUERY /data` route.

## Use a non-`id` primary key

**Objective:** address records by a column such as `slug` or `code`.

**Prerequisites:** the column is unique and exists in the table.

**Steps:**

1. Set `settings.primaryKey`:

```ts
rack("/catalog/categories", {
  model: { drizzle: { db, table: categories } },
  settings: { primaryKey: "slug" },
});
```

2. Restart the server.

**Expected result:** item routes use the configured key, for example:

```text
PUT /catalog/categories/peripherals
QUERY /catalog/categories/data/peripherals
```

**Common mistake:** assuming the key is detected automatically. It is not. The default is always `id`.

## Enable soft delete

**Objective:** keep deleted rows in the database while hiding them from reads.

**Prerequisites:** the table has a nullable timestamp column.

**Steps:**

1. Add a nullable timestamp column to your table, for example `deletedAt`.
2. Enable soft delete and, if needed, name the column:

```ts
rack("/catalog/products", {
  model: { drizzle: { db, table: products } },
  settings: {
    softDelete: true,
    deletedAtField: "deletedAt",
  },
});
```

3. Restart the server.

**Expected result:** deleting a record writes the current timestamp to the column. List and detail requests exclude rows with a non-null timestamp. The delete response includes `"softDelete": true`.

**Common mistake:** enabling soft delete without the timestamp column. The delete request fails because the column does not exist.

## Organize the sidebar

**Objective:** group resources and nest related resources.

**Prerequisites:** each resource has a unique `metadata.id`.

**Steps:**

1. Give related resources the same `group`.
2. Use `order` to control position, lower first.
3. Use `parent` with the parent resource ID to nest children.

```ts
rack("/catalog/products", {
  model,
  metadata: {
    id: "products",
    label: "Product",
    pluralLabel: "Products",
    group: "Catalog",
    order: 1,
    icon: "package",
  },
});

rack("/catalog/variants", {
  model,
  metadata: {
    id: "variants",
    label: "Variant",
    pluralLabel: "Variants",
    group: "Catalog",
    order: 2,
    icon: "tags",
    parent: "products",
  },
});
```

4. Restart the server and open any panel or the dashboard.

**Expected result:** the sidebar shows a `Catalog` group with `Products`, and `Variants` nested under `Products`.

**Common mistake:** using a `parent` value that does not match a registered `metadata.id`. The resource appears at the top level instead.

## Hide a resource from navigation

**Objective:** keep an API available without showing it in the sidebar or dashboard.

**Steps:**

1. Set `metadata.hidden` to `true`:

```ts
metadata: { id: "audit", hidden: true }
```

2. Restart the server.

**Expected result:** the resource disappears from the sidebar and dashboard. Its panel, if enabled, and its data routes still work when opened directly.

## Disable the panel but keep the API

**Objective:** expose only the JSON API for a resource.

**Steps:**

1. Set `page.enabled` to `false`:

```ts
rack("/catalog/products", {
  model,
  page: { enabled: false },
});
```

2. Restart the server.

**Expected result:** `GET /catalog/products` returns `404`. `QUERY /catalog/products/data` and the mutation routes work normally.

## Protect a resource and its panel

**Objective:** require a permission or a custom check before users can read or change records.

**Prerequisites:** your application has a way to determine permissions.

**Steps:**

1. Add authorization rules per operation.
2. Use a string when your application provides permissions through `app.decorate` or `app.state`, or through the `x-permissions` header.
3. Use a function when the check needs the request or record ID.

```ts
rack("/catalog/products", {
  model,
  authorization: {
    list: "products.view",
    detail: "products.view",
    create: "products.create",
    update: "products.update",
    delete: async ({ request, id }) =>
      request.headers.get("x-admin") === "true" && id !== "1",
  },
});
```

4. Provide the permission source in your application, for example:

```ts
app.decorate("permissions", ["products.view", "products.create"]);
```

**Expected result:** the panel page uses the `list` rule. Denied requests return `403` with an error envelope.

**Common mistake:** relying on string rules without any permission source. When no source is configured, string rules allow the request.

**Important:** the dashboard and custom React pages do not use these rules. Protect their URLs separately in your application if needed.

## Customize the panel stylesheet

**Objective:** change colors or spacing without editing package files.

**Steps:**

1. Pass a CSS file path or raw CSS to `reactPlugin`:

```ts
import { reactPlugin } from "elysia-rack/react";

app.use(
  reactPlugin({
    css: { content: ":root{--color-primary:#0055aa}" },
  }),
);
```

You can also point to a file:

```ts
app.use(reactPlugin({ css: "./panel-overrides.css" }));
```

2. Restart the server and reload the panel.

**Expected result:** `/__rack/panel.css` serves your override. The default stylesheet is replaced, not appended.

**Common mistake:** passing a path that does not exist. If the string is not a valid file and does not look like CSS, the default stylesheet is used.

## Hide the donate link

**Objective:** remove the Ko-fi link from the panel and dashboard.

**Steps:**

1. Disable it for all pages:

```ts
app.use(reactPlugin({ donate: false }));
```

Or disable it only for the dashboard:

```ts
app.use(dashboard({ title: "My Panel", donate: false }));
```

2. Restart the server.

**Expected result:** the footer no longer shows the donate link.

## Make idempotency optional

**Objective:** allow create requests without an idempotency key.

**Steps:**

1. Set `required` to `false`:

```ts
rack("/catalog/products", {
  model,
  idempotency: { required: false },
});
```

2. Restart the server.

**Expected result:** `POST` without a key succeeds. Requests that include a key still use replay protection.

To remove idempotency handling entirely, set `enabled: false` instead. This skips the store and never replays a response.

## Use a shared idempotency store

**Objective:** prevent duplicate creates when more than one application instance is running.

**Prerequisites:** a shared store such as Redis or a database table.

**Steps:**

1. Implement the store contract.
2. Pass it to `idempotency.store`.
3. Use the same store from every instance.

```ts
const store = {
  async get(key: string) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : undefined;
  },
  async set(key: string, record: unknown, ttlSeconds?: number) {
    await redis.set(key, JSON.stringify(record), {
      EX: ttlSeconds ?? 86400,
    });
  },
};

rack("/catalog/products", {
  model,
  idempotency: { store, ttl: 3600 },
});
```

**Expected result:** a key used on one instance is recognized by the others. The stored record expires after the configured TTL.

**Common mistake:** using the default in-memory store with multiple instances. Each process has its own store, so the same key can create duplicate records on different instances.

## Add OpenAPI documentation

**Objective:** include the generated routes in an OpenAPI document.

**Prerequisites:** an OpenAPI plugin for Elysia, such as `@elysiajs/swagger`.

**Steps:**

1. Add `openapi` metadata to the resource:

```ts
openapi: {
  tags: ["Catalog"],
  description: "Product catalog",
  operations: {
    list: { summary: "List products", operationId: "listProducts" },
    create: { summary: "Create product" },
  },
},
```

2. Mount your OpenAPI plugin on the same Elysia application.

**Expected result:** the generated routes appear in the OpenAPI document with the configured tags, summaries, descriptions, and operation IDs.

**Common mistake:** expecting `openapi` to generate a document by itself. It only attaches route metadata.

## Next steps

- [Advanced usage](advanced-usage.md): custom pages, registry helpers, and production deployment.
- [Configuration reference](../configuration/configuration-reference.md): exact option names and defaults.
