// Build characters/samples/lab2d.html: the 2D Lab, seven side-by-side tests
// of the Season 1 movement and texture plan, as ONE file.   node tools/lab2d-sheet.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = await build({
  entryPoints: [path.join(root, "characters/samples/lab2d-page.mjs")],
  bundle: true, write: false, format: "iife", target: "es2022", minify: false, logLevel: "warning",
});
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");

const pair = (n, a, b, aSub, bSub, extra = "") => `<div class="duo">
<figure class="today"><canvas class="stage sq" id="c${n}a"></canvas><figcaption><b>Today</b><span>${aSub}</span></figcaption></figure>
<figure class="lab"><canvas class="stage sq" id="c${n}b"></canvas><figcaption><b>Lab</b><span>${bSub}</span>${extra}</figcaption></figure></div>`;

const section = (n, title, watch, body) => `<section id="s${n}"><div class="head"><span class="n">${n}</span><div><h2>${title}</h2><p class="watch">${watch}</p></div></div>${body}</section>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>2D Lab</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800;9..144,900&family=Sora:wght@400;600;700&family=Bangers&family=Permanent+Marker&display=swap" rel="stylesheet">
<style>
:root{--bg:#120b0e;--panel:#1d1317;--line:#3a2329;--ink:#f5ece8;--muted:#c9b6b8;--red:#ff4d57;--gold:#ffb36b;--mint:#7be0a5}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:radial-gradient(1200px 700px at 85% -10%,#4a0f1d 0,transparent 60%),radial-gradient(900px 600px at -10% 20%,#2a101c 0,transparent 55%),var(--bg);color:var(--ink);font:15px/1.6 Sora,system-ui,sans-serif;min-height:100vh;overflow-x:hidden}
body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 20% 30%,#ff4d5714 0,transparent 25%),radial-gradient(circle at 80% 70%,#ffb36b10 0,transparent 25%);animation:drift 18s ease-in-out infinite alternate}
@keyframes drift{to{transform:translate(-3%,2%) scale(1.05)}}
main{max-width:1320px;margin:0 auto;padding:40px 16px 80px;position:relative}
.kicker{color:var(--red);font-weight:700;letter-spacing:.16em;text-transform:uppercase;font-size:13px}
h1{font-family:Fraunces,Georgia,serif;font-weight:900;font-size:clamp(40px,7vw,84px);line-height:.98;margin:10px 0 14px;letter-spacing:-.01em}
h1 em{font-style:normal;background:linear-gradient(90deg,var(--red),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 30px #ff4d5755)}
.lede{color:var(--muted);max-width:820px;margin:0 0 22px;font-size:16px}
nav.toc{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
nav.toc a{color:var(--ink);text-decoration:none;font-size:13px;border:1px solid var(--line);border-radius:999px;padding:6px 12px;background:#1d131799;transition:border-color .2s,transform .15s}
nav.toc a:hover{border-color:var(--gold);transform:translateY(-2px)}
.bar{position:sticky;top:0;z-index:9;background:#120b0ee6;backdrop-filter:blur(12px);border-block:1px solid var(--line);margin:0 -16px 10px;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;color:var(--muted);font-size:14px}
select,button{font:inherit;font-size:14px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer;transition:background .2s,transform .15s,border-color .2s,box-shadow .2s}
button:hover,select:hover{border-color:var(--red)}button:active{transform:scale(.95)}
#play{background:var(--red);color:#1a0508;font-weight:700;border:0;box-shadow:0 0 24px #ff4d5755}
#beat.on{background:var(--gold);color:#1a0508;border:0;box-shadow:0 0 22px #ffb36b88}
label.chk{display:inline-flex;gap:6px;align-items:center;cursor:pointer}
section{margin-top:44px;scroll-margin-top:70px;animation:rise .7s both}
@keyframes rise{from{opacity:0;transform:translateY(18px)}}
.head{display:flex;gap:14px;align-items:flex-start;margin-bottom:12px}
.head .n{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,var(--red),var(--gold));color:#1a0508;font:900 22px Fraunces,serif;box-shadow:0 8px 30px #ff4d5744}
h2{font-family:Fraunces,Georgia,serif;font-size:clamp(24px,3vw,32px);margin:0;line-height:1.1}
.watch{color:var(--muted);margin:4px 0 0;max-width:900px}
.watch b{color:var(--gold);font-weight:600}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.chip{border-radius:999px}.chip.on{background:var(--ink);color:#1a0508;border-color:var(--ink);font-weight:700}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:820px){.duo{grid-template-columns:1fr}}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:22px;overflow:hidden;position:relative;transition:transform .3s,box-shadow .3s}
figure:hover{transform:translateY(-3px);box-shadow:0 18px 50px #0008}
figure.lab{border-color:#ffb36b88;box-shadow:0 0 0 1px #ffb36b55 inset,0 0 60px #ffb36b18}
figure.today{opacity:.96}
canvas.stage{display:block;width:100%}
canvas.sq{aspect-ratio:1/1}canvas.wide{aspect-ratio:16/9}canvas.tall{aspect-ratio:3/4}
figcaption{padding:10px 16px 14px;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
figcaption b{font-size:17px}figcaption span{color:var(--muted);font-size:14px}
figure.lab figcaption b{color:var(--gold)}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.three.four4{grid-template-columns:repeat(4,1fr)}.three.four{grid-template-columns:repeat(2,1fr);margin-bottom:12px}@media (max-width:820px){.three,.three.four,.three.four4{grid-template-columns:1fr 1fr}}
.five{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
@media (max-width:1000px){.five{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.five{grid-template-columns:1fr}}
.five figcaption b{font-size:14px}
.notes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px;margin-top:12px}
.note{background:#1d1317cc;border:1px solid var(--line);border-radius:16px;padding:12px 14px;color:var(--muted);font-size:14px}.note b{color:var(--ink);display:block;margin-bottom:2px}
.meter{margin-top:12px;background:#1d1317cc;border:1px solid var(--line);border-radius:16px;padding:12px 16px;color:var(--muted);font-size:14px}.meter b{color:var(--ink)}
.bars{display:grid;grid-template-columns:auto 1fr auto;gap:6px 12px;align-items:center;margin-top:8px}
.bars i{display:block;height:14px;border-radius:99px;background:#6b5560;width:var(--w);animation:grow 1.2s cubic-bezier(.2,.9,.2,1) both}.bars i.lab{background:linear-gradient(90deg,var(--red),var(--gold))}
@keyframes grow{from{width:0}}.bars em{font-style:normal;color:var(--ink);font-weight:700}
.foot{margin-top:56px;color:var(--muted);font-size:14px;border-top:1px solid var(--line);padding-top:18px}
</style></head><body><main>
<div class="kicker">The Red Flag Theory · Season 1 · 2D lab</div>
<h1>Same drawings. <em>New life.</em></h1>
<p class="lede">Seven tests of the Season 1 plan. On the left, the engine as it is today; on the right, the lab's new layers on the same cast. Everything runs live in this page at the video's own 30 frames a second. Scroll; each test plays when it comes into view.</p>
<nav class="toc"><a href="#s1">1 · Smooth</a><a href="#s2">2 · Knees and feet</a><a href="#s2b">2b · Side faces</a><a href="#s3">3 · Variety</a><a href="#s4">4 · Two people</a><a href="#s5">5 · Wind</a><a href="#s6">6 · Hint of 3D</a><a href="#s7">7 · Red Flag moment</a></nav>
<div class="bar">
<button id="play" title="Pause or play every picture on the page.">❚❚ Pause</button>
<label title="Slow everything down to see each movement.">Speed <select id="speed"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label>
<label title="Pictures per second. 30 is what a video has; 12 looks like hand-drawn cartoons.">Frames <select id="fps"><option value="30">30 a second (video)</option><option value="60">60 a second</option><option value="12">12 (on twos)</option></select></label>
<label class="chk" title="Smear fast movement a little, like a real camera does."><input type="checkbox" id="blur"> motion blur</label>
<label title="Draw everyone in their own style, or all in one style to compare.">Look <select id="look"><option value="own">each person's own</option><option value="geo">all Geo-minimal</option><option value="paper">all Paper cut-out</option><option value="hose2">all Rubber hose</option></select></label>
<button id="restart" title="Start every move again from the beginning, all in step.">↺ From the start</button>
<button id="beat" title="Play a drum beat the dancer moves to (sound on).">♪ Beat</button>
</div>
${section(1, "Smooth, not choppy", "One wave, both sides. Lab: <b>the hips move first and the hand arrives last</b>, the hand swings on an arc, overshoots a little and settles, and the body never freezes. The orange line is where the hand has been in the last second and a half.",
  `<div class="row"><label class="chk" title="Draw the line the hand travels along, to see if it moves in a smooth arc."><input type="checkbox" id="t1path" checked> show the hand's path</label></div>` + pair(1, "", "", "springs on joint angles", "key poses + overlap + arcs + overshoot") + `<div class="meter" id="m1">Measuring…</div>`)}
