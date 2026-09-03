import { href } from "./href";

export interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  sortable?: readonly string[];
  params: Record<string, unknown>;
  selectable?: boolean;
  editable?: boolean;
  primaryKey?: string;
}

function statusBadge(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.toLowerCase();
  if (text === "active") return "bg-success-muted text-success-muted-foreground";
  if (text === "archived") return "bg-warning-muted text-warning-muted-foreground";
  return "bg-badge-background text-badge-foreground";
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString("en-US");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DataTable({
  columns,
  rows,
  sortable,
  params,
  selectable,
  editable,
  primaryKey,
}: DataTableProps) {
  const activeSort = typeof params.sort === "string" ? params.sort : "";
  const activeOrder = params.order === "desc" ? "desc" : "asc";
  const pk = primaryKey ?? "id";
  const extra = (selectable ? 1 : 0) + (editable ? 1 : 0);
  if (rows.length === 0)
    return (
      <div className="border-table-border overflow-x-auto rounded-md border">
        <table
          className="bg-table w-full border-collapse text-left text-sm"
          data-selectable={selectable ? true : undefined}
          data-editable={editable ? true : undefined}
          data-pk={primaryKey ?? "id"}
        >
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
    <div className="border-table-border overflow-x-auto rounded-md border">
      <table
        className="bg-table w-full border-collapse text-left text-sm"
        data-selectable={selectable ? true : undefined}
        data-editable={editable ? true : undefined}
        data-pk={primaryKey ?? "id"}
      >
        <thead>
          <tr className="bg-table-header">
            {selectable ? (
              <th className="border-table-border border-b px-4 py-2">
                <input type="checkbox" data-select-all aria-label="Select all" />
              </th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col}
                data-col={col}
                className="border-table-border border-b px-4 py-2 text-xs font-bold tracking-wider uppercase"
              >
                {sortable?.includes(col) ? (
                  <a
                    className="text-link hover:text-link-hover"
                    data-qlink
                    data-sort-link={col}
                    href={href(params, {
                      sort: col,
                      order: activeSort === col && activeOrder === "asc" ? "desc" : "asc",
                    })}
                  >
                    {col}
                    <span data-sort-ind>
                      {activeSort === col ? (activeOrder === "asc" ? " ▲" : " ▼") : ""}
                    </span>
                  </a>
                ) : (
                  col
                )}
              </th>
            ))}
            {editable ? (
              <th className="border-table-border border-b px-4 py-2 text-xs font-bold tracking-wider uppercase">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody data-panel-rows>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-table-row-hover">
              {selectable ? (
                <td className="border-table-border border-t px-4 py-2">
                  <input
                    type="checkbox"
                    data-select-row
                    value={String(row[pk] ?? "")}
                    aria-label={`Select row ${String(row[pk] ?? i)}`}
                  />
                </td>
              ) : null}
              {columns.map((col) => (
                <td key={col} className="border-table-border border-t px-4 py-2">
                  {col === "status" && statusBadge(row[col]) ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(row[col]) ?? ""}`}
                    >
                      {cell(row[col])}
                    </span>
                  ) : (
                    cell(row[col])
                  )}
                </td>
              ))}
              {editable ? (
                <td className="border-table-border border-t px-4 py-2 whitespace-nowrap">
                  <div className="border-table-border inline-flex overflow-hidden rounded-md border">
                    <button
                      type="button"
                      data-edit-id={String(row[pk] ?? "")}
                      className="text-link hover:bg-table-row-hover px-2 py-1 text-sm font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-delete-id={String(row[pk] ?? "")}
                      className="border-table-border text-destructive hover:bg-table-row-hover border-l px-2 py-1 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
