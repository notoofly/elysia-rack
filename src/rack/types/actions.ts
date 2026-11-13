export interface CrudAction {
  /**
   * Button label.
   */
  label: string;

  /**
   * Target URL. Use `:id` as a placeholder for the row primary key.
   */
  href: string;

  /**
   * Lucide icon name. Rendered for toolbar actions only.
   */
  icon?: string;

  /**
   * HTTP method. When set, the panel runs the action via `fetch`
   * and refreshes the table instead of navigating.
   */
  method?: string;

  /**
   * Confirmation prompt shown before running a method action.
   */
  confirm?: string;

  /**
   * Where the action appears. Default: `row`.
   */
  scope?: "row" | "toolbar";
}
