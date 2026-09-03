export interface CrudValidationOptions {
  create?: unknown;

  /**
   * PUT: full replacement.
   */
  replace?: unknown;

  /**
   * PATCH: partial update.
   */
  update?: unknown;

  /**
   * Validate resource ID.
   */
  params?: unknown;

  /**
   * Validate QUERY body/query definition.
   */
  query?: unknown;
}
