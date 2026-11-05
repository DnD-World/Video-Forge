// Build the motion-library pages (3 Nov 2026), each as ONE file:
//   characters/samples/capture.html        tracks free clips into takes (run on tools/take-server.mjs)
//   characters/samples/motion-library.html the acted moves, side by side with their clips
//   node tools/acted-pages.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = async (entry) => (await build({ entryPoints: [path.join(root, entry)], bundle: true, write: false, format: "iife", target: "es2022", logLevel: "warning" })).outputFiles[0].text.replaceAll("</script", "<\\/script");

const capture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Clip Capture</title>
<style>body{margin:0;background:#120b0e;color:#f5ece8;font:14px/1.5 system-ui,sans-serif;padding:16px}canvas{border-radius:10px;border:2px solid #ff4d57;display:block;margin-bottom:10px}pre{white-space:pre-wrap;color:#ffb36b}video{display:none}</style></head>
<body><h1 style="margin:0 0 10px;font-size:20px">Clip capture</h1><canvas id="view"></canvas><pre id="log"></pre><video id="video" playsinline muted></video>
<script>${await bundle("characters/samples/capture-page.mjs")}</script></body></html>`;
fs.writeFileSync(path.join(root, "characters/samples/capture.html"), capture);
console.log("wrote characters/samples/capture.html");

if (fs.existsSync(path.join(root, "characters/samples/library-page.mjs"))) {
  const { head, body } = await import("./library-shell.mjs");
  const html = head + body.replace("%JS%", await bundle("characters/samples/library-page.mjs"));
  fs.writeFileSync(path.join(root, "characters/samples/motion-library.html"), html);
  console.log(`wrote characters/samples/motion-library.html ${Math.round(html.length / 1024)} KB`);
}
