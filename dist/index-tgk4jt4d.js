// src/rack/registry.ts
var registrations = new Map;
function registerRack(reg) {
  registrations.set(reg.path, reg);
}
function listRacks() {
  return [...registrations.values()];
}
function getRack(id) {
  for (const r of registrations.values())
    if (r.metadata.id === id)
      return r;
  return;
}
function getRackTree() {
  const nodes = new Map;
  for (const r of registrations.values()) {
    nodes.set(r.metadata.id, { ...r, children: [] });
  }
  const roots = [];
  for (const node of nodes.values()) {
    const parentId = node.metadata.parent;
    if (parentId && nodes.has(parentId) && parentId !== node.metadata.id) {
      nodes.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (list) => {
    list.sort((a, b) => {
      const orderA = a.metadata.order ?? 0;
      const orderB = b.metadata.order ?? 0;
      if (orderA !== orderB)
        return orderA - orderB;
      const labelA = a.metadata.pluralLabel ?? a.metadata.label ?? a.metadata.id;
      const labelB = b.metadata.pluralLabel ?? b.metadata.label ?? b.metadata.id;
      return labelA.localeCompare(labelB);
    });
    for (const n of list)
      if (n.children.length)
        sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}
function flatRackTree(tree = getRackTree()) {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      const { children, ...rest } = n;
      out.push(rest);
      if (children.length)
        walk(children);
    }
  };
  walk(tree);
  return out;
}
function clearRacks() {
  registrations.clear();
}

export { registerRack, listRacks, getRack, getRackTree, flatRackTree, clearRacks };
