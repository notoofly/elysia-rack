/**
 * Panel form logic: collect the body from a form and fill a form from a row.
 * Used directly by the browser bundle (client/panel.ts).
 */

import { isJsonRecord, type JsonValue, type RowData } from "../../../rack/json.ts";

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function controls(form: HTMLFormElement): FormControl[] {
  return Array.from(form.elements).filter(
    (el): el is FormControl =>
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement,
  );
}

export function collectFormBody(form: HTMLFormElement): {
  body?: Record<string, JsonValue>;
  error?: string;
} {
  const body: Record<string, JsonValue> = {};
  for (const el of controls(form)) {
    if (!el.name || el.disabled) continue;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      if (el.checked) body[el.name] = true;
      continue;
    }
    if (el.value === "") continue;
    if (el.hasAttribute("data-json")) {
      let parsed: JsonValue;
      try {
        parsed = JSON.parse(el.value);
      } catch {
        return { error: `Invalid JSON in ${el.name}` };
      }
      body[el.name] = parsed;
      continue;
    }
    const kind = el.dataset.kind;
    if (kind === "integer" || kind === "number") {
      const n = Number(el.value);
      if (Number.isNaN(n)) return { error: `Invalid number in ${el.name}` };
      body[el.name] = n;
      continue;
    }
    if (kind === "boolean") {
      if (el.value === "true" || el.value === "1") body[el.name] = true;
      else if (el.value === "false" || el.value === "0") body[el.name] = false;
      else body[el.name] = el.value;
      continue;
    }
    body[el.name] = el.value;
  }
  return { body };
}

export function fillForm(form: HTMLFormElement, row: RowData): void {
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
