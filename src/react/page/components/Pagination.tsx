import { href, pageWindow } from "./href";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  params: Record<string, unknown>;
}

export { pageWindow };

const pageClass =
  "border-border rounded-md border px-3 py-1 text-sm hover:bg-navigation-hover";
const currentClass =
  "bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-bold";
const disabledClass =
  "border-border text-text-disabled rounded-md border px-3 py-1 text-sm";

export function Pagination({ page, totalPages, total, limit, params }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
      <p className="text-text-muted" data-panel-count>
        Page {page} of {totalPages} — {from}–{to} of {total} records
      </p>
      <div className="flex items-center gap-1" data-panel-pages>
        {page > 1 ? (
          <a className={pageClass} data-qlink href={href(params, { page: page - 1 })}>
            ← Previous
          </a>
        ) : (
          <span className={disabledClass}>← Previous</span>
        )}
        {pageWindow(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="text-text-muted px-1">
              …
            </span>
          ) : p === page ? (
            <span key={p} className={currentClass}>
              {p}
            </span>
          ) : (
            <a key={p} className={pageClass} data-qlink href={href(params, { page: p })}>
              {p}
            </a>
          ),
        )}
        {page < totalPages ? (
          <a className={pageClass} data-qlink href={href(params, { page: page + 1 })}>
            Next →
          </a>
        ) : (
          <span className={disabledClass}>Next →</span>
        )}
      </div>
    </nav>
  );
}
