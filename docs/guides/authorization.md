# Authorization

Authorization in elysia-rack is application code, not a login system. Your app authenticates the caller and provides permission data. elysia-rack uses that data to allow or deny each CRUD operation and to build per-caller navigation.

Rules are configured in the top-level `authorization` option of `rack(path, options)`. They are not nested under `settings`.

## What a rule controls

Each operation has its own rule. Rules are evaluated independently.

| Operation | Routes it protects | Panel effect |
|---|---|---|
| `list` | `GET {path}` and `QUERY {path}/data` | Opens the panel and loads table rows |
| `detail` | `QUERY {path}/data/{pk}` | Loads one row for the detail and edit views |
| `create` | `POST {path}` | Saves a new row |
| `replace` | `PUT {path}/{pk}` | Replaces a row |
| `update` | `PATCH {path}/{pk}` | Patches a row, including soft-delete restore |
| `delete` | `DELETE {path}/{pk}` | Removes or soft-deletes a row |

`{pk}` is `settings.primaryKey` (`id` by default).

Two different options can close the same feature:

- `operations.<operation>: false` removes the route. The response is `404`.
- `authorization.<operation>` keeps the route but checks access. A denial is `403`.

`page.enabled: false` removes only the `GET {path}` panel page; the data API stays mounted.

## Rule types

```ts
rack("/catalog/products", {
  model,
  authorization: {
    list: "products.view",
    detail: "products.view",
    create: "products.write",
    update: "products.write",
    replace: "products.write",
    delete: false,
  },
});
```

| Rule | Result |
|---|---|
| Omitted or `true` | Allow |
| `false` | Deny with `403` |
| String | Require that permission from a server-trusted source |
| Function | Await it; a truthy result allows, a falsy result denies with `403` |

Function rules may be synchronous or asynchronous.

### Function rule context

A function rule receives one object:

| Field | Type | Meaning |
|---|---|---|
| `operation` | `Rack.CrudOperation` | Operation being checked |
| `request` | `Request` | Incoming request |
| `id` | `string \| undefined` | Item ID on item routes; absent on collection routes |
| `resource` | `TModel` | Exact model object passed to `rack()` |
| `permissions` | `readonly string[] \| undefined` | Server-trusted permissions for this request |

The context does not include `store` or a `user` object. Read trusted session data in your own application code, or use `request` inside the function. Never trust a client-supplied role header as proof of identity.

```ts
authorization: {
  list: ({ permissions }) => (permissions?.includes("orders.view") ?? false),
  detail: async ({ id, permissions, request }) => {
    if (permissions?.includes("orders.admin") === true) return true;
    return id !== undefined && (await canAccessOrder(request, id));
  },
}
```

`canAccessOrder` is your application function. It should use a verified session and your database, not request headers alone.

## Provide permissions

String rules read permissions from server-trusted sources only:

1. `permissions` on the Elysia context, added with `derive` or `decorate`.
2. `permissions` in app state, added with `app.state("permissions", [...])`.

Use `derive` for per-request permissions:

```ts
import { Elysia } from "elysia";

const app = new Elysia()
  .derive(({ request }) => ({
    permissions: permissionsFor(request),
  }));
```

Use `decorate` when the list is static for the whole process:

```ts
app.decorate("permissions", ["products.view", "products.write"]);
```

`permissionsFor` must derive permissions from a verified session, token, or database lookup. The caller-controlled `x-permissions` header is never read. If no trusted source is present, a string rule denies the request. There is no allow-by-default fallback.

## End-to-end setup

The example below wires a permission source, mounts the dashboard, and protects two resources. `permissionsFor` and `canAccessOrder` come from your application.

```ts
import { Elysia } from "elysia";
import { dashboard, rack } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

function permissionsFor(request: Request): string[] {
  const session = getSessionFromCookie(request.headers.get("cookie"));
  return session?.permissions ?? [];
}

const app = new Elysia()
  .use(reactPlugin())
  .derive(({ request }) => ({ permissions: permissionsFor(request) }))
  .use(dashboard({ title: "Shop" }))
  .use(
    rack("/catalog/products", {
      model: productsModel,
      metadata: { id: "products", label: "Product", group: "Catalog", order: 1 },
      authorization: {
        list: "products.view",
        detail: "products.view",
        create: "products.write",
        replace: "products.write",
        update: "products.write",
        delete: false,
      },
    }),
  )
  .use(
    rack("/catalog/orders", {
      model: ordersModel,
      metadata: { id: "orders", label: "Order", group: "Catalog", order: 2 },
      authorization: {
        list: "orders.view",
        detail: async ({ id, permissions, request }) => {
          if (permissions?.includes("orders.admin") === true) return true;
          return id !== undefined && (await canAccessOrder(request, id));
        },
        create: "orders.write",
        update: "orders.write",
        delete: false,
      },
    }),
  )
  .listen(3000);
```

