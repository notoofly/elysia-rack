export type CrudFieldFormat =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "badge"
  | "json";

export interface CrudFieldOption {
  value: string | number;
  label: string;
}

/**
 * Populate a form select from a related resource.
 * Provide static `options`, or a `load` function (resolved when the panel
 * renders) so the panel never needs direct access to another rack's adapter.
 */
export interface CrudFieldRelation {
  options?: readonly CrudFieldOption[];
  load?: () => Promise<readonly CrudFieldOption[]>;
}

export interface CrudFieldConfig {
  /**
   * Display label. Defaults to the field name.
   */
  label?: string;

  /**
   * Cell formatter. Defaults to the field kind.
   */
  format?: CrudFieldFormat;

  /**
   * ISO currency code for `format: "currency"`. Default: `USD`.
   */
  currency?: string;

  /**
   * Hide from create/edit forms (still shown in the table).
   */
  readOnly?: boolean;

  /**
   * Hide from table columns (still editable in forms).
   */
  hideInTable?: boolean;

  /**
   * Hide from create/edit forms (still shown in the table).
   */
  hideInForm?: boolean;

  /**
   * Sort weight. Lower first; fields without a value keep their natural order.
   */
  order?: number;

  /**
   * Render the form input as a select of related values.
   */
  relation?: CrudFieldRelation;
}
