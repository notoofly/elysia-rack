import Elysia from "elysia";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRenderer } from "./render";
import { ReactRack } from "./types";

/**
 * Static panel assets (dist/panel.css, dist/panel-*.js),
 * served under `/__rack/*`. No build step required.
 */
const PANEL_ASSETS: Record<string, string> = {
  "panel.css": "text/css; charset=utf-8",
  "panel-theme.js": "text/javascript; charset=utf-8",
  "panel-app.js": "text/javascript; charset=utf-8",
};

function resolveDistDir(): string | null {
  const candidates = [join(process.cwd(), "dist"), join(fileURLToPath(new URL(".", import.meta.url)), "..")];
  for (const dir of candidates) {
    try {
      if (existsSync(join(dir, "panel-app.js"))) return dir;
    } catch {
      // try next
    }
  }
  return null;
}

function pickPanelCssOption(options: ReactRack.ReactPluginOptions): ReactRack.PanelCssOverride | undefined {
  return options.css ?? options.panelCss;
}

function resolveCssFilePath(raw: string): string | null {
  const candidates = [raw, join(process.cwd(), raw)];
  const dist = resolveDistDir();
  if (dist) candidates.push(join(dist, raw));
  for (const p of candidates) {
    try {
      if (existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function page<Props = Record<string, never>>(path: string, props?: Props): ReactRack.PageDescriptor<Props> {
  return {
    [ReactRack.PAGE]: true,
    path,
    props
  }
}

export const pages: ReactRack.PageRegistry = {
  "/dashboard": () => import("./page/Dashboard"),
  "/panel": () => import("./page/Panel")
}

const defaultPages = pages

function mergeRegistries(base: ReactRack.PageRegistry, extra?: ReactRack.PageRegistry | ReactRack.PageRegistry[]): ReactRack.PageRegistry {
  if (!extra) return { ...base }
  const list = Array.isArray(extra) ? extra : [extra]
  // combine registry with from options — array will be merged
  return list.reduce<ReactRack.PageRegistry>((acc, r) => ({ ...acc, ...r }), { ...base })
}

export function reactPlugin(options: ReactRack.ReactPluginOptions = {}) {
  const registry = mergeRegistries(defaultPages, options.pages)
  const render = createRenderer(registry)
  const panelCssOverride = pickPanelCssOption(options);
  let cachedCustomCss: string | Buffer | null = null;
  let cachedCustomCssLoaded = false;

  async function loadCustomPanelCss(): Promise<string | Buffer | null> {
    if (cachedCustomCssLoaded) return cachedCustomCss;
    if (!panelCssOverride) {
      cachedCustomCssLoaded = true;
      return (cachedCustomCss = null);
    }
    // { content: string } -> raw CSS
    if (typeof panelCssOverride === "object" && panelCssOverride.content !== undefined) {
      cachedCustomCssLoaded = true;
      return (cachedCustomCss = panelCssOverride.content);
    }
    // { path: string } -> file
    if (typeof panelCssOverride === "object" && panelCssOverride.path) {
      const p = resolveCssFilePath(panelCssOverride.path);
      if (p) {
        try {
          cachedCustomCssLoaded = true;
          return (cachedCustomCss = await readFile(p));
        } catch {
          // fallback to default
        }
      }
      cachedCustomCssLoaded = true;
      return (cachedCustomCss = null);
    }
    // string -> file if exists, otherwise raw CSS if it looks like CSS
    if (typeof panelCssOverride === "string") {
      const filePath = resolveCssFilePath(panelCssOverride);
      if (filePath) {
        try {
          cachedCustomCssLoaded = true;
          return (cachedCustomCss = await readFile(filePath));
        } catch {
          // treat as raw below
        }
      }
      const looksLikeCss = panelCssOverride.includes("{") || panelCssOverride.includes("\n");
      if (looksLikeCss) {
        cachedCustomCssLoaded = true;
        return (cachedCustomCss = panelCssOverride);
      }
      // string is neither a file nor CSS -> fallback to default
      cachedCustomCssLoaded = true;
      return (cachedCustomCss = null);
    }
    cachedCustomCssLoaded = true;
    return (cachedCustomCss = null);
  }

  return new Elysia({ name: "@elysia-rack/react" })
    .decorate('react', { render })
    .get("/__rack/:name", async ({ params, status }) => {
      const type = PANEL_ASSETS[params.name];
      if (!type) return status(404, "Panel asset not found");
      // Allow panel.css override via react({ css })
      if (params.name === "panel.css") {
        const custom = await loadCustomPanelCss();
        if (custom !== null) {
          return new Response(custom, {
            headers: {
              "Content-Type": type,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
      const dir = resolveDistDir();
      if (!dir) return status(404, "Panel asset not found");
      try {
        const data = await readFile(join(dir, params.name));
        return new Response(data, {
          headers: {
            "Content-Type": type,
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        return status(404, "Panel asset not found");
      }
    })
    .onAfterHandle({ as: "scoped" }, async ({ responseValue }) => {
      if (typeof responseValue !== "object" || responseValue === null || !(ReactRack.PAGE in responseValue)) {
        return
      }
      const descriptor = responseValue as {
        [ReactRack.PAGE]: true,
        path: string,
        props: unknown
      }
      return render(descriptor.path, descriptor.props)
    })

}
