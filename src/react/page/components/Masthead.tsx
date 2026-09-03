export interface MastheadProps {
  title: string;
  group?: string;
  resource?: string;
  total?: number;
}

export function Masthead({ title, group, resource, total }: MastheadProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <header className="bg-header text-header-foreground">
      <div className="flex items-center justify-between gap-4 py-2 text-xs tracking-widest text-text-muted uppercase">
        <span>{today}</span>
        <span className="hidden sm:inline">Daily Edition</span>
        <button
          id="koran-theme-toggle"
          type="button"
          className="border-border hover:bg-navigation-hover rounded-full border px-3 py-1 tracking-widest uppercase"
        >
          ◐ Theme
        </button>
      </div>
      <h1 className="font-koran py-2 text-center text-5xl font-black tracking-tight">
        {title}
      </h1>
      <div className="flex items-center justify-center gap-2 pb-3 text-sm text-text-muted">
        {group ? <span className="uppercase">{group}</span> : null}
        {group && (resource || total !== undefined) ? <span aria-hidden="true">·</span> : null}
        {resource ? <span className="font-mono text-xs">/{resource}</span> : null}
        {total !== undefined ? <span>{total} records</span> : null}
      </div>
      <div className="koran-rule-double" />
    </header>
  );
}
