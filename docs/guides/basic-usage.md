# Basic usage

This page covers the tasks most users perform after the first setup: browsing, searching, creating, editing, and deleting records.

Before you start, confirm that `reactPlugin()`, `dashboard()`, and at least one `rack()` resource are mounted as described in [Getting started](../getting-started.md).

## Open the panel

Go to the resource path you passed to `rack()`, for example:

```text
http://localhost:3000/catalog/products
```

Expected result: a page with a sidebar, breadcrumb, title, record count, toolbar, table, pagination, and a `New record` button.

The panel shows only the operations you enabled. If `create` is disabled, the `New record` button is not shown. If `delete` is disabled, row delete actions and bulk delete are not shown.

## Browse records

The table displays the columns returned by the database. Each page shows up to the configured page size.

At the bottom of the table you see a summary such as:

```text
1-20 of 57 records
```

Use `Previous` and `Next`, or the page numbers, to move between pages.

Expected result: the URL updates with a `page` parameter and the table reloads.

## Search

Search appears when `query.searchable` contains at least one field.

1. Enter text in the `Search` field.
2. Press `Enter` or click `Apply`.

With JavaScript enabled, results update shortly after you stop typing.

Expected result: only records that contain the text in one of the searchable fields are shown.

If search is not shown, no searchable fields are configured. If search produces no change, check that `query.searchable` is set and that your database supports the search operator. See [Common issues](../troubleshooting/common-issues.md).

## Filter

Filter inputs appear for each field listed in `query.filterable`.

1. Enter a value in a filter field.
2. Click `Apply`.

Expected result: only records whose field matches the value are shown.

Filters compare values directly. If a filter is ignored, the field is not in `query.filterable`.

## Sort

Sort controls appear when `query.sortable` is set.

1. Choose a field in the `Sort` list.
2. Choose `Ascending` or `Descending` in the `Order` list.
3. Click `Apply`.

You can also click a sortable column heading. The arrow next to the heading shows the active direction.

Expected result: the table is ordered by the selected field.

If no sort is requested, `defaultSort` is used when configured. Otherwise the database decides the order.

## Change the page size

Add a `limit` parameter to the panel URL:

```text
http://localhost:3000/catalog/products?limit=50
```

Expected result: up to 50 records per page, subject to `pagination.max`.

## Create a record

1. Click `New record`.
2. Fill in the dialog fields.
3. Click `Create`.

Expected result: the dialog closes, the table refreshes, and the new record appears.

Behavior details:

- The primary key field is omitted when the database generates it.
- Required fields are based on column nullability.
- The panel sends `POST {path}` with an automatically generated `Idempotency-Key`.
- If the database has no known columns, the dialog shows a raw JSON field instead of individual inputs.

If a create request fails, the dialog shows the HTTP status and a short error message.

## Edit a record

1. Click `Edit` on a row.
2. Change one or more values.
3. Click `Save`.

Expected result: the dialog closes and the table shows the updated values.

Behavior details:

- The panel loads the row through `QUERY {path}/data/{id}` before opening the dialog.
- Saving sends `PATCH {path}/{id}`.
- Empty inputs are skipped, so the update is partial.
- Editing requires the `detail` operation to load the row.
- Editing saves with `PATCH`, so the `update` operation must be enabled.

## Delete a record

1. Click `Delete` on a row.
2. Confirm the browser prompt.

Expected result: the row is removed and the table refreshes.

When `settings.softDelete` is enabled, the record is timestamped instead of removed. It disappears from the panel and API reads but remains in the database.

## Bulk actions

Select rows with the checkboxes to show the bulk bar.

Available actions:

| Action | Result |
|---|---|
| `Delete selected` | Deletes each selected record after confirmation |
| Field and value plus `Apply` | Sends one partial update to each selected record |
| `Clear` | Clears the current selection |

Bulk updates send the value as a string. Use the normal edit dialog when the field needs a specific type or complex value.

## Use the dashboard

Visit the path passed to `dashboard()`, by default:

```text
http://localhost:3000/
```

Expected result: a page with a sidebar and a table of every registered resource. Each row shows the resource label, mount path, and enabled operations.

The dashboard is a navigation overview. It does not display records.

## Switch between dark and light mode

Click `◐ Theme` in the page header.

The panel stores your choice in the browser. If you have no stored choice, it follows the operating system or browser preference.

## Use the JSON API

All reads use the `QUERY` method.

List records:

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data'
```

Get one record:

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data/1'
```

Create a record:

```bash
curl -X POST 'http://localhost:3000/catalog/products' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: create-001' \
  -d '{"name":"Keyboard","price":850000}'
```

Replace a record:

```bash
curl -X PUT 'http://localhost:3000/catalog/products/1' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Keyboard v2","price":900000}'
```

Update a record:

```bash
curl -X PATCH 'http://localhost:3000/catalog/products/1' \
  -H 'Content-Type: application/json' \
  -d '{"price":950000}'
```

Delete a record:

```bash
curl -X DELETE 'http://localhost:3000/catalog/products/1'
```

### Read parameters

You can send list parameters in the URL, in a JSON body, or both. Body values override URL values.

```bash
curl -X QUERY 'http://localhost:3000/catalog/products/data?page=2' \
  -H 'Content-Type: application/json' \
  -d '{"limit":5}'
```

### Response envelope

Data responses share this structure:

```json
{
  "resource": "products",
  "operation": "list",
  "adapter": "drizzle"
}
```

- `resource` is `metadata.id` when set, otherwise the mount path.
- `operation` is the operation that ran.
- `adapter` is `drizzle` or `prisma`.
- `metadata` is echoed when you passed `metadata` to `rack()`.
- `data` contains the row or rows when available.

A list response also includes `via`, `query`, and `total`. `total` is the number of matching records before pagination.

## Expected status codes

| Status | Meaning |
|---|---|
| `200` | List, detail, replace, update, or delete succeeded |
| `201` | Create succeeded |
| `400` | Create was sent without the required idempotency key |
| `403` | Authorization denied the request |
| `404` | The route is disabled, or the record or ID was not found |
| `422` | Validation failed |

## Common mistakes

- Using `GET` for data reads. Use `QUERY`.
- Sending `POST` without an `Idempotency-Key`.
- Forgetting to enable `update` while expecting panel edits to save.
- Forgetting to enable `detail` while expecting the edit dialog to load.
- Using an ID that does not match the type of the primary key column.

## Next steps

- [Common workflows](common-workflows.md): configure read-only resources, soft delete, and access control.
- [Advanced usage](advanced-usage.md): custom pages, shared stores, and production settings.