${section(2, "Knees and feet", "Sitting down and getting up. Lab: <b>feet stay planted</b>, knees bend only the way knees bend, the hips go back while the chest leans forward to balance, and she pushes on her knees to stand.",
  `<div class="row"><label class="chk" title="Draw the skeleton over the lab character, to see how the joints bend."><input type="checkbox" id="t2bones" checked> show the bones (lab)</label></div>` + pair(2, "", "", "hips drop; legs swap to a seated shape", "IK legs, planted feet, balance, a lean to rise"))}
${section("2b", "Side-on faces", "The body turns slowly from the front to full profile and back. Left: <b>the face turns all the way with it</b> (today: a sliver eye, a front-on mouth, a nose bump). Right: <b>the face stops at three-quarter</b> while the body keeps turning: the cartoon way.",
  `<div class="row" id="k2b"></div><div class="duo">
<figure class="today"><canvas class="stage sq" id="c2ba"></canvas><figcaption><b>Face turns with the body</b><span>as today</span></figcaption></figure>
<figure class="lab"><canvas class="stage sq" id="c2bb"></canvas><figcaption><b>Face held at three-quarter</b><span>body to full profile</span></figcaption></figure></div>`)}
${section(3, "Variety", "Moves made from rules, not drawn frame by frame: <b>a jump from real gravity</b> (crouch, stretch, flight, squash, dust), a kick with a smear, a dance built from the beat (switch on ♪ Beat), and a cartoon faint that falls like a plank.",
  `<div class="row" id="k3"></div>` + pair(3, "", "", "the nearest move today", "generators + body solver + physics"))}
