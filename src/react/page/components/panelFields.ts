import type { FieldDescriptor, FieldKind } from "../../../rack/adapters/index";
import type {
  CrudFieldConfig,
  CrudFieldFormat,
  CrudFieldOption,
} from "../../../rack/types/fields";

/**
 * Serializable per-field descriptor shared by the server renderer,
 * the browser bundle, and tests. Relation options are resolved before
 * serialization so the client never needs a data loader.
 */
export interface PanelField {
  name: string;
  label: string;
  kind: FieldKind;
  format: CrudFieldFormat;
  currency?: string;
  nullable: boolean;
  primary: boolean;
  autoIncrement: boolean;
  readOnly: boolean;
  hideInTable: boolean;
  hideInForm: boolean;
  enumValues?: readonly string[];
  relation?: readonly CrudFieldOption[];
  order: number;
}

function defaultFormat(kind: FieldKind): CrudFieldFormat {
  switch (kind) {
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
      return "datetime";
    case "json":
      return "json";
    default:
      return "text";
  }
}

function toDescriptor(name: string, primaryKey: string): FieldDescriptor {
  return {
    name,
    kind: "text",
    primary: name === primaryKey,
    autoIncrement: false,
    nullable: true,
  };
}

export async function buildPanelFields(input: {
  fields?: FieldDescriptor[];
  columns: string[];
  config?: Record<string, CrudFieldConfig>;
  hiddenFields?: readonly string[];
  primaryKey: string;
  deletedAtField: string;
}): Promise<PanelField[]> {
  const config = input.config ?? {};
  const hidden = new Set(input.hiddenFields ?? []);
  const base = input.fields?.length
    ? input.fields
    : input.columns.map((name) => toDescriptor(name, input.primaryKey));

  const out: PanelField[] = [];
  base.forEach((field, index) => {
    if (field.name === input.deletedAtField) return;
    const cfg = config[field.name] ?? {};
    const hide = hidden.has(field.name) || cfg.hideInTable === true;
    const hideInForm =
      hidden.has(field.name) || cfg.hideInForm === true || cfg.readOnly === true;
    out.push({
      name: field.name,
      label: cfg.label ?? field.name,
      kind: field.kind,
      format: cfg.format ?? defaultFormat(field.kind),
      ...(cfg.currency !== undefined ? { currency: cfg.currency } : {}),
      nullable: field.nullable,
      primary: field.primary,
      autoIncrement: field.autoIncrement,
      readOnly: cfg.readOnly === true,
      hideInTable: hide,
      hideInForm,
      ...(field.enumValues !== undefined ? { enumValues: field.enumValues } : {}),
      order: cfg.order ?? index,
    });
  });

  for (const field of out) {
    const relation = config[field.name]?.relation;
    if (!relation) continue;
    const options =
      relation.options ??
      (relation.load ? await relation.load() : undefined) ??
      [];
    field.relation = [...options];
  }

  return out
    .map((field, index) => ({ field, index }))
    .sort((a, b) =>
      a.field.order === b.field.order
        ? a.index - b.index
        : a.field.order - b.field.order,
    )
    .map(({ field }) => field);
}

export function isNumericField(field: PanelField): boolean {
  return (
    field.format === "number" ||
    field.format === "currency" ||
    field.kind === "integer" ||
    field.kind === "number"
  );
}

function formatDate(value: unknown, withTime: boolean): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return withTime ? date.toLocaleString("en-US") : date.toLocaleDateString("en-US");
}

/** Human-readable cell text for a field value. */
export function displayValue(field: PanelField | undefined, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field?.relation) {
    const match = field.relation.find((o) => String(o.value) === String(value));
    if (match) return match.label;
  }
  switch (field?.format) {
    case "boolean":
      return value === true || value === "true" || value === 1 ? "Yes" : "No";
    case "date":
      return formatDate(value, false);
    case "datetime":
      return formatDate(value, true);
    case "currency": {
      const amount = Number(value);
      if (Number.isNaN(amount)) return String(value);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: field.currency ?? "USD",
      }).format(amount);
    }
    case "number":
      return Number.isNaN(Number(value)) ? String(value) : Number(value).toLocaleString("en-US");
    case "json":
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

/** Coerce a raw form/bulk string to the field's kind. */
export function coerceFieldValue(
  field: PanelField | undefined,
  raw: string,
): { value?: unknown; error?: string } {
  if (!field) return { value: raw };
  switch (field.kind) {
    case "integer":
    case "number": {
      const n = Number(raw);
      if (raw.trim() === "" || Number.isNaN(n))
        return { error: `${field.label} must be a number` };
      return { value: n };
    }
    case "boolean":
      return { value: raw === "true" || raw === "1" };
    case "json":
      try {
        return { value: JSON.parse(raw) };
      } catch {
        return { error: `${field.label} is not valid JSON` };
      }
    default:
      return { value: raw };
  }
}
