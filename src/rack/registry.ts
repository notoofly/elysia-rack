import type { Rack } from "./types";

export interface RackRegistration {
  /** Mount path, e.g. `/catalog/products`. */
  path: string;

  /** Resolved metadata (`id` defaults to path). */
  metadata: Rack.CrudMetadata & { id: string };

  /** Resolved operations (all default `true`). */
  operations: Required<Rack.CrudOperationsOptions>;
}

/** Tree node for sidebar/dashboard. Children are resources where `metadata.parent === node.metadata.id`. */
export interface RackTreeNode extends RackRegistration {
  children: RackTreeNode[];
}

const registrations = new Map<string, RackRegistration>();

/**
 * Register a rack resource. Called automatically by `rack()`.
 * Re-registering the same path replaces the previous entry.
 */
export function registerRack(reg: RackRegistration): void {
  registrations.set(reg.path, reg);
}

/** List all registered rack resources in registration order. */
export function listRacks(): RackRegistration[] {
  return [...registrations.values()];
}

/** Get a single registration by `metadata.id`. */
export function getRack(id: string): RackRegistration | undefined {
  for (const r of registrations.values()) if (r.metadata.id === id) return r;
  return undefined;
}

function sortTreeNodes(list: RackTreeNode[]): void {
  list.sort((a, b) => {
    const orderA = a.metadata.order ?? 0;
    const orderB = b.metadata.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    const labelA = a.metadata.pluralLabel ?? a.metadata.label ?? a.metadata.id;
    const labelB = b.metadata.pluralLabel ?? b.metadata.label ?? b.metadata.id;
    return labelA.localeCompare(labelB);
  });
  for (const n of list) if (n.children.length) sortTreeNodes(n.children);
}

/** Build a tree from an explicit list (pure, reusable for props.racks). */
export function buildRackTree(racks: RackRegistration[]): RackTreeNode[] {
  const nodes = new Map<string, RackTreeNode>();
  for (const r of racks) nodes.set(r.metadata.id, { ...r, children: [] });
  const roots: RackTreeNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.metadata.parent;
    if (parentId && nodes.has(parentId) && parentId !== node.metadata.id) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  sortTreeNodes(roots);
  return roots;
}

/**
 * Build a hierarchical tree from `parent` metadata.
 * - Nodes without `parent` or with missing parent become roots.
 * - Children are sorted by `order` then label.
 */
export function getRackTree(): RackTreeNode[] {
  return buildRackTree([...registrations.values()]);
}

/** Flatten tree into a depth-first ordered list (useful for legacy dashboard). */
export function flatRackTree(tree = getRackTree()): RackRegistration[] {
  const out: RackRegistration[] = [];
  const walk = (nodes: RackTreeNode[]) => {
    for (const n of nodes) {
      const { children, ...rest } = n;
      out.push(rest);
      if (children.length) walk(children);
    }
  };
  walk(tree);
  return out;
}

/** Clear the registry (mainly for tests). */
export function clearRacks(): void {
  registrations.clear();
}
