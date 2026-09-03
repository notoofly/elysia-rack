import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const root = fileURLToPath(new URL(".", import.meta.url))

// Build aset panel (CSS + JS browser) ke dist/ dengan nama stabil.
// Jangan kosongkan outDir: output JS library (bun build) juga tinggal di sini.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    cssMinify: true,
    rollupOptions: {
      input: {
        panel: resolve(root, "src/react/page/panel.css"),
        "panel-theme": resolve(root, "src/react/page/client/theme.ts"),
        "panel-app": resolve(root, "src/react/page/client/panel.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
})
