// Browser-only bundle for the interactive panel: live QUERY, selection,
// and actions (create/edit/delete/bulk/detail/restore). Without JS, links
// and forms keep working through plain GET navigation.
declare const document: any;
declare const window: any;

import { href, pageWindow } from "../components/href";
import { collectFormBody, fillForm } from "../components/panelForm";
import {
  coerceFieldValue,
  displayValue,
  isNumericField,
  type PanelField,
} from "../components/panelFields";

interface ListQuery {
  page?: number;
  limit?: number;
  sort?: { field?: string; direction?: string };
}

interface ListResponse {
  data: Record<string, unknown>[];
  total: number;
  query?: ListQuery;
}

interface CustomAction {
  label: string;
  href: string;
  method?: string;
  confirm?: string;
}

interface TableConfig {
  fields: PanelField[];
  byName: Map<string, PanelField>;
  actions: CustomAction[];
  pk: string;
  selectable: boolean;
  editable: boolean;
  viewable: boolean;
  softDelete: boolean;
  restorable: boolean;
  deletedAt: string;
}

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let id: any;
  return ((...args: any[]) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...(args as any)), wait);
  }) as T;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .split("&")
    .join("&amp;")
    .split("<")
    .join("&lt;")
    .split(">")
    .join("&gt;")
    .split('"')
    .join("&quot;");
}

