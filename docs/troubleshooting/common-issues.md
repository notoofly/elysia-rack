# Common issues

Use this page when elysia-rack does not behave as expected. Each entry follows the same structure: problem, possible cause, solution, and verification.

## The panel URL returns JSON instead of an HTML page

**Problem:** visiting a resource path such as `/catalog/products` returns a JSON object with a `path` and `props` field instead of the panel.

**Possible cause:** `reactPlugin()` is not mounted, or it was mounted after the route that returns the page. Without the plugin, the page descriptor is returned as JSON.

**Solution:**

1. Import the plugin from `elysia-rack/react`.
2. Mount it before `dashboard()` and before any `rack()` call.

```ts
import { reactPlugin } from "elysia-rack/react";

new Elysia()
  .use(reactPlugin())
  .use(dashboard())
  .use(rack("/catalog/products", { model }));
```

**Verification:** reload the resource path. The response should be HTML with the panel layout.

## The dashboard returns JSON

**Problem:** the dashboard path returns a JSON page descriptor.

**Possible cause:** same as the panel issue. `reactPlugin()` is missing or mounted too late.

**Solution:** mount `reactPlugin()` before `dashboard()`.

**Verification:** reload the dashboard path. The response should be HTML.

## Panel styles or scripts return 404

**Problem:** the panel loads without styling or the create, edit, and delete actions do not work. The browser network tab shows `404` for `/__rack/panel.css`, `/__rack/panel-app.js`, or `/__rack/panel-theme.js`.

**Possible cause:** the package assets are missing from the deployment, or the process cannot read the package `dist` directory.

**Solution:**

1. Confirm the installed package includes its `dist` directory.
2. Reinstall the package if files are missing.
3. Confirm the application process can read the installed package files.
4. Restart the application after reinstalling.

**Verification:** request each asset and confirm `200`:

```bash
curl -I http://localhost:3000/__rack/panel.css
curl -I http://localhost:3000/__rack/panel-app.js
curl -I http://localhost:3000/__rack/panel-theme.js
```

The CSS response should be `text/css`. The script responses should be JavaScript.

## Create returns 400

**Problem:** a `POST` request returns `400` with the error `Idempotency-Key header is required`.

**Possible cause:** idempotency is enabled and required by default, and the request did not include the configured header.

**Solution:** send a unique key per create attempt:

```bash
curl -X POST http://localhost:3000/catalog/products \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000' \
  -d '{"name":"Keyboard"}'
```

If your clients cannot send keys, set:

```ts
idempotency: { required: false }
```

To remove the handling entirely, set `enabled: false`.

**Verification:** the same request returns `201`.

## A filter is ignored

**Problem:** a query parameter does not change the results.

**Possible cause:** `query.filterable` is configured and does not include that field. Unlisted filters are dropped without an error.

**Solution:** add the field to `query.filterable`, or remove `query.filterable` to accept all non-reserved parameters as filters.

**Verification:** request the list with the filter and inspect the `query.filters` object in the response. It should contain the field.

## Search does nothing

**Problem:** the `search` parameter has no effect.

**Possible cause:** `query.searchable` is missing or empty.

**Solution:** add the fields you want to search:

```ts
query: {
  searchable: ["name", "sku"],
}
```

**Verification:** send a list request with `?search=keyboard`. The response `query.search` should contain the value and the configured field list.

## Search fails on SQLite

**Problem:** a list request with `search` returns a database error such as `near "ilike": syntax error` when using the Drizzle adapter with SQLite.

**Possible cause:** this behavior was reproduced during preparation of this documentation. The Drizzle adapter emits the PostgreSQL `ILIKE` operator, which SQLite does not support.

**Solution:**

1. Omit `query.searchable` on SQLite resources.
2. Use filters for simple matching.
3. Use a database that supports `ILIKE`, such as PostgreSQL, when full text search is required.

The panel hides the search box when `searchable` is empty, so users are not offered a broken control.

**Verification:** list requests without `search` succeed, and the panel no longer shows the search field.

## An item route returns 404 for an existing row

**Problem:** a record exists, but a detail, update, or delete request returns `404`.

**Possible cause:** the route ID does not match the primary key, or the ID has the wrong type for an integer column.

**Solution:**

1. Confirm `settings.primaryKey` matches the real key column name. The default is `id` and is not detected automatically.
2. Use the value from that column in the URL.
3. For integer keys, send a numeric ID. A non-numeric value cannot match an integer column and resolves to `404`.

**Verification:** request the row through the list endpoint, copy the primary key value from `data`, and use it in the item URL.

## The edit dialog is empty or does not open

**Problem:** clicking `Edit` does nothing, or the dialog has no values.

**Possible cause:** the `detail` operation is disabled, or the client script cannot load.

