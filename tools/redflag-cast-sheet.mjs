// Build characters/samples/redflag-cast.html: the Red Flag Theory Season 1 cast
// picker (face and clothes chosen separately), as ONE file (script inlined).
//   node tools/redflag-cast-sheet.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = await build({
  entryPoints: [path.join(root, "characters/samples/cast-page.mjs")],
  bundle: true, write: false, format: "iife", target: "es2022", minify: false, logLevel: "warning",
});
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Red Flag Cast</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#120b0e;--panel:#1d1317;--panel2:#24181d;--line:#3a2329;--ink:#f5ece8;--muted:#c2aeb0;--red:#ff4d57}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 80% -10%,#3a0f18 0,transparent 60%),radial-gradient(900px 500px at -10% 10%,#24101a 0,transparent 55%),var(--bg);color:var(--ink);font:15px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
.top{max-width:1400px;margin:0 auto;padding:40px 16px 10px}
.kicker{color:var(--red);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
h1{font-family:Fraunces,Georgia,serif;font-weight:800;font-size:clamp(34px,6vw,64px);line-height:1.02;margin:10px 0}
h1 em{font-style:normal;color:var(--red);text-shadow:0 0 40px #ff4d5755}
.lede{color:var(--muted);max-width:820px;margin:0 0 6px}
.bar{position:sticky;top:0;z-index:5;background:#120b0ee8;backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.bar>div{max-width:1400px;margin:0 auto;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.seg{display:inline-flex;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:3px}
button{font:inherit;font-size:14px;color:var(--ink);background:transparent;border:0;border-radius:999px;padding:6px 14px;cursor:pointer;transition:background .2s,color .2s,transform .15s,border-color .2s,box-shadow .2s}
button:hover{background:#ffffff14}button:active{transform:scale(.96)}
.seg button[aria-pressed=true]{background:var(--red);color:#1a0508;font-weight:700}
.seg button em{font-style:normal;font-size:13px;opacity:.8}
#progress{margin-left:auto;display:flex;align-items:center;gap:8px;color:var(--muted);font-size:14px}
#progress b{color:var(--ink)}
#progress i{display:block;width:120px;height:8px;border-radius:9px;background:#ffffff14;position:relative;overflow:hidden}
#progress i:after{content:"";position:absolute;inset:0;width:calc(var(--k)*100%);background:linear-gradient(90deg,var(--red),#ffb36b);border-radius:9px;transition:width .4s}
main{max-width:1400px;margin:0 auto;padding:8px 16px 60px}
h2{font-family:Fraunces,Georgia,serif;font-size:clamp(26px,3.6vw,38px);margin:44px 0 6px}h2 small{display:block;font-family:Sora,sans-serif;font-size:14px;color:var(--muted);font-weight:400;margin-top:2px}
#geo{background:linear-gradient(135deg,#2a1830,#1d1317);border:1px solid var(--line);border-radius:20px;padding:18px;margin-top:22px}
#geo h2{margin:0 0 4px}#geonow{color:var(--red)}
#geogrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:12px;margin-top:12px}
.geoopt{padding:0;border-radius:16px;overflow:hidden;background:var(--panel);border:2px solid var(--line);text-align:left;display:flex;flex-direction:column}
.geoopt canvas{display:block;width:100%}
.geoopt span{padding:10px 14px}.geoopt b{display:block;font-size:16px}.geoopt small{color:var(--muted);font-size:13px}
.geoopt[aria-pressed=true]{border-color:var(--red);box-shadow:0 0 0 1px var(--red),0 0 40px #ff4d5744}
.person{background:var(--panel);border:1px solid var(--line);border-radius:20px;margin:16px 0;overflow:hidden;transition:border-color .3s,box-shadow .3s;animation:rise .5s both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}}
.person.ready{border-color:var(--sig);box-shadow:0 0 0 1px var(--sig),0 0 50px color-mix(in srgb,var(--sig) 30%,transparent)}
.person>header{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line);background:linear-gradient(90deg,color-mix(in srgb,var(--sig) 22%,transparent),transparent 60%)}
.sw{flex:none;width:34px;height:34px;border-radius:50%;background:var(--sig);box-shadow:0 0 0 3px #0005,0 0 24px var(--sig)}
h3{margin:0;font-size:19px}.person header p{margin:0;color:var(--muted);font-size:14px}
dl{display:grid;grid-template-columns:auto auto;gap:0 8px;margin:0 0 0 auto;font-size:13px}dt{color:var(--muted)}dd{margin:0}dd em{color:#ffb36b;font-style:normal}
.need.met{color:#8be08b}.need.met:after{content:" ✓"}
.count{font-size:13px;font-weight:700;background:#0004;border:1px solid var(--line);border-radius:999px;padding:3px 12px}
.ready .count{border-color:var(--sig)}
.body{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:16px;padding:16px 18px}
@media (max-width:760px){.body{grid-template-columns:1fr}.pv{max-width:300px;margin:0 auto;width:100%}dl{margin-left:0}}
.pv{position:relative;border-radius:16px;overflow:hidden;align-self:start;position:sticky;top:70px}
.pv canvas{display:block;width:100%}
.pvlabel{position:absolute;left:10px;bottom:10px;background:#000a;color:#fff;font-size:13px;font-weight:700;border-radius:999px;padding:2px 10px;border:2px solid var(--sig)}
h4{margin:2px 0 8px;font-size:15px}h4 small{color:var(--muted);font-weight:400;font-size:13px;margin-left:6px}
.faces{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px;margin-bottom:16px}
.outfits{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
.tile{position:relative;padding:0;border-radius:14px;overflow:hidden;background:#0003;border:2px solid var(--line);display:flex;flex-direction:column}
.tile canvas{display:block;width:100%}
.tile span{padding:5px 6px 7px;font-size:13px;font-weight:600;line-height:1.3}
.tile:hover{border-color:color-mix(in srgb,var(--sig) 70%,#fff);transform:translateY(-2px)}
.tile[aria-pressed=true]{background:#0003;border-color:var(--sig);box-shadow:0 0 22px color-mix(in srgb,var(--sig) 55%,transparent)}
.tick{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:var(--sig);color:#fff;font-style:normal;font-weight:800;display:grid;place-items:center;transform:scale(0);transition:transform .25s cubic-bezier(.3,1.6,.5,1);text-shadow:0 1px 2px #0008}
.tile[aria-pressed=true] .tick{transform:scale(1)}
.person>footer{padding:0 18px 14px;color:var(--muted);font-size:13px}
.copy{background:var(--red);color:#1a0508;font-weight:700;box-shadow:0 0 24px #ff4d5755}
.copy:hover{background:#ff6a72}
#copied{position:fixed;inset:0;z-index:20;background:#000a;display:grid;place-items:center;padding:16px}
#copied[hidden]{display:none}
#copied>div{background:var(--panel);border:1px solid var(--red);border-radius:18px;padding:18px;width:min(560px,100%);display:grid;gap:10px}
#copied p{margin:0;font-weight:700}
#copied textarea{width:100%;height:140px;background:#0006;color:var(--ink);border:1px solid var(--line);border-radius:10px;font:13px/1.4 ui-monospace,monospace;padding:8px}
.foot{max-width:1400px;margin:0 auto;padding:0 16px 40px;color:var(--muted);font-size:13px}
</style></head><body>
<div class="top">
  <div class="kicker">The Red Flag Theory · Season 1 cast</div>
  <h1>Pick each person's <em>face</em> and <em>clothes</em></h1>
  <p class="lede">All 40 people from the roster, each drawn in their own show's look. Choose one face and the outfits to keep (every outfit keeps the person's signature colour). Hover an outfit to try it on in the big picture. Your picks stay in this browser.</p>
</div>
<div class="bar"><div>
  <div class="seg" id="tabs"></div>
  <div class="seg"><button data-framing="full" aria-pressed="true" title="Show the whole body, head to feet.">Full body</button><button data-framing="waist" aria-pressed="false" title="Show from the waist up, like a talking scene.">Waist up</button></div>
  <div id="progress"></div>
  <button id="copy" class="copy" title="Copy your picks as text, to paste back to Claude.">Copy my picks</button>
</div></div>
<div id="copied" hidden><div><p id="copiedmsg"></p><textarea id="copiedtext" readonly></textarea><button id="copiedclose" class="copy" title="Close this box.">Close</button></div></div>
<main id="main">
  <section id="geo"><h2>Decide: geo-minimal eyes <small>Monday to Wednesday. Your choice: <span id="geonow"></span>. Click one; every geo-minimal person below updates.</small></h2><div id="geogrid"></div></section>
</main>
<p class="foot">Built from brands/redflag/cast.json (roster 1–40). New people's signature colours are proposals.</p>
<script>${js}</script>
</body></html>`;
const dest = path.join(root, "characters/samples/redflag-cast.html");
fs.writeFileSync(dest, html);
console.log(`wrote ${path.relative(root, dest)} ${Math.round(html.length / 1024)} KB`);
