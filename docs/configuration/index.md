# Configuration overview

elysia-rack is configured in the TypeScript code that builds your Elysia application. There is no configuration file, no environment variable namespace, and no command line interface.

This page explains how the parts fit together. For every option and default, see the [Configuration reference](configuration-reference.md).

## The three building blocks

| Function | Import | Role |
|---|---|---|
| `rack(path, options)` | `elysia-rack` | Registers one resource, mounts its routes, and stores navigation metadata |
| `dashboard(options)` | `elysia-rack` | Mounts a dashboard page that lists registered resources |
| `reactPlugin(options)` | `elysia-rack/react` | Serves panel assets and renders React pages to HTML |
| `page(path, props)` | `elysia-rack/react` | Describes a React page to render, used by custom routes |

Only `rack()` and its `model` option are required to expose an API. The panel and dashboard are optional.

## Recommended setup order

Use this order so the React page hook is registered before the pages that depend on it:

```ts
import { Elysia } from "elysia";
import { dashboard, rack } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

const app = new Elysia()
  .use(reactPlugin())
  .use(dashboard({ title: "My Panel", path: "/" }))
  .use(rack("/catalog/products", { model }))
  .use(rack("/catalog/categories", { model }));
```

Without `reactPlugin()`, a panel or dashboard route returns a JSON page descriptor instead of HTML. The data API still works.

## What is configured where

| Concern | Where it is configured |
|---|---|
| Database connection and table | `rack({ model })` |
| URL of a resource | First argument to `rack()` |
| Primary key and delete behavior | `rack({ settings })` |
| Enabled operations | `rack({ operations })` |
| Search, filter, sort, pagination | `rack({ query })` |
| Input validation | `rack({ validation })` |
| Access control | `rack({ authorization })` and your application middleware |
| Panel labels, icons, grouping | `rack({ metadata })` |
| Panel enable or disable | `rack({ page })` |
| Create idempotency | `rack({ idempotency })` |
| OpenAPI metadata | `rack({ openapi })` |
| Dashboard path and title | `dashboard({ path, title })` |
| Panel CSS override | `reactPlugin({ css })` |
| Donate link | `reactPlugin({ donate })` or `dashboard({ donate })` |
| Server port | Your Elysia application with `app.listen(port)` |

## Environment variables

elysia-rack does not read any environment variables itself. You may read environment variables in your own application to create the database connection, for example:

```ts
const db = drizzle(process.env.DATABASE_URL ?? "app.db");
```

That variable is defined by your application, not by elysia-rack.

## Restart requirements

There is no hot configuration reload. All options are read when `rack()`, `dashboard()`, and `reactPlugin()` run during application startup.

After changing any option, restart the server. Re-registering the same resource path at runtime replaces the previous registry entry, but this is intended for startup code, not for live reconfiguration.

## Required versus optional

Only `rack()` requires an argument: `model`.

Everything else has a safe default:

- All six operations are enabled.
- The primary key is `id`.
- Soft delete is disabled.
- Search is disabled until `query.searchable` is set.
- Filters and sorts are unrestricted until `query.filterable` or `query.sortable` is set.
- Pagination defaults to 20 records per page with a maximum of 100.
- Create requests require an `Idempotency-Key` header.
- The panel and dashboard are enabled when `reactPlugin()` is mounted.

## Multiple resources

Register each resource with its own `rack()` call. Use `metadata.id` as a stable identifier and `metadata.parent` to nest resources in the sidebar.

```ts
rack("/catalog/products", {
  model,
  metadata: { id: "products", label: "Product", group: "Catalog", order: 1 },
});

rack("/catalog/variants", {
  model,
  metadata: {
    id: "variants",
    label: "Variant",
    group: "Catalog",
    order: 2,
    parent: "products",
  },
});
```

## Next step

Continue to the [Configuration reference](configuration-reference.md).