${section(4, "Two people", "Hands lock onto the other person: <b>hands meet and pump together</b>, arms wrap round a back (the near arm in front, the far arm behind), a hand pats a head and the little one's hair answers it, a ball flies on a real arc and is caught.",
  `<div class="row" id="k4"></div><figure class="lab"><canvas class="stage wide" id="c4"></canvas><figcaption><b>Lab</b><span>Today the engine can't touch a second person at all.</span></figcaption></figure>`)}
${section(5, "Gravity and wind", "Hair and the hem are chains with weight: they swing, trail and settle; <b>the wind pushes them and the leaves alike</b>. The green line is the modesty check: a hem may rise at most 1% of her height, and the number shows the worst so far.",
  `<div class="row" id="k5"></div><div class="row"><label class="chk" title="Show how high the hem rises, against the 1% limit (green: within it, red: over)."><input type="checkbox" id="t5mod" checked> show the modesty check</label></div>` + pair(5, "", "", "follow-through only, no wind", "physics hair and hem, a wind field, leaves"))}
${section(6, "A hint of 3D", "The same drawing and the same movement at three strengths. Each part is shaded as what it really is: <b>soft round arms and legs, a lit side and a shadow side on the head and body</b>, a soft shadow from each part on what is behind it, a faint rim of light on the far edges, a shine on the hair. Small parts like pockets are left almost flat.",
  `<div class="row" id="k6"></div><div class="three four4">
<figure class="today"><canvas class="stage tall" id="c6a"></canvas><figcaption><b>A hint of 3D</b><span>before</span></figcaption></figure>
<figure class="lab"><canvas class="stage tall" id="c6b"></canvas><figcaption><b>Hint + stronger clay</b><span>last round</span></figcaption></figure>
<figure class="lab"><canvas class="stage tall" id="c6c"></canvas><figcaption><b>Full 3D + clay, softer limbs</b><span>the new Red Flag look</span></figcaption></figure>
<figure class="lab"><canvas class="stage tall" id="c6d"></canvas><figcaption><b>Full 3D</b><span>no clay, limbs full</span></figcaption></figure></div>
<figure class="lab" style="margin-top:12px"><canvas class="stage wide" id="c6t"></canvas><figcaption><b>Slow turn</b><span>the new Red Flag look from every side: front, three-quarter, profile and round again</span></figcaption></figure>`)}
${section(7, "The Red Flag moment", "Two strengths of the same beat. <b>Subtle</b> for the Sunday show: a slow push-in on her face, a small flag pops up over her head on its exclamation-mark mast, a faint red breath at the edges, a slow pan to him. <b>Loud</b> for clips on the discussion days: the reaction zoom with a shake, the frozen red-and-black frame, the inked figure, a whip pan.",
  `<div class="row" id="k7"></div><figure class="lab"><canvas class="stage wide" id="c7"></canvas><figcaption><b>Lab</b><span>camera, parallax, cloth flag on an exclamation mark, emotion effect</span></figcaption></figure>`)}
