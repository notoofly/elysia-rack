import Elysia from "elysia";
import type { ReactRack } from "../react/types";
export interface DashboardOptions {
    /** Mount path for the dashboard page (default "/") */
    path?: string;
    /** Dashboard title (default "Panel") */
    title?: string;
    /** React page registry key (default "/dashboard") */
    pagePath?: string;
    /** Donate config — false to hide, or { url, label, enabled } to customize */
    donate?: ReactRack.DonateConfig;
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
export declare function dashboard(options?: DashboardOptions): Elysia<"", {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {
    [x: string]: {
        get: {
            body: unknown;
            params: {};
            query: unknown;
            headers: unknown;
            response: {
                200: {
                    [x: symbol]: true;
                    path: string;
                    props: {
                        resource: string | undefined;
                        donate?: ReactRack.DonateConfig | undefined;
                        name?: string | undefined;
                    };
                };
            };
        };
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
