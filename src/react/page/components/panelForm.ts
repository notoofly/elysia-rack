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
      const parsed: JsonValue = JSON.parse(el.value);
      if (!isJsonRecord(parsed)) {
        return { error: `Invalid JSON in ${el.name}` };
      }
      body[el.name] = parsed;
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
