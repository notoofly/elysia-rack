import type { CrudFieldConfig } from "./fields.ts";

export interface CrudMetadata<TField extends string = string> {
  /**
   * Internal unique resource ID.
   */
  id?: string;

  /**
   * Human-readable singular label.
   */
  label?: string;

  /**
   * Human-readable plural label.
   */
  pluralLabel?: string;

  /**
   * Navigation group.
   *
   * Example: 'Catalog'
   */
  group?: string;

  /**
   * Parent resource/navigation ID.
   */
  parent?: string;

  /**
   * Lucide icon name, e.g. `package` or `ShoppingCart`.
   * Unknown names fall back to the raw string.
   */
  icon?: string;

  /**
   * Sidebar order.
   */
  order?: number;

  /**
   * Hide from generated sidebar.
   */
  hidden?: boolean;

  /**
   * Field names hidden from the generated panel (table columns,
   * create/edit forms, and bulk field picker).
   */
  hiddenFields?: readonly TField[];

  /**
   * Per-field display configuration: labels, formatters, order,
   * read-only, table/form visibility, and relations.
   */
  fields?: Partial<Record<TField, CrudFieldConfig>>;
}
