export type CrudSortDirection = "asc" | "desc";

export interface CrudQueryOptions {
  /**
   * Fields allowed for full-text/search query.
   */
  searchable?: readonly string[];

  /**
   * Fields allowed for filtering.
   */
  filterable?: readonly string[];

  /**
   * Fields allowed for sorting.
   */
  sortable?: readonly string[];

  /**
   * Default sort.
   */
  defaultSort?: {
    field: string;
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
