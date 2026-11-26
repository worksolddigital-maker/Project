import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Standalone build: the same React screens and domain code as the Next.js app,
 * bundled into ONE self-contained HTML file. The API client and Next.js routing
 * are swapped for in-browser shims (see demo/shims).
 */
export default defineConfig({
  root: r("./"),
  base: "./",
  plugins: [tailwindcss(), viteSingleFile()],
  resolve: {
    alias: [
      { find: /^@\/lib\/api\/client$/, replacement: r("./shims/api-client.ts") },
      { find: /^@\/lib\/navigation$/, replacement: r("./shims/navigation.ts") },
      { find: /^next\/link$/, replacement: r("./shims/next-link.tsx") },
      { find: /^next\/navigation$/, replacement: r("./shims/next-navigation.ts") },
      { find: /^@\//, replacement: `${r("../src")}/` },
    ],
  },
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  build: {
    outDir: r("../dist-demo"),
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 10000,
    assetsInlineLimit: 100_000_000,
    rolldownOptions: {
      // Libraries ship "use client" markers that only matter to React Server Components.
      onLog(level, log, handler) {
        if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
        handler(level, log);
      },
    },
  },
});
