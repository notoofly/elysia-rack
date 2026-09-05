import {
  __require
} from "../index-37x76zdn.js";

// src/react/index.ts
import Elysia from "elysia";
import { existsSync as existsSync2 } from "node:fs";
import { readFile as readFile2 } from "node:fs/promises";
import { join as join2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// src/react/render.tsx
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToReadableStream } from "react-dom/server";
import { jsxDEV } from "react/jsx-dev-runtime";
function pageTitle(path, props) {
  const metadata = props?.metadata;
  return metadata?.pluralLabel ?? metadata?.label ?? path;
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
var FALLBACK_TEMPLATE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{title}}</title><link rel="stylesheet" href="/__rack/panel.css"><script type="module" src="/__rack/panel-theme.js"></script><!--app-head--></head><body><!--app--></body></html>`;
var cachedTemplate = null;
async function loadTemplate() {
  if (cachedTemplate !== null)
    return cachedTemplate;
  const candidates = [
    join(fileURLToPath(new URL(".", import.meta.url)), "app.html"),
    join(fileURLToPath(new URL(".", import.meta.url)), "..", "app.html"),
    join(process.cwd(), "dist", "app.html"),
    join(process.cwd(), "src", "react", "app.html")
  ];
  for (const dir of [join(process.cwd(), "dist"), join(fileURLToPath(new URL(".", import.meta.url)), "..")]) {
    const p = join(dir, "app.html");
    if (!candidates.includes(p))
      candidates.push(p);
  }
  for (const p of candidates) {
    try {
      if (!existsSync(p))
        continue;
      cachedTemplate = await readFile(p, "utf-8");
      return cachedTemplate;
    } catch {}
  }
  cachedTemplate = FALLBACK_TEMPLATE;
  return cachedTemplate;
}
function buildShell(template, title) {
  const safeTitle = escapeHtml(title);
  const html = template.replaceAll("{{title}}", safeTitle);
  for (const marker of ["<!--app-->", "{{body}}", "<!--app-html-->"]) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      return { head: html.slice(0, idx), tail: html.slice(idx + marker.length) };
    }
  }
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose !== -1)
    return { head: html.slice(0, bodyClose), tail: html.slice(bodyClose) };
  return { head: html, tail: "" };
}
function createRenderer(pages) {
  return async function render(path, props) {
    const loader = pages[path];
    if (!loader) {
      return new Response("Page Not Found", {
        status: 404
      });
    }
    const module = await loader();
    const Component = module.default;
    const stream = await renderToReadableStream(/* @__PURE__ */ jsxDEV(Component, {
      ...props
    }, undefined, false, undefined, this));
    const template = await loadTemplate();
    const { head, tail } = buildShell(template, pageTitle(path, props));
    const encoder = new TextEncoder;
    const combined = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(head));
        const reader = stream.getReader();
        try {
          for (;; ) {
            const { done, value } = await reader.read();
            if (done)
              break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
        controller.enqueue(encoder.encode(tail));
        controller.close();
      }
    });
    return new Response(combined, {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  };
}

// src/react/types.ts
var ReactRack;
((ReactRack) => {
  ReactRack.PAGE = Symbol.for("@elysia-panel/react");
})(ReactRack ||= {});

// src/react/index.ts
var PANEL_ASSETS = {
  "panel.css": "text/css; charset=utf-8",
  "panel-theme.js": "text/javascript; charset=utf-8",
  "panel-app.js": "text/javascript; charset=utf-8"
};
function resolveDistDir() {
  const candidates = [join2(process.cwd(), "dist"), join2(fileURLToPath2(new URL(".", import.meta.url)), "..")];
  for (const dir of candidates) {
    try {
      if (existsSync2(join2(dir, "panel-app.js")))
        return dir;
    } catch {}
  }
  return null;
}
function pickPanelCssOption(options) {
  return options.css ?? options.panelCss;
}
function resolveCssFilePath(raw) {
  const candidates = [raw, join2(process.cwd(), raw)];
  const dist = resolveDistDir();
  if (dist)
    candidates.push(join2(dist, raw));
  for (const p of candidates) {
    try {
      if (existsSync2(p))
        return p;
    } catch {}
  }
  return null;
}
function page(path, props) {
  return {
    [ReactRack.PAGE]: true,
    path,
    props
  };
}
var pages = {
  "/dashboard": () => import("../Dashboard-0da8dvbv.js"),
  "/panel": () => import("../Panel-n0kstkyw.js")
};
var defaultPages = pages;
function mergeRegistries(base, extra) {
  if (!extra)
    return { ...base };
  const list = Array.isArray(extra) ? extra : [extra];
  return list.reduce((acc, r) => ({ ...acc, ...r }), { ...base });
}
function reactPlugin(options = {}) {
  const registry = mergeRegistries(defaultPages, options.pages);
  const render = createRenderer(registry);
  const panelCssOverride = pickPanelCssOption(options);
  let cachedCustomCss = null;
  let cachedCustomCssLoaded = false;
  async function loadCustomPanelCss() {
    if (cachedCustomCssLoaded)
      return cachedCustomCss;
    if (!panelCssOverride) {
      cachedCustomCssLoaded = true;
      return cachedCustomCss = null;
    }
    if (typeof panelCssOverride === "object" && panelCssOverride.content !== undefined) {
      cachedCustomCssLoaded = true;
      return cachedCustomCss = panelCssOverride.content;
    }
    if (typeof panelCssOverride === "object" && panelCssOverride.path) {
      const p = resolveCssFilePath(panelCssOverride.path);
      if (p) {
        try {
          cachedCustomCssLoaded = true;
          return cachedCustomCss = await readFile2(p);
        } catch {}
      }
      cachedCustomCssLoaded = true;
      return cachedCustomCss = null;
    }
    if (typeof panelCssOverride === "string") {
      const filePath = resolveCssFilePath(panelCssOverride);
      if (filePath) {
        try {
          cachedCustomCssLoaded = true;
          return cachedCustomCss = await readFile2(filePath);
        } catch {}
      }
      const looksLikeCss = panelCssOverride.includes("{") || panelCssOverride.includes(`
`);
      if (looksLikeCss) {
        cachedCustomCssLoaded = true;
        return cachedCustomCss = panelCssOverride;
      }
      cachedCustomCssLoaded = true;
      return cachedCustomCss = null;
    }
    cachedCustomCssLoaded = true;
    return cachedCustomCss = null;
  }
  return new Elysia({ name: "@elysia-rack/react" }).decorate("react", { render }).get("/__rack/:name", async ({ params, status }) => {
    const type = PANEL_ASSETS[params.name];
    if (!type)
      return status(404, "Panel asset not found");
    if (params.name === "panel.css") {
      const custom = await loadCustomPanelCss();
      if (custom !== null) {
        return new Response(custom, {
          headers: {
            "Content-Type": type,
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
    }
    const dir = resolveDistDir();
    if (!dir)
      return status(404, "Panel asset not found");
    try {
      const data = await readFile2(join2(dir, params.name));
      return new Response(data, {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=3600"
        }
      });
    } catch {
      return status(404, "Panel asset not found");
    }
  }).onAfterHandle({ as: "scoped" }, async ({ responseValue }) => {
    if (typeof responseValue !== "object" || responseValue === null || !(ReactRack.PAGE in responseValue)) {
      return;
    }
    const descriptor = responseValue;
    return render(descriptor.path, descriptor.props);
  });
}
export {
  reactPlugin,
  pages,
  page
};