${section(8, "Subtitles", "Four ways to subtitle the same exchange, over the talking shots. <b>Classic</b>: the whole line, calm. <b>Karaoke</b>: each word lights up as it is said, in the speaker's colour. <b>Kinetic</b>: two or three words at a time, big, the key words in red. <b>Drama</b>: the speaker's name and colour on their side of the frame, and an inner thought shown softer, in italics, tagged THINKS. Below: four transitions that mean something, in turn: <b>the red flag</b> sweeps across, <b>a match cut through the eyes</b>, <b>the frame shatters</b>, <b>a film burn into a memory</b> (a flashback).",
  `<div class="three four">
<figure class="lab"><canvas class="stage wide" id="c8a"></canvas><figcaption><b>Classic</b><span>calm, readable, for everything</span></figcaption></figure>
<figure class="lab"><canvas class="stage wide" id="c8b"></canvas><figcaption><b>Karaoke</b><span>word by word, speaker colour</span></figcaption></figure>
<figure class="lab"><canvas class="stage wide" id="c8c"></canvas><figcaption><b>Kinetic</b><span>a flip box rolling on its long axis</span></figcaption></figure>
<figure class="lab"><canvas class="stage wide" id="c8d"></canvas><figcaption><b>Drama</b><span>who speaks, and what they think</span></figcaption></figure></div>
<figure class="lab"><canvas class="stage wide" id="c8t"></canvas><figcaption><b>Transitions</b><span>red flag sweep · eye match cut · shatter · film burn into a memory</span></figcaption></figure>`)}
<div class="notes">
<div class="note"><b>Not built yet</b>Mouth shapes from the voice and beat gestures from the words, a pose library beyond these moves, lip sync in the wow reel.</div>
<div class="note"><b>Faces</b>Blinks every few seconds, eyes that dart instead of glide, lids that close on a hug or a pat.</div>
<div class="note"><b>Modesty</b>No chest movement exists anywhere. Hems are capped. The kick is done by someone in trousers.</div>
</div>
<p class="foot">Plan: docs/research/2d-motion-plan-2026-11.md · Code: characters/lab/ · Rebuild: node tools/lab2d-sheet.mjs</p>
</main><script>${js}</script></body></html>`;
const dest = path.join(root, "characters/samples/lab2d.html");
fs.writeFileSync(dest, html);
console.log(`wrote ${path.relative(root, dest)} ${Math.round(html.length / 1024)} KB`);
