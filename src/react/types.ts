import type { ComponentType } from "react";

export namespace ReactRack {
  export const PAGE = Symbol.for("@elysia-panel/react")
  export interface PageDescriptor<Props = unknown> {
    [PAGE]: true;
    path: string;
    props?: Props
  }

  export type PageComponent<Props = any> = ComponentType<Props>
  export type PageRegistry = Record<string, () => Promise<{
    default: PageComponent
  }>>

  /** Override source for panel.css */
  export type PanelCssOverride = string | { path?: string; content?: string };

  /** Donate / Ko-fi config — set false to hide */
  export type DonateConfig = false | {
    enabled?: boolean;
    url?: string;
    label?: string;
  };

  export interface ReactPluginOptions {
    pages?: PageRegistry | PageRegistry[];
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
     * - `false` to hide, `true`/undefined to show default Ko-fi.
     * - `{ url, label, enabled }` to customize.
     * @default { url: "https://ko-fi.com/notoofly_manu", label: "☕ Donate" }
     */
    donate?: DonateConfig;
  }
}
