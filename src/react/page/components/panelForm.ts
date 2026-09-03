/**
 * Panel form logic: collect the body from a form and fill a form from a row.
 * Used directly by the browser bundle (client/panel.ts).
 */

export function collectFormBody(form: any): {
  body?: Record<string, unknown>;
  error?: string;
} {
  const body: Record<string, unknown> = {};
  const els = form.elements || [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el || !el.name || el.disabled) continue;
    if (el.type === "checkbox") {
      if (el.checked) body[el.name] = true;
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

export function fillForm(
  form: any,
  row: Record<string, unknown>,
): void {
  const els = form.elements || [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el || !el.name) continue;
    const v = row[el.name];
    if (v === undefined || v === null) continue;
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
