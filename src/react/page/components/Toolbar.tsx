import { href } from "./href";
import type { PanelField } from "./panelFields";

export interface ToolbarProps {
  fields?: PanelField[];
  searchable?: readonly string[];
  filterable?: readonly string[];
  sortable?: readonly string[];
  params: Record<string, unknown>;
  softDelete?: boolean;
  includeDeleted?: boolean;
}

const inputClass =
  "border-input bg-input-background text-foreground placeholder:text-form-placeholder focus:border-ring h-8 rounded-md border px-2.5 text-sm";
const labelClass = "flex flex-col gap-1";

function FilterInput({ field, value }: { field?: PanelField; value: unknown }) {
  const current = value === undefined || value === null ? "" : String(value);
  if (field?.relation) {
    return (
      <select name={field.name} defaultValue={current} className={`${inputClass} w-40`}>
        <option value="">All</option>
        {field.relation.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field?.kind === "enum") {
    return (
      <select name={field.name} defaultValue={current} className={`${inputClass} w-40`}>
        <option value="">All</option>
        {(field.enumValues ?? []).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }
  if (field?.kind === "boolean") {
    return (
      <select name={field.name} defaultValue={current} className={`${inputClass} w-40`}>
        <option value="">All</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (field?.kind === "date") {
    return (
      <input
        type="date"
        name={field.name}
        defaultValue={current}
        className={`${inputClass} w-40`}
      />
    );
  }
  if (field?.kind === "integer" || field?.kind === "number") {
    return (
      <input
        type="number"
        name={field.name}
        defaultValue={current}
        className={`${inputClass} w-40`}
      />
    );
  }
  return (
    <input name={field?.name ?? ""} defaultValue={current} className={`${inputClass} w-40`} />
  );
}

export function Toolbar({
  fields,
  searchable,
  filterable,
  sortable,
  params,
  softDelete,
  includeDeleted,
}: ToolbarProps) {
  const hasFilters =
    Boolean(searchable?.length) ||
    Boolean(filterable?.length) ||
    Boolean(sortable?.length) ||
    Boolean(softDelete);
  if (!hasFilters) return null;

  const byName = new Map((fields ?? []).map((f) => [f.name, f]));
  const label = (name: string) => byName.get(name)?.label ?? name;
  const searchLabel = (searchable ?? []).map(label).join(", ");

  return (
    <form method="get" action="" className="flex flex-wrap items-end gap-3 pb-4">
      {includeDeleted ? (
        <input type="hidden" name="includeDeleted" value="true" />
      ) : null}
      {searchable && searchable.length > 0 ? (
        <label className={labelClass}>
          <span className="text-text-muted text-xs font-medium">Search</span>
          <input
            name="search"
            data-search-input
            defaultValue={String(params.search ?? "")}
            placeholder={searchLabel}
            autoComplete="off"
            className={`${inputClass} w-56 max-w-full`}
          />
        </label>
      ) : null}
      {(filterable ?? []).map((name) => (
        <label key={name} className={labelClass}>
          <span className="text-text-muted text-xs font-medium">{label(name)}</span>
          <FilterInput field={byName.get(name)} value={params[name]} />
        </label>
      ))}
      {sortable && sortable.length > 0 ? (
        <>
          <label className={labelClass}>
            <span className="text-text-muted text-xs font-medium">Sort</span>
            <select name="sort" defaultValue={String(params.sort ?? "")} className={inputClass}>
              <option value="">Default</option>
              {sortable.map((name) => (
                <option key={name} value={name}>
                  {label(name)}
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
      {softDelete ? (
        <a
          data-qlink
          href={href(params, {
            includeDeleted: includeDeleted ? undefined : "true",
            page: 1,
          })}
          className="text-text-muted hover:text-foreground h-8 self-end text-sm underline underline-offset-4"
        >
          {includeDeleted ? "Hide deleted" : "Show deleted"}
        </a>
      ) : null}
    </form>
  );
}
