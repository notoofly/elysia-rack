import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server"
import { RackIcon } from "./page/components/Icon"
import { ReactRack } from "./types"

type PageMetadata = { pluralLabel?: string; label?: string; icon?: string };

function pageMeta(props: unknown): PageMetadata {
  return (props as { metadata?: PageMetadata } | null)?.metadata ?? {};
}

function pageTitle(path: string, props: unknown): string {
  const metadata = pageMeta(props);
  return metadata.pluralLabel ?? metadata.label ?? path;
}

/** Render `metadata.icon` (Lucide name) as an inline SVG favicon in `<head>`. */
function faviconHead(icon?: string): string {
  if (!icon) return ""
  try {
    const svg = renderToStaticMarkup(<RackIcon name={icon} size={32} />)
    if (!svg.startsWith("<svg")) return ""
    return `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(svg)}">`
  } catch {
    return ""
  }
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

function buildShell(template: string, title: string, extraHead = ""): { head: string; tail: string } {
  const safeTitle = escapeHtml(title)
  const html = template
    .replaceAll("{{title}}", safeTitle)
    .replace("<!--app-head-->", extraHead)

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

function isLazyPage(entry: ReactRack.PageEntry): entry is ReactRack.PageLoader {
  return ReactRack.isLazyPage(entry);
}

export function createRenderer(pages: ReactRack.PageRegistry) {
  return async function render(
    path: string,
    props: unknown
  ): Promise<Response> {
    const entry = pages[path]
    if (!entry) {
      return new Response("Page Not Found", {
        status: 404
      })
    }
    const Component = isLazyPage(entry)
      ? (await entry()).default
      : entry
    const stream = await renderToReadableStream(
      <Component {...(props as object)} />
    )
    const template = await loadTemplate()
    const { head, tail } = buildShell(
      template,
      pageTitle(path, props),
      faviconHead(pageMeta(props).icon),
    )
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
