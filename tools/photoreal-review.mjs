// Build characters/checks/review-photoreal-<name>.html: the photoreal puppet
// bent by the skeleton next to a drawn character, live, with the question in
// plain words. Pictures inside; ignored folder (may be a private character).
//   node tools/photoreal-review.mjs --sources a.png~a.pose.json,t.png~t.pose.json~edges [--name nikos]
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const sources = arg("sources").split(",").map((part) => {
  const [img, pose, flag] = part.split("~");
  return { image: "data:image/png;base64," + fs.readFileSync(img).toString("base64"), pose: JSON.parse(fs.readFileSync(pose, "utf8")), armEdges: flag === "edges" };
});
const name = arg("name", "puppet");
const out = await build({ entryPoints: [path.join(root, "characters/photoreal/review-page.mjs")], bundle: true, write: false, format: "esm", target: "es2022", logLevel: "warning" });
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Photoreal puppets that move</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b1726;--card:#12233a;--ink:#e8f1f2;--muted:#9fb3c8;--mint:#5be3b5;--amber:#ffb35b;--line:#22344a}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#16314f,var(--bg));color:var(--ink);font:16px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
main{max-width:1240px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:30px;margin:0 0 6px}h1 span{color:var(--amber)}
.lead{color:var(--muted);max-width:880px;margin:0 0 14px}
.bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:0 0 14px;color:var(--muted)}
select{font:inherit;background:#1c3555;color:var(--ink);border:1px solid #2b4b72;border-radius:999px;padding:4px 12px}
.now{padding:6px 14px;border-radius:999px;background:#1c3555;color:var(--mint);font-weight:600}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:760px){.grid{grid-template-columns:1fr}}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
figure.photo{border-color:var(--amber);box-shadow:0 0 0 1px var(--amber) inset}
canvas{display:block;width:100%;aspect-ratio:1;background:linear-gradient(#ffe6f2 0 88%,#f7c6dc 88%)}
figcaption{padding:12px 16px}figcaption b{font-size:18px}figcaption span{color:var(--muted);font-size:14px;display:block}
.q{margin-top:24px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 22px}
.q h2{margin:0 0 6px;font-size:21px}.q ul{color:var(--muted);margin:6px 0 0;padding-left:20px}
.opts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}@media (max-width:760px){.opts{grid-template-columns:1fr}}
.opt{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:#0f1e31}.opt b{color:var(--mint)}.opt.rec{border-color:var(--mint);box-shadow:0 0 0 1px var(--mint) inset}.opt small{display:block;color:var(--muted);margin-top:4px}
</style></head><body><main>
<h1>A photoreal puppet <span>that moves</span></h1>
<p class="lead">Left: ${name === "nikos" ? "Nikos" : "the puppet"}, from two generated pictures (arms down, arms out), bent by the same skeleton and the same movement as the drawn characters — no cutting, no visible joints. Right: a drawn character doing exactly the same at the same moment, for comparison. It loops through every move.</p>
<div class="bar"><span class="now" id="now"></span><label>Speed <select id="slow"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label></div>
<div class="grid">
<figure class="photo"><canvas id="photo"></canvas><figcaption><b>Photoreal, bent</b><span>two Nano Banana pictures, mixed per arm</span></figcaption></figure>
<figure><canvas id="drawn"></canvas><figcaption><b>Drawn</b><span>for comparison</span></figcaption></figure>
</div>
<section class="q"><h2>What I need from you</h2>
<p>Is the photoreal one good enough to keep building? Still to do if yes:</p>
<ul><li>faint hairline marks next to a hanging arm in some frames (left over from the cut)</li><li>side-on walking (needs a side picture; already generated, not yet wired)</li><li>hands that change shape (a hand sheet is generated; not yet wired)</li><li>talking and blinking on this face (the existing puppet face parts, layered on top)</li><li>every new photoreal puppet would need 2 extra pictures from Image Forge (arms down, arms out) — about 4 US cents</li></ul>
<div class="opts">
<div class="opt rec"><b>Keep going</b> — recommended<small>Full movement for photoreal puppets is within reach; I finish the list above.</small></div>
<div class="opt"><b>Upper body only</b><small>Keep the bending for arms and head; legs stay still (fewer things to get wrong).</small></div>
<div class="opt"><b>Portraits only</b><small>The last resort: face and shoulders, talking and blinking.</small></div>
</div></section>
</main>
<script>window.__REVIEW=${JSON.stringify({ sources })};</script>
<script type="module">${js}</script></body></html>`;
const file = path.join(root, "characters/checks", `review-photoreal-${name}.html`);
fs.writeFileSync(file, html);
console.log("wrote", path.relative(root, file), (html.length / 1024).toFixed(0), "KB");
