export interface ToolbarProps {
  searchable?: readonly string[];
  filterable?: readonly string[];
  sortable?: readonly string[];
  params: Record<string, unknown>;
}

const inputClass =
  "bg-input-background border-input text-foreground placeholder:text-form-placeholder rounded-md border px-3 py-1.5 text-sm";
const labelClass =
  "flex flex-col gap-1 text-xs font-semibold tracking-wider text-form-label uppercase";

export function Toolbar({ searchable, filterable, sortable, params }: ToolbarProps) {
  if (!searchable?.length && !filterable?.length && !sortable?.length) return null;
  return (
    <form method="get" action="" className="flex flex-wrap items-end gap-3 py-4">
      {searchable && searchable.length > 0 ? (
        <label className={labelClass}>
          Search
          <input
            name="search"
            data-search-input
            defaultValue={String(params.search ?? "")}
            placeholder={searchable.join(", ")}
            autoComplete="off"
            className={inputClass}
          />
        </label>
      ) : null}
      {(filterable ?? []).map((field) => (
        <label key={field} className={labelClass}>
          {field}
          <input
            name={field}
            defaultValue={String(params[field] ?? "")}
            className={inputClass}
          />
        </label>
      ))}
      {sortable && sortable.length > 0 ? (
        <>
          <label className={labelClass}>
            Sort
            <select
              name="sort"
              defaultValue={String(params.sort ?? "")}
              className={inputClass}
            >
              <option value="">—</option>
              {sortable.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Order
            <select
              name="order"
              defaultValue={String(params.order ?? "")}
              className={inputClass}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </>
      ) : null}
      <button
        type="submit"
        className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-semibold"
      >
        Apply
      </button>
    </form>
  );
}
