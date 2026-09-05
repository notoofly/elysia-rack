/**
 * Build a panel link preserving current params with overrides.
 * Empty values drop the key (e.g. resetting to page 1).
 */
export declare function href(params: Record<string, unknown>, over?: Record<string, unknown>): string;
/**
 * Page numbers with ellipsis for pagination.
 * Shared by the server renderer and the browser client.
 */
export declare function pageWindow(page: number, total: number): (number | "…")[];
