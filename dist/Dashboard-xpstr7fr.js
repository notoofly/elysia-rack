import {
  listRacks
} from "./index-zc7rgvmm.js";
import"./index-37x76zdn.js";

// src/react/page/components/Breadcrumb.tsx
import { jsxDEV } from "react/jsx-dev-runtime";
function Breadcrumb({ trail }) {
  return /* @__PURE__ */ jsxDEV("nav", {
    "aria-label": "Breadcrumb",
    className: "pb-3 text-sm",
    children: /* @__PURE__ */ jsxDEV("ol", {
      className: "flex flex-wrap items-center gap-1.5",
      children: trail.map((item, i) => {
        const last = i === trail.length - 1;
        return /* @__PURE__ */ jsxDEV("li", {
          className: "flex items-center gap-1.5",
          children: [
            i > 0 ? /* @__PURE__ */ jsxDEV("span", {
              "aria-hidden": "true",
              className: "text-text-muted",
              children: "/"
            }, undefined, false, undefined, this) : null,
            item.href && !last ? /* @__PURE__ */ jsxDEV("a", {
              href: item.href,
              className: "text-text-muted hover:text-foreground",
              children: item.label
            }, undefined, false, undefined, this) : /* @__PURE__ */ jsxDEV("span", {
              "aria-current": last ? "page" : undefined,
              className: last ? "text-foreground font-semibold" : "text-text-muted",
              children: item.label
            }, undefined, false, undefined, this)
          ]
        }, `${item.label}-${i}`, true, undefined, this);
      })
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}

// src/react/page/components/Sidebar.tsx
import { jsxDEV as jsxDEV2 } from "react/jsx-dev-runtime";
function Sidebar({ title, groups }) {
  return /* @__PURE__ */ jsxDEV2("aside", {
    className: "bg-sidebar text-sidebar-foreground border-sidebar-border min-h-0 w-64 shrink-0 overflow-y-auto rounded-lg border",
    children: [
      /* @__PURE__ */ jsxDEV2("div", {
        className: "border-sidebar-border border-b px-4 py-3",
        children: /* @__PURE__ */ jsxDEV2("p", {
          className: "font-koran text-xl font-black tracking-tight",
          children: title
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV2("nav", {
        className: "flex flex-col gap-4 p-3",
        children: groups.map((group) => /* @__PURE__ */ jsxDEV2("section", {
          children: /* @__PURE__ */ jsxDEV2("details", {
            className: "group",
            open: group.items.some((item) => item.active) || undefined,
            children: [
              /* @__PURE__ */ jsxDEV2("summary", {
                className: "font-koran border-sidebar-border flex cursor-pointer list-none items-center justify-between border-b px-2 pb-1 text-base font-bold tracking-tight [&::-webkit-details-marker]:hidden",
                children: [
                  /* @__PURE__ */ jsxDEV2("span", {
                    children: group.name
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsxDEV2("span", {
                    "aria-hidden": "true",
                    className: "text-text-muted text-xs transition group-open:rotate-180",
                    children: "▾"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsxDEV2("ul", {
                className: "border-sidebar-border mt-1 ml-2 flex flex-col gap-0.5 border-l py-1 pl-2",
                children: group.items.map((item) => /* @__PURE__ */ jsxDEV2("li", {
                  children: /* @__PURE__ */ jsxDEV2("a", {
                    href: item.href,
                    "aria-current": item.active ? "page" : undefined,
                    className: item.active ? "bg-sidebar-primary text-sidebar-primary-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    children: [
                      item.icon ? /* @__PURE__ */ jsxDEV2("span", {
                        "aria-hidden": "true",
                        children: item.icon
                      }, undefined, false, undefined, this) : null,
                      /* @__PURE__ */ jsxDEV2("span", {
                        children: item.label
                      }, undefined, false, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                }, item.id, false, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, group.name, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// src/react/page/Dashboard.tsx
import { jsxDEV as jsxDEV3 } from "react/jsx-dev-runtime";
function itemLabel(r) {
  return r.metadata.pluralLabel ?? r.metadata.label ?? r.metadata.id;
}
function buildGroups(racks, selectedId) {
  const byGroup = new Map;
  for (const r of racks) {
    if (r.metadata.hidden)
      continue;
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
      active: r.metadata.id === selectedId
    });
  }
  const groups = [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const group of groups) {
    const orderOf = (id) => racks.find((r) => r.metadata.id === id)?.metadata.order ?? 0;
    group.items.sort((a, b) => orderOf(a.id) - orderOf(b.id) || a.label.localeCompare(b.label));
  }
  return groups;
}
async function Dashboard(props) {
  const racks = (props.racks ?? listRacks()).filter((r) => !r.metadata.hidden);
  const selected = racks.find((r) => r.metadata.id === props.resource) ?? racks[0];
  const groups = buildGroups(racks, selected?.metadata.id);
  const trail = [
    { label: "Dashboard", href: "?" },
    ...selected?.metadata.group ? [{ label: selected.metadata.group }] : [],
    ...selected ? [{ label: itemLabel(selected) }] : []
  ];
  return /* @__PURE__ */ jsxDEV3("div", {
    className: "koran-paper font-koran-body text-foreground flex flex-col min-h-screen",
    children: /* @__PURE__ */ jsxDEV3("div", {
      className: "flex min-h-0 flex-1 gap-6 p-4 sm:p-6 h-full",
      children: [
        /* @__PURE__ */ jsxDEV3(Sidebar, {
          title: props.name ?? "Panel",
          groups
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsxDEV3("main", {
          className: "flex min-w-0 flex-1 flex-col",
          children: [
            /* @__PURE__ */ jsxDEV3(Breadcrumb, {
              trail
            }, undefined, false, undefined, this),
            selected ? /* @__PURE__ */ jsxDEV3("iframe", {
              src: selected.path,
              title: itemLabel(selected),
              sandbox: "allow-scripts allow-same-origin allow-forms",
              className: "bg-card min-h-0 w-full flex-1 rounded-lg"
            }, undefined, false, undefined, this) : /* @__PURE__ */ jsxDEV3("p", {
              className: "text-text-muted border-border rounded-lg border px-4 py-10 text-center",
              children: "No resources registered. Mount a resource with rack() first."
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
export {
  Dashboard as default
};
