import {
  Breadcrumb,
  Masthead,
  Sidebar
} from "./index-xsfqad54.js";
import {
  getRackTree
} from "./index-4wxvmd8a.js";
import"./index-37x76zdn.js";

// src/react/page/components/href.ts
function href(params, over = {}) {
  const query = new URLSearchParams;
  for (const [key, value] of Object.entries({ ...params, ...over })) {
    if (value === undefined || value === null || value === "")
      continue;
    query.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const str = query.toString();
  return str ? `?${str}` : "?";
}
function pageWindow(page, total) {
  const keep = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1)
      out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

// src/react/page/components/DataTable.tsx
import { jsxDEV } from "react/jsx-dev-runtime";
function statusBadge(value) {
  if (typeof value !== "string")
    return null;
  const text = value.toLowerCase();
  if (text === "active")
    return "bg-success-muted text-success-muted-foreground";
  if (text === "archived")
    return "bg-warning-muted text-warning-muted-foreground";
  return "bg-badge-background text-badge-foreground";
}
function cell(value) {
  if (value === null || value === undefined)
    return "";
  if (value instanceof Date)
    return value.toLocaleString("en-US");
  if (typeof value === "object")
    return JSON.stringify(value);
  return String(value);
}
function DataTable({
  columns,
  rows,
  sortable,
  params,
  selectable,
  editable,
  primaryKey
}) {
  const activeSort = typeof params.sort === "string" ? params.sort : "";
  const activeOrder = params.order === "desc" ? "desc" : "asc";
  const pk = primaryKey ?? "id";
  const extra = (selectable ? 1 : 0) + (editable ? 1 : 0);
  if (rows.length === 0)
    return /* @__PURE__ */ jsxDEV("div", {
      className: "border-table-border overflow-x-auto rounded-md border",
      children: /* @__PURE__ */ jsxDEV("table", {
        className: "bg-table w-full border-collapse text-left text-sm",
        "data-selectable": selectable ? true : undefined,
        "data-editable": editable ? true : undefined,
        "data-pk": primaryKey ?? "id",
        children: /* @__PURE__ */ jsxDEV("tbody", {
          "data-panel-rows": true,
          children: /* @__PURE__ */ jsxDEV("tr", {
            children: /* @__PURE__ */ jsxDEV("td", {
              colSpan: columns.length + extra || 1,
              className: "text-text-muted px-4 py-10 text-center",
              children: "No records found."
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  return /* @__PURE__ */ jsxDEV("div", {
    className: "border-table-border overflow-x-auto rounded-md border",
    children: /* @__PURE__ */ jsxDEV("table", {
      className: "bg-table w-full border-collapse text-left text-sm",
      "data-selectable": selectable ? true : undefined,
      "data-editable": editable ? true : undefined,
      "data-pk": primaryKey ?? "id",
      children: [
        /* @__PURE__ */ jsxDEV("thead", {
          children: /* @__PURE__ */ jsxDEV("tr", {
            className: "bg-table-header",
            children: [
              selectable ? /* @__PURE__ */ jsxDEV("th", {
                className: "border-table-border border-b px-4 py-2",
                children: /* @__PURE__ */ jsxDEV("input", {
                  type: "checkbox",
                  "data-select-all": true,
                  "aria-label": "Select all"
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this) : null,
              columns.map((col) => /* @__PURE__ */ jsxDEV("th", {
                "data-col": col,
                className: "border-table-border border-b px-4 py-2 text-xs font-bold tracking-wider uppercase",
                children: sortable?.includes(col) ? /* @__PURE__ */ jsxDEV("a", {
                  className: "text-link hover:text-link-hover",
                  "data-qlink": true,
                  "data-sort-link": col,
                  href: href(params, {
                    sort: col,
                    order: activeSort === col && activeOrder === "asc" ? "desc" : "asc"
                  }),
                  children: [
                    col,
                    /* @__PURE__ */ jsxDEV("span", {
                      "data-sort-ind": true,
                      children: activeSort === col ? activeOrder === "asc" ? " ▲" : " ▼" : ""
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this) : col
              }, col, false, undefined, this)),
              editable ? /* @__PURE__ */ jsxDEV("th", {
                className: "border-table-border border-b px-4 py-2 text-xs font-bold tracking-wider uppercase",
                children: "Actions"
              }, undefined, false, undefined, this) : null
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsxDEV("tbody", {
          "data-panel-rows": true,
          children: rows.map((row, i) => /* @__PURE__ */ jsxDEV("tr", {
            className: "hover:bg-table-row-hover",
            children: [
              selectable ? /* @__PURE__ */ jsxDEV("td", {
                className: "border-table-border border-t px-4 py-2",
                children: /* @__PURE__ */ jsxDEV("input", {
                  type: "checkbox",
                  "data-select-row": true,
                  value: String(row[pk] ?? ""),
                  "aria-label": `Select row ${String(row[pk] ?? i)}`
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this) : null,
              columns.map((col) => /* @__PURE__ */ jsxDEV("td", {
                className: "border-table-border border-t px-4 py-2",
                children: col === "status" && statusBadge(row[col]) ? /* @__PURE__ */ jsxDEV("span", {
                  className: `rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(row[col]) ?? ""}`,
                  children: cell(row[col])
                }, undefined, false, undefined, this) : cell(row[col])
              }, col, false, undefined, this)),
              editable ? /* @__PURE__ */ jsxDEV("td", {
                className: "border-table-border border-t px-4 py-2 whitespace-nowrap",
                children: /* @__PURE__ */ jsxDEV("div", {
                  className: "border-table-border inline-flex overflow-hidden rounded-md border",
                  children: [
                    /* @__PURE__ */ jsxDEV("button", {
                      type: "button",
                      "data-edit-id": String(row[pk] ?? ""),
                      className: "text-link hover:bg-table-row-hover px-2 py-1 text-sm font-semibold",
                      children: "Edit"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV("button", {
                      type: "button",
                      "data-delete-id": String(row[pk] ?? ""),
                      className: "border-table-border text-destructive hover:bg-table-row-hover border-l px-2 py-1 text-sm font-semibold",
                      children: "Delete"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              }, undefined, false, undefined, this) : null
            ]
          }, i, true, undefined, this))
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}

// src/react/page/components/Pagination.tsx
import { jsxDEV as jsxDEV2 } from "react/jsx-dev-runtime";
var pageClass = "border-border rounded-md border px-3 py-1 text-sm hover:bg-navigation-hover";
var currentClass = "bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-bold";
var disabledClass = "border-border text-text-disabled rounded-md border px-3 py-1 text-sm";
function Pagination({ page, totalPages, total, limit, params }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return /* @__PURE__ */ jsxDEV2("nav", {
    className: "flex flex-wrap items-center justify-between gap-3 py-4 text-sm",
    children: [
      /* @__PURE__ */ jsxDEV2("p", {
        className: "text-text-muted",
        "data-panel-count": true,
        children: [
          "Page ",
          page,
          " of ",
          totalPages,
          " — ",
          from,
          "–",
          to,
          " of ",
          total,
          " records"
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsxDEV2("div", {
        className: "flex items-center gap-1",
        "data-panel-pages": true,
        children: [
          page > 1 ? /* @__PURE__ */ jsxDEV2("a", {
            className: pageClass,
            "data-qlink": true,
            href: href(params, { page: page - 1 }),
            children: "← Previous"
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsxDEV2("span", {
            className: disabledClass,
            children: "← Previous"
          }, undefined, false, undefined, this),
          pageWindow(page, totalPages).map((p, i) => p === "…" ? /* @__PURE__ */ jsxDEV2("span", {
            className: "text-text-muted px-1",
            children: "…"
          }, `e${i}`, false, undefined, this) : p === page ? /* @__PURE__ */ jsxDEV2("span", {
            className: currentClass,
            children: p
          }, p, false, undefined, this) : /* @__PURE__ */ jsxDEV2("a", {
            className: pageClass,
            "data-qlink": true,
            href: href(params, { page: p }),
            children: p
          }, p, false, undefined, this)),
          page < totalPages ? /* @__PURE__ */ jsxDEV2("a", {
            className: pageClass,
            "data-qlink": true,
            href: href(params, { page: page + 1 }),
            children: "Next →"
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsxDEV2("span", {
            className: disabledClass,
            children: "Next →"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// src/react/page/components/Toolbar.tsx
import { jsxDEV as jsxDEV3, Fragment } from "react/jsx-dev-runtime";
var inputClass = "bg-input-background border-input text-foreground placeholder:text-form-placeholder rounded-md border px-3 py-1.5 text-sm";
var labelClass = "flex flex-col gap-1 text-xs font-semibold tracking-wider text-form-label uppercase";
function Toolbar({ searchable, filterable, sortable, params }) {
  if (!searchable?.length && !filterable?.length && !sortable?.length)
    return null;
  return /* @__PURE__ */ jsxDEV3("form", {
    method: "get",
    action: "",
    className: "flex flex-wrap items-end gap-3 py-4",
    children: [
      searchable && searchable.length > 0 ? /* @__PURE__ */ jsxDEV3("label", {
        className: labelClass,
        children: [
          "Search",
          /* @__PURE__ */ jsxDEV3("input", {
            name: "search",
            "data-search-input": true,
            defaultValue: String(params.search ?? ""),
            placeholder: searchable.join(", "),
            autoComplete: "off",
            className: inputClass
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this) : null,
      (filterable ?? []).map((field) => /* @__PURE__ */ jsxDEV3("label", {
        className: labelClass,
        children: [
          field,
          /* @__PURE__ */ jsxDEV3("input", {
            name: field,
            defaultValue: String(params[field] ?? ""),
            className: inputClass
          }, undefined, false, undefined, this)
        ]
      }, field, true, undefined, this)),
      sortable && sortable.length > 0 ? /* @__PURE__ */ jsxDEV3(Fragment, {
        children: [
          /* @__PURE__ */ jsxDEV3("label", {
            className: labelClass,
            children: [
              "Sort",
              /* @__PURE__ */ jsxDEV3("select", {
                name: "sort",
                defaultValue: String(params.sort ?? ""),
                className: inputClass,
                children: [
                  /* @__PURE__ */ jsxDEV3("option", {
                    value: "",
                    children: "—"
                  }, undefined, false, undefined, this),
                  sortable.map((field) => /* @__PURE__ */ jsxDEV3("option", {
                    value: field,
                    children: field
                  }, field, false, undefined, this))
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV3("label", {
            className: labelClass,
            children: [
              "Order",
              /* @__PURE__ */ jsxDEV3("select", {
                name: "order",
                defaultValue: String(params.order ?? ""),
                className: inputClass,
                children: [
                  /* @__PURE__ */ jsxDEV3("option", {
                    value: "asc",
                    children: "Ascending"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsxDEV3("option", {
                    value: "desc",
                    children: "Descending"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this) : null,
      /* @__PURE__ */ jsxDEV3("button", {
        type: "submit",
        className: "bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-semibold",
        children: "Apply"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// src/react/page/Panel.tsx
import { jsxDEV as jsxDEV4 } from "react/jsx-dev-runtime";
var inputClass2 = "bg-input-background border-input text-foreground rounded-md border px-3 py-1.5 text-sm font-normal normal-case";
var fieldLabelClass = "flex flex-col gap-1 text-xs font-semibold tracking-wider text-form-label uppercase";
function FieldInput({ field, required }) {
  switch (field.kind) {
    case "enum":
      return /* @__PURE__ */ jsxDEV4("label", {
        className: fieldLabelClass,
        children: [
          field.name,
          /* @__PURE__ */ jsxDEV4("select", {
            name: field.name,
            required,
            defaultValue: "",
            className: inputClass2,
            children: [
              /* @__PURE__ */ jsxDEV4("option", {
                value: "",
                children: "—"
              }, undefined, false, undefined, this),
              (field.enumValues ?? []).map((v) => /* @__PURE__ */ jsxDEV4("option", {
                value: v,
                children: v
              }, v, false, undefined, this))
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this);
    case "boolean":
      return /* @__PURE__ */ jsxDEV4("label", {
        className: fieldLabelClass,
        children: [
          field.name,
          /* @__PURE__ */ jsxDEV4("input", {
            type: "checkbox",
            name: field.name,
            value: "true",
            className: "h-4 w-4"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this);
    case "integer":
    case "number":
      return /* @__PURE__ */ jsxDEV4("label", {
        className: fieldLabelClass,
        children: [
          field.name,
          /* @__PURE__ */ jsxDEV4("input", {
            type: "number",
            step: field.kind === "number" ? "any" : "1",
            name: field.name,
            required,
            className: inputClass2
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this);
    case "date":
      return /* @__PURE__ */ jsxDEV4("label", {
        className: fieldLabelClass,
        children: [
          field.name,
          /* @__PURE__ */ jsxDEV4("input", {
            type: "datetime-local",
            name: field.name,
            required,
            className: inputClass2
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this);
    case "json":
      return /* @__PURE__ */ jsxDEV4("label", {
        className: fieldLabelClass,
        children: [
          field.name,
          /* @__PURE__ */ jsxDEV4("textarea", {
            name: field.name,
            "data-json": true,
            rows: 3,
            placeholder: "{}",
            className: `${inputClass2} font-mono`
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this);
    default:
      return /* @__PURE__ */ jsxDEV4("label", {
        className: fieldLabelClass,
        children: [
          field.name,
          /* @__PURE__ */ jsxDEV4("input", {
            name: field.name,
            required,
            className: inputClass2
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this);
  }
}
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
async function Panel(props) {
  const params = props.params ?? {};
  const page = Math.max(Number(params.page ?? 1) || 1, 1);
  const limit = Math.max(Number(params.limit ?? props.query?.pagination?.default ?? 20) || 1, 1);
  let rows = [];
  let total = 0;
  if (props.load) {
    try {
      const result = await props.load(params);
      rows = result.data;
      total = result.total;
    } catch {}
  }
  const columns = rows.length > 0 ? Object.keys(rows[0] ?? {}).filter((c) => c !== "deletedAt") : [];
  const title = props.metadata?.pluralLabel ?? props.metadata?.label ?? props.resource ?? "Panel";
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pk = props.primaryKey ?? "id";
  const deletedAt = props.deletedAtField ?? "deletedAt";
  const fieldDefs = props.fields?.length ? props.fields.filter((f) => !f.autoIncrement && f.name !== deletedAt).map((f) => ({
    name: f.name,
    kind: f.kind,
    nullable: f.nullable,
    enumValues: f.enumValues
  })) : columns.filter((c) => c !== deletedAt).map((name) => ({
    name,
    kind: "text",
    nullable: name === pk
  }));
  const createFields = fieldDefs;
  const editFields = fieldDefs.filter((f) => f.name !== pk);
  const isRequired = (f) => !f.nullable && f.kind !== "boolean";
  const canCreate = props.operations?.create !== false;
  const canEdit = props.operations?.update !== false || props.operations?.replace !== false;
  const canDelete = props.operations?.delete !== false;
  const selectable = canEdit || canDelete;
  const tree = getRackTree().filter((r) => !r.metadata.hidden);
  const groups = buildGroupsFromTree(tree, props.resource);
  const trail = [
    { label: "Dashboard", href: "/" },
    ...props.metadata?.group ? [{ label: props.metadata.group }] : [],
    { label: title }
  ];
  return /* @__PURE__ */ jsxDEV4("div", {
    className: "koran-paper font-koran-body text-foreground flex min-h-screen flex-col",
    children: /* @__PURE__ */ jsxDEV4("div", {
      className: "flex flex-1 gap-6 p-4 sm:p-6",
      children: [
        /* @__PURE__ */ jsxDEV4(Sidebar, {
          title: "Panel",
          groups
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsxDEV4("main", {
          className: "flex min-w-0 flex-1 flex-col",
          children: [
            /* @__PURE__ */ jsxDEV4(Breadcrumb, {
              trail
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsxDEV4("div", {
              className: "mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6",
              children: [
                /* @__PURE__ */ jsxDEV4(Masthead, {
                  title,
                  group: props.metadata?.group,
                  resource: props.resource,
                  total
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsxDEV4("div", {
                  "data-query-url": props.queryUrl,
                  children: [
                    /* @__PURE__ */ jsxDEV4(Toolbar, {
                      searchable: props.query?.searchable,
                      filterable: props.query?.filterable,
                      sortable: props.query?.sortable,
                      params
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV4("div", {
                      className: "flex items-center justify-between gap-3 pb-3",
                      children: [
                        /* @__PURE__ */ jsxDEV4("div", {
                          "data-bulk-bar": true,
                          style: { display: "none" },
                          className: "items-center gap-2",
                          children: [
                            /* @__PURE__ */ jsxDEV4("span", {
                              "data-bulk-count": true,
                              className: "text-sm text-text-muted"
                            }, undefined, false, undefined, this),
                            canDelete ? /* @__PURE__ */ jsxDEV4("button", {
                              type: "button",
                              "data-bulk-delete": true,
                              className: "bg-destructive text-destructive-foreground rounded-md px-3 py-1.5 text-sm font-semibold",
                              children: "Delete selected"
                            }, undefined, false, undefined, this) : null,
                            canEdit ? /* @__PURE__ */ jsxDEV4("span", {
                              className: "inline-flex items-center gap-2",
                              children: [
                                /* @__PURE__ */ jsxDEV4("select", {
                                  "data-bulk-field": true,
                                  "aria-label": "Bulk field",
                                  className: "bg-input-background border-input rounded-md border px-2 py-1.5 text-sm",
                                  children: editFields.map((f) => /* @__PURE__ */ jsxDEV4("option", {
                                    value: f.name,
                                    children: f.name
                                  }, f.name, false, undefined, this))
                                }, undefined, false, undefined, this),
                                /* @__PURE__ */ jsxDEV4("input", {
                                  "data-bulk-value": true,
                                  placeholder: "New value",
                                  "aria-label": "Bulk value",
                                  className: "bg-input-background border-input placeholder:text-form-placeholder rounded-md border px-2 py-1.5 text-sm"
                                }, undefined, false, undefined, this),
                                /* @__PURE__ */ jsxDEV4("button", {
                                  type: "button",
                                  "data-bulk-apply": true,
                                  className: "bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm font-semibold",
                                  children: "Apply"
                                }, undefined, false, undefined, this)
                              ]
                            }, undefined, true, undefined, this) : null,
                            /* @__PURE__ */ jsxDEV4("button", {
                              type: "button",
                              "data-bulk-clear": true,
                              className: "text-text-muted text-sm underline",
                              children: "Clear"
                            }, undefined, false, undefined, this)
                          ]
                        }, undefined, true, undefined, this),
                        canCreate ? /* @__PURE__ */ jsxDEV4("button", {
                          type: "button",
                          "data-open-create": true,
                          className: "bg-primary text-primary-foreground ml-auto rounded-md px-4 py-1.5 text-sm font-semibold",
                          children: "+ New"
                        }, undefined, false, undefined, this) : null
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ jsxDEV4(DataTable, {
                      columns,
                      rows,
                      sortable: props.query?.sortable,
                      params,
                      selectable,
                      editable: canEdit || canDelete,
                      primaryKey: pk
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV4(Pagination, {
                      page,
                      totalPages,
                      total,
                      limit,
                      params
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV4("dialog", {
                      id: "rack-create",
                      className: "bg-card text-card-foreground rounded-lg border p-0",
                      children: /* @__PURE__ */ jsxDEV4("form", {
                        "data-create-form": true,
                        className: "flex min-w-80 flex-col gap-3 p-6",
                        children: [
                          /* @__PURE__ */ jsxDEV4("h2", {
                            className: "font-koran text-2xl font-bold",
                            children: "New record"
                          }, undefined, false, undefined, this),
                          createFields.length > 0 ? createFields.map((f) => /* @__PURE__ */ jsxDEV4(FieldInput, {
                            field: f,
                            required: isRequired(f)
                          }, f.name, false, undefined, this)) : /* @__PURE__ */ jsxDEV4("label", {
                            className: "flex flex-col gap-1 text-xs font-semibold tracking-wider text-form-label uppercase",
                            children: [
                              "JSON body",
                              /* @__PURE__ */ jsxDEV4("textarea", {
                                "data-create-json": true,
                                rows: 4,
                                placeholder: '{"name": "..."}',
                                className: "bg-input-background border-input text-foreground rounded-md border px-3 py-1.5 font-mono text-sm font-normal normal-case"
                              }, undefined, false, undefined, this)
                            ]
                          }, undefined, true, undefined, this),
                          /* @__PURE__ */ jsxDEV4("p", {
                            "data-form-error": true,
                            className: "text-form-error text-sm"
                          }, undefined, false, undefined, this),
                          /* @__PURE__ */ jsxDEV4("div", {
                            className: "flex justify-end gap-2",
                            children: [
                              /* @__PURE__ */ jsxDEV4("button", {
                                type: "button",
                                "data-close": true,
                                className: "border-border rounded-md border px-4 py-1.5 text-sm",
                                children: "Cancel"
                              }, undefined, false, undefined, this),
                              /* @__PURE__ */ jsxDEV4("button", {
                                type: "submit",
                                className: "bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-semibold",
                                children: "Create"
                              }, undefined, false, undefined, this)
                            ]
                          }, undefined, true, undefined, this)
                        ]
                      }, undefined, true, undefined, this)
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV4("dialog", {
                      id: "rack-edit",
                      className: "bg-card text-card-foreground rounded-lg border p-0",
                      children: /* @__PURE__ */ jsxDEV4("form", {
                        "data-edit-form": true,
                        className: "flex min-w-80 flex-col gap-3 p-6",
                        children: [
                          /* @__PURE__ */ jsxDEV4("h2", {
                            className: "font-koran text-2xl font-bold",
                            children: [
                              "Edit record ",
                              /* @__PURE__ */ jsxDEV4("span", {
                                "data-edit-id-label": true,
                                className: "text-text-muted text-lg"
                              }, undefined, false, undefined, this)
                            ]
                          }, undefined, true, undefined, this),
                          editFields.map((f) => /* @__PURE__ */ jsxDEV4(FieldInput, {
                            field: f
                          }, f.name, false, undefined, this)),
                          /* @__PURE__ */ jsxDEV4("p", {
                            "data-form-error": true,
                            className: "text-form-error text-sm"
                          }, undefined, false, undefined, this),
                          /* @__PURE__ */ jsxDEV4("div", {
                            className: "flex justify-end gap-2",
                            children: [
                              /* @__PURE__ */ jsxDEV4("button", {
                                type: "button",
                                "data-close": true,
                                className: "border-border rounded-md border px-4 py-1.5 text-sm",
                                children: "Cancel"
                              }, undefined, false, undefined, this),
                              /* @__PURE__ */ jsxDEV4("button", {
                                type: "submit",
                                className: "bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-semibold",
                                children: "Save"
                              }, undefined, false, undefined, this)
                            ]
                          }, undefined, true, undefined, this)
                        ]
                      }, undefined, true, undefined, this)
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsxDEV4("script", {
                      type: "module",
                      src: "/__rack/panel-app.js"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsxDEV4("footer", {
                  className: "border-border text-text-muted border-t pt-3 text-center text-xs tracking-widest uppercase",
                  children: "Printed by elysia-rack"
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
  Panel as default
};