function toParams(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function baseUrl(root: any): string {
  const q: string = root.getAttribute("data-query-url") || "";
  return q.slice(-5) === "/data" ? q.slice(0, -5) : q || "?";
}

function uid(): string {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch {
    // ignore, use the fallback below
  }
  return `k-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function setErr(form: any, msg: string): void {
  const el = form.querySelector("[data-form-error]");
  if (el) el.textContent = msg;
}

function setBusy(el: any, busy: boolean): void {
  if (!el) return;
  el.disabled = busy;
  if (busy) el.setAttribute("aria-busy", "true");
  else el.removeAttribute("aria-busy");
}

function toast(root: any, message: string, error = false): void {
  const box = root.querySelector("[data-rack-toasts]");
  if (!box) return;
  const el = document.createElement("div");
  el.className = error
    ? "bg-destructive text-destructive-foreground pointer-events-auto rounded-md px-3.5 py-2 text-sm shadow-lg"
    : "bg-card text-card-foreground border-border pointer-events-auto rounded-md border px-3.5 py-2 text-sm shadow-lg";
  el.textContent = message;
  box.appendChild(el);
  window.setTimeout(() => el.remove(), 4000);
}

function refresh(root: any): void {
  void run(root, new URLSearchParams(window.location.search));
}

function parse<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function tableOf(root: any): any {
  return root.querySelector("table");
}

function tableConfig(root: any): TableConfig {
  const tbl = tableOf(root);
  const fields = parse<PanelField[]>(tbl?.getAttribute("data-rack-fields"), []);
  return {
    fields,
    byName: new Map(fields.map((f) => [f.name, f])),
    actions: parse<CustomAction[]>(tbl?.getAttribute("data-rack-actions"), []),
    pk: tbl?.getAttribute("data-pk") || "id",
    selectable: !!tbl?.hasAttribute("data-selectable"),
    editable: !!tbl?.hasAttribute("data-editable"),
    viewable: !!tbl?.hasAttribute("data-viewable"),
    softDelete: !!tbl?.hasAttribute("data-soft-delete"),
    restorable: !!tbl?.hasAttribute("data-restorable"),
    deletedAt: tbl?.getAttribute("data-deleted-at") || "deletedAt",
  };
}

function badgeClass(value: unknown): string {
  if (typeof value !== "string")
    return "bg-badge-background text-badge-foreground";
  const text = value.toLowerCase();
  if (text === "active") return "bg-success-muted text-success-muted-foreground";
  if (text === "archived") return "bg-warning-muted text-warning-muted-foreground";
  return "bg-badge-background text-badge-foreground";
}

function actionButton(action: CustomAction, id: string): string {
  const target = esc(action.href.replaceAll(":id", encodeURIComponent(id)));
  const cls =
    "text-link hover:text-link-hover ml-3 px-1 text-sm font-medium hover:underline";
  if (action.method) {
    const confirm = action.confirm
      ? ` data-rack-confirm="${esc(action.confirm)}"`
      : "";
    return `<button type="button" data-rack-href="${target}" data-rack-method="${esc(action.method)}"${confirm} class="${cls}">${esc(action.label)}</button>`;
  }
  return `<a href="${target}" class="${cls}">${esc(action.label)}</a>`;
}

function actionCell(id: string, cfg: TableConfig, deleted: boolean): string {
  let inner = "";
  if (deleted) {
    if (cfg.restorable)
      inner = `<button type="button" data-restore-id="${esc(id)}" class="text-link hover:text-link-hover px-1 text-sm font-medium hover:underline">Restore</button>`;
  } else {
    if (cfg.viewable)
      inner += `<button type="button" data-view-id="${esc(id)}" class="text-link hover:text-link-hover px-1 text-sm font-medium hover:underline">View</button>`;
    if (cfg.editable)
      inner +=
        `<button type="button" data-edit-id="${esc(id)}" class="text-link hover:text-link-hover ${cfg.viewable ? "ml-3 " : ""}px-1 text-sm font-medium hover:underline">Edit</button>` +
        `<button type="button" data-delete-id="${esc(id)}" class="text-destructive ml-3 px-1 text-sm font-medium hover:underline">Delete</button>`;
    for (const action of cfg.actions) inner += actionButton(action, id);
  }
  return `<td class="border-table-border border-t px-3 py-2.5 whitespace-nowrap text-right">${inner}</td>`;
}

function numericCols(rows: Record<string, unknown>[], cols: string[]): Set<string> {
  const out = new Set<string>();
  if (!rows.length) return out;
  for (const col of cols) {
    if (rows.every((r) => typeof r[col] === "number" || r[col] == null)) out.add(col);
  }
  return out;
}

function cellHtml(field: PanelField | undefined, value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = esc(displayValue(field, value));
  if (field?.format === "badge" || field?.name === "status")
    return `<span class="rounded-sm px-1.5 py-0.5 text-xs font-medium ${badgeClass(value)}">${text}</span>`;
  return text;
}

function paintRows(
  tbody: any,
  cols: string[],
  rows: Record<string, unknown>[],
  cfg: TableConfig,
): void {
  const showActions =
    cfg.editable || cfg.viewable || cfg.softDelete || cfg.actions.length > 0;
  const span = cols.length + (cfg.selectable ? 1 : 0) + (showActions ? 1 : 0);
  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="${span || 1}" class="text-text-muted px-4 py-10 text-center">No records found.</td></tr>`;
    return;
  }
  const numeric = numericCols(rows, cols);
  tbody.innerHTML = rows
    .map((row) => {
      const id = row[cfg.pk] == null ? "" : String(row[cfg.pk]);
      const deleted = cfg.softDelete && row[cfg.deletedAt] != null;
      let html = `<tr class="hover:bg-table-row-hover">`;
      if (cfg.selectable)
        html += `<td class="border-table-border border-t px-3 py-2.5"><input type="checkbox" data-select-row value="${esc(id)}" aria-label="Select row ${esc(id)}" class="accent-primary size-4"></td>`;
      html += cols
        .map((col) => {
          const field = cfg.byName.get(col);
          const align = numeric.has(col) || (field && isNumericField(field))
            ? " text-right tabular-nums"
            : "";
          return `<td class="border-table-border border-t px-3 py-2.5${align}">${cellHtml(field, row[col])}</td>`;
        })
        .join("");
      if (showActions) html += actionCell(id, cfg, Boolean(deleted));
      return html + "</tr>";
    })
    .join("");
}

function paintPages(
  box: any,
  params: Record<string, string>,
  page: number,
  totalPages: number,
): void {
  const linkCls =
    "border-border rounded-md border px-2.5 py-1 text-xs hover:bg-navigation-hover";
  const offCls =
    "border-border text-text-disabled rounded-md border px-2.5 py-1 text-xs";
  let html =
    page > 1
      ? `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: page - 1 }))}">Previous</a>`
      : `<span class="${offCls}">Previous</span>`;
  for (const p of pageWindow(page, totalPages)) {
    if (p === "…") html += `<span class="text-text-muted px-1">…</span>`;
    else if (p === page)
      html += `<span class="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium">${p}</span>`;
    else
      html += `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: p }))}">${p}</a>`;
  }
  html +=
    page < totalPages
      ? `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: page + 1 }))}">Next</a>`
      : `<span class="${offCls}">Next</span>`;
  box.innerHTML = html;
}

