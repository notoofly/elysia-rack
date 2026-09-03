export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  href: string;
  active?: boolean;
}

export interface SidebarGroup {
  name: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  title: string;
  groups: SidebarGroup[];
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
              open={group.items.some((item) => item.active) || undefined}
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
                <li key={item.id}>
                  <a
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={
                      item.active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    }
                  >
                    {item.icon ? (
                      <span aria-hidden="true">{item.icon}</span>
                    ) : null}
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            </details>
          </section>
        ))}
      </nav>
    </aside>
  );
}
