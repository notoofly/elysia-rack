export type CrudSortDirection = "asc" | "desc";

export interface CrudQueryOptions<TField extends string = string> {
  /**
   * Fields allowed for full-text/search query.
   */
  searchable?: readonly TField[];

  /**
   * Fields allowed for filtering.
   */
  filterable?: readonly TField[];

  /**
   * Fields allowed for sorting.
   */
  sortable?: readonly TField[];

  /**
   * Default sort.
   */
  defaultSort?: {
    field: TField;
    direction?: CrudSortDirection;
  };

  /**
   * Pagination configuration.
   */
  pagination?: CrudPaginationOptions;
}

export interface CrudPaginationOptions {
  default?: number;
  max?: number;
}
