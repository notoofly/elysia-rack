import { getRackTree, type RackTreeNode } from "../../rack/registry";
import { Breadcrumb } from "./components/Breadcrumb";
import { Sidebar, type SidebarGroup, type SidebarItem } from "./components/Sidebar";
import { Masthead } from "./components/Masthead";

export interface DashboardProps {
  name?: string;
  resource?: string;
}

function itemLabel(r: { metadata: { pluralLabel?: string; label?: string; id: string } }): string {
  return r.metadata.pluralLabel ?? r.metadata.label ?? r.metadata.id;
}

function toSidebarItem(node: RackTreeNode, activeId?: string): SidebarItem {
  return {
    id: node.metadata.id,
    label: itemLabel(node),
    icon: node.metadata.icon,
    href: node.path,
    active: node.metadata.id === activeId,
    children: node.children.filter((c) => !c.metadata.hidden).map((c) => toSidebarItem(c, activeId)),
  };
}

function buildGroupsFromTree(tree: RackTreeNode[], activeId?: string): SidebarGroup[] {
  const byGroup = new Map<string, SidebarGroup>();
  for (const root of tree) {
    if (root.metadata.hidden) continue;
    const name = root.metadata.group ?? "General";
    let group = byGroup.get(name);
    if (!group) {
      group = { name, items: [] };
      byGroup.set(name, group);
    }
    group.items.push(toSidebarItem(root, activeId));
  }
  return [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default async function Dashboard(props: DashboardProps) {
  const tree = getRackTree().filter((r) => !r.metadata.hidden);
  const groups = buildGroupsFromTree(tree, props.resource);
  const totalResources = tree.length + tree.reduce((a, n) => a + n.children.length, 0);
  const totalGroups = groups.length;

  return (
    <div className="koran-paper font-koran-body text-foreground flex min-h-screen flex-col">
      <div className="flex flex-1 gap-6 p-4 sm:p-6">
        <Sidebar title={props.name ?? "Panel"} groups={groups} />
        <main className="flex min-w-0 flex-1 flex-col">
          <Breadcrumb trail={[{ label: "Dashboard" }]} />
          <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
            <Masthead title={props.name ?? "ERP Demo"} group="Dashboard" resource="dashboard" total={totalResources} />
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 pb-6 lg:grid-cols-4">
              <div className="bg-card border-border rounded-lg border px-4 py-3">
                <p className="text-text-muted text-xs font-semibold tracking-widest uppercase">Resources</p>
                <p className="font-koran text-2xl font-black">{totalResources}</p>
                <p className="text-text-muted text-xs">{totalGroups} groups</p>
              </div>
              <div className="bg-card border-border rounded-lg border px-4 py-3">
                <p className="text-text-muted text-xs font-semibold tracking-widest uppercase">Modules</p>
                <p className="font-koran text-2xl font-black">{totalGroups}</p>
                <p className="text-text-muted text-xs">Core → Governance</p>
              </div>
              <div className="bg-card border-border rounded-lg border px-4 py-3">
                <p className="text-text-muted text-xs font-semibold tracking-widest uppercase">Status</p>
                <p className="font-koran text-2xl font-black">Ready</p>
                <p className="text-text-muted text-xs">PGlite in-memory</p>
              </div>
              <div className="bg-card border-border rounded-lg border px-4 py-3">
                <p className="text-text-muted text-xs font-semibold tracking-widest uppercase">Tree</p>
                <p className="font-koran text-2xl font-black">{tree.length}</p>
                <p className="text-text-muted text-xs">root nodes</p>
              </div>
            </div>

            {/* Tree preview — daftar resource per group */}
            <div className="border-border bg-card rounded-lg border">
              <div className="border-border flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold tracking-widest uppercase">Resource Tree</h2>
                <span className="text-text-muted text-xs">{totalResources} resources</span>
              </div>
              <div className="divide-border divide-y">
                {groups.map((g) => (
                  <div key={g.name} className="px-4 py-3">
                    <p className="text-xs font-semibold tracking-widest uppercase text-form-label">{g.name}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {g.items.map((it) => (
                        <li key={it.id}>
                          <a href={it.href} className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium hover:underline">
                            <span>{it.icon ?? "•"}</span> {it.label}
                          </a>
                          {(it.children?.length ?? 0) > 0 && (
                            <span className="text-text-muted ml-1 text-xs">+{it.children?.length ?? 0} child</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {groups.length === 0 && (
                  <p className="text-text-muted px-4 py-6 text-center text-sm">Belum ada resource terdaftar — pastikan rack() sudah dipanggil sebelum dashboard render.</p>
                )}
              </div>
            </div>

            <footer className="border-border text-text-muted mt-6 border-t pt-3 text-center text-xs tracking-widest uppercase">
              Printed by elysia-rack — ERP blueprint
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
