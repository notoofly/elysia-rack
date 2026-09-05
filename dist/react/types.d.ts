import type { ComponentType } from "react";
export declare namespace ReactRack {
    const PAGE: unique symbol;
    interface PageDescriptor<Props = unknown> {
        [PAGE]: true;
        path: string;
        props?: Props;
    }
    type PageComponent<Props = any> = ComponentType<Props>;
    type PageRegistry = Record<string, () => Promise<{
        default: PageComponent;
    }>>;
    /** Override source for panel.css */
    type PanelCssOverride = string | {
        path?: string;
        content?: string;
    };
    /** Donate / Ko-fi config — set false to hide */
    type DonateConfig = false | {
        enabled?: boolean;
        url?: string;
        label?: string;
    };
    interface ReactPluginOptions {
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
