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

// src/react/page/components/panelForm.ts
function collectFormBody(form) {
  const body = {};
  const els = form.elements || [];
  for (let i = 0;i < els.length; i++) {
    const el = els[i];
    if (!el || !el.name || el.disabled)
      continue;
    if (el.type === "checkbox") {
      if (el.checked)
        body[el.name] = true;
      continue;
    }
    if (el.value === "" || el.value === undefined || el.value === null)
      continue;
    if (el.hasAttribute && el.hasAttribute("data-json")) {
      try {
        body[el.name] = JSON.parse(el.value);
      } catch {
        return { error: `Invalid JSON in ${el.name}` };
      }
      continue;
    }
    body[el.name] = el.value;
  }
  return { body };
}
function fillForm(form, row) {
  const els = form.elements || [];
  for (let i = 0;i < els.length; i++) {
    const el = els[i];
    if (!el || !el.name)
      continue;
    const v = row[el.name];
    if (v === undefined || v === null)
      continue;
    if (el.type === "checkbox") {
      el.checked = v === true || v === "true" || v === 1;
      continue;
    }
    if (el.type === "datetime-local" && typeof v === "string") {
      el.value = v.slice(0, 16);
      continue;
    }
    el.value = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
}

// src/react/page/client/panel.ts
function debounce(fn, wait) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), wait);
  };
}
function esc(value) {
  return String(value ?? "").split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
}
function cellText(value) {
  if (value === null || value === undefined)
    return "";
  if (typeof value === "object")
    return JSON.stringify(value);
  return String(value);
}
function badgeClass(col, value) {
  if (col !== "status" || typeof value !== "string")
    return null;
  const text = value.toLowerCase();
  if (text === "active")
    return "bg-success-muted text-success-muted-foreground";
  if (text === "archived")
    return "bg-warning-muted text-warning-muted-foreground";
  return "bg-badge-background text-badge-foreground";
}
function toParams(sp) {
  const out = {};
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}
function baseUrl(root) {
  const q = root.getAttribute("data-query-url") || "";
  return q.slice(-5) === "/data" ? q.slice(0, -5) : q || "?";
}
function uid() {
  try {
    if (window.crypto?.randomUUID)
      return window.crypto.randomUUID();
  } catch {}
  return `k-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
function setErr(form, msg) {
  const el = form.querySelector("[data-form-error]");
  if (el)
    el.textContent = msg;
}
function refresh(root) {
  run(root, new URLSearchParams(window.location.search));
}
function actionCell(id) {
  return `<td class="border-table-border border-t px-4 py-2 whitespace-nowrap">` + `<div class="border-table-border inline-flex overflow-hidden rounded-md border">` + `<button type="button" data-edit-id="${esc(id)}" class="text-link hover:bg-table-row-hover px-2 py-1 text-sm font-semibold">Edit</button>` + `<button type="button" data-delete-id="${esc(id)}" class="border-table-border text-destructive hover:bg-table-row-hover border-l px-2 py-1 text-sm font-semibold">Delete</button>` + `</div></td>`;
}
function paintRows(tbody, cols, rows, pk, selectable, editable) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${cols.length}" class="text-text-muted px-4 py-10 text-center">No records found.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((row) => {
    const id = row[pk] == null ? "" : String(row[pk]);
    let html = `<tr class="hover:bg-table-row-hover">`;
    if (selectable)
      html += `<td class="border-table-border border-t px-4 py-2"><input type="checkbox" data-select-row value="${esc(id)}" aria-label="Select row ${esc(id)}"></td>`;
    html += cols.map((col) => {
      const cls = badgeClass(col, row[col]);
      const inner = cls ? `<span class="rounded-full px-2 py-0.5 text-xs font-semibold ${cls}">${esc(cellText(row[col]))}</span>` : esc(cellText(row[col]));
      return `<td class="border-table-border border-t px-4 py-2">${inner}</td>`;
    }).join("");
    if (editable)
      html += actionCell(id);
    return html + "</tr>";
  }).join("");
}
function paintPages(box, params, page, totalPages) {
  const linkCls = "border-border rounded-md border px-3 py-1 text-sm hover:bg-navigation-hover";
  const offCls = "border-border text-text-disabled rounded-md border px-3 py-1 text-sm";
  let html = page > 1 ? `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: page - 1 }))}">← Previous</a>` : `<span class="${offCls}">← Previous</span>`;
  for (const p of pageWindow(page, totalPages)) {
    if (p === "…")
      html += `<span class="text-text-muted px-1">…</span>`;
    else if (p === page)
      html += `<span class="bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-bold">${p}</span>`;
    else
      html += `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: p }))}">${p}</a>`;
  }
  html += page < totalPages ? `<a class="${linkCls}" data-qlink href="${esc(href(params, { page: page + 1 }))}">Next →</a>` : `<span class="${offCls}">Next →</span>`;
  box.innerHTML = html;
}
function paint(root, json, sp) {
  const params = toParams(sp);
  const cols = [];
  Array.prototype.forEach.call(root.querySelectorAll("thead th[data-col]"), (th) => {
    cols.push(th.getAttribute("data-col"));
  });
  const q = json.query ?? {};
  const page = q.page ?? 1;
  const limit = q.limit ?? 20;
  const total = json.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const tbl = root.querySelector("table");
  const selectable = !!tbl?.hasAttribute("data-selectable");
  const editable = !!tbl?.hasAttribute("data-editable");
  const pk = tbl?.getAttribute("data-pk") || "id";
  const tbody = root.querySelector("[data-panel-rows]");
  if (tbody)
    paintRows(tbody, cols, json.data ?? [], pk, selectable, editable);
  const count = root.querySelector("[data-panel-count]");
  if (count) {
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    count.textContent = `Page ${page} of ${totalPages} — ${from}–${Math.min(page * limit, total)} of ${total} records`;
  }
  const box = root.querySelector("[data-panel-pages]");
  if (box)
    paintPages(box, params, page, totalPages);
  const sort = q.sort ?? {};
  Array.prototype.forEach.call(root.querySelectorAll("a[data-sort-link]"), (a) => {
    const col = a.getAttribute("data-sort-link");
    const active = sort.field === col;
    const order = active && sort.direction === "asc" ? "desc" : "asc";
    a.setAttribute("href", href(params, { sort: col, order }));
    const ind = a.querySelector("[data-sort-ind]");
    if (ind)
      ind.textContent = active ? sort.direction === "asc" ? " ▲" : " ▼" : "";
  });
  try {
    window.history.replaceState(null, "", href(params, {}));
  } catch {}
  syncBulk(root);
}
async function run(root, sp) {
  const base = root.getAttribute("data-query-url") || "";
  const search = sp.toString();
  const res = await fetch(base + (search ? `?${search}` : ""), {
    method: "QUERY",
    headers: { Accept: "application/json" }
  });
  if (!res.ok)
    return;
  paint(root, await res.json(), sp);
}
function selectedIds(root) {
  const ids = [];
  Array.prototype.forEach.call(root.querySelectorAll("[data-select-row]:checked"), (c) => {
    ids.push(c.value);
  });
  return ids;
}
function syncBulk(root) {
  const ids = selectedIds(root);
  const bar = root.querySelector("[data-bulk-bar]");
  if (bar)
    bar.style.display = ids.length ? "" : "none";
  const count = root.querySelector("[data-bulk-count]");
  if (count)
    count.textContent = `${ids.length} selected`;
  const boxes = root.querySelectorAll("[data-select-row]");
  const all = root.querySelector("[data-select-all]");
  if (all)
    all.checked = boxes.length > 0 && ids.length === boxes.length;
}
async function createRecord(root, form) {
  setErr(form, "");
  const raw = form.querySelector("[data-create-json]");
  if (raw) {
    let body;
    try {
      body = JSON.parse(raw.value);
    } catch {
      setErr(form, "Invalid JSON body");
      return;
    }
    const res = await fetch(baseUrl(root), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": uid() },
      body: JSON.stringify(body)
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
      body: JSON.stringify(collected.body)
    });
    if (!res.ok) {
      setErr(form, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return;
    }
  }
  const dlg = form.closest("dialog");
  form.reset();
  if (dlg)
    dlg.close();
  refresh(root);
}
async function updateRecord(root, form) {
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
    body: JSON.stringify(collected.body)
  });
  if (!res.ok) {
    setErr(form, `Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const dlg = form.closest("dialog");
  if (dlg)
    dlg.close();
  refresh(root);
}
async function openEdit(root, id) {
  const res = await fetch(`${baseUrl(root)}/data/${encodeURIComponent(id)}`, {
    method: "QUERY",
    headers: { Accept: "application/json" }
  });
  if (!res.ok)
    return;
  const row = (await res.json()).data ?? {};
  const dlg = document.getElementById("rack-edit");
  if (!dlg)
    return;
  const form = dlg.querySelector("[data-edit-form]");
  if (!form)
    return;
  form.dataset.id = id;
  const label = dlg.querySelector("[data-edit-id-label]");
  if (label)
    label.textContent = `#${id}`;
  fillForm(form, row);
  setErr(form, "");
  dlg.showModal?.();
}
async function deleteOne(root, id) {
  if (!window.confirm(`Delete record ${id}?`))
    return;
  const res = await fetch(`${baseUrl(root)}/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  if (res.ok)
    refresh(root);
}
async function bulkDelete(root) {
  const ids = selectedIds(root);
  if (!ids.length)
    return;
  if (!window.confirm(`Delete ${ids.length} records?`))
    return;
  const base = baseUrl(root);
  for (const id of ids) {
    await fetch(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  refresh(root);
}
async function bulkApply(root) {
  const field = root.querySelector("[data-bulk-field]");
  const input = root.querySelector("[data-bulk-value]");
  const ids = selectedIds(root);
  if (!field?.value || !input || !ids.length)
    return;
  const base = baseUrl(root);
  const payload = JSON.stringify({ [field.value]: input.value });
  for (const id of ids) {
    await fetch(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: payload
    });
  }
  input.value = "";
  refresh(root);
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!t?.closest)
    return;
  const root = t.closest("[data-query-url]");
  if (!root)
    return;
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
    openEdit(root, eb.getAttribute("data-edit-id"));
    return;
  }
  const dbtn = t.closest("[data-delete-id]");
  if (dbtn) {
    deleteOne(root, dbtn.getAttribute("data-delete-id"));
    return;
  }
  if (t.closest("[data-bulk-delete]")) {
    bulkDelete(root);
    return;
  }
  if (t.closest("[data-bulk-apply]")) {
    bulkApply(root);
    return;
  }
  if (t.closest("[data-bulk-clear]")) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-select-row],[data-select-all]"), (c) => {
      c.checked = false;
    });
    syncBulk(root);
    return;
  }
  const a = t.closest("a[data-qlink]");
  if (!a)
    return;
  e.preventDefault();
  run(root, new URLSearchParams(a.getAttribute("href").replace(/^\?/, "")));
});
document.addEventListener("submit", (e) => {
  const f = e.target;
  if (!f || f.tagName !== "FORM")
    return;
  const root = f.closest?.("[data-query-url]");
  if (!root)
    return;
  if (f.hasAttribute("data-create-form")) {
    e.preventDefault();
    createRecord(root, f);
    return;
  }
  if (f.hasAttribute("data-edit-form")) {
    e.preventDefault();
    updateRecord(root, f);
    return;
  }
  e.preventDefault();
  const clean = new URLSearchParams;
  const els = f.elements ?? [];
  for (let i = 0;i < els.length; i++) {
    const el = els[i];
    if (!el.name || el.disabled)
      continue;
    if ((el.type === "checkbox" || el.type === "radio") && !el.checked)
      continue;
    if (el.value === "")
      continue;
    clean.append(el.name, el.value);
  }
  run(root, clean);
});
var debouncedRunForSearch = debounce((form, root) => {
  const clean = new URLSearchParams;
  const els = form.elements ?? [];
  for (let i = 0;i < els.length; i++) {
    const el = els[i];
    if (!el.name || el.disabled)
      continue;
    if ((el.type === "checkbox" || el.type === "radio") && !el.checked)
      continue;
    if (el.value === "")
      continue;
    clean.append(el.name, el.value);
  }
  run(root, clean);
}, 350);
document.addEventListener("input", (e) => {
  const t = e.target;
  if (!t || !t.closest)
    return;
  const isSearch = t.getAttribute?.("data-search-input") !== null || t.getAttribute?.("name") === "search";
  if (!isSearch)
    return;
  const form = t.closest("form");
  const root = t.closest("[data-query-url]") || form?.closest?.("[data-query-url]");
  if (!form || !root)
    return;
  debouncedRunForSearch(form, root);
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (!t?.closest)
    return;
  const root = t.closest("[data-query-url]");
  if (!root)
    return;
  const all = t.hasAttribute("data-select-all");
  if (!all && !t.hasAttribute("data-select-row"))
    return;
  if (all) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-select-row]"), (c) => {
      c.checked = t.checked;
    });
  }
  syncBulk(root);
});
