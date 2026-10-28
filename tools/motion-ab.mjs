// Build characters/samples/motion-ab.html: BEFORE | AFTER for the motion layer,
// one file that opens straight from disk.   node tools/motion-ab.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// BEFORE is the engine as it was just before the motion work, taken from git
const BEFORE = "a6561d1";
const old = path.join(root, "characters/checks", `before-${BEFORE}`);
if (!fs.existsSync(path.join(old, "characters/core/index.mjs"))) {
  fs.mkdirSync(old, { recursive: true });
  execFileSync("git", ["-C", root, "archive", "--format=tar", "-o", path.join(old, "src.tar"), BEFORE, "characters", "explainer/core"]);
  execFileSync("tar", ["-xf", "src.tar"], { cwd: old });
  fs.rmSync(path.join(old, "src.tar"));
}
const out = await build({
  entryPoints: [path.join(root, "characters/samples/motion-ab-page.mjs")], bundle: true, write: false, format: "iife", target: "es2022", logLevel: "warning",
  alias: { "before-core": path.join(old, "characters/core/index.mjs") },
});
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Movement, before and after</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b1726;--card:#12233a;--ink:#e8f1f2;--muted:#9fb3c8;--mint:#5be3b5;--line:#22344a}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#16314f,var(--bg));color:var(--ink);font:16px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
main{max-width:1240px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:30px;margin:0 0 6px}h1 span{color:var(--mint)}
.lead{color:var(--muted);max-width:860px;margin:0 0 16px}
.bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:0 0 14px;color:var(--muted)}
select{font:inherit;background:#1c3555;color:var(--ink);border:1px solid #2b4b72;border-radius:999px;padding:4px 12px}
.now{padding:6px 14px;border-radius:999px;background:#1c3555;color:var(--mint);font-weight:600}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media (max-width:760px){.grid{grid-template-columns:1fr}}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
canvas{display:block;width:100%;aspect-ratio:4/3}
figcaption{padding:12px 16px}figcaption b{font-size:18px}figcaption span{color:var(--muted);font-size:14px;display:block}
figure.after{border-color:var(--mint);box-shadow:0 0 0 1px var(--mint) inset}
ul{color:var(--muted);font-size:14px;margin:18px 0 0;padding-left:20px}
</style></head><body><main>
<h1>Movement <span>— before and after</span></h1>
<p class="lead">The same character, the same moves, at the same moment. Left: the drawing engine exactly as it was before this work (taken from its saved version). Right: with weight, follow-through, a small wind-up before big moves, breathing, and feet that stay planted when walking. Change the character or the drawing style; slow it down to see the difference.</p>
<div class="bar"><span class="now" id="now"></span>
<label>Character <select id="who"></select></label>
<label>Style <select id="look"></select></label>
<label>Speed <select id="slow"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label></div>
<div class="grid">
<figure><canvas id="before"></canvas><figcaption><b>Before</b><span>joints glide to each pose on their own</span></figcaption></figure>
<figure class="after"><canvas id="after"></canvas><figcaption><b>After</b><span>weight, overlap, anticipation, breathing, planted feet</span></figcaption></figure>
</div>
<ul><li>Watch the forearm and hand trail the upper arm in the wave.</li><li>Before the jump the body dips; after landing it settles.</li><li>Standing still, the weight drifts from leg to leg and the chest breathes.</li><li>Walking, a foot on the floor stays exactly where it was put.</li></ul>
</main><script>${js}</script></body></html>`;
const file = path.join(root, "characters/samples/motion-ab.html");
fs.writeFileSync(file, html);
console.log("wrote", path.relative(root, file), (html.length / 1024).toFixed(0), "KB");
