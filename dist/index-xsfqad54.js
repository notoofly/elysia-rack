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
function SidebarItemView({ item, depth = 0 }) {
  const hasChildren = item.children && item.children.length > 0;
  return /* @__PURE__ */ jsxDEV2("li", {
    children: [
      /* @__PURE__ */ jsxDEV2("a", {
        href: item.href,
        "aria-current": item.active ? "page" : undefined,
        className: item.active ? "bg-sidebar-primary text-sidebar-primary-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        style: depth > 0 ? { paddingLeft: `${8 + depth * 12}px` } : undefined,
        children: [
          item.icon ? /* @__PURE__ */ jsxDEV2("span", {
            "aria-hidden": "true",
            children: item.icon
          }, undefined, false, undefined, this) : null,
          /* @__PURE__ */ jsxDEV2("span", {
            children: item.label
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      hasChildren ? /* @__PURE__ */ jsxDEV2("ul", {
        className: "border-sidebar-border mt-0.5 ml-2 flex flex-col gap-0.5 border-l py-1 pl-2",
        children: item.children.map((child) => /* @__PURE__ */ jsxDEV2(SidebarItemView, {
          item: child,
          depth: depth + 1
        }, child.id, false, undefined, this))
      }, undefined, false, undefined, this) : null
    ]
  }, undefined, true, undefined, this);
}
function hasActive(items) {
  for (const it of items) {
    if (it.active)
      return true;
    if (it.children && hasActive(it.children))
      return true;
  }
  return false;
}
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
            open: hasActive(group.items) || undefined,
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
                children: group.items.map((item) => /* @__PURE__ */ jsxDEV2(SidebarItemView, {
                  item
                }, item.id, false, undefined, this))
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, group.name, false, undefined, this))
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// src/react/page/components/Masthead.tsx
import { jsxDEV as jsxDEV3 } from "react/jsx-dev-runtime";
function Masthead({ title, group, resource, total }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return /* @__PURE__ */ jsxDEV3("header", {
    className: "bg-header text-header-foreground",
    children: [
      /* @__PURE__ */ jsxDEV3("div", {
        className: "flex items-center justify-between gap-4 py-2 text-xs tracking-widest text-text-muted uppercase",
        children: [
          /* @__PURE__ */ jsxDEV3("span", {
            children: today
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV3("span", {
            className: "hidden sm:inline",
            children: "Daily Edition"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV3("button", {
            id: "koran-theme-toggle",
            type: "button",
            className: "border-border hover:bg-navigation-hover rounded-full border px-3 py-1 tracking-widest uppercase",
            children: "◐ Theme"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV3("h1", {
        className: "font-koran py-2 text-center text-5xl font-black tracking-tight",
        children: title
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsxDEV3("div", {
        className: "flex items-center justify-center gap-2 pb-3 text-sm text-text-muted",
        children: [
          group ? /* @__PURE__ */ jsxDEV3("span", {
            className: "uppercase",
            children: group
          }, undefined, false, undefined, this) : null,
          group && (resource || total !== undefined) ? /* @__PURE__ */ jsxDEV3("span", {
            "aria-hidden": "true",
            children: "·"
          }, undefined, false, undefined, this) : null,
          resource ? /* @__PURE__ */ jsxDEV3("span", {
            className: "font-mono text-xs",
            children: [
              "/",
              resource
            ]
          }, undefined, true, undefined, this) : null,
          total !== undefined ? /* @__PURE__ */ jsxDEV3("span", {
            children: [
              total,
              " records"
            ]
          }, undefined, true, undefined, this) : null
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV3("div", {
        className: "koran-rule-double"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

export { Breadcrumb, Sidebar, Masthead };
