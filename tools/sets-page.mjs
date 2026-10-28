// Build characters/checks/sets-<name>.html: the four half-body sets live, with
// a photoreal presenter (folder from tools/make-photoreal.mjs) and drawn
// characters. Ignored folder: the presenter may be a private character.
//   node tools/sets-page.mjs --dir <presenter folder> [--name nikos]
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg("dir"), name = arg("name", "presenter");
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "photoreal.json"), "utf8"));
const files = {};
for (const s of manifest.sources) {
  files[s.image] = "data:image/png;base64," + fs.readFileSync(path.join(dir, s.image)).toString("base64");
  files[s.pose] = fs.readFileSync(path.join(dir, s.pose), "utf8");
}
for (const p of Object.values(manifest.face?.parts ?? {})) files[p.file] = "data:image/png;base64," + fs.readFileSync(path.join(dir, p.file)).toString("base64");
const out = await build({ entryPoints: [path.join(root, "characters/sets/sets-page.mjs")], bundle: true, write: false, format: "esm", target: "es2022", logLevel: "warning" });
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Half-body sets</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b1726;--card:#12233a;--ink:#e8f1f2;--muted:#9fb3c8;--mint:#5be3b5;--line:#22344a}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#16314f,var(--bg));color:var(--ink);font:16px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
main{max-width:1280px;margin:0 auto;padding:28px 16px 60px}h1{font-size:30px;margin:0 0 6px}h1 span{color:var(--mint)}
.lead{color:var(--muted);max-width:880px;margin:0 0 18px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:760px){.grid{grid-template-columns:1fr}}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
canvas{display:block;width:100%;aspect-ratio:16/9}figcaption{padding:12px 16px}figcaption b{font-size:18px}figcaption span{display:block;color:var(--muted);font-size:14px}
</style></head><body><main>
<h1>Half-body sets <span>— photoreal and drawn together</span></h1>
<p class="lead">${manifest.name}, photoreal, seated in each set with drawn characters around him. Furniture hides the legs, so everyone moves from the waist up. People take turns talking; the one talking gestures.</p>
<div class="grid">
<figure><canvas data-set="news"></canvas><figcaption><b>News desk</b><span>one or two presenters</span></figcaption></figure>
<figure><canvas data-set="meeting"></canvas><figcaption><b>Conference room</b><span>a team of up to four around a table</span></figcaption></figure>
<figure><canvas data-set="stage"></canvas><figcaption><b>Conference stage</b><span>a speaker at the podium, a panel beside</span></figcaption></figure>
<figure><canvas data-set="podcast"></canvas><figcaption><b>Podcast</b><span>two hosts at microphones</span></figcaption></figure>
</div></main>
<script>window.__SETS=${JSON.stringify({ presenters: [{ manifest, files }] })};</script>
<script type="module">${js}</script></body></html>`;
const file = path.join(root, "characters/checks", `sets-${name}.html`);
fs.writeFileSync(file, html);
console.log("wrote", path.relative(root, file), (html.length / 1024).toFixed(0), "KB");