**Solution:**

1. Enable `operations.detail`.
2. Ensure `operations.update` is enabled. The edit dialog saves with `PATCH`, so an enabled `replace` operation does not make editing work.
3. Confirm `/__rack/panel-app.js` returns `200`.

**Verification:** click `Edit`. The dialog should load the current values and `Save` should update the row.

## The create dialog shows a raw JSON field

**Problem:** the `New record` dialog shows a JSON text area instead of individual inputs.

**Possible cause:** the adapter did not return field information. This is expected with Prisma, which does not expose its schema at runtime, or when the table has no known columns.

**Solution:**

- With Prisma, enter a valid JSON object for the new record.
- With Drizzle, confirm that `table` is a Drizzle table object, not a plain object.
- When rows already exist, the panel can derive inputs from the existing row columns. Create one row first if needed.

**Verification:** the dialog either shows the expected fields or accepts valid JSON and creates the record.

## Resources do not appear in the sidebar or dashboard

**Problem:** a registered resource is missing from navigation.

**Possible cause:** one of these conditions:

- `metadata.hidden` is `true`.
- `metadata.parent` points to an ID that is not registered, while you expected nesting.
- `rack()` was called after the page rendered, or after startup in a way that does not affect the running process.

**Solution:**

1. Set `metadata.hidden` to `false` or remove it.
2. Check that `metadata.parent` matches another resource's `metadata.id`.
3. Register every resource during application startup.
4. Restart the server after changing registration code.

**Verification:** reload any panel or the dashboard. The resource appears in the expected group and position.

## Requests return 403

**Problem:** the API or panel returns `403` with `Forbidden`.

**Possible cause:** an authorization rule denied the request.

**Solution:**

1. Check the `operation` and `requiredPermission` fields in the response body.
2. For a `false` rule, change it to `true`, a function, or a valid permission.
3. For a string rule, provide the permission through `app.decorate`, `app.state`, or the `x-permissions` header.
4. Confirm that your permission source is mounted before the resource routes.

**Verification:** repeat the request with the required permission. The response should no longer be `403`.

**Note:** if no permission source is configured at all, string rules allow the request. A `403` from a string rule means a source exists and did not contain the permission.

## Requests return 422

**Problem:** a create, update, replace, or detail request returns `422`.

**Possible cause:** a validation schema rejected the input. The `params` schema also applies to item routes, including detail and delete.

**Solution:**

1. Read the validation response body to find the failing field.
2. Send values that match the schema types and constraints.
3. Adjust the schema only if the restriction is wrong.

**Verification:** the same request with corrected input succeeds.

## The API returns 405 or a proxy error

**Problem:** the panel loads but lists are empty, or a direct read request fails before reaching the application.

**Possible cause:** a proxy, load balancer, WAF, or CDN blocks the `QUERY` method.

**Solution:** allow `QUERY` for the resource paths in every layer in front of the application.

**Verification:** request the list endpoint and confirm `200` with a JSON body. If you control the proxy, check its access log for the rejected method.

## Duplicate records are created in a multi-instance deployment

**Problem:** the same idempotency key creates more than one record.

**Possible cause:** each instance uses its own default in-memory store.

**Solution:** configure `idempotency.store` with a shared backend such as Redis or a database table, and use the same store and TTL on every instance.

**Verification:** send the same create request twice through different instances. The second response should include `Idempotent-Replayed: true`, and the database should contain one record.

## The package fails to import or reports a peer dependency error

**Problem:** the application fails on startup with a missing module or peer dependency error.

**Possible cause:** one of the required peer packages is missing or older than the supported version.

**Solution:**

1. Confirm Bun 1.0.0 or newer, or Node.js 20.0.0 or newer.
2. Confirm Elysia 1.4.0 or newer.
3. Confirm React and React DOM 18 or newer if you use the panel.
4. Confirm Drizzle ORM 0.45.0 or newer if you use the Drizzle adapter.
5. Reinstall dependencies with your package manager.

**Verification:** the import check and application startup succeed. See [Installation](../installation/index.md).

## The stylesheet override is not applied

**Problem:** the panel still uses the default appearance after passing `css` or `panelCss`.

**Possible cause:** a file path was passed but the file does not exist, or a plain string was treated as a path and not as CSS.

**Solution:**

1. Use `{ content: "..." }` for raw CSS.
2. Use `{ path: "./file.css" }` for a file path.
3. Confirm the file exists relative to the working directory.
4. Restart the server after the change.

**Verification:** request `/__rack/panel.css` and confirm it contains your rules.

## Next steps

- [FAQ](../faq.md)
- [Configuration reference](../configuration/configuration-reference.md)
- [Common workflows](../guides/common-workflows.md)
