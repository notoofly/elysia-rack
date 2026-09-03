export interface CrudOperationsOptions {
  list?: boolean;
  detail?: boolean;
  create?: boolean;

  /**
   * PUT
   */
  replace?: boolean;

  /**
   * PATCH
   */
  update?: boolean;

  delete?: boolean;
}
