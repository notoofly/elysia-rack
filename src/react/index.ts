import Elysia from "elysia";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRenderer } from "./render";
import { ReactRack } from "./types";

/**
 * Vite-built panel assets (dist/panel.css, dist/panel-*.js),
 * served under `/__rack/*`.
 */
const PANEL_ASSETS: Record<string, string> = {
  "panel.css": "text/css; charset=utf-8",
  "panel-theme.js": "text/javascript; charset=utf-8",
  "panel-app.js": "text/javascript; charset=utf-8",
};

function resolveDistDir(): string | null {
  const candidates = [
    join(process.cwd(), "dist"),
    join(fileURLToPath(new URL(".", import.meta.url)), ".."),
  ];
  for (const dir of candidates) {
    try {
      if (existsSync(join(dir, "panel-app.js"))) return dir;
    } catch {
      // coba kandidat berikut
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


export function reactPlugin(options: ReactRack.ReactPluginOptions) {
  const render = createRenderer(options.pages)

  return new Elysia({ name: "@elysia-rack/react" })
    .decorate('react', { render })
    .get("/__rack/:name", async ({ params, status }) => {
      const type = PANEL_ASSETS[params.name];
      const dir = resolveDistDir();
      if (!type || !dir)
        return status(404, "Panel asset not built. Run `bun run build:assets`.");
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
