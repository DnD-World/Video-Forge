// Build characters/samples/engine.html: the engine test page as ONE file
// (script inlined), so it opens straight from disk with no server.
//   node tools/character-sheet.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = await build({
  entryPoints: [path.join(root, "characters/samples/engine-page.mjs")],
  bundle: true, write: false, format: "iife", target: "es2022", minify: false, logLevel: "warning",
});
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Character engine</title>
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
figcaption{padding:8px 12px}figcaption small{color:var(--muted)}
</style></head><body>
<header><h1>Character engine <span>— the real drawing code, live</span></h1>
<div class="bar">
<label>View <input id="view" type="range" min="0" max="2" step="0.05" value="0"> <span id="viewv">front</span></label>
<label>Pose <select id="pose"></select></label>
<label>Framing <select id="framing"><option>full</option><option>waist</option><option>head</option></select></label>
<label>Line boil <input id="boil" type="range" min="0" max="4" step="0.1" value="0"> <span id="boilv">look's own</span></label>
<button id="play">Pause</button></div></header>
<main id="grid"></main>
<script>${js}</script></body></html>`;
const file = path.join(root, "characters/samples/engine.html");
fs.writeFileSync(file, html);
console.log("wrote", path.relative(root, file), (html.length / 1024).toFixed(0), "KB");
