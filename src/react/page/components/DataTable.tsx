import type { CrudAction } from "../../../rack/types/actions";
import { href } from "./href";
import { displayValue, isNumericField, type PanelField } from "./panelFields";

export interface DataTableProps {
  fields: PanelField[];
  rows: Record<string, unknown>[];
  sortable?: readonly string[];
  params: Record<string, unknown>;
  selectable?: boolean;
  editable?: boolean;
  viewable?: boolean;
  actions?: readonly CrudAction[];
  primaryKey?: string;
  softDelete?: boolean;
  restorable?: boolean;
  deletedAtField?: string;
}

function actionHref(action: CrudAction, id: string): string {
  return action.href.replaceAll(":id", encodeURIComponent(id));
}

function badgeClass(value: unknown): string {
  if (typeof value !== "string")
    return "bg-badge-background text-badge-foreground";
  const text = value.toLowerCase();
  if (text === "active") return "bg-success-muted text-success-muted-foreground";
  if (text === "archived") return "bg-warning-muted text-warning-muted-foreground";
  return "bg-badge-background text-badge-foreground";
}

function RowAction({ action, id }: { action: CrudAction; id: string }) {
  const className =
    "text-link hover:text-link-hover ml-3 px-1 text-sm font-medium hover:underline";
  if (action.method) {
    return (
      <button
        type="button"
        data-rack-href={actionHref(action, id)}
        data-rack-method={action.method}
        data-rack-confirm={action.confirm}
        className={className}
      >
        {action.label}
      </button>
    );
  }
  return (
    <a href={actionHref(action, id)} className={className}>
      {action.label}
    </a>
  );
}

export function DataTable({
  fields,
  rows,
  sortable,
  params,
  selectable,
  editable,
  viewable,
  actions,
  primaryKey,
  softDelete,
  restorable,
  deletedAtField,
}: DataTableProps) {
  const activeSort = typeof params.sort === "string" ? params.sort : "";
  const activeOrder = params.order === "desc" ? "desc" : "asc";
  const pk = primaryKey ?? "id";
  const deletedAt = deletedAtField ?? "deletedAt";
  const rowActions = actions ?? [];
  const columns = fields.filter((f) => !f.hideInTable);
  const showActions =
    Boolean(editable) ||
    Boolean(viewable) ||
    Boolean(softDelete) ||
    rowActions.length > 0;
  const extra = (selectable ? 1 : 0) + (showActions ? 1 : 0);
  const cellClass = (field: PanelField) =>
    `border-table-border border-t px-3 py-2.5 ${
      isNumericField(field) ? "text-right tabular-nums" : ""
    }`;
  const tableAttrs = {
    "data-selectable": selectable ? true : undefined,
    "data-editable": editable ? true : undefined,
    "data-viewable": viewable ? true : undefined,
    "data-soft-delete": softDelete ? true : undefined,
    "data-restorable": restorable ? true : undefined,
    "data-deleted-at": deletedAt,
    "data-rack-fields": JSON.stringify(fields),
    "data-rack-actions": rowActions.length > 0 ? JSON.stringify(rowActions) : undefined,
    "data-pk": pk,
  } as const;

  if (rows.length === 0)
    return (
      <div className="border-border bg-table overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-left text-sm" {...tableAttrs}>
          <tbody data-panel-rows>
            <tr>
              <td
                colSpan={columns.length + extra || 1}
                className="text-text-muted px-4 py-10 text-center"
              >
                No records found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="border-border bg-table overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm" {...tableAttrs}>
        <thead>
          <tr>
            {selectable ? (
              <th className="border-border w-10 border-b px-3 py-2">
                <input
                  type="checkbox"
                  data-select-all
                  aria-label="Select all"
                  className="accent-primary size-4"
                />
              </th>
            ) : null}
            {columns.map((field) => (
              <th
                key={field.name}
                data-col={field.name}
                className={`border-border text-text-muted border-b px-3 py-2 text-xs font-medium ${
                  isNumericField(field) ? "text-right" : ""
                }`}
              >
                {sortable?.includes(field.name) ? (
                  <a
                    className="hover:text-foreground text-link"
                    data-qlink
                    data-sort-link={field.name}
                    href={href(params, {
                      sort: field.name,
                      order:
                        activeSort === field.name && activeOrder === "asc"
                          ? "desc"
                          : "asc",
                    })}
                  >
                    {field.label}
                    <span data-sort-ind>
                      {activeSort === field.name
                        ? activeOrder === "asc"
                          ? " ▲"
                          : " ▼"
                        : ""}
                    </span>
                  </a>
                ) : (
                  field.label
                )}
              </th>
            ))}
            {showActions ? (
              <th className="border-border text-text-muted border-b px-3 py-2 text-right text-xs font-medium">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody data-panel-rows>
          {rows.map((row, i) => {
            const id = String(row[pk] ?? "");
            const deleted = Boolean(softDelete && row[deletedAt] != null);
            return (
              <tr key={i} className="hover:bg-table-row-hover">
                {selectable ? (
                  <td className="border-table-border border-t px-3 py-2.5">
                    <input
                      type="checkbox"
                      data-select-row
                      value={id}
                      aria-label={`Select row ${id || i}`}
                      className="accent-primary size-4"
                    />
                  </td>
                ) : null}
                {columns.map((field) => {
                  const value = row[field.name];
                  const badge =
                    field.format === "badge" || field.name === "status";
                  return (
                    <td key={field.name} className={cellClass(field)}>
                      {badge ? (
                        value === null || value === undefined ? (
                          ""
                        ) : (
                          <span
                            className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${badgeClass(value)}`}
                          >
                            {displayValue(field, value)}
                          </span>
                        )
                      ) : (
                        displayValue(field, value)
                      )}
                    </td>
                  );
                })}
                {showActions ? (
                  <td className="border-table-border whitespace-nowrap border-t px-3 py-2.5 text-right">
                    {deleted ? (
                      restorable ? (
                        <button
                          type="button"
                          data-restore-id={id}
                          className="text-link hover:text-link-hover px-1 text-sm font-medium hover:underline"
                        >
                          Restore
                        </button>
                      ) : null
                    ) : (
                      <>
                        {viewable ? (
                          <button
                            type="button"
                            data-view-id={id}
                            className="text-link hover:text-link-hover px-1 text-sm font-medium hover:underline"
                          >
                            View
                          </button>
                        ) : null}
                        {editable ? (
                          <>
                            <button
                              type="button"
                              data-edit-id={id}
                              className="text-link hover:text-link-hover ml-3 px-1 text-sm font-medium hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              data-delete-id={id}
                              className="text-destructive ml-3 px-1 text-sm font-medium hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                        {rowActions.map((action, a) => (
                          <RowAction key={a} action={action} id={id} />
                        ))}
                      </>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
