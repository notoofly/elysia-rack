# Advanced usage

This page covers custom pages, navigation helpers, production deployment, and behavior that matters when you run elysia-rack with real users.

## Add a custom React page

elysia-rack can render your own React components with the same HTML shell and panel stylesheet used by the built-in pages.

**Objective:** render a custom page at `/hello`.

**Steps:**

1. Create a component that default-exports a React component.

```tsx
// Hello.tsx
export default function Hello({ name }: { name: string }) {
  return <main style={{ padding: 24 }}>Hello {name}</main>;
}
```

2. Register the page with `reactPlugin`.
3. Return a page descriptor from a route.

```ts
import { Elysia } from "elysia";
import { lazyPage, page, reactPlugin } from "elysia-rack/react";

const myPages = {
  "/hello": lazyPage(() => import("./Hello")),
};

const app = new Elysia()
  .use(reactPlugin({ pages: myPages }))
  .get("/hello", () => page("/hello", { name: "Ada" }));
```

**Expected result:** visiting `/hello` returns server-rendered HTML from your component.

**Shorter:** pass the component directly, or auto-mount it with `views`:

```ts
import Hello from "./Hello";

// a) component directly in the registry
app.use(reactPlugin({ pages: { "/hello": Hello } }));

// b) auto-mounted at its URL — no page() call
app.use(
  reactPlugin({
    views: [{ path: "/hello", component: Hello, props: { name: "Ada" } }],
  }),
);
```

Wrap dynamic imports with `lazyPage(() => import(...))`; anything else in `pages`
is treated as a component.

**Limits:**

- Custom pages are server-rendered only. Only the built-in panel ships a browser bundle for live actions.
- A page key that collides with a built-in key replaces the built-in page.
- Custom pages have no built-in authorization.

## Merge several page registries

Pass one registry or an array. Arrays are merged in order, and later entries win on key collisions.

```ts
import { lazyPage, pages, reactPlugin } from "elysia-rack/react";

const adminPages = {
  "/admin": lazyPage(() => import("./Admin")),
};

app.use(reactPlugin({ pages: [pages, adminPages] }));
```

The built-in `"/dashboard"` and `"/panel"` pages remain available when you add your own pages.

## Use a different dashboard page

`dashboard({ pagePath })` selects which React page key is rendered at the dashboard URL. The default is `"/dashboard"`.

```ts
app.use(
  dashboard({
    path: "/admin",
    title: "Operations",
    pagePath: "/dashboard",
  }),
);
```

To use a custom dashboard, register a page under a new key and point `pagePath` at it.

## Build custom navigation from the registry

The registry helpers expose the same in-memory data used by the panel sidebar and dashboard.

```ts
import { getRackTree } from "elysia-rack";

const tree = getRackTree();
```

Each node contains:

| Field | Meaning |
|---|---|
| `path` | Mount path of the resource |
| `metadata` | Resolved metadata, including `id` |
| `operations` | Resolved operation flags |
| `children` | Nested child nodes |

You can pass the tree to your own component for a custom menu. Resources registered with `hidden: true` are still present in the tree. Filter them out yourself if needed.

The registry is in memory and process-wide. Register resources during startup, not per request.

## Understand adapter differences

| Behavior | Drizzle | Prisma |
|---|---|---|
| Panel form fields | Built from table columns | Built from existing row columns, or raw JSON for an empty table |
| Search | SQL `ILIKE`, which may fail on SQLite | `contains` with insensitive mode |
| Unknown or malformed item ID | `404` for integer columns | Coerced to a number when possible |
| Missing row | `404` | `404`, including Prisma `P2025` delete errors |
| Empty replace or update body | Returns the existing row without writing | Passed to Prisma |
| Soft delete | Updates the configured timestamp column | Updates the configured timestamp column |

If you need reliable search across SQLite, use filtering instead or switch to a database that supports `ILIKE`, such as PostgreSQL.

## Production deployment checklist

### Allow the `QUERY` method

The panel and the read API use `QUERY`. Configure every reverse proxy, load balancer, WAF, and CDN in front of the application to allow it.

Verification:

```bash
curl -i -X QUERY 'https://your-host/catalog/products/data'
```

A successful response has status `200` and a JSON body. A `405` or a proxy error means the method is blocked before it reaches Elysia.

### Share the idempotency store

The default store is per process and in memory. With two or more instances, a client can send the same key to different instances and create duplicate records.

Use `idempotency.store` with a shared backend and the same TTL on every instance. See [Make idempotency optional](common-workflows.md) for the store contract.

### Register resources during startup

The registry is not persisted. Call `rack()` while the application starts. Resources added later are not available to already-rendered pages and may produce inconsistent navigation.

### Protect the dashboard and custom pages

Only `rack()` routes use the authorization rules. The dashboard and custom pages are plain Elysia routes. Add authentication or a network restriction in your application if they expose sensitive navigation or data.

### Configure permissions before using string rules

String rules allow requests when no permission source exists. In production, mount your authentication or authorization plugin so `permissions` is available on the context, or use function rules.

### Keep validation separate from business rules

Validation checks types and shapes. It does not check ownership, tenancy, or state transitions. Put those checks in authorization functions or the database layer.

### Control response data

Use `settings.returning: false` when mutation responses should omit row data. This reduces accidental exposure of columns that clients do not need.

### Review soft delete behavior

Soft delete requires a nullable timestamp column. Queries exclude soft-deleted rows, but the rows remain in the database and may still be visible to other tools. Plan retention and purge jobs separately.

### Check asset availability

The published package includes the panel assets. Confirm that your deployment includes the package `dist` directory and that `/__rack/panel.css`, `/__rack/panel-app.js`, and `/__rack/panel-theme.js` return `200`.

## Theme customization

The panel is styled with semantic design tokens. Prefer overriding token values instead of component rules so dark mode continues to work.

```ts
app.use(
  reactPlugin({
    css: {
      content: `
        :root {
          --color-primary: #0055aa;
        }
      `,
    },
  }),
);
```

The panel also stores a dark or light preference in the browser and otherwise follows the operating system setting.

## Upgrade planning

1. Read the release notes for the target version.
2. Back up your database and application configuration.
3. Update the package with Bun or npm.
4. Run your application tests.
5. Restart the application.
6. Open the panel and dashboard, then verify a list, create, update, and delete operation.

The package is at version `0.2.2`. Configuration names may change between releases, so review the [Configuration reference](../configuration/configuration-reference.md) after an upgrade.

## Verify a deployment

Use these checks after deploying:

| Check | Command | Expected |
|---|---|---|
| Panel loads | `curl -I https://your-host/catalog/products` | `200` and `text/html` |
| List API works | `curl -X QUERY https://your-host/catalog/products/data` | `200` and JSON |
| Create requires a key | Send `POST` without a key | `400` |
| Create works with a key | Send `POST` with `Idempotency-Key` | `201` |
| Replay works | Repeat the same request | `201` with `Idempotent-Replayed: true` |
| Panel assets load | Request `/__rack/panel.css` | `200` and `text/css` |
| Authorization denies | Request with a denied rule | `403` |

## Next steps

- [Common issues](../troubleshooting/common-issues.md): diagnose failures.
- [FAQ](../faq.md): short answers about compatibility and limitations.
