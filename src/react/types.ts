import type { ComponentType } from "react";

export namespace ReactRack {
  export const PAGE = Symbol.for("@elysia-panel/react")
  export interface PageDescriptor<Props = unknown> {
    [PAGE]: true;
    path: string;
    props?: Props
  }

  export type PageComponent<Props = any> = ComponentType<Props>
  export type PageLoader = () => Promise<{
    default: PageComponent
  }>
  /** A page is either a component or a loader wrapped with `lazyPage()`. */
  export type PageEntry = PageComponent | PageLoader
  export type PageRegistry = Record<string, PageEntry>

  const lazyPages = new WeakSet<PageLoader>()

  /** Mark a `() => import(...)` loader so it is not mistaken for a component. */
  export function lazyPage(loader: PageLoader): PageLoader {
    lazyPages.add(loader)
    return loader
  }

  /** @internal */
  export function isLazyPage(entry: PageEntry): entry is PageLoader {
    return typeof entry === "function" && lazyPages.has(entry as PageLoader)
  }

  /** A page registered directly with its URL — no `page()` call needed. */
  export interface ReactView<Props = any> {
    /** URL path the route is mounted at. */
    path: string
    component: PageEntry
    props?: Props
  }

  /** Override source for panel.css */
  export type PanelCssOverride = string | { path?: string; content?: string };

  export interface ReactPluginOptions {
    pages?: PageRegistry | PageRegistry[];
    /** Pages auto-mounted at their `path`; `page()` is not needed for these. */
    views?: ReactView[];
    /**
     * Override `panel.css` served at `/__rack/panel.css`.
     * - `string`: file path if the file exists, otherwise raw CSS string.
     * - `{ path }`: explicit file path.
     * - `{ content }`: raw CSS string.
     * `panelCss` is an alias for `css`.
     */
    css?: PanelCssOverride;
    panelCss?: PanelCssOverride;
    /**
     * Donate badge/link — shown in Dashboard & Panel footer.
     * @default true (show Ko-fi)
     */
    donate?: boolean;
  }
}
