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
export interface CrudSettings {
    /**
     * Primary key field.
     *
     * Default should be resolved by the ORM adapter.
     */
    primaryKey?: string;
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
    deletedAtField?: string;
    /**
     * Return representation after mutation.
     */
    returning?: boolean;
}
