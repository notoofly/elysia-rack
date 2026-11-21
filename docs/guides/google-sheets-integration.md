# Google Sheets integration

Use the Google Sheets adapter to expose a worksheet as a `rack()` resource through Google Sheets API v4.

## Install

```bash
bun add googleapis
# or
npm i googleapis
```

`googleapis` is an optional peer dependency. Install it only when you use the Google Sheets provider.

## Google Cloud setup

1. Create/select a Google Cloud project.
2. Enable **Google Sheets API**.
3. Create credentials:
   - **Service account** for server-to-server access (recommended for backend racks).
   - **OAuth2 client** when actions must run as an end user.
4. For service accounts, share the target spreadsheet with the service account email (Editor for CRUD, Viewer for read-only).
5. Store credentials outside the repository; never commit JSON keys or tokens.

## Basic service account resource

```ts
import { Elysia } from "elysia";
import { google } from "googleapis";
import { rack } from "elysia-rack";
import { reactPlugin } from "elysia-rack/react";

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials/service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

new Elysia()
  .use(reactPlugin())
  .use(
    rack("/products", {
      model: {
        googleSheets: {
          auth,
          spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
          worksheet: "Products",
          primaryKey: "id",
        },
      },
      metadata: { id: "products", label: "Product", pluralLabel: "Products" },
    }),
  )
  .listen(3000);
```

## OAuth2 / pre-authenticated client

The adapter accepts any auth client accepted by `google.sheets({ version: "v4", auth })`.

```ts
import { google } from "googleapis";

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

rack("/products", {
  model: {
    googleSheets: {
      auth: oauth2,
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      worksheet: "Products",
      primaryKey: "id",
    },
  },
});
```

Your application owns OAuth consent/token lifecycle. Do not expose tokens through rack routes.

## Configuration

| Option | Type | Default | Meaning |
|---|---|---|---|
| `auth` | Google auth client | required | GoogleAuth/OAuth2/JWT-compatible client accepted by googleapis. |
| `spreadsheetId` | string | required | Spreadsheet ID from the sheet URL. |
| `worksheet` | string | required | Worksheet/tab title. |
| `primaryKey` | string | rack `settings.primaryKey` or `"id"` | Column used as record identity. |
| `headerRow` | number | `1` | 1-based row containing headers. |
| `metadataCacheTtl` | number (ms) | `30000` | Cache sheet metadata/headers. `0` disables cache. |
| `schema` | TypeBox `t.Object(...)` | none | Optional record schema for typed fields and introspection. |

## Record schema / field mapping

- Headers are read from `headerRow`; header names become record field names.
- Add optional `schema` (TypeBox) to declare record field names/types. This gives typed `query/metadata/settings` field names and better panel field introspection.
- Without `schema`, `describe()` infers kinds from sample row values.

```ts
import { t } from "elysia";

model: {
  googleSheets: {
    auth,
    spreadsheetId: "1abc...",
    worksheet: "Products",
    primaryKey: "id",
    schema: t.Object({
      id: t.Integer(),
      name: t.String(),
      status: t.Union([t.Literal("active"), t.Literal("archived")]),
    }),
  },
}
```

## CRUD behavior

| Operation | Google Sheets API |
|---|---|
| List | `spreadsheets.values.get` for data range; filters/sort/pagination applied in memory. |
| Detail | Read rows and find by primary key. |
| Create | `spreadsheets.values.append` (INSERT_ROWS). |
| Replace | `spreadsheets.values.update` for matched row. |
| Update | `spreadsheets.values.update` for matched row. |
| Delete | `spreadsheets.batchUpdate` `deleteDimension` for physical delete; soft delete writes timestamp via `values.update`. |

The adapter uses batch reads/writes where applicable and avoids per-cell requests. Record identity is primary key, not row number.

## Query, limits, and quotas

- Initial implementation performs filter/sort/pagination in memory after reading worksheet rows.
- Suitable for small/medium sheets; large sheets can hit quota/latency limits.
- Metadata is cached by `metadataCacheTtl`; record data is not indefinitely cached.
- Avoid high-frequency polling. Google Sheets API has per-project quotas.

## Concurrency

- Writes are serialized per model config in-process.
- External spreadsheet edits can still race; destructive operations resolve by primary key at execution time.
- Do not assume row numbers are stable.
- Google Sheets is not a transactional database; no multi-row ACID guarantees.

## Errors

Adapter normalizes common API errors:

- `AUTH_FAILURE` (401/403)
- `SPREADSHEET_NOT_FOUND` (404)
- `MISSING_WORKSHEET`
- `INVALID_HEADER`
- `INVALID_REQUEST` (400)
- `API_QUOTA` (429)
- `NETWORK_TIMEOUT`

Errors include safe cause details; credentials/tokens are not logged by the adapter.

## Security notes

- Use least-privilege scopes. Read-only resources can use `spreadsheets.readonly`.
- Prefer service accounts for backend jobs; share only required spreadsheets.
- Keep credentials in secret manager/env-provided files, not source control.
