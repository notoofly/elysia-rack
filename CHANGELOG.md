# Changelog

## [0.6.2] — 2026-11-16

### Fixes
- Drizzle `describe()` now uses drizzle's `is()` helper instead of `instanceof`, so panel create/edit forms render correctly even when the app and elysia-rack resolve separate `drizzle-orm` copies (duplicate class identity broke the `instanceof` check and caused a JSON-textarea fallback in the "New record" dialog).

## [0.6.1] — 2026-11-16

### Build & module system
- Switch `tsconfig.json` to `moduleResolution: "NodeNext"` and `module: "NodeNext"` for standard Node.js ESM resolution.
- All relative imports now use explicit `.ts` / `.tsx` extensions; dynamic imports use `.js` for `bun build` runtime resolution.
- `tsconfig.build.json` updated to `module: "NodeNext"` with `allowImportingTsExtensions: true` for declaration emission.

### Authorization context
- `CrudAuthorizationContext` now includes `permissions?: unknown`, so authorization rule functions can access auth payloads decorated on the Elysia context (e.g. by an auth plugin).
- `authorize()` passes `permissions` through to rule functions.

### Fixes
- Playground: explicit `ctx` types on authorization callbacks and route handlers (`params`, `status`, `body`).
- `tests/react.test.tsx`: corrected `.tsx` extensions for React component imports.
- `src/react/render.tsx` and `src/react/page/*`: corrected `.tsx` extensions for component imports.
- Dashboard request handler tests with typed `res.json()` casts.

### Coverage
- Added tests for `getRack`, `buildRackTree`, `flatRackTree`, and `dashboard` request handling.
- `src/rack/dashboard.ts` and `src/rack/registry.ts` now at 100% line coverage.

## [0.6.0] — 2026-11-15

Security fixes from the run-1 audit. Some changes are breaking.

### Authorization (breaking)
- String permission rules now fail closed and trust only server-side sources: `permissions` decorated on the context (`app.decorate`) or `app.state`. The caller-controlled `x-permissions` header is no longer accepted, and a string rule with no permission source now returns `403` instead of allowing the request. Mount a permission source before using string rules.

### Soft delete
- Drizzle: `update` and `replace` now include the alive predicate (`deletedAt IS NULL`), so soft-deleted rows return `404` and cannot be mutated. Restoring a row still requires an explicit authorized write.
- Prisma: caller filters can no longer overwrite the `deletedAt` alive predicate, so list/count cannot reveal soft-deleted rows.

### Idempotency
- New `idempotency.scope` callback namespaces keys per server-trusted caller (e.g. principal or tenant). Keys become `<resource>::<scope>::<key>`. Without `scope`, callers share one namespace; set it when multiple principals use a rack instance.
- The in-memory store no longer evicts live entries within their TTL, so the execute-once guarantee holds for the process lifetime. `maxEntries` is a soft ceiling that triggers an expired-entry purge. Use a durable shared store for strict execute-once across restarts or multiple instances.

## [0.5.8] — 2026-11-14

- Bump to 0.5.8.

## [0.5.5] — 2026-11-13

- Fix custom `panel.css`: previously replaced the default stylesheet entirely; now it is appended after the default `panel.css`, so custom rules cascade over and override specific tokens/rules without losing the base panel styles.

## [0.5.4] — 2026-11-13

- Docs: rewritten README.md — project header, key features, routes/configuration tables, custom actions, idempotency, soft delete, ORM adapters, authorization, dashboard, pages/theming, docs links, contributing, license, resources.

## [0.5.3] — 2026-11-13

- Release of CHANGELOG.md and docs/playground updates.

## [0.5.2] — 2026-11-13

- Docs: expanded README examples (`metadata.fields`, `actions`) and `src/playground.ts` demo (category relation field, Duplicate row action, Export CSV toolbar action, `includeDeleted`).

## [0.5.1] — 2026-11-13

### Panel actions
- New `actions` option: row actions and toolbar actions with `label`, `href` (`:id` placeholder), `method`, `confirm`, `icon`, `scope` (`row` | `toolbar`). Actions with a `method` issue a fetch and refresh the table; without a `method` they open a link.
- Custom actions are gated by per-operation authorization (same `authorization` config as CRUD operations).

### Panel UI & metadata
- Favicon: `metadata.icon` (Lucide icon name) rendered as an inline SVG `<link rel="icon">` in `<head>` via the `<!--app-head-->` marker.
- Field config: `metadata.fields` supports `label`, `format` (`text` | `number` | `currency` | `date` | `datetime` | `boolean` | `badge` | `json`), `currency`, `readOnly`, `hideInTable`, `hideInForm`, `order`, and `relation`.
  - `relation` renders a `<select>`; provide static `options` or an async `load()` function. The relation label is shown in table and detail views.
- `hiddenFields` keeps a field out of both table and form (shortcut for `hideInTable` + `hideInForm`).
- Detail view: panel dialog via `QUERY /data/:id`.

### Filters, bulk edit, soft delete
- Type-aware filter widgets: enum/boolean picks a select, dates get a date picker, numbers get numeric inputs, relations get a select. Column labels and sorting come from field config.
- Bulk edit: type-aware coercion and validation (`coerceFieldValue` handles number, boolean, JSON).
- Soft delete: `Show deleted` toggle passes `includeDeleted` through Drizzle and Prisma adapters, plus a `Restore` button (`PATCH` clearing `deletedAt`) gated on `operations.update !== false`.

### Fixes
- `deletedAtField` is no longer hardcoded ("deletedAt"); it now uses the configured field name.

## [0.4.0] — 2026-11-12 (baseline)

- Fix `ilike` search on SQLite/MySQL; easier React views via component + views.
