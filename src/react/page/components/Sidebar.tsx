import { RackIcon } from "./Icon";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  href: string;
  active?: boolean;
  children?: SidebarItem[];
}

export interface SidebarGroup {
  name: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  title: string;
  groups: SidebarGroup[];
}

function SidebarItemView({ item, depth = 0 }: { item: SidebarItem; depth?: number }) {
  const hasChildren = item.children && item.children.length > 0;
  return (
    <li>
      <a
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        className={
          item.active
            ? "bg-sidebar-primary text-sidebar-primary-foreground flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm"
        }
        style={depth > 0 ? { paddingLeft: `${10 + depth * 12}px` } : undefined}
      >
        {item.icon ? (
          <RackIcon name={item.icon} size={16} className="size-4 shrink-0" />
        ) : null}
        <span>{item.label}</span>
      </a>
      {hasChildren ? (
        <ul className="border-sidebar-border mt-0.5 ml-2 flex flex-col gap-0.5 border-l py-1 pl-2">
          {item.children!.map((child) => (
            <SidebarItemView key={child.id} item={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function hasActive(items: SidebarItem[]): boolean {
  for (const it of items) {
    if (it.active) return true;
    if (it.children && hasActive(it.children)) return true;
  }
  return false;
}

export function Sidebar({ title, groups }: SidebarProps) {
  return (
    <aside className="border-sidebar-border bg-sidebar shrink-0 border-b lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:overflow-y-auto lg:border-r lg:border-b-0 xl:w-64">
      <input
        type="checkbox"
        id="rack-nav-toggle"
        aria-label="Toggle navigation"
        className="peer sr-only"
      />
      <div className="border-sidebar-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <a href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="bg-gold text-gold-foreground flex size-6 shrink-0 items-center justify-center text-[13px] font-semibold"
          >
            {title.charAt(0).toUpperCase()}
          </span>
          <span className="font-display text-[15px] tracking-tight">{title}</span>
        </a>
        <label
          htmlFor="rack-nav-toggle"
          className="border-border text-muted-foreground hover:bg-navigation-hover cursor-pointer rounded-md border px-2.5 py-1 text-xs lg:hidden"
        >
          Menu
        </label>
      </div>
      <nav className="hidden flex-col gap-4 overflow-y-auto px-3 py-3 peer-checked:flex lg:flex lg:py-4">
        {groups.map((group) => (
          <section key={group.name}>
            <details className="group" open={hasActive(group.items) || undefined}>
              <summary className="text-text-muted flex cursor-pointer list-none items-center justify-between px-2.5 pb-1.5 text-xs font-medium [&::-webkit-details-marker]:hidden">
                <span>{group.name}</span>
                <span
                  aria-hidden="true"
                  className="text-text-subtle transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <ul className="border-sidebar-border mt-1 ml-2 flex flex-col gap-0.5 border-l py-1 pl-2">
                {group.items.map((item) => (
                  <SidebarItemView key={item.id} item={item} />
                ))}
              </ul>
            </details>
          </section>
        ))}
      </nav>
    </aside>
  );
}
