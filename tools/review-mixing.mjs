// Build characters/checks/review-<name>.html: a live side-by-side review of
// experiments #49b (picture puppet cut into limbs) and #49c (puppet head on a
// drawn body), with the decision in plain words. One file, picture inside;
// written to the ignored checks folder because the picture may be private.
//   node tools/review-mixing.mjs --image <keyed full-body png> --limbs <json> [--name nikos] [--look sticker]
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const image = "data:image/png;base64," + fs.readFileSync(arg("image")).toString("base64");
const limbs = JSON.parse(fs.readFileSync(arg("limbs"), "utf8"));
const name = arg("name", "puppet");
const card = { name: "Body", hair: "bald", wear: [{ id: "tshirt", colors: ["#f4f4f4"] }, { id: "vest", colors: ["#1f5e45"] }, { id: "trousers", colors: ["#16181d"] }, { id: "shoes", colors: ["#16181d"] }] };
const out = await build({ entryPoints: [path.join(root, "characters/samples/review-mixing-page.mjs")], bundle: true, write: false, format: "esm", target: "es2022", logLevel: "warning" });
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Puppets that move</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b1726;--card:#12233a;--ink:#e8f1f2;--muted:#9fb3c8;--mint:#5be3b5;--line:#22344a}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#16314f,var(--bg));color:var(--ink);font:16px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
main{max-width:1240px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:30px;margin:0 0 6px}h1 span{color:var(--mint)}
.lead{color:var(--muted);max-width:820px;margin:0 0 22px}
.now{display:inline-block;margin:0 0 14px;padding:6px 14px;border-radius:999px;background:#1c3555;color:var(--mint);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media (max-width:860px){.grid{grid-template-columns:1fr}}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
canvas.stage{display:block;width:100%;aspect-ratio:3/4;background:linear-gradient(#ffe6f2 0 82%,#f7c6dc 82%)}
figure.b canvas.stage{background:linear-gradient(#24395a 0 82%,#1b2c44 82%)}
figcaption{padding:14px 16px}figcaption b{font-size:18px}figcaption .tag{float:right;font-size:12px;padding:3px 10px;border-radius:999px;background:#1c3555;color:var(--muted)}
.good,.bad{margin:8px 0 0;padding-left:20px;color:var(--muted);font-size:14px}.good li::marker{content:"✓  ";color:var(--mint)}.bad li::marker{content:"✗  ";color:#ff8a8a}
.q{margin-top:28px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px 22px}
.q h2{margin:0 0 8px;font-size:22px}.opts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
@media (max-width:860px){.opts{grid-template-columns:1fr 1fr}}
.opt{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:#0f1e31}.opt b{color:var(--mint)}.opt.rec{border-color:var(--mint);box-shadow:0 0 0 1px var(--mint) inset}
.opt small{display:block;color:var(--muted);margin-top:4px}
</style></head><body><main>
<h1>Can a picture puppet move like a drawn one? <span>— you decide</span></h1>
<p class="lead">Today a picture puppet (from Image Forge) can only talk, blink and swap a few arm pictures. Drawn characters can wave, point, jump, dance, hold things. These two tests try to give picture puppets the same moves. All three below do the exact same moves at the same moment, looping. Nothing here costs credit: it reuses ${name === "nikos" ? "Nikos's" : "the puppet's"} one full-body picture.</p>
<div class="now">Now playing: <span id="move"></span></div>
<div class="grid">
<figure><canvas class="stage"></canvas><figcaption><span class="tag">today</span><b>A · Drawn character</b>
<ul class="good"><li>Every move, clean</li><li>Any style, any colours</li></ul><ul class="bad"><li>Cartoon, not your puppet's look</li></ul></figcaption></figure>
<figure class="b"><canvas class="stage"></canvas><figcaption><span class="tag">test B</span><b>B · Puppet cut into pieces</b>
<ul class="good"><li>Looks like your real puppet</li><li>Every move in the library works</li></ul><ul class="bad"><li>Joints can show at shoulders, elbows, knees</li><li>Front-facing only for now</li></ul></figcaption></figure>
<figure><canvas class="stage"></canvas><figcaption><span class="tag">test C</span><b>C · Puppet's head, drawn body</b>
<ul class="good"><li>Real face on a body that can do anything</li><li>In the app the face would still talk and blink</li></ul><ul class="bad"><li>Two styles clash (photo head, cartoon body)</li></ul></figcaption></figure>
</div>
<section class="q"><h2>The question</h2>
<p>Which of these should I spend more work on? More work means: hiding the joints in B (soft edges, a shoulder piece), or making C's body match the head's style. Tell me in chat with one letter.</p>
<div class="opts">
<div class="opt rec"><b>B</b> — recommended<small>Your puppets keep their own look and get every move. Joints are the price; they can be softened.</small></div>
<div class="opt"><b>C</b><small>Good for cartoon-style puppets whose head already looks drawn; weaker for realistic ones.</small></div>
<div class="opt"><b>Both</b><small>B for full-body puppets, C for head-only puppets. About double the work.</small></div>
<div class="opt"><b>Neither</b><small>Picture puppets stay as they are; anyone who must move becomes a drawn character.</small></div>
</div></section>
</main>
<script>window.__REVIEW=${JSON.stringify({ image, limbs, card, look: arg("look", "sticker") })};</script>
<script type="module">${js}</script></body></html>`;
const file = path.join(root, "characters/checks", `review-${name}.html`);
fs.writeFileSync(file, html);
console.log("wrote", path.relative(root, file), (html.length / 1024).toFixed(0), "KB");
