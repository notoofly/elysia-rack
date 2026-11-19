export interface CrudPageOptions {
  /**
   * Custom page path handled by react().
   *
   * Example: '/products'
   */
  path?: string;

  /**
   * Disable generated HTML page.
   */
  enabled?: boolean;

  /**
   * Custom page for this resource.
   */
  component?: string;
}

export interface CrudSettings<TField extends string = string> {
  /**
   * Primary key field.
   *
   * Default should be resolved by the ORM adapter.
   */
  primaryKey?: TField;

  /**
   * Soft delete support.
   *
   * When enabled, deletes set a timestamp column instead of
   * removing the row, and reads skip soft-deleted rows.
   */
  softDelete?: boolean;

  /**
   * Column used for soft deletes.
   *
   * Default: 'deletedAt'.
   */
  deletedAtField?: TField;

  /**
   * Return representation after mutation.
   */
  returning?: boolean;
}
