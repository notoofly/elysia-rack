// Browser-only bundle for the interactive panel: live QUERY, selection,
// and actions (create/edit/delete/bulk). Without JS, links and forms
// keep working through plain GET navigation.
declare const document: any;
declare const window: any;

import { href, pageWindow } from "../components/href";
import { collectFormBody, fillForm } from "../components/panelForm";

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

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function badgeClass(col: string, value: unknown): string | null {
  if (col !== "status" || typeof value !== "string") return null;
  const text = value.toLowerCase();
  if (text === "active") return "bg-success-muted text-success-muted-foreground";
  if (text === "archived") return "bg-warning-muted text-warning-muted-foreground";
  return "bg-badge-background text-badge-foreground";
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

function refresh(root: any): void {
  void run(root, new URLSearchParams(window.location.search));
}

function actionCell(id: string): string {
  return (
    `<td class="border-table-border border-t px-4 py-2 whitespace-nowrap">` +
    `<div class="border-table-border inline-flex overflow-hidden rounded-md border">` +
    `<button type="button" data-edit-id="${esc(id)}" class="text-link hover:bg-table-row-hover px-2 py-1 text-sm font-semibold">Edit</button>` +
    `<button type="button" data-delete-id="${esc(id)}" class="border-table-border text-destructive hover:bg-table-row-hover border-l px-2 py-1 text-sm font-semibold">Delete</button>` +
    `</div></td>`
  );
}

function paintRows(
  tbody: any,
  cols: string[],
  rows: Record<string, unknown>[],
  pk: string,
  selectable: boolean,
  editable: boolean,
): void {
  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="${cols.length}" class="text-text-muted px-4 py-10 text-center">No records found.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map((row) => {
      const id = row[pk] == null ? "" : String(row[pk]);
      let html = `<tr class="hover:bg-table-row-hover">`;
      if (selectable)
        html += `<td class="border-table-border border-t px-4 py-2"><input type="checkbox" data-select-row value="${esc(id)}" aria-label="Select row ${esc(id)}"></td>`;
      html += cols
        .map((col) => {
          const cls = badgeClass(col, row[col]);
          const inner = cls
            ? `<span class="rounded-full px-2 py-0.5 text-xs font-semibold ${cls}">${esc(cellText(row[col]))}</span>`
            : esc(cellText(row[col]));
          return `<td class="border-table-border border-t px-4 py-2">${inner}</td>`;
        })
        .join("");
      if (editable) html += actionCell(id);
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
    "border-border rounded-md border px-3 py-1 text-sm hover:bg-navigation-hover";
  const offCls =
    "border-border text-text-disabled rounded-md border px-3 py-1 text-sm";
  let html =
    page > 1
      ? `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: page - 1 }))}">← Previous</a>`
      : `<span class="${offCls}">← Previous</span>`;
  for (const p of pageWindow(page, totalPages)) {
    if (p === "…") html += `<span class="text-text-muted px-1">…</span>`;
    else if (p === page)
      html += `<span class="bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-bold">${p}</span>`;
    else
      html += `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: p }))}">${p}</a>`;
  }
  html +=
    page < totalPages
      ? `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: page + 1 }))}">Next →</a>`
      : `<span class="${offCls}">Next →</span>`;
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
  const tbl: any = root.querySelector("table");
  const selectable = !!tbl?.hasAttribute("data-selectable");
  const editable = !!tbl?.hasAttribute("data-editable");
  const pk = tbl?.getAttribute("data-pk") || "id";
  const tbody = root.querySelector("[data-panel-rows]");
  if (tbody) paintRows(tbody, cols, json.data ?? [], pk, selectable, editable);
  const count = root.querySelector("[data-panel-count]");
  if (count) {
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    count.textContent = `Page ${page} of ${totalPages} — ${from}–${Math.min(page * limit, total)} of ${total} records`;
  }
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
  const raw = form.querySelector("[data-create-json]");
  if (raw) {
    let body: unknown;
    try {
      body = JSON.parse(raw.value);
    } catch {
      setErr(form, "Invalid JSON body");
      return;
    }
    const res = await fetch(baseUrl(root), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": uid() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setErr(form, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return;
    }
  } else {
    const collected = collectFormBody(form);
    if (collected.error) {
      setErr(form, collected.error);
      return;
    }
    const res = await fetch(baseUrl(root), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": uid() },
      body: JSON.stringify(collected.body),
    });
    if (!res.ok) {
      setErr(form, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return;
    }
  }
  const dlg = form.closest("dialog");
  form.reset();
  if (dlg) dlg.close();
  refresh(root);
}

async function updateRecord(root: any, form: any): Promise<void> {
  setErr(form, "");
  const id = form.dataset?.id || "";
  if (!id) {
    setErr(form, "Missing record id");
    return;
  }
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
    setErr(form, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const dlg = form.closest("dialog");
  if (dlg) dlg.close();
  refresh(root);
}

async function openEdit(root: any, id: string): Promise<void> {
  const res = await fetch(`${baseUrl(root)}/data/${encodeURIComponent(id)}`, {
    method: "QUERY",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return;
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

async function deleteOne(root: any, id: string): Promise<void> {
  if (!window.confirm(`Delete record ${id}?`)) return;
  const res = await fetch(`${baseUrl(root)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.ok) refresh(root);
}

async function bulkDelete(root: any): Promise<void> {
  const ids = selectedIds(root);
  if (!ids.length) return;
  if (!window.confirm(`Delete ${ids.length} records?`)) return;
  const base = baseUrl(root);
  for (const id of ids) {
    await fetch(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  refresh(root);
}

async function bulkApply(root: any): Promise<void> {
  const field = root.querySelector("[data-bulk-field]");
  const input = root.querySelector("[data-bulk-value]");
  const ids = selectedIds(root);
  if (!field?.value || !input || !ids.length) return;
  const base = baseUrl(root);
  const payload = JSON.stringify({ [field.value]: input.value });
  for (const id of ids) {
    await fetch(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
  }
  input.value = "";
  refresh(root);
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
