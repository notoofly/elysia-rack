import { renderToReadableStream } from "react-dom/server"
import type { ReactRack } from "./types"

function pageTitle(path: string, props: unknown): string {
  const metadata = (props as { metadata?: { pluralLabel?: string; label?: string } } | null)?.metadata;
  return metadata?.pluralLabel ?? metadata?.label ?? path;
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
    const head = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${pageTitle(path, props)}</title><link rel="stylesheet" href="/__rack/panel.css"><script type="module" src="/__rack/panel-theme.js"></script></head><body>`;
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
        controller.enqueue(encoder.encode("</body></html>"));
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
