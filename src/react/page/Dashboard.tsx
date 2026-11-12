import { Fragment } from "react";
import { getRackTree, type RackTreeNode } from "../../rack/registry";
import { Sidebar, type SidebarGroup, type SidebarItem } from "./components/Sidebar";
import { RackIcon } from "./components/Icon";
import { Masthead } from "./components/Masthead";
import { resolveDonateProp } from "../donate";

export interface DashboardProps {
  name?: string;
  resource?: string;
  donate?: boolean;
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

function countNodes(nodes: RackTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}

function operationsLabel(node: RackTreeNode): string {
  const op = node.operations;
  const write = [op.create, op.update, op.replace, op.delete];
  if (!write.some(Boolean)) return "Read only";
  if (write.every(Boolean)) return "Full";
  const labels: string[] = [];
  if (op.create) labels.push("Create");
  if (op.update) labels.push("Update");
  if (op.replace) labels.push("Replace");
  if (op.delete) labels.push("Delete");
  return labels.join(", ");
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function ResourceRow({ node, depth = 0 }: { node: RackTreeNode; depth?: number }) {
  return (
    <>
      <tr className="hover:bg-table-row-hover">
        <td className="border-table-border border-t px-3 py-2.5">
          <a
            href={node.path}
            className="text-link hover:text-link-hover font-medium hover:underline"
            style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}
          >
            {node.metadata.icon ? (
              <RackIcon
                name={node.metadata.icon}
                size={16}
                className="mr-1.5 inline size-4 align-text-bottom"
              />
            ) : null}
            {node.metadata.label ?? node.metadata.id}
          </a>
        </td>
        <td className="border-table-border text-text-muted border-t px-3 py-2.5 font-mono text-xs">
          {node.path}
        </td>
        <td className="border-table-border text-text-muted border-t px-3 py-2.5 text-xs">
          {operationsLabel(node)}
        </td>
      </tr>
      {node.children
        .filter((c) => !c.metadata.hidden)
        .map((child) => (
          <ResourceRow key={child.metadata.id} node={child} depth={depth + 1} />
        ))}
    </>
  );
}

export default async function Dashboard(props: DashboardProps) {
  const tree = getRackTree().filter((r) => !r.metadata.hidden);
  const groups = buildGroupsFromTree(tree, props.resource);
  const totalResources = countNodes(tree);
  const totalGroups = groups.length;
  const donate = resolveDonateProp(props.donate);

  return (
    <div className="text-foreground flex min-h-screen flex-col lg:flex-row">
      <Sidebar title={props.name ?? "Panel"} groups={groups} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <Masthead
            title={props.name ?? "Panel"}
            detail={`${plural(totalResources, "resource")} in ${plural(totalGroups, "group")}`}
          />

          <div className="bg-table border-border overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border-border text-text-muted border-b px-3 py-2 text-xs font-medium">
                    Resource
                  </th>
                  <th className="border-border text-text-muted border-b px-3 py-2 text-xs font-medium">
                    Path
                  </th>
                  <th className="border-border text-text-muted border-b px-3 py-2 text-xs font-medium">
                    Operations
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-text-muted px-4 py-10 text-center">
                      No resources registered. Call rack() before rendering this page.
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => {
                    const nodes = tree.filter(
                      (r) => (r.metadata.group ?? "General") === group.name,
                    );
                    return (
                      <Fragment key={group.name}>
                        <tr className="bg-surface-muted">
                          <th
                            colSpan={3}
                            className="border-border text-text-muted border-b px-3 py-1.5 text-left text-xs font-medium"
                          >
                            {group.name}{" "}
                            <span className="text-text-subtle font-normal">
                              {plural(countNodes(nodes), "resource")}
                            </span>
                          </th>
                        </tr>
                        {nodes.map((node) => (
                          <ResourceRow key={node.metadata.id} node={node} />
                        ))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="border-border text-text-muted mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
            <span>elysia-rack</span>
            {donate.enabled ? (
              <a
                href={donate.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                {donate.label}
              </a>
            ) : null}
          </footer>
        </div>
      </main>
    </div>
  );
}
