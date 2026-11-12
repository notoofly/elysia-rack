export interface CrudMetadata {
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
}
