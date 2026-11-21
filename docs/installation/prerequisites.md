# Prerequisites

Before installing elysia-rack, confirm that your environment meets the requirements on this page.

## Supported runtimes

| Runtime | Minimum version | Notes |
|---|---|---|
| Bun | 1.0.0 | Recommended for the examples in this documentation |
| Node.js | 20.0.0 | Supported by the published package |
| Elysia | 1.4.0 | Required peer dependency |

elysia-rack declares no operating system restriction. It can run anywhere Bun or Node.js runs, including Linux, macOS, and Windows. The procedures in this documentation were executed on Linux. Other operating systems were not tested during the preparation of this documentation.

## Peer dependencies

elysia-rack requires these packages in your application:

| Package | Version | Required |
|---|---|---|
| `elysia` | 1.4.0 or newer | Yes |
| `react` | 18 or newer | Yes if you use the panel, dashboard, or any React page |
| `react-dom` | 18 or newer | Yes if you use the panel, dashboard, or any React page |
| `drizzle-orm` | 0.45.0 or newer | Yes only when you use the Drizzle adapter |
| `exceljs` | 4.x | Yes only when you use the ExcelJS adapter |
| `googleapis` | supported by your runtime | Yes only when you use the Google Sheets adapter |

Prisma needs no extra provider package. Install only providers you configure. `lucide-react` is installed automatically as a dependency of elysia-rack.

The published package includes the built panel stylesheet and browser scripts. You do not need a separate build step after installing from a package registry.

## Data source requirements

elysia-rack does not create tables/sheets or run migrations. You need an existing data source:

- **Drizzle**: database + Drizzle table object.
- **Prisma**: Prisma client + model delegate.
- **ExcelJS**: readable `.xlsx` file or in-memory workbook, with a worksheet and header row.
- **Google Sheets**: Google Cloud project, Sheets API enabled, credentials/auth client, spreadsheet shared with the caller as needed.

Spreadsheet adapters are not transactional databases; plan for concurrency/quota/file-lock limits.

## Network requirements

elysia-rack does not open its own port. It registers routes inside your existing Elysia server, so the listening port is the one you pass to `app.listen()`.

The panel and dashboard use these URL patterns:

| URL | Purpose |
|---|---|
| `/{resource path}` | Server-rendered panel for a resource |
| `/{resource path}/data` | `QUERY` list endpoint |
| `/{resource path}/data/{id}` | `QUERY` detail endpoint |
| `/__rack/panel.css` | Panel stylesheet |
| `/__rack/panel-app.js` | Panel browser actions |
| `/__rack/panel-theme.js` | Dark and light theme toggle |

Reverse proxies, load balancers, and CDNs must allow the `QUERY` HTTP method. Some infrastructure blocks non-standard methods by default.

## Permissions

The application process needs:

- Read and write access to the database or database file.
- Permission to bind the port passed to `app.listen()`.
- Read access to the installed package files so the panel assets can be served.

No elevated operating system privileges are required.

## Version checking

Check your installed versions before reporting a problem:

```bash
bun --version
node --version
```

Check the installed package version:

```bash
bun pm ls | grep elysia-rack
# or
npm ls elysia-rack
```

## Next step

Continue to [Installation](index.md).
