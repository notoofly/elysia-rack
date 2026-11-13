# Changelog

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
