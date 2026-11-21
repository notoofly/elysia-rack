# ExcelJS integration

Use the ExcelJS adapter to expose a worksheet in a local `.xlsx` file as a `rack()` resource.

## Install

```bash
bun add exceljs
# or
npm i exceljs
```

`exceljs` is an optional peer dependency. Install it only when you use the ExcelJS provider.

## Basic file-backed resource

```ts
import { Elysia } from "elysia";
import { rack } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

new Elysia()
  .use(reactPlugin())
  .use(
    rack("/products", {
      model: {
        exceljs: {
          file: "./data/products.xlsx",
          worksheet: "Products",
          primaryKey: "id",
        },
      },
      metadata: { id: "products", label: "Product", pluralLabel: "Products" },
    }),
  )
  .listen(3000);
```

## In-memory workbook

```ts
import ExcelJS from "exceljs";
import { rack } from "elysia-rack";

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile("./data/products.xlsx");

rack("/products", {
  model: {
    exceljs: {
      workbook,
      worksheet: "Products",
      primaryKey: "id",
    },
  },
});
```

In-memory workbooks are not persisted to disk unless you also provide `file` and keep persistence enabled.

## Configuration

| Option | Type | Default | Meaning |
|---|---|---|---|
| `file` | string | none | Path to the `.xlsx` file. Required unless `workbook` is provided. |
| `workbook` | ExcelJS Workbook | none | In-memory workbook instance. |
| `worksheet` | string | required | Worksheet name used as the data source. |
| `primaryKey` | string | rack `settings.primaryKey` or `"id"` | Column used as record identity. |
| `headerRow` | number | `1` | 1-based row containing headers. |
| `persist` | boolean | `true` when `file` is set | Write workbook changes back to `file`. |
| `createWorksheet` | boolean | `false` | Create worksheet when missing. |
| `schema` | TypeBox `t.Object(...)` | none | Optional record schema for typed fields and introspection. |

## Record schema / field mapping

- The adapter reads column headers from `headerRow`.
- Header names become record field names.
- Add optional `schema` (TypeBox, same style as `validation`) to declare record field names/types. This gives typed `query/metadata/settings` field names and better panel field introspection.
- Without `schema`, `describe()` infers kinds from sample values.
- If the configured primary key column is missing, reads fail with `MISSING_PRIMARY_KEY`. Create can add it when building a new row.

Use `metadata.fields` for labels, formats, visibility, and relations as with other adapters.

```ts
import { t } from "elysia";

model: {
  exceljs: {
    file: "./data/products.xlsx",
    worksheet: "Products",
    primaryKey: "id",
    schema: t.Object({
      id: t.Integer(),
      name: t.String(),
      status: t.Union([t.Literal("active"), t.Literal("archived")]),
      price: t.Number(),
    }),
  },
}
```

## CRUD behavior

| Operation | Behavior |
|---|---|
| List | Reads worksheet rows, then applies rack query filters/sort/pagination in memory. |
| Detail | Finds row by primary key. |
| Create | Appends a row. Missing numeric primary keys get the next numeric value. |
| Replace | Replaces matching row fields from request body; primary key is preserved. |
| Update | Patches matching row fields; primary key is preserved. |
| Delete | Removes row, or sets `deletedAt` when `settings.softDelete` is true. |

Record identity is the primary key column, never row position.

## Persistence and concurrency

- Writes are serialized per workbook/config instance in-process.
- When persisting to file, the adapter writes a temp file and renames it over the target.
- ExcelJS is not a transactional database. There is no multi-process file lock.
- Avoid multiple processes writing the same `.xlsx` file concurrently.

## Limitations

- Query filtering/sorting/pagination run in memory after reading worksheet rows.
- Large workbooks can be slow and memory-heavy.
- Formula cells are read by result when available; writing formulas is not part of CRUD.
- Rich text and hyperlinks are reduced to text values.
- No SQL joins/transactions.

## Troubleshooting

- `MISSING_DEPENDENCY`: install `exceljs`.
- `FILE_NOT_FOUND`: check `file` path, or set `createWorksheet: true` for new files.
- `MISSING_WORKSHEET`: verify `worksheet` name.
- `INVALID_HEADER`: ensure header row has unique, non-empty names.
- `DUPLICATE_PRIMARY_KEY`: fix duplicate IDs in the sheet.
- `PERSISTENCE_FAILED`: check file permissions and disk space.
