/**
 * Panel form logic: collect the body from a form and fill a form from a row.
 * Used directly by the browser bundle (client/panel.ts).
 */

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function controls(form: HTMLFormElement): FormControl[] {
  return Array.from(form.elements) as FormControl[];
}

export function collectFormBody(form: HTMLFormElement): {
  body?: Record<string, unknown>;
  error?: string;
} {
  const body: Record<string, unknown> = {};
  for (const el of controls(form)) {
    if (!el.name || el.disabled) continue;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      if (el.checked) body[el.name] = true;
      continue;
    }
    if (el.value === "") continue;
    if (el.hasAttribute("data-json")) {
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
  form: HTMLFormElement,
  row: Record<string, unknown>,
): void {
  for (const el of controls(form)) {
    if (!el.name) continue;
    const v = row[el.name];
    if (v === undefined || v === null) continue;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
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
