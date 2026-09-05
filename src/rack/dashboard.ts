import Elysia from "elysia";
import { PANEL_PAGE_KEY } from "./page";

export interface DashboardOptions {
  /** Mount path for the dashboard page (default "/") */
  path?: string;
  /** Dashboard title (default "Panel") */
  title?: string;
  /** React page registry key (default "/dashboard") */
  pagePath?: string;
  /** Donate badge — false to hide, true/undefined to show */
  donate?: boolean;
}

/**
 * Dashboard plugin — mounts `GET {path}` that renders
 * `page("/dashboard")` via `reactPlugin`.
 *
 * Tree metadata is stored in memory by `rack()` (registry)
 * and loaded when Dashboard renders via `getRackTree()`.
 *
 * Recommended setup:
 * ```ts
 * const app = new Elysia()
 *   .use(reactPlugin({ pages }))
 *   .use(dashboard({ title: "My Panel" }))
 *   .use(rack("/catalog/products", { model, metadata: { id: "products", group: "Catalog" } }))
 * ```
 */
export function dashboard(options?: DashboardOptions) {
  const path = options?.path ?? "/";
  const pagePath = options?.pagePath ?? "/dashboard";
  const title = options?.title;

  return new Elysia({ name: "rack:dashboard" }).get(
    path,
    ({ query }) => ({
      [Symbol.for(PANEL_PAGE_KEY)]: true as const,
      path: pagePath,
      props: {
        ...(title !== undefined ? { name: title } : {}),
        ...(options?.donate !== undefined ? { donate: options.donate } : {}),
        resource:
          typeof (query as Record<string, unknown>).resource === "string"
            ? ((query as Record<string, unknown>).resource as string)
            : undefined,
      },
    }),
  );
}
