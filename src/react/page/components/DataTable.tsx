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

function statusTag(value: unknown): string | null {
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

function isNumericColumn(rows: Record<string, unknown>[], col: string): boolean {
  if (rows.length === 0) return false;
  return rows.every((r) => typeof r[col] === "number" || r[col] == null);
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
  const numeric = new Set(columns.filter((c) => isNumericColumn(rows, c)));
  const cellClass = (col: string) =>
    `border-table-border border-t px-3 py-2.5 ${
      numeric.has(col) ? "text-right tabular-nums" : ""
    }`;
  if (rows.length === 0)
    return (
      <div className="border-border bg-table overflow-x-auto rounded-lg border">
        <table
          className="w-full border-collapse text-left text-sm"
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
    <div className="border-border bg-table overflow-x-auto rounded-lg border">
      <table
        className="w-full border-collapse text-left text-sm"
        data-selectable={selectable ? true : undefined}
        data-editable={editable ? true : undefined}
        data-pk={primaryKey ?? "id"}
      >
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
            {columns.map((col) => (
              <th
                key={col}
                data-col={col}
                className={`border-border text-text-muted border-b px-3 py-2 text-xs font-medium ${
                  numeric.has(col) ? "text-right" : ""
                }`}
              >
                {sortable?.includes(col) ? (
                  <a
                    className="hover:text-foreground text-link"
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
              <th className="border-border text-text-muted border-b px-3 py-2 text-right text-xs font-medium">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody data-panel-rows>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-table-row-hover">
              {selectable ? (
                <td className="border-table-border border-t px-3 py-2.5">
                  <input
                    type="checkbox"
                    data-select-row
                    value={String(row[pk] ?? "")}
                    aria-label={`Select row ${String(row[pk] ?? i)}`}
                    className="accent-primary size-4"
                  />
                </td>
              ) : null}
              {columns.map((col) => (
                <td key={col} className={cellClass(col)}>
                  {col === "status" && statusTag(row[col]) ? (
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${statusTag(row[col]) ?? ""}`}
                    >
                      {cell(row[col])}
                    </span>
                  ) : (
                    cell(row[col])
                  )}
                </td>
              ))}
              {editable ? (
                <td className="border-table-border whitespace-nowrap border-t px-3 py-2.5 text-right">
                  <button
                    type="button"
                    data-edit-id={String(row[pk] ?? "")}
                    className="text-link hover:text-link-hover px-1 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    data-delete-id={String(row[pk] ?? "")}
                    className="text-destructive ml-3 px-1 text-sm font-medium hover:underline"
                  >
                    Delete
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
