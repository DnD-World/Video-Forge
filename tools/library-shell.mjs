// The motion-library page's HTML around its script (tools/acted-pages.mjs fills %JS%).
export const head = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Motion Library</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#120b0e;--panel:#1d1317;--line:#3a2329;--ink:#f5ece8;--muted:#c2aeb0;--red:#ff4d57;--gold:#ffb36b;--mint:#7be0a5}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 80% -10%,#3a0f18 0,transparent 60%),radial-gradient(900px 500px at -10% 10%,#24101a 0,transparent 55%),var(--bg);color:var(--ink);font:15px/1.55 Sora,system-ui,sans-serif;min-height:100vh}
main{max-width:1400px;margin:0 auto;padding:36px 16px 60px}
.kicker{color:var(--red);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:13px}
h1{font-family:Fraunces,Georgia,serif;font-weight:800;font-size:clamp(32px,5.5vw,60px);line-height:1.02;margin:10px 0}
h1 em{font-style:normal;color:var(--red);text-shadow:0 0 40px #ff4d5755}
.lede{color:var(--muted);max-width:860px;margin:0 0 18px}
.bar{position:sticky;top:0;z-index:5;background:#120b0ee8;backdrop-filter:blur(10px);border-block:1px solid var(--line);margin:0 -16px 16px;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;color:var(--muted);font-size:14px}
#progress b{color:var(--ink)}
select,button{font:inherit;font-size:14px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer;transition:background .2s,transform .15s,border-color .2s,box-shadow .2s}
button:hover,select:hover{border-color:var(--red)}button:active{transform:scale(.96)}
.copy{background:var(--red);color:#1a0508;font-weight:700;border:0;box-shadow:0 0 24px #ff4d5755;margin-left:auto}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px}
.mv{background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:border-color .3s,box-shadow .3s,opacity .3s;animation:rise .5s both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}}
.mv.keep{border-color:var(--mint);box-shadow:0 0 0 1px var(--mint) inset,0 0 40px #7be0a533}
.mv.drop{opacity:.45}
.pair{display:grid;grid-template-columns:3fr 2fr;background:#000;aspect-ratio:5/4}
.pair canvas{display:block;width:100%;height:100%;min-height:0}
.pair canvas.src{background:#0b0709}
.tag{font-size:12px;font-weight:700;border-radius:999px;padding:1px 8px;background:#2a1419;color:var(--gold)}.tag.quaternius{color:var(--mint)}
.mv header{display:flex;justify-content:space-between;gap:8px;padding:10px 14px 0;align-items:baseline}.mv header b{font-size:16px}.mv header span{color:var(--muted);font-size:13px}
.mv p{margin:2px 14px 0;color:var(--muted);font-size:13px}.mv a{color:var(--gold)}
.btns{display:flex;gap:8px;padding:10px 14px 14px}
.btns button{flex:1}
.mv.keep button[data-v=keep]{background:var(--mint);color:#082014;font-weight:700;border-color:var(--mint)}
.mv.drop button[data-v=drop]{background:#3a2329;font-weight:700}
#copied{position:fixed;inset:0;z-index:20;background:#000a;display:grid;place-items:center;padding:16px}
#copied[hidden]{display:none}
#copied>div{background:var(--panel);border:1px solid var(--red);border-radius:18px;padding:18px;width:min(560px,100%);display:grid;gap:10px}
#copied textarea{width:100%;height:140px;background:#0006;color:var(--ink);border:1px solid var(--line);border-radius:10px;font:13px/1.4 ui-monospace,monospace;padding:8px}
</style></head><body>`;
export const body = `<main>
<div class="kicker">The Red Flag Theory · motion library v2</div>
<h1>Real <em>motion capture</em>, on our people</h1>
<p class="lede"><span id="count"></span> moves from ready-made motion libraries: CMU Graphics Lab motion capture (free for all uses) and Quaternius (CC0, public domain). Left: a Red Flag character doing the move. Right: the captured person, as a stick figure. A person who sits in the capture sits on a chair here. Keep the ones that feel natural, drop the rest. Your picks stay in this browser; press "Copy my picks" and paste the line in chat.</p>
<div class="bar"><span id="progress"></span><label>Who <select id="who"></select></label><button id="copy" class="copy">Copy my picks</button></div>
<div id="copied" hidden><div><b>Copied. Paste this in chat:</b><textarea id="copiedtext" readonly></textarea><button id="copiedclose" class="copy" style="margin:0">Close</button></div></div>
<section id="grid"></section>
</main><script>%JS%</script></body></html>`;
