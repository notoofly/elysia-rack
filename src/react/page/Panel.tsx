import type { FieldDescriptor } from "../../rack/adapters/index";
import type { Rack } from "../../rack/types";
import { getRackTree, type RackRegistration, type RackTreeNode } from "../../rack/registry";
import { Breadcrumb } from "./components/Breadcrumb";
import { DataTable } from "./components/DataTable";
import { RackIcon } from "./components/Icon";
import { Masthead } from "./components/Masthead";
import { buildPanelFields, type PanelField } from "./components/panelFields";
import { Pagination } from "./components/Pagination";
import { Sidebar, type SidebarGroup, type SidebarItem } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { resolveDonateProp } from "../donate";

const inputClass =
  "border-input bg-input-background text-foreground placeholder:text-form-placeholder h-9 rounded-md border px-2.5 text-sm";
const fieldLabelClass = "flex flex-col gap-1.5 text-sm font-medium text-form-label";
const secondaryButtonClass =
  "border-border bg-background text-foreground hover:bg-navigation-hover rounded-md border px-3.5 py-1.5 text-sm font-medium";
const primaryButtonClass =
  "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3.5 py-1.5 text-sm font-medium";

function FieldInput({ field, required }: { field: PanelField; required?: boolean }) {
  if (field.relation) {
    return (
      <label className={fieldLabelClass}>
        {field.label}
        <select name={field.name} required={required} defaultValue="" className={inputClass}>
          <option value="">Select</option>
          {field.relation.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  switch (field.kind) {
    case "enum":
      return (
        <label className={fieldLabelClass}>
          {field.label}
          <select name={field.name} required={required} defaultValue="" className={inputClass}>
            <option value="">Select</option>
            {(field.enumValues ?? []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      );
    case "boolean":
      return (
        <label className={`${fieldLabelClass} flex-row items-center gap-2`}>
          <input type="checkbox" name={field.name} value="true" className="accent-primary size-4" />
          {field.label}
        </label>
      );
    case "integer":
    case "number":
      return (
        <label className={fieldLabelClass}>
          {field.label}
          <input
            type="number"
            step={field.kind === "number" ? "any" : "1"}
            name={field.name}
            required={required}
            className={inputClass}
          />
        </label>
      );
    case "date":
      return (
        <label className={fieldLabelClass}>
          {field.label}
          <input
            type="datetime-local"
            name={field.name}
            required={required}
            className={inputClass}
          />
        </label>
      );
    case "json":
      return (
        <label className={fieldLabelClass}>
          {field.label}
          <textarea
            name={field.name}
            data-json
            rows={3}
            placeholder="{}"
            className={`${inputClass} font-mono`}
          />
        </label>
      );
    default:
      return (
        <label className={fieldLabelClass}>
          {field.label}
          <input name={field.name} required={required} className={inputClass} />
        </label>
      );
  }
}

function itemLabel(r: RackRegistration): string {
  return r.metadata.pluralLabel ?? r.metadata.label ?? r.metadata.id;
}

function toSidebarItem(node: RackTreeNode, activeId?: string): SidebarItem {
  return {
    id: node.metadata.id,
    label: itemLabel(node),
    icon: node.metadata.icon,
    href: node.path,
    active: node.metadata.id === activeId,
    children: node.children
      .filter((c) => !c.metadata.hidden)
      .map((c) => toSidebarItem(c, activeId)),
  };
}

function buildGroupsFromTree(tree: RackTreeNode[], activeId?: string): SidebarGroup[] {
  const byGroup = new Map<string, SidebarGroup>();
  for (const root of tree) {
    if (root.metadata.hidden) continue;
    const name = root.metadata.group ?? "General";
    let group = byGroup.get(name);
    if (!group) {
      group = { name, items: [] };
      byGroup.set(name, group);
    }
    group.items.push(toSidebarItem(root, activeId));
  }
  return [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function CustomActionButton({ action }: { action: Rack.CrudAction }) {
  const content = (
    <>
      {action.icon ? <RackIcon name={action.icon} size={14} className="size-3.5" /> : null}
      {action.label}
    </>
  );
  if (action.method) {
    return (
      <button
        type="button"
        data-rack-href={action.href}
        data-rack-method={action.method}
        data-rack-confirm={action.confirm}
        className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}
      >
        {content}
      </button>
    );
  }
  return (
    <a href={action.href} className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}>
      {content}
    </a>
  );
}

export interface PanelProps {
  donate?: boolean;
  resource?: string;
  metadata?: Rack.CrudMetadata;
  actions?: readonly Rack.CrudAction[];
  operations?: Rack.CrudOperationsOptions;
  primaryKey?: string;
  query?: Rack.CrudQueryOptions;
  params?: Record<string, unknown>;
  queryUrl?: string;
  fields?: FieldDescriptor[];
  softDelete?: boolean;
  deletedAtField?: string;
  load?: (input: Record<string, unknown>) => Promise<{
    data: unknown[];
    total: number;
  }>;
}

export default async function Panel(props: PanelProps) {
  const params = props.params ?? {};
  const page = Math.max(Number(params.page ?? 1) || 1, 1);
  const limit = Math.max(
    Number(params.limit ?? props.query?.pagination?.default ?? 20) || 1,
    1,
  );

  let rows: Record<string, unknown>[] = [];
  let total = 0;
  if (props.load) {
    try {
      const result = await props.load(params);
      rows = result.data as Record<string, unknown>[];
      total = result.total;
    } catch {
      // keep empty on load failure (e.g., dummy adapter in tests)
    }
  }

  const title =
    props.metadata?.pluralLabel ??
    props.metadata?.label ??
    props.resource ??
    "Panel";
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pk = props.primaryKey ?? "id";
  const deletedAt = props.deletedAtField ?? "deletedAt";
  const rawColumns = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

  const fields = await buildPanelFields({
    fields: props.fields,
    columns: rawColumns,
    config: props.metadata?.fields,
    hiddenFields: props.metadata?.hiddenFields,
    primaryKey: pk,
    deletedAtField: deletedAt,
  });
  const tableFields = fields.filter((f) => !f.hideInTable);
  const formFields = fields.filter((f) => !f.hideInForm && !f.autoIncrement);
  const createFields = formFields;
  const editFields = formFields.filter((f) => f.name !== pk);
  const isRequired = (f: PanelField) => !f.nullable && f.kind !== "boolean";
  const canCreate = props.operations?.create !== false;
  const canEdit =
    props.operations?.update !== false || props.operations?.replace !== false;
  const canDelete = props.operations?.delete !== false;
  const canUpdate = props.operations?.update !== false;
  const canView = props.operations?.detail !== false;
  const softDelete = props.softDelete === true;
  const selectable = canEdit || canDelete;
  const allActions = props.actions ?? [];
  const rowActions = allActions.filter((a) => (a.scope ?? "row") === "row");
  const toolbarActions = allActions.filter((a) => a.scope === "toolbar");
  const includeDeleted = params.includeDeleted === "true" || params.includeDeleted === true;

  // Load entire tree for sidebar, highlight active panel
  const tree = getRackTree().filter((r) => !r.metadata.hidden);
  const groups = buildGroupsFromTree(tree, props.resource);
  const donate = resolveDonateProp(props.donate);
  const trail = [
    { label: "Dashboard", href: "/" },
    ...(props.metadata?.group ? [{ label: props.metadata.group }] : []),
    { label: title },
  ];

  return (
    <div className="text-foreground flex min-h-screen flex-col lg:flex-row">
      <Sidebar title="Panel" groups={groups} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <Breadcrumb trail={trail} />
          <div data-query-url={props.queryUrl}>
            <Masthead
              title={title}
              icon={props.metadata?.icon}
              detail={<span data-panel-total>{plural(total, "record")}</span>}
              actions={
                toolbarActions.length > 0 || canCreate ? (
                  <>
                    {toolbarActions.map((action, i) => (
                      <CustomActionButton key={i} action={action} />
                    ))}
                    {canCreate ? (
                      <button type="button" data-open-create className={primaryButtonClass}>
                        New record
                      </button>
                    ) : null}
                  </>
                ) : undefined
              }
            />
            <Toolbar
              fields={fields}
              searchable={props.query?.searchable}
              filterable={props.query?.filterable}
              sortable={props.query?.sortable}
              params={params}
              softDelete={softDelete}
              includeDeleted={includeDeleted}
            />
            <div
              data-bulk-bar
              style={{ display: "none" }}
              className="flex flex-wrap items-center gap-2 pb-3"
            >
              <span data-bulk-count className="text-text-muted text-xs" />
              {canDelete ? (
                <button
                  type="button"
                  data-bulk-delete
                  className="bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 text-xs font-medium"
                >
                  Delete selected
                </button>
              ) : null}
              {canEdit ? (
                <span className="inline-flex items-center gap-2">
                  <select
                    data-bulk-field
                    aria-label="Bulk field"
                    className="border-input bg-input-background h-8 rounded-md border px-2 text-xs"
                  >
                    {editFields.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input
                    data-bulk-value
                    placeholder="New value"
                    aria-label="Bulk value"
                    className="border-input bg-input-background placeholder:text-form-placeholder h-8 rounded-md border px-2 text-xs"
                  />
                  <button
                    type="button"
                    data-bulk-apply
                    className="bg-secondary text-secondary-foreground hover:bg-navigation-hover rounded-md px-3 py-1.5 text-xs font-medium"
                  >
                    Apply
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                data-bulk-clear
                className="text-text-muted hover:text-foreground text-xs underline"
              >
                Clear
              </button>
            </div>
            <DataTable
              fields={fields}
              rows={rows}
              sortable={props.query?.sortable}
              params={params}
              selectable={selectable}
              editable={canEdit || canDelete}
              viewable={canView}
              actions={rowActions}
              primaryKey={pk}
              softDelete={softDelete}
              restorable={canUpdate}
              deletedAtField={deletedAt}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              params={params}
            />
            <dialog
              id="rack-create"
              className="bg-card text-card-foreground w-full max-w-md rounded-lg border p-0 shadow-lg"
            >
              <form data-create-form className="flex flex-col gap-4 p-5">
                <h2 className="font-display text-xl leading-tight">New record</h2>
                {createFields.length > 0 ? (
                  createFields.map((f) => (
                    <FieldInput key={f.name} field={f} required={isRequired(f)} />
                  ))
                ) : (
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-form-label">
                    JSON body
                    <textarea
                      data-create-json
                      rows={4}
                      placeholder='{"name": "..."}'
                      className={`${inputClass} h-auto font-mono`}
                    />
                  </label>
                )}
                <p data-form-error className="text-form-error text-sm" />
                <div className="border-border flex justify-end gap-2 border-t pt-4">
                  <button type="button" data-close className={secondaryButtonClass}>
                    Cancel
                  </button>
                  <button type="submit" className={primaryButtonClass}>
                    Create
                  </button>
                </div>
              </form>
            </dialog>
            <dialog
              id="rack-edit"
              className="bg-card text-card-foreground w-full max-w-md rounded-lg border p-0 shadow-lg"
            >
              <form data-edit-form className="flex flex-col gap-4 p-5">
                <h2 className="font-display text-xl leading-tight">
                  Edit record{" "}
                  <span data-edit-id-label className="text-text-muted font-mono text-sm" />
                </h2>
                {editFields.map((f) => (
                  <FieldInput key={f.name} field={f} />
                ))}
                <p data-form-error className="text-form-error text-sm" />
                <div className="border-border flex justify-end gap-2 border-t pt-4">
                  <button type="button" data-close className={secondaryButtonClass}>
                    Cancel
                  </button>
                  <button type="submit" className={primaryButtonClass}>
                    Save
                  </button>
                </div>
              </form>
            </dialog>
            <dialog
              id="rack-detail"
              className="bg-card text-card-foreground w-full max-w-md rounded-lg border p-0 shadow-lg"
            >
              <div className="flex flex-col gap-4 p-5">
                <h2 className="font-display text-xl leading-tight">
                  Record{" "}
                  <span data-detail-id-label className="text-text-muted font-mono text-sm" />
                </h2>
                <dl data-detail-body className="flex flex-col gap-3 text-sm" />
                <div className="border-border flex justify-end border-t pt-4">
                  <button type="button" data-close className={secondaryButtonClass}>
                    Close
                  </button>
                </div>
              </div>
            </dialog>
            <div
              data-rack-toasts
              aria-live="polite"
              className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
            />
            <script type="module" src="/__rack/panel-app.js" />
          </div>
          <footer className="border-border text-text-muted mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
            <span>elysia-rack</span>
            {donate.enabled ? (
              <a
                href={donate.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                {donate.label}
              </a>
            ) : null}
          </footer>
        </div>
      </main>
    </div>
  );
}
