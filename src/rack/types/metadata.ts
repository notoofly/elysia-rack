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
   * Icon identifier.
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
