import {
  Breadcrumb,
  Masthead,
  Sidebar
} from "./index-xsfqad54.js";
import {
  getRackTree
} from "./index-4wxvmd8a.js";
import"./index-37x76zdn.js";

// src/react/page/Dashboard.tsx
import { jsxDEV } from "react/jsx-dev-runtime";
function itemLabel(r) {
  return r.metadata.pluralLabel ?? r.metadata.label ?? r.metadata.id;
}
function toSidebarItem(node, activeId) {
  return {
    id: node.metadata.id,
    label: itemLabel(node),
    icon: node.metadata.icon,
    href: node.path,
    active: node.metadata.id === activeId,
    children: node.children.filter((c) => !c.metadata.hidden).map((c) => toSidebarItem(c, activeId))
  };
}
function buildGroupsFromTree(tree, activeId) {
  const byGroup = new Map;
  for (const root of tree) {
    if (root.metadata.hidden)
      continue;
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
async function Dashboard(props) {
  const tree = getRackTree().filter((r) => !r.metadata.hidden);
  const groups = buildGroupsFromTree(tree, props.resource);
  const totalResources = tree.length + tree.reduce((a, n) => a + n.children.length, 0);
  const totalGroups = groups.length;
  return /* @__PURE__ */ jsxDEV("div", {
    className: "koran-paper font-koran-body text-foreground flex min-h-screen flex-col",
    children: /* @__PURE__ */ jsxDEV("div", {
      className: "flex flex-1 gap-6 p-4 sm:p-6",
      children: [
        /* @__PURE__ */ jsxDEV(Sidebar, {
          title: props.name ?? "Panel",
          groups
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsxDEV("main", {
          className: "flex min-w-0 flex-1 flex-col",
          children: [
            /* @__PURE__ */ jsxDEV(Breadcrumb, {
              trail: [{ label: "Dashboard" }]
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsxDEV("div", {
              className: "mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6",
              children: [
                /* @__PURE__ */ jsxDEV(Masthead, {
                  title: props.name ?? "ERP Demo",
                  group: "Dashboard",
                  resource: "dashboard",
                  total: totalResources
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsxDEV("div", {
                  className: "grid grid-cols-2 gap-3 pb-6 lg:grid-cols-4",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", {
                      className: "bg-card border-border rounded-lg border px-4 py-3",
                      children: [
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs font-semibold tracking-widest uppercase",
                          children: "Resources"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "font-koran text-2xl font-black",
                          children: totalResources
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs",
                          children: [
                            totalGroups,
                            " groups"
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ jsxDEV("div", {
                      className: "bg-card border-border rounded-lg border px-4 py-3",
                      children: [
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs font-semibold tracking-widest uppercase",
                          children: "Modules"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "font-koran text-2xl font-black",
                          children: totalGroups
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs",
                          children: "Core → Governance"
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ jsxDEV("div", {
                      className: "bg-card border-border rounded-lg border px-4 py-3",
                      children: [
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs font-semibold tracking-widest uppercase",
                          children: "Status"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "font-koran text-2xl font-black",
                          children: "Ready"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs",
                          children: "PGlite in-memory"
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ jsxDEV("div", {
                      className: "bg-card border-border rounded-lg border px-4 py-3",
                      children: [
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs font-semibold tracking-widest uppercase",
                          children: "Tree"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "font-koran text-2xl font-black",
                          children: tree.length
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted text-xs",
                          children: "root nodes"
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsxDEV("div", {
                  className: "border-border bg-card rounded-lg border",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", {
                      className: "border-border flex items-center justify-between border-b px-4 py-3",
                      children: [
                        /* @__PURE__ */ jsxDEV("h2", {
                          className: "text-sm font-semibold tracking-widest uppercase",
                          children: "Resource Tree"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ jsxDEV("span", {
                          className: "text-text-muted text-xs",
                          children: [
                            totalResources,
                            " resources"
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ jsxDEV("div", {
                      className: "divide-border divide-y",
                      children: [
                        groups.map((g) => /* @__PURE__ */ jsxDEV("div", {
                          className: "px-4 py-3",
                          children: [
                            /* @__PURE__ */ jsxDEV("p", {
                              className: "text-xs font-semibold tracking-widest uppercase text-form-label",
                              children: g.name
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ jsxDEV("ul", {
                              className: "mt-2 flex flex-wrap gap-2",
                              children: g.items.map((it) => /* @__PURE__ */ jsxDEV("li", {
                                children: [
                                  /* @__PURE__ */ jsxDEV("a", {
                                    href: it.href,
                                    className: "bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium hover:underline",
                                    children: [
                                      /* @__PURE__ */ jsxDEV("span", {
                                        children: it.icon ?? "•"
                                      }, undefined, false, undefined, this),
                                      " ",
                                      it.label
                                    ]
                                  }, undefined, true, undefined, this),
                                  (it.children?.length ?? 0) > 0 && /* @__PURE__ */ jsxDEV("span", {
                                    className: "text-text-muted ml-1 text-xs",
                                    children: [
                                      "+",
                                      it.children?.length ?? 0,
                                      " child"
                                    ]
                                  }, undefined, true, undefined, this)
                                ]
                              }, it.id, true, undefined, this))
                            }, undefined, false, undefined, this)
                          ]
                        }, g.name, true, undefined, this)),
                        groups.length === 0 && /* @__PURE__ */ jsxDEV("p", {
                          className: "text-text-muted px-4 py-6 text-center text-sm",
                          children: "Belum ada resource terdaftar — pastikan rack() sudah dipanggil sebelum dashboard render."
                        }, undefined, false, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsxDEV("footer", {
                  className: "border-border text-text-muted mt-6 border-t pt-3 text-center text-xs tracking-widest uppercase",
                  children: "Printed by elysia-rack — ERP blueprint"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
export {
  Dashboard as default
};
