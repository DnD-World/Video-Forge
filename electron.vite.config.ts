import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import type { Plugin } from "vite";

/**
 * A content-security policy in the built page (not the dev server, whose
 * hot-reload needs inline scripts). Scripts only from the app's own files;
 * nothing can be fetched from the network (connect-src has no https:), so a
 * hostile script could not send anything out even if one ever got in. Pictures
 * may come from https: because stock-clip thumbnails are web images.
 */
function contentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "media-src 'self' blob: data:",
    "font-src 'self' data: blob:",
    "connect-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  return {
    name: "video-forge-csp",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" },
    ],
  };
}

export default defineConfig({
  main: {
    // Everything in package.json `dependencies` stays external and is
    // require()d at runtime instead of being inlined. @remotion/bundler and
    // @remotion/renderer ship native binaries and spawn their own child
    // processes, so bundling them into main.js breaks them outright.
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      lib: { entry: resolve(__dirname, "electron/main.ts") },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      lib: { entry: resolve(__dirname, "electron/preload.ts"), formats: ["cjs"] },
      // preload.cjs, not .mjs: a sandboxed window can only load a CommonJS preload.
      rollupOptions: { output: { entryFileNames: "[name].cjs" } },
    },
  },
  renderer: {
    root: ".",
    plugins: [react(), contentSecurityPolicy()],
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: { index: resolve(__dirname, "index.html") },
      },
    },
    resolve: {
      alias: { "@": resolve(__dirname, "src") },
    },
  },
});
