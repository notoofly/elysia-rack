export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ trail }: { trail: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pb-3 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span aria-hidden="true" className="text-text-muted">
                  /
                </span>
              ) : null}
              {item.href && !last ? (
                <a
                  href={item.href}
                  className="text-text-muted hover:text-foreground"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={
                    last ? "text-foreground font-semibold" : "text-text-muted"
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