function paint(root: any, json: ListResponse, sp: URLSearchParams): void {
  const params = toParams(sp);
  const cols: string[] = [];
  Array.prototype.forEach.call(
    root.querySelectorAll("thead th[data-col]"),
    (th: any) => {
      cols.push(th.getAttribute("data-col"));
    },
  );
  const q = json.query ?? {};
  const page = q.page ?? 1;
  const limit = q.limit ?? 20;
  const total = json.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const cfg = tableConfig(root);
  const tbody = root.querySelector("[data-panel-rows]");
  if (tbody) paintRows(tbody, cols, json.data ?? [], cfg);
  const count = root.querySelector("[data-panel-count]");
  if (count) {
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    count.textContent =
      total === 0 ? "0 records" : `${from}–${Math.min(page * limit, total)} of ${total} records`;
  }
  const totalEl = root.querySelector("[data-panel-total]");
  if (totalEl) totalEl.textContent = `${total} record${total === 1 ? "" : "s"}`;
  const box = root.querySelector("[data-panel-pages]");
  if (box) paintPages(box, params, page, totalPages);
  const sort = q.sort ?? {};
  Array.prototype.forEach.call(
    root.querySelectorAll("a[data-sort-link]"),
    (a: any) => {
      const col = a.getAttribute("data-sort-link");
      const active = sort.field === col;
      const order = active && sort.direction === "asc" ? "desc" : "asc";
      a.setAttribute("href", href(params, { sort: col, order }));
      const ind = a.querySelector("[data-sort-ind]");
      if (ind) ind.textContent = active ? (sort.direction === "asc" ? " ▲" : " ▼") : "";
    },
  );
  try {
    window.history.replaceState(null, "", href(params, {}));
  } catch {
    // ignore
  }
  syncBulk(root);
}

