# Frequently asked questions

## General

### Is elysia-rack a standalone admin application?

No. It is a library that runs inside an Elysia application. You install it, configure resources in your code, and start your own server.

### Who is it for?

Developers and administrators who already run an Elysia application with Drizzle ORM or Prisma and want a ready-made JSON API and panel for their data.

### Does it create database tables or migrations?

No. You define the table or model with your ORM. elysia-rack uses what already exists.

## Installation and compatibility

### Which operating systems are supported?

elysia-rack declares no OS restriction. It runs anywhere Bun 1.0.0 or newer, or Node.js 20.0.0 or newer, runs. The procedures in this documentation were validated on Linux. macOS and Windows were not tested for this documentation.

### Can I use it with Node.js instead of Bun?

Yes. Node.js 20.0.0 and newer is supported. The examples use Bun for convenience.

### Which versions of Elysia and React do I need?

Elysia 1.4.0 or newer. React and React DOM 18 or newer if you use the panel or dashboard.

### Do I need Drizzle ORM if I use Prisma?

No. Drizzle ORM is optional and only needed for the Drizzle adapter.

### Can I use another ORM?

The supported adapters are Drizzle and Prisma. Other ORMs are not supported unless they expose a compatible Drizzle or Prisma model shape.

### Does it work with pnpm or Yarn?

The package is on the public npm registry and should install with any npm-compatible package manager. Only Bun and npm were validated for this documentation.

## Configuration

### Do I need a configuration file?

No. Configuration is passed to `rack()`, `dashboard()`, and `reactPlugin()` in your application code.

### Does elysia-rack read environment variables?

No. It reads no environment variables. Your application can read them to build the database connection.

### Which options are required?

Only `model` is required for `rack()`. Everything else has a default.

### How do I change the primary key?

Set `settings.primaryKey`. It defaults to `id` and is not detected from the database schema. See [Use a non-id primary key](guides/common-workflows.md).

### How do I turn off one operation?

Set that operation to `false` in `operations`. Disabled routes return `404` and their panel controls are hidden.

### How do I make the panel read-only?

Enable `list` and `detail`, and disable `create`, `replace`, `update`, and `delete`.

### How do I disable the panel but keep the API?

Set `page: { enabled: false }` for that resource.

## Daily usage

### Why do reads use `QUERY` instead of `GET`?

`QUERY` is the read method implemented by elysia-rack. Use `QUERY` for `/data` endpoints. `GET` on the resource path serves the panel, not data.

### Does the panel work without JavaScript?

List navigation, search/filter/sort forms, and pagination links continue to work. Create, edit, delete, and bulk actions require JavaScript. See [Basic usage](guides/basic-usage.md).

### Why does `POST` require a header?

Create requests use idempotency keys by default to prevent duplicates when a client retries. Send a unique `Idempotency-Key`, or set `idempotency.required` to `false`.

### Can I reuse the same idempotency key on different resources?

Yes. Keys are scoped per resource.

### How long are idempotency keys remembered?

The default TTL is 86400 seconds (24 hours). Change it with `idempotency.ttl`.

### Why does search not appear in the panel?

Search appears only when `query.searchable` contains fields.

### Why does search fail on SQLite?

The Drizzle adapter uses the PostgreSQL `ILIKE` operator, which SQLite does not support. Use filters or a database that supports `ILIKE`. See [Common issues](troubleshooting/common-issues.md).

### Why is a filter ignored?

If `query.filterable` is set, only listed fields are accepted. Unlisted filters are dropped silently.

### Why can a record not be edited from the panel?

Editing needs `detail` to load the row and `update` to save it with `PATCH`. Check both operations.

## Access control

### Is authentication included?

No. You add authentication in your application.

### Does the panel respect authorization rules?

The panel page uses the `list` rule. Panel actions use the matching create, update, and delete rules. Detail loading uses the `detail` rule.

### Does the dashboard respect authorization rules?

No. The dashboard and custom pages have no built-in authorization. Protect their URLs yourself.

### Why do string permission rules allow requests?

If no permission source is configured, string rules allow the request. Configure `app.decorate`, `app.state`, or the `x-permissions` header before relying on them.

## Deployment and updates

### Do I need to configure my proxy for anything?

Yes. Every proxy, load balancer, and CDN must allow the `QUERY` method.

### How do I update elysia-rack?

Run `bun update elysia-rack` or `npm update elysia-rack`, then restart the application. Review release notes first.

### How do I uninstall it?

Run `bun remove elysia-rack` or `npm uninstall elysia-rack`, then remove the `.use(rack(...))` calls from your application. Uninstalling does not change your database.

### Is there a hosted or managed version?

No. You host the Elysia application yourself.

### Is it suitable for multiple server instances?

Yes, with two conditions: configure a shared idempotency store, and register resources during startup on every instance.

## Data and behavior

### Does it validate input?

Yes, when you attach schemas to `validation`. Validation failures return `422`.

### Does it enforce ownership or tenancy?

Not by itself. Use authorization functions or your database layer.

### What happens when I delete with soft delete enabled?

The record is timestamped in the configured column and hidden from reads. It is not physically removed.

### Can I use a custom stylesheet?

Yes. Pass `css` or `panelCss` to `reactPlugin`. The override replaces the default panel stylesheet.

### Can I hide the donate link?

Yes. Use `reactPlugin({ donate: false })` or `dashboard({ donate: false })`.

## License

### What license is elysia-rack under?

MIT. See the [LICENSE](../LICENSE) file in the repository.
