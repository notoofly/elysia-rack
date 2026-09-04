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
            ? "bg-sidebar-primary text-sidebar-primary-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold"
            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
        }
        style={depth > 0 ? { paddingLeft: `${8 + depth * 12}px` } : undefined}
      >
        {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
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
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border min-h-0 w-64 shrink-0 overflow-y-auto rounded-lg border">
      <div className="border-sidebar-border border-b px-4 py-3">
        <p className="font-koran text-xl font-black tracking-tight">{title}</p>
      </div>
      <nav className="flex flex-col gap-4 p-3">
        {groups.map((group) => (
          <section key={group.name}>
            <details
              className="group"
              open={hasActive(group.items) || undefined}
            >
              <summary className="font-koran border-sidebar-border flex cursor-pointer list-none items-center justify-between border-b px-2 pb-1 text-base font-bold tracking-tight [&::-webkit-details-marker]:hidden">
                <span>{group.name}</span>
                <span
                  aria-hidden="true"
                  className="text-text-muted text-xs transition group-open:rotate-180"
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
