import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { renderToReadableStream } from "react-dom/server"
import type { ReactRack } from "./types"

function pageTitle(path: string, props: unknown): string {
  const metadata = (props as { metadata?: { pluralLabel?: string; label?: string } } | null)?.metadata;
  return metadata?.pluralLabel ?? metadata?.label ?? path;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

const FALLBACK_TEMPLATE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{title}}</title><link rel="stylesheet" href="/__rack/panel.css"><script type="module" src="/__rack/panel-theme.js"></script><!--app-head--></head><body><!--app--></body></html>`

let cachedTemplate: string | null = null

/** Load HTML shell from app.html with fallback. Cached after first read. */
async function loadTemplate(): Promise<string> {
  if (cachedTemplate !== null) return cachedTemplate
  const candidates = [
    join(fileURLToPath(new URL(".", import.meta.url)), "app.html"),
    join(fileURLToPath(new URL(".", import.meta.url)), "..", "app.html"),
    join(process.cwd(), "dist", "app.html"),
    join(process.cwd(), "src", "react", "app.html"),
  ]
  // Also try dist dirs that contain built assets
  for (const dir of [join(process.cwd(), "dist"), join(fileURLToPath(new URL(".", import.meta.url)), "..")]) {
    const p = join(dir, "app.html")
    if (!candidates.includes(p)) candidates.push(p)
  }

  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue
      cachedTemplate = await readFile(p, "utf-8")
      return cachedTemplate
    } catch { /* try next candidate */ }
  }
  cachedTemplate = FALLBACK_TEMPLATE
  return cachedTemplate
}

function buildShell(template: string, title: string): { head: string; tail: string } {
  const safeTitle = escapeHtml(title)
  const html = template.replaceAll("{{title}}", safeTitle)

  // Primary SSR placeholder — stream is injected here
  for (const marker of ["<!--app-->", "{{body}}", "<!--app-html-->"]) {
    const idx = html.indexOf(marker)
    if (idx !== -1) {
      return { head: html.slice(0, idx), tail: html.slice(idx + marker.length) }
    }
  }
  // Fallback: inject before </body>
  const bodyClose = html.lastIndexOf("</body>")
  if (bodyClose !== -1) return { head: html.slice(0, bodyClose), tail: html.slice(bodyClose) }
  return { head: html, tail: "" }
}

export function createRenderer(pages: ReactRack.PageRegistry) {
  return async function render(
    path: string,
    props: unknown
  ): Promise<Response> {
    const loader = pages[path]
    if (!loader) {
      return new Response("Page Not Found", {
        status: 404
      })
    }
    const module = await loader()
    const Component = module.default
    const stream = await renderToReadableStream(
      <Component {...(props as object)} />
    )
    const template = await loadTemplate()
    const { head, tail } = buildShell(template, pageTitle(path, props))
    const encoder = new TextEncoder();
    const combined = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(head));
        const reader = stream.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
        controller.enqueue(encoder.encode(tail));
        controller.close();
      },
    });
    return new Response(combined, {
      headers: {
        'Content-Type': "text/html; charset=utf-8"
      }
    })
  }
}
