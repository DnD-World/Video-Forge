// Build characters/samples/redflag.html: the Red Flag Theory family in every
// look, as ONE file (script inlined), so it opens straight from disk.
//   node tools/redflag-sheet.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = await build({
  entryPoints: [path.join(root, "characters/samples/redflag-page.mjs")],
  bundle: true, write: false, format: "iife", target: "es2022", minify: false, logLevel: "warning",
});
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Red Flag Looks</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#120b0e;--panel:#1d1317;--line:#3a2329;--ink:#f5ece8;--muted:#c2aeb0;--red:#ff4d57;--red2:#b3122a}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 80% -10%,#3a0f18 0,transparent 60%),radial-gradient(900px 500px at -10% 10%,#24101a 0,transparent 55%),var(--bg);color:var(--ink);font:15px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
header{max-width:1400px;margin:0 auto;padding:40px 16px 8px;position:relative}
.kicker{display:inline-flex;align-items:center;gap:8px;color:var(--red);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
.flag{width:18px;height:22px;position:relative;display:inline-block}
.flag:before{content:"";position:absolute;left:2px;top:0;width:2px;height:22px;background:var(--ink);border-radius:1px}
.flag:after{content:"";position:absolute;left:4px;top:1px;width:13px;height:9px;background:var(--red);clip-path:polygon(0 0,100% 20%,80% 55%,100% 90%,0 100%);transform-origin:left center;animation:wave 1.6s ease-in-out infinite}
@keyframes wave{50%{transform:skewY(-8deg) scaleX(.86)}}
h1{font-family:Fraunces,Georgia,serif;font-weight:800;font-size:clamp(34px,6vw,64px);line-height:1.02;margin:10px 0 10px;letter-spacing:-.01em}
h1 em{font-style:normal;color:var(--red);text-shadow:0 0 40px #ff4d5755}
.lede{color:var(--muted);max-width:760px;margin:0 0 20px}
#cast{list-style:none;padding:0;margin:0 0 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
#cast li{display:flex;gap:12px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px;animation:rise .6s both}
#cast li:nth-child(2){animation-delay:.08s}#cast li:nth-child(3){animation-delay:.16s}#cast li:nth-child(4){animation-delay:.24s}
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
#cast i{flex:none;width:30px;height:30px;border-radius:50%;background:var(--sig);box-shadow:0 0 0 3px #0005,0 0 22px var(--sig)}
#cast b{font-size:16px}#cast span{color:var(--muted)}#cast small{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.bar{position:sticky;top:0;z-index:5;background:#120b0ee6;backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.bar>div{max-width:1400px;margin:0 auto;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.seg{display:inline-flex;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:3px}
button{font:inherit;font-size:14px;color:var(--ink);background:transparent;border:0;border-radius:999px;padding:6px 14px;cursor:pointer;transition:background .2s,color .2s,transform .15s}
button:hover{background:#ffffff14}button:active{transform:scale(.96)}
button[aria-pressed=true]{background:var(--red);color:#1a0508;font-weight:700}
.solo{background:var(--panel);border:1px solid var(--line)}
#picks{display:flex;gap:6px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:14px}
#picks a{color:var(--ink);text-decoration:none;background:#ff4d5722;border:1px solid #ff4d5766;border-radius:999px;padding:3px 10px}
#picks:before{content:"Your picks:";font-weight:700;color:var(--ink);margin-right:2px}
main{max-width:1400px;margin:0 auto;padding:8px 16px 60px}
.group{margin-top:30px}
h2{font-family:Fraunces,Georgia,serif;font-size:26px;margin:0 0 12px}h2 small{font-family:Sora,sans-serif;font-size:14px;color:var(--muted);font-weight:400;margin-left:8px}
summary{cursor:pointer;list-style:none}summary h2:after{content:" ▾";color:var(--red)}
.rows{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,620px),1fr));gap:16px}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:transform .3s,box-shadow .3s,border-color .3s}
figure:hover{transform:translateY(-3px);box-shadow:0 18px 50px #0008}
figure.picked{border-color:var(--red);box-shadow:0 0 0 1px var(--red),0 0 40px #ff4d5733}
.stage{position:relative}
canvas{display:block;width:100%}
body.phone .stage{width:360px;max-width:100%;margin:14px auto 0;border-radius:10px;overflow:hidden;outline:8px solid #000;outline-offset:0}
.who{position:absolute;left:0;right:0;bottom:8px;display:grid;grid-template-columns:repeat(4,1fr);pointer-events:none}
.who span{justify-self:center;font-size:13px;font-weight:700;color:#fff;background:#0009;border-radius:999px;padding:2px 10px;border:2px solid transparent;transition:border-color .25s,box-shadow .25s}
body[data-framing=waist] .who,body[data-framing=head] .who{top:8px;bottom:auto}
.who span.on{border-color:var(--sig);box-shadow:0 0 16px var(--sig)}
body.phone .who span{font-size:11px;padding:1px 6px}
figcaption{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 16px}
figcaption b{display:block;font-size:16px}figcaption small{color:var(--muted);font-size:13px}
.star{flex:none;background:#ffffff0d;border:1px solid var(--line)}
.dayhead{margin:56px 0 0;padding:28px 0 0;border-top:1px solid var(--line)}
.dayhead .big{font-size:clamp(30px,4.5vw,46px);margin:0}.dayhead p{color:var(--muted);margin:6px 0 0}
.group.day h2{font-size:22px}
.group.day .rows{grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}
.group.day figcaption small{display:none}
.hairbox{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:16px;margin:0 0 22px}
.hairbox h2{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.hairbox h2 .seg{margin-left:auto}
#hairnow{color:var(--red)}
#hairgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
.hair{padding:0;border-radius:14px;overflow:hidden;background:#0003;border:2px solid var(--line);display:flex;flex-direction:column}
.hair span{padding:5px 0 6px;font-size:13px;font-weight:600}
.hair[aria-pressed=true]{background:#0003;color:var(--ink);border-color:var(--red);box-shadow:0 0 22px #ff4d5755}
.hair:hover{border-color:#ff4d5799;transform:translateY(-2px)}
footer{max-width:1400px;margin:0 auto;padding:0 16px 40px;color:var(--muted);font-size:13px}
@media (max-width:600px){header{padding-top:24px}.bar>div{gap:8px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body>
<header>
<div class="kicker"><span class="flag"></span> The Red Flag Theory</div>
<h1>One family, <em>every look</em>.</h1>
<p class="lede">Jake, Rita, Lucas and Amber, drawn live by Video Forge's own engine from one card each. Same cards in every row: only the look changes. They take turns talking so you can judge the lip-sync too. Press <b>☆ Pick</b> on the ones you like.</p>
<ul id="cast"></ul>
<section class="hairbox">
<h2>Hair library <small>Every style the engine has (18; messy, shaggy and undercut are new). Click one to try it on Lucas in every row below. Now: <b id="hairnow"></b></small>
<span class="seg" role="group" aria-label="Hair look"><button data-hairlook="paper" aria-pressed="true" title="Hair drawn as flat cut paper shapes.">Paper</button><button data-hairlook="sitcom" aria-pressed="false" title="Hair drawn like a TV cartoon: smooth, with a shine.">Sitcom</button></span></h2>
<div id="hairgrid"></div>
</section>
</header>
<div class="bar"><div>
<div class="seg" role="group" aria-label="Framing"><button data-framing="full" aria-pressed="true" title="Show the whole body, head to feet.">Full body</button><button data-framing="waist" aria-pressed="false" title="Show from the waist up, like a talking scene.">Waist up</button><button data-framing="head" aria-pressed="false" title="Show head and shoulders only, like a close-up.">Head</button></div>
<button id="facing" class="solo" aria-pressed="false" title="Turn the characters towards each other, as in a conversation.">Face each other</button>
<button id="phone" class="solo" aria-pressed="false" title="Show the pictures at phone size, to check they still read small.">Phone size</button>
<button id="play" class="solo" title="Pause or play every picture on the page.">❚❚ Pause</button>
<div id="picks"></div>
</div></div>
<main id="main"></main>
<footer>Plain room behind them on purpose: the real rooms (Omni loops + furniture drawn in front) come next. "Phone size" shows the video as wide as a phone held upright.</footer>
<script>${js}</script></body></html>`;
const file = path.join(root, "characters/samples/redflag.html");
fs.writeFileSync(file, html);
console.log("wrote", path.relative(root, file), (html.length / 1024).toFixed(0), "KB");
