// Build characters/samples/moves.html: the motion library page as ONE file
// (script inlined), so it opens straight from disk with no server.
//   node tools/moves-page.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = await build({
  entryPoints: [path.join(root, "characters/samples/moves-page.mjs")],
  bundle: true, write: false, format: "iife", target: "es2022", minify: false, logLevel: "warning",
});
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Motion library</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b1726;--card:#12233a;--ink:#e8f1f2;--muted:#9fb3c8;--mint:#5be3b5}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 Sora,system-ui,sans-serif}
header{padding:20px 16px 4px;max-width:1500px;margin:0 auto}h1{margin:0;font-size:24px}h1 span{color:var(--mint)}
.bar{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:10px 0;color:var(--muted)}
select,button{font:inherit;background:#1c3555;color:var(--ink);border:1px solid #2b4b72;border-radius:999px;padding:4px 12px}
input[type=range]{accent-color:var(--mint)}
main{display:grid;gap:14px;padding:12px 16px 40px;max-width:1500px;margin:0 auto}
figure{margin:0;background:var(--card);border-radius:14px;overflow:hidden}canvas{display:block;width:100%}
figcaption{padding:10px 14px 6px}figcaption small{color:var(--muted)}figcaption code{color:var(--mint);font-size:12px}
.labels{display:flex}.labels span{flex:1;text-align:center;padding:4px 0 8px;color:var(--muted);font-size:12px;letter-spacing:.04em;text-transform:uppercase}
</style></head><body>
<header><h1>Motion library <span>— <span id="count"></span>, live</span></h1>
<div class="bar">
<label>Look <select id="look"></select></label>
<label>Who <select id="who"></select></label>
<label>Style <select id="styles"></select></label>
<label>Move <select id="move"></select></label>
<label>Energy <input id="energy" type="range" min="0" max="1" step="0.05" value="0.6"></label>
<button id="play">Pause</button></div></header>
<main id="grid"></main>
<script>${js}</script></body></html>`;
const file = path.join(root, "characters/samples/moves.html");
fs.writeFileSync(file, html);
console.log("wrote", path.relative(root, file), (html.length / 1024).toFixed(0), "KB");
