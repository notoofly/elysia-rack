export interface ToolbarProps {
  searchable?: readonly string[];
  filterable?: readonly string[];
  sortable?: readonly string[];
  params: Record<string, unknown>;
}

const inputClass =
  "border-input bg-input-background text-foreground placeholder:text-form-placeholder focus:border-ring h-8 rounded-md border px-2.5 text-sm";
const labelClass = "flex flex-col gap-1";

export function Toolbar({ searchable, filterable, sortable, params }: ToolbarProps) {
  if (!searchable?.length && !filterable?.length && !sortable?.length) return null;
  return (
    <form method="get" action="" className="flex flex-wrap items-end gap-3 pb-4">
      {searchable && searchable.length > 0 ? (
        <label className={labelClass}>
          <span className="text-text-muted text-xs font-medium">Search</span>
          <input
            name="search"
            data-search-input
            defaultValue={String(params.search ?? "")}
            placeholder={searchable.join(", ")}
            autoComplete="off"
            className={`${inputClass} w-56 max-w-full`}
          />
        </label>
      ) : null}
      {(filterable ?? []).map((field) => (
        <label key={field} className={labelClass}>
          <span className="text-text-muted text-xs font-medium capitalize">{field}</span>
          <input
            name={field}
            defaultValue={String(params[field] ?? "")}
            className={`${inputClass} w-40 max-w-full`}
          />
        </label>
      ))}
      {sortable && sortable.length > 0 ? (
        <>
          <label className={labelClass}>
            <span className="text-text-muted text-xs font-medium">Sort</span>
            <select name="sort" defaultValue={String(params.sort ?? "")} className={inputClass}>
              <option value="">Default</option>
              {sortable.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            <span className="text-text-muted text-xs font-medium">Order</span>
            <select name="order" defaultValue={String(params.order ?? "")} className={inputClass}>
              <option value="">Default</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </>
      ) : null}
      <button
        type="submit"
        className="border-border bg-background text-foreground hover:bg-navigation-hover h-8 rounded-md border px-3.5 text-sm font-medium"
      >
        Apply
      </button>
    </form>
  );
}