Mount the permission source before the racks that use it. With the setup above:

- A caller without `products.view` gets `403` on both the product panel and `QUERY /catalog/products/data`.
- A caller with `products.view` but not `products.write` can open the product panel but gets `403` when creating or editing.
- No caller can delete products or orders because those rules are `false`.
- The dashboard and both sidebars show only resources whose `list` rule allows the current caller.

## Denial responses

A denial is a `403` response with a small JSON envelope.

A `false` or failing function rule returns:

```json
{ "error": "Forbidden", "operation": "delete" }
```

A `string` rule that is not satisfied returns the required permission:

```json
{
  "error": "Forbidden",
  "operation": "list",
  "requiredPermission": "products.view"
}
```

Check the `operation` field in client error handling. It names the rule that denied the request, not necessarily the route the user clicked.

The panel renders action buttons from `operations` flags. It does not receive per-caller rule results. A button can therefore be visible while its API call returns `403`; keep `operations` and `authorization` aligned for the experience you want.

## Dashboard and navigation filtering

`dashboard()` and the panel route filter the registry tree with `getAuthorizedRackTree(context)` before rendering. Each resource's `authorization.list` rule is evaluated against the same request context used by the data routes. Unauthorized resources are absent from the sidebar, dashboard table, and rendered HTML.

The panel route checks its own `list` rule before building the tree, so that rule can run more than once per panel request. Keep function rules free of side effects.

`getRackTree()` remains the raw, unfiltered registry helper. Use it for server-side tooling. For your own per-caller navigation, use the authorized helper:

```ts
import { page } from "elysia-rack/react";
import { getAuthorizedRackTree } from "elysia-rack";

app.get("/my-nav", async (context) =>
  page("/my-nav", { tree: await getAuthorizedRackTree(context) }),
);
```

`getAuthorizedRackTree(ctx)` returns a promise because rules can be async. Pass an Elysia context with `request`, and optionally `permissions` and `store`. A resource registered without authorization rules stays in the tree.

Rules are also used for `list` on the panel page itself. The dashboard URL is not otherwise protected: if the shell itself must be private, protect that route in your application. Custom React pages are plain Elysia routes and need the same application-level protection.

`metadata.hidden` still removes a resource from the rendered navigation after authorization filtering. If a parent resource is denied but an authorized child has `metadata.parent` pointing to it, the child becomes a root node.

## Custom actions and custom pages

Custom action URLs are not covered by rack rules. Call the exported `authorize()` helper in the route that serves the action:

```ts
import { authorize } from "elysia-rack";

app.post("/catalog/products/:id/duplicate", async (context) => {
  const denied = await authorize("update", "products.write", {
    request: context.request,
    id: context.params.id,
    resource: productsModel,
    permissions: context.permissions,
    store: context.store,
  });
  if (denied) return denied;

  return duplicateProduct(context.params.id);
});
```

`authorize()` returns `null` when allowed, or the same `403` envelope used by rack routes. Use the operation name that matches the business action; `update` is common for duplicate and similar edits.

For a custom page that displays records, either protect the URL with your application middleware or call `authorize("list", rule, ctx)` before returning the page descriptor.

## Common recipes

| Goal | Configuration |
|---|---|
| Public reads, authenticated writes | `list: true`, `detail: true`, write rules as strings or functions |
| Read-only resource | `list: true`, `detail: true`, all write rules `false` |
| Static public reference data | Omit `authorization`; all operations allow |
| Hide from navigation but keep API | `metadata.hidden: true` |
| Remove a route entirely | `operations.<operation>: false` |
| Per-row ownership | Function rule using `id` and a verified session lookup |

## Verification checklist

- [ ] The permission source is mounted before the racks that use string rules.
- [ ] Every operation has an explicit rule, including `replace` if you support `PUT`.
- [ ] Denied requests return `403` with the expected `operation`.
- [ ] The dashboard and both sidebars show only resources the caller may list.
- [ ] Custom actions and custom pages have their own checks.
- [ ] The `QUERY` method is allowed through every proxy in front of the app.
