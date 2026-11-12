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

Prisma users do not need the `drizzle-orm` package. `lucide-react` is installed automatically as a dependency of elysia-rack.

The published package includes the built panel stylesheet and browser scripts. You do not need a separate build step after installing from a package registry.

## Database requirements

elysia-rack does not include a database and does not create tables or run migrations. You need:

- A database server or file-based database supported by your ORM.
- An existing table or model with at least one primary key column.
- A configured Drizzle database instance and table object, or a Prisma client and model delegate.

The library supports two adapter shapes:

- Drizzle, using `drizzle-orm`.
- Prisma, using any Prisma model delegate such as `prisma.product`.

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
