import {
  listRacks,
  type RackRegistration,
} from "../../rack/registry";
import { Breadcrumb } from "./components/Breadcrumb";
import { Sidebar, type SidebarGroup } from "./components/Sidebar";

export interface DashboardProps {
  name?: string;
  resource?: string;
  racks?: RackRegistration[];
}

function itemLabel(r: RackRegistration): string {
  return r.metadata.pluralLabel ?? r.metadata.label ?? r.metadata.id;
}

function buildGroups(racks: RackRegistration[], selectedId?: string): SidebarGroup[] {
  const byGroup = new Map<string, SidebarGroup>();
  for (const r of racks) {
    if (r.metadata.hidden) continue;
    const name = r.metadata.group ?? "General";
    let group = byGroup.get(name);
    if (!group) {
      group = { name, items: [] };
      byGroup.set(name, group);
    }
    group.items.push({
      id: r.metadata.id,
      label: itemLabel(r),
      icon: r.metadata.icon,
      href: `?resource=${encodeURIComponent(r.metadata.id)}`,
      active: r.metadata.id === selectedId,
    });
  }
  const groups = [...byGroup.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const group of groups) {
    const orderOf = (id: string) =>
      racks.find((r) => r.metadata.id === id)?.metadata.order ?? 0;
    group.items.sort(
      (a, b) => orderOf(a.id) - orderOf(b.id) || a.label.localeCompare(b.label),
    );
  }
  return groups;
}

export default async function Dashboard(props: DashboardProps) {
  const racks = (props.racks ?? listRacks()).filter((r) => !r.metadata.hidden);
  const selected =
    racks.find((r) => r.metadata.id === props.resource) ?? racks[0];
  const groups = buildGroups(racks, selected?.metadata.id);
  const trail = [
    { label: "Dashboard", href: "?" },
    ...(selected?.metadata.group
      ? [{ label: selected.metadata.group }]
      : []),
    ...(selected ? [{ label: itemLabel(selected) }] : []),
  ];

  return (
    <div className="koran-paper font-koran-body text-foreground flex flex-col min-h-screen">
      <div className="flex min-h-0 flex-1 gap-6 p-4 sm:p-6 h-full">
        <Sidebar title={props.name ?? "Panel"} groups={groups} />
        <main className="flex min-w-0 flex-1 flex-col">
          <Breadcrumb trail={trail} />
          {selected ? (
            <iframe
              src={selected.path}
              title={itemLabel(selected)}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="bg-card min-h-0 w-full flex-1 rounded-lg"
            />
          ) : (
            <p className="text-text-muted border-border rounded-lg border px-4 py-10 text-center">
              No resources registered. Mount a resource with rack() first.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
