# elysia-rack Documentation

elysia-rack is a library for the [Elysia](https://elysiajs.com) web framework. It turns a database model into a complete admin resource: a JSON API, search and filtering, validation, authorization, and a browser panel for creating, editing, and deleting records.

The documentation describes version `0.2.2` of the published package.

## What it does

You describe one database table once. elysia-rack then provides:

- REST routes for list, detail, create, replace, update, and delete.
- A `QUERY` read API under `/data` for the panel and for client applications.
- Search, filtering, sorting, and pagination controlled by your configuration.
- Per-operation validation and authorization.
- Idempotent create requests.
- OpenAPI metadata for the generated routes.
- A server-rendered browser panel with table, create, edit, delete, and bulk actions.
- A dashboard page and sidebar built from every resource you register.

## Who should use it

Use elysia-rack if you already have:

- A Bun or Node.js application built with Elysia.
- A database accessed through Drizzle ORM or Prisma.
- A need for an internal admin API or a small back-office panel.

You do not need to build routes, table pages, or forms by hand. You do need to write a small amount of TypeScript configuration in your application.

## Main requirements

- Bun 1.0.0 or newer, or Node.js 20.0.0 or newer.
- Elysia 1.4.0 or newer.
- React and React DOM 18 or newer if you use the panel.
- Drizzle ORM 0.45.0 or newer if you use the Drizzle adapter. Prisma needs no extra package.
- A database and a table or model that already exist.

## Important limitations

- elysia-rack is a library, not a standalone application. It runs inside your Elysia server.
- It does not create database tables or run migrations.
- It does not provide a login system. You add authentication and authorization rules.
- The dashboard and custom pages have no built-in authorization. Protect them in your application if they must not be public.
- Reads use the non-standard `QUERY` HTTP method. Reverse proxies, load balancers, and CDNs must allow it.
- The default idempotency store is held in memory and is not shared between processes.
- String permission rules allow requests when no permission source is configured. Configure a permission source before relying on them.
- Search with the Drizzle adapter may fail on SQLite because the adapter uses the PostgreSQL `ILIKE` operator. See [Common issues](troubleshooting/common-issues.md).
- Prisma does not expose schema information at runtime, so Prisma-backed panels fall back to row columns and a raw JSON form.

## Documentation map

| Page | Purpose |
|---|---|
| [Getting started](getting-started.md) | Install, configure, and complete a first working operation |
| [Installation](installation/index.md) | Install and remove the package with Bun or npm |
| [Prerequisites](installation/prerequisites.md) | Runtimes, peer dependencies, database, and network requirements |
| [Configuration overview](configuration/index.md) | Where configuration lives and how the parts fit together |
| [Configuration reference](configuration/configuration-reference.md) | Every user-facing option with defaults |
| [Basic usage](guides/basic-usage.md) | Use the panel, API, and dashboard day to day |
| [Common workflows](guides/common-workflows.md) | Read-only resources, soft delete, navigation, protection, and theming |
| [Advanced usage](guides/advanced-usage.md) | Custom pages, registry helpers, shared stores, and production setup |
| [Common issues](troubleshooting/common-issues.md) | Diagnose installation, configuration, and runtime problems |
| [FAQ](faq.md) | Short answers about compatibility, usage, and limitations |

## Existing developer guide

The repository also contains [USAGE.md](USAGE.md), a detailed guide that includes internal behavior notes and development workflows. It is useful for maintainers. The pages in this directory are written for people who install, configure, and operate elysia-rack.

## License

MIT. See the [LICENSE](../LICENSE) file in the repository.