async function run(root: any, sp: URLSearchParams): Promise<void> {
  const base = root.getAttribute("data-query-url") || "";
  const search = sp.toString();
  const res = await fetch(base + (search ? `?${search}` : ""), {
    method: "QUERY",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return;
  paint(root, (await res.json()) as ListResponse, sp);
}

function selectedIds(root: any): string[] {
  const ids: string[] = [];
  Array.prototype.forEach.call(
    root.querySelectorAll("[data-select-row]:checked"),
    (c: any) => {
      ids.push(c.value);
    },
  );
  return ids;
}

function syncBulk(root: any): void {
  const ids = selectedIds(root);
  const bar = root.querySelector("[data-bulk-bar]");
  if (bar) bar.style.display = ids.length ? "" : "none";
  const count = root.querySelector("[data-bulk-count]");
  if (count) count.textContent = `${ids.length} selected`;
  const boxes = root.querySelectorAll("[data-select-row]");
  const all = root.querySelector("[data-select-all]");
  if (all) all.checked = boxes.length > 0 && ids.length === boxes.length;
}

async function createRecord(root: any, form: any): Promise<void> {
  setErr(form, "");
  const submit = form.querySelector('[type="submit"]');
  setBusy(submit, true);
  try {
    const raw = form.querySelector("[data-create-json]");
    let body: unknown;
    if (raw) {
      try {
        body = JSON.parse(raw.value);
      } catch {
        setErr(form, "Invalid JSON body");
        return;
      }
    } else {
      const collected = collectFormBody(form);
      if (collected.error) {
        setErr(form, collected.error);
        return;
      }
      body = collected.body;
    }
    const res = await fetch(baseUrl(root), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": uid() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const message = `Error ${res.status}: ${(await res.text()).slice(0, 200)}`;
      setErr(form, message);
      toast(root, message, true);
      return;
    }
    const dlg = form.closest("dialog");
    form.reset();
    if (dlg) dlg.close();
    toast(root, "Record created");
    refresh(root);
  } finally {
    setBusy(submit, false);
  }
}

async function updateRecord(root: any, form: any): Promise<void> {
  setErr(form, "");
  const id = form.dataset?.id || "";
  if (!id) {
    setErr(form, "Missing record id");
    return;
  }
  const submit = form.querySelector('[type="submit"]');
  setBusy(submit, true);
  try {
    const collected = collectFormBody(form);
    if (collected.error) {
      setErr(form, collected.error);
      return;
    }
    const res = await fetch(`${baseUrl(root)}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collected.body),
    });
    if (!res.ok) {
      const message = `Error ${res.status}: ${(await res.text()).slice(0, 200)}`;
      setErr(form, message);
      toast(root, message, true);
      return;
    }
    const dlg = form.closest("dialog");
    if (dlg) dlg.close();
    toast(root, "Record saved");
    refresh(root);
  } finally {
    setBusy(submit, false);
  }
}

async function openEdit(root: any, id: string): Promise<void> {
  const res = await fetch(`${baseUrl(root)}/data/${encodeURIComponent(id)}`, {
    method: "QUERY",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    toast(root, `Could not load record ${id}`, true);
    return;
  }
  const row = ((await res.json()) as { data?: Record<string, unknown> }).data ?? {};
  const dlg = document.getElementById("rack-edit");
  if (!dlg) return;
  const form = dlg.querySelector("[data-edit-form]");
  if (!form) return;
  form.dataset.id = id;
  const label = dlg.querySelector("[data-edit-id-label]");
  if (label) label.textContent = `#${id}`;
  fillForm(form, row);
  setErr(form, "");
  dlg.showModal?.();
}

async function openDetail(root: any, id: string): Promise<void> {
  const res = await fetch(`${baseUrl(root)}/data/${encodeURIComponent(id)}`, {
    method: "QUERY",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    toast(root, `Could not load record ${id}`, true);
    return;
  }
  const row = ((await res.json()) as { data?: Record<string, unknown> }).data ?? {};
  const dlg = document.getElementById("rack-detail");
  if (!dlg) return;
  const label = dlg.querySelector("[data-detail-id-label]");
  if (label) label.textContent = `#${id}`;
  const body = dlg.querySelector("[data-detail-body]");
  if (body) body.innerHTML = renderDetail(root, row);
  dlg.showModal?.();
}

function renderDetail(root: any, row: Record<string, unknown>): string {
  const cfg = tableConfig(root);
  const items = cfg.fields
    .filter((field) => row[field.name] !== undefined && !field.hideInTable)
    .map(
      (field) =>
        `<div class="flex flex-col gap-0.5"><dt class="text-text-muted text-xs font-medium">${esc(field.label)}</dt><dd class="text-foreground text-sm">${esc(displayValue(field, row[field.name])) || "—"}</dd></div>`,
    );
  return items.join("") || `<p class="text-text-muted text-sm">No fields</p>`;
}

async function deleteOne(root: any, id: string): Promise<void> {
  if (!window.confirm(`Delete record ${id}?`)) return;
  const res = await fetch(`${baseUrl(root)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.ok) {
    toast(root, "Record deleted");
    refresh(root);
    return;
  }
  toast(root, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`, true);
}

async function restoreOne(root: any, id: string): Promise<void> {
  const cfg = tableConfig(root);
  const res = await fetch(`${baseUrl(root)}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [cfg.deletedAt]: null }),
  });
  if (res.ok) {
    toast(root, "Record restored");
    refresh(root);
    return;
  }
  toast(root, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`, true);
}

async function bulkDelete(root: any): Promise<void> {
  const ids = selectedIds(root);
  if (!ids.length) return;
  if (!window.confirm(`Delete ${ids.length} records?`)) return;
  const base = baseUrl(root);
  let failed = 0;
  for (const id of ids) {
    const res = await fetch(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) failed++;
  }
  if (failed > 0) toast(root, `${failed} of ${ids.length} deletes failed`, true);
  else toast(root, `${ids.length} record${ids.length === 1 ? "" : "s"} deleted`);
  refresh(root);
}

async function bulkApply(root: any): Promise<void> {
  const field = root.querySelector("[data-bulk-field]");
  const input = root.querySelector("[data-bulk-value]");
  const ids = selectedIds(root);
  if (!field?.value || !input || !ids.length) return;
  const cfg = tableConfig(root);
  const meta = cfg.byName.get(field.value);
  const coerced = coerceFieldValue(meta, input.value);
  if (coerced.error) {
    toast(root, coerced.error, true);
    return;
  }
  const base = baseUrl(root);
  const payload = JSON.stringify({ [field.value]: coerced.value });
  let failed = 0;
  for (const id of ids) {
    const res = await fetch(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    if (!res.ok) failed++;
  }
  input.value = "";
  if (failed > 0) toast(root, `${failed} of ${ids.length} updates failed`, true);
  else toast(root, `${ids.length} record${ids.length === 1 ? "" : "s"} updated`);
  refresh(root);
}

async function runCustomAction(root: any, el: any): Promise<void> {
  const target = el.getAttribute("data-rack-href");
  if (!target) return;
  const confirmMsg = el.getAttribute("data-rack-confirm");
  if (confirmMsg && !window.confirm(confirmMsg)) return;
  const res = await fetch(target, {
    method: el.getAttribute("data-rack-method") || "GET",
  });
  if (res.ok) refresh(root);
  else toast(root, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`, true);
}

document.addEventListener("click", (e: any) => {
  const t = e.target;
  if (!t?.closest) return;
  const root = t.closest("[data-query-url]");
  if (!root) return;
  const closer = t.closest("[data-close]");
  if (closer) {
    closer.closest("dialog")?.close();
    return;
  }
  const custom = t.closest("[data-rack-href]");
  if (custom) {
    e.preventDefault();
    void runCustomAction(root, custom);
    return;
  }
  if (t.closest("[data-open-create]")) {
    const dlg = document.getElementById("rack-create");
    if (dlg) {
      const cf = dlg.querySelector("[data-create-form]");
      if (cf) {
        cf.reset();
        setErr(cf, "");
      }
      dlg.showModal?.();
    }
    return;
  }
  const view = t.closest("[data-view-id]");
  if (view) {
    void openDetail(root, view.getAttribute("data-view-id"));
    return;
  }
  const restore = t.closest("[data-restore-id]");
  if (restore) {
    void restoreOne(root, restore.getAttribute("data-restore-id"));
    return;
  }
  const eb = t.closest("[data-edit-id]");
  if (eb) {
    void openEdit(root, eb.getAttribute("data-edit-id"));
    return;
  }
  const dbtn = t.closest("[data-delete-id]");
  if (dbtn) {
    void deleteOne(root, dbtn.getAttribute("data-delete-id"));
    return;
  }
  if (t.closest("[data-bulk-delete]")) {
    void bulkDelete(root);
    return;
  }
  if (t.closest("[data-bulk-apply]")) {
    void bulkApply(root);
    return;
  }
  if (t.closest("[data-bulk-clear]")) {
    Array.prototype.forEach.call(
      root.querySelectorAll("[data-select-row],[data-select-all]"),
      (c: any) => {
        c.checked = false;
      },
    );
    syncBulk(root);
    return;
  }
  const a = t.closest("a[data-qlink]");
  if (!a) return;
  e.preventDefault();
  void run(root, new URLSearchParams(a.getAttribute("href").replace(/^\?/, "")));
});

document.addEventListener("submit", (e: any) => {
  const f = e.target;
  if (!f || f.tagName !== "FORM") return;
  const root = f.closest?.("[data-query-url]");
  if (!root) return;
  if (f.hasAttribute("data-create-form")) {
    e.preventDefault();
    void createRecord(root, f);
    return;
  }
  if (f.hasAttribute("data-edit-form")) {
    e.preventDefault();
    void updateRecord(root, f);
    return;
  }
  e.preventDefault();
  const clean = new URLSearchParams();
  const els = f.elements ?? [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el.name || el.disabled) continue;
    if ((el.type === "checkbox" || el.type === "radio") && !el.checked) continue;
    if (el.value === "") continue;
    clean.append(el.name, el.value);
  }
  void run(root, clean);
});

// Debounce search: LIKE '%query%' without waiting for Enter
const debouncedRunForSearch = debounce((form: any, root: any) => {
  const clean = new URLSearchParams();
  const els = form.elements ?? [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el.name || el.disabled) continue;
    if ((el.type === "checkbox" || el.type === "radio") && !el.checked) continue;
    if (el.value === "") continue;
    clean.append(el.name, el.value);
  }
  void run(root, clean);
}, 350);

document.addEventListener("input", (e: any) => {
  const t = e.target;
  if (!t || !t.closest) return;
  const isSearch = t.getAttribute?.("data-search-input") !== null || t.getAttribute?.("name") === "search";
  if (!isSearch) return;
  const form = t.closest("form");
  const root = t.closest("[data-query-url]") || form?.closest?.("[data-query-url]");
  if (!form || !root) return;
  debouncedRunForSearch(form, root);
});

document.addEventListener("change", (e: any) => {
  const t = e.target;
  if (!t?.closest) return;
  const root = t.closest("[data-query-url]");
  if (!root) return;
  const all = t.hasAttribute("data-select-all");
  if (!all && !t.hasAttribute("data-select-row")) return;
  if (all) {
    Array.prototype.forEach.call(
      root.querySelectorAll("[data-select-row]"),
      (c: any) => {
        c.checked = t.checked;
      },
    );
  }
  syncBulk(root);
});
