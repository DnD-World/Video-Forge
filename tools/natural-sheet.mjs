// Build characters/samples/natural-movement.html: today | + follow-through |
// acted by you, side by side, as ONE file.   node tools/natural-sheet.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = await build({
  entryPoints: [path.join(root, "characters/samples/natural-page.mjs")],
  bundle: true, write: false, format: "iife", target: "es2022", minify: false, logLevel: "warning",
});
const js = out.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Natural Movement</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#120b0e;--panel:#1d1317;--line:#3a2329;--ink:#f5ece8;--muted:#c2aeb0;--red:#ff4d57;--gold:#ffb36b}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 80% -10%,#3a0f18 0,transparent 60%),radial-gradient(900px 500px at -10% 10%,#24101a 0,transparent 55%),var(--bg);color:var(--ink);font:15px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
main{max-width:1400px;margin:0 auto;padding:36px 16px 60px}
.kicker{color:var(--red);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
h1{font-family:Fraunces,Georgia,serif;font-weight:800;font-size:clamp(32px,5.5vw,60px);line-height:1.02;margin:10px 0}
h1 em{font-style:normal;color:var(--red);text-shadow:0 0 40px #ff4d5755}
.lede{color:var(--muted);max-width:860px;margin:0 0 18px}
.bar{position:sticky;top:0;z-index:5;background:#120b0ee8;backdrop-filter:blur(10px);border-block:1px solid var(--line);margin:0 -16px 16px;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;color:var(--muted);font-size:14px}
select,button,.filebtn{font:inherit;font-size:14px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer;transition:background .2s,transform .15s,border-color .2s,box-shadow .2s}
button:hover,.filebtn:hover,select:hover{border-color:var(--red)}button:active{transform:scale(.96)}
.now{padding:6px 14px;border-radius:999px;background:#2a1419;color:var(--gold);font-weight:700;border:1px solid var(--line)}
label.chk{display:inline-flex;gap:6px;align-items:center;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
@media (max-width:900px){.grid{grid-template-columns:1fr}}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:20px;overflow:hidden;position:relative;animation:rise .6s both}
figure:nth-child(2){animation-delay:.08s}figure:nth-child(3){animation-delay:.16s}
@keyframes rise{from{opacity:0;transform:translateY(14px)}}
figure canvas.stage{display:block;width:100%;aspect-ratio:4/5}
figcaption{padding:12px 16px 14px}figcaption b{font-size:18px;display:flex;gap:8px;align-items:center}figcaption span{color:var(--muted);font-size:14px;display:block}
.num{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#0006;border:1px solid var(--line);font-size:13px}
figure.f2{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset}figure.f2 .num{background:var(--gold);color:#1a0508;border:0}
figure.f3{border-color:var(--red);box-shadow:0 0 0 1px var(--red) inset,0 0 60px #ff4d5733}figure.f3 .num{background:var(--red);color:#1a0508;border:0}
#pip{position:absolute;right:10px;top:10px;width:30%;border-radius:12px;border:2px solid var(--red);box-shadow:0 6px 24px #0008;opacity:0;transition:opacity .4s;background:#000}
.act{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 14px}
.act .go{background:var(--red);color:#1a0508;font-weight:700;border:0;box-shadow:0 0 24px #ff4d5755}
.act .live{background:#fff;color:#c00;animation:pulse 1s infinite}
@keyframes pulse{50%{box-shadow:0 0 0 6px #ff4d5744}}
.filebtn input{display:none}
#actstatus{padding:0 16px 14px;color:var(--gold);font-size:14px;min-height:1.5em}
.notes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px;margin-top:22px}
.note{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px;color:var(--muted);font-size:14px}.note b{color:var(--ink);display:block;margin-bottom:4px;font-size:15px}
video{display:none}
</style></head><body><main>
<div class="kicker">The Red Flag Theory · movement lab</div>
<h1>More <em>natural</em> movement</h1>
<p class="lede">The same person, three ways. <b>1</b> is today. <b>2</b> adds follow-through: hair, hems and earrings are carried by the body, so they lag, swing past and settle, and long hair hangs down when the head tilts. <b>3</b> is you: act in front of the camera (or open a video of someone) and the drawn character copies the body, with the follow-through on top. A take can be saved and used in an episode.</p>
<div class="bar"><span class="now" id="now"></span>
<label title="Pick which character to watch.">Who <select id="who"></select></label>
<button id="outfit" title="Dress the character in their next outfit.">Next outfit</button>
<label title="Slow everything down to see each movement.">Speed <select id="slow"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label>
<label class="chk" title="Copy your legs too. Off: only the upper body follows you."><input type="checkbox" id="legs" checked> copy the legs</label>
<label class="chk" title="Turn the character when you turn your head."><input type="checkbox" id="turn"> turn with my head</label></div>
<div class="grid">
<figure class="f1"><canvas class="stage" id="s0"></canvas><figcaption><b><i class="num">1</i>Today</b><span>joints have weight; hair and clothes are stiff</span></figcaption></figure>
<figure class="f2"><canvas class="stage" id="s1"></canvas><figcaption><b><i class="num">2</i>+ Follow-through</b><span>hair, hems and earrings trail, swing and settle</span></figcaption></figure>
<figure class="f3"><canvas class="stage" id="s2"></canvas><canvas id="pip"></canvas><figcaption><b><i class="num">3</i>Acted by you</b><span>a body tracker copies a real person, plus follow-through</span></figcaption>
<div class="act"><button class="go" id="cam" title="Use your webcam: the character copies how you move. Nothing is uploaded.">Use my camera</button><label class="filebtn" title="Use a video file instead of the webcam: the character copies the person in it.">Open a video<input type="file" id="file" accept="video/*"></label><button id="neutral" title="Click, then stand still for a second: that pose becomes the starting point the character copies from.">Reset neutral</button><button id="rec" title="Start or stop recording your movement as a take.">● Record a take</button><button id="save" title="Save the recorded take as a file on your computer.">Save take</button><label class="filebtn" title="Open a take you saved earlier and play it on the character.">Load take<input type="file" id="load" accept=".json,application/json"></label></div>
<div id="actstatus">Nothing is sent anywhere: the tracker runs in this page.</div></figure>
</div>
<div class="notes">
<div class="note"><b>Watch in 2</b>The jump: the hair lifts on the way down and drops after landing. The facepalm: the head tips and long hair falls the other way. The walk-out: the skirt trails.</div>
<div class="note"><b>Doing 3 well</b>Stand 2–3 m back, whole body in view, plain background, good light. Stand still for a second first: that is the "neutral" the figure measures from.</div>
<div class="note"><b>What 3 copies today</b>Arms, steps, crouch and jump, head tilt and nod. Not yet: fingers, the face (mouth and eyebrows still come from the voice), turning round.</div>
</div>
<video id="video" playsinline muted></video>
</main><script>${js}</script></body></html>`;
const dest = path.join(root, "characters/samples/natural-movement.html");
fs.writeFileSync(dest, html);
console.log(`wrote ${path.relative(root, dest)} ${Math.round(html.length / 1024)} KB`);
