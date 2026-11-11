"""Review page for Ak: brands/scotus/review/index.html (open it in a browser).
python tools/review_page.py"""
import os, shutil, base64, cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "..", "review"); os.makedirs(OUT, exist_ok=True)
NAMES = ["roberts", "thomas", "alito", "sotomayor", "kagan", "gorsuch", "kavanaugh", "barrett", "jackson"]  # by seniority
TITLE = {"roberts": "Chief Justice Roberts"}
# the approved file predates embed mode: add the same few display lines to the copy (the rig itself is untouched)
a = open(os.path.join(ROOT, "work", "sotomayor_rig_APPROVED.html"), encoding="utf8").read()
a = a.replace("</style>", "body.embed #panel{display:none}body.embed #wrap{padding:0}body.embed #stage{height:100vh;width:auto}body.embed{margin:0;overflow:hidden}</style>", 1)
a = a.replace("</script></body>", "if(still.get('embed')){document.body.classList.add('embed');if(still.get('mode'))setMode(still.get('mode'))}</script></body>", 1)
assert "body.embed{" in a and "still.get('embed')" in a
open(os.path.join(OUT, "sotomayor_A_approved.html"), "w", encoding="utf8").write(a)
for n in NAMES:
    shutil.copy(os.path.join(ROOT, "build", f"{n}_rig.html"), os.path.join(OUT, f"{n}.html"))

def thumb(path, w=420):
    im = cv2.imread(path); h = int(im.shape[0] * w / im.shape[1])
    ok, b = cv2.imencode(".jpg", cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 86])
    return "data:image/jpeg;base64," + base64.b64encode(b).decode()

P = os.path.join(ROOT, "..", "portraits")
glasses = "".join(f"""
<figure class="pair"><div class="two"><img src="{thumb(os.path.join(P, 'original', n + '.jpg'))}" alt="{n} as drawn">
<img src="{thumb(os.path.join(P, n + '.png'))}" alt="{n} without glasses"></div>
<figcaption><b>{n.capitalize()}</b> — left: your Flow portrait · right: glasses removed (Nano Banana 2)</figcaption></figure>"""
    for n in ("jackson", "kagan", "thomas"))
grid = "".join(f"""
<figure class="card"><div class="frame"><iframe loading="lazy" data-src="{n}.html" title="{n} rig"></iframe>
<img class="orig" src="{thumb(os.path.join(P, n + '.png'), 300)}" alt="original"></div>
<figcaption>{TITLE.get(n, 'Justice ' + n.capitalize())}</figcaption></figure>""" for n in NAMES)

html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SCOTUS Rigs Review</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{{--navy:#1c2a3f;--navy2:#24344d;--cream:#efe2c7;--gold:#c9a96a;--ink:#f6efe2;--mut:#b9b0a0}}
*{{box-sizing:border-box}}body{{margin:0;background:radial-gradient(circle at 30% 0,#2a3b57,var(--navy) 60%);color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif}}
header{{padding:40px 24px 16px;text-align:center;border-bottom:1px solid #c9a96a55}}
h1{{font:800 clamp(28px,5vw,52px)/1.05 'Playfair Display',serif;margin:0;color:var(--cream);letter-spacing:.02em}}
h1 small{{display:block;font:600 13px Inter;letter-spacing:.3em;color:var(--gold);margin-top:10px}}
h2{{font:600 26px 'Playfair Display',serif;color:var(--cream);margin:0 0 6px}}
section{{max-width:1240px;margin:0 auto;padding:36px 16px}}
.ask{{background:#c9a96a1f;border:1px solid #c9a96a66;border-radius:10px;padding:10px 14px;color:var(--cream);display:inline-block;margin:6px 0 18px}}
.pairs{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}}
.two{{display:grid;grid-template-columns:1fr 1fr;gap:6px}}.two img{{width:100%;border-radius:6px;display:block}}
figure{{margin:0}}figcaption{{color:var(--mut);font-size:13px;padding:8px 2px}}figcaption b{{color:var(--cream)}}
.ab{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}
.ab .frame{{aspect-ratio:896/1200}}
.frame{{position:relative;aspect-ratio:896/1200;border-radius:10px;overflow:hidden;background:#000;box-shadow:0 18px 40px #0008,0 0 0 1px #c9a96a44}}
.frame iframe{{position:absolute;inset:0;width:100%;height:100%;border:0}}
.frame .orig{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .25s;pointer-events:none}}
.frame:hover .orig,.peek .frame .orig{{opacity:1}}
.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:980px;margin:0 auto}}@media (max-width:760px){{.grid{{grid-template-columns:repeat(2,1fr);gap:12px}}}}
.card figcaption{{text-align:center;color:var(--cream);font-weight:600}}
.bar{{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 16px}}
button{{font:600 14px Inter;background:var(--navy2);color:var(--ink);border:1px solid #c9a96a77;border-radius:999px;padding:8px 16px;cursor:pointer}}
button.on{{background:var(--gold);color:#1a1a1a}}
.tag{{display:inline-block;font:600 12px Inter;letter-spacing:.12em;color:#1a1a1a;background:var(--gold);border-radius:4px;padding:2px 8px;margin-bottom:8px}}
.note{{color:var(--mut);font-size:13px}}
@media (max-width:640px){{.ab{{grid-template-columns:1fr}}}}
</style></head><body>
<header><h1>SCOTUS Unofficial<small>RIG REVIEW · 11 NOV 2026</small></h1></header>

<section><h2>1 · Glasses removed</h2>
<div class="ask">Approve each: keep the right-hand version, or redo?</div>
<div class="pairs">{glasses}</div></section>

<section><h2>2 · Sotomayor: approved rig vs new build</h2>
<div class="ask">A or B?</div>
<p class="note">B is built by the new general scripts and keeps every layer as your original pixels instead of tracing it into vector shapes. That clears the old "vector face slightly flatter than original" leftover. Rest-pose difference from the portrait: A 4.6, B 0.6 (0 = identical).</p>
<div class="bar"><button data-m="idle" class="on">Idle</button><button data-m="demo">Talking demo</button></div>
<div class="ab">
<figure><span class="tag">A · APPROVED</span><div class="frame"><iframe data-src="sotomayor_A_approved.html" title="A"></iframe></div></figure>
<figure><span class="tag">B · NEW</span><div class="frame"><iframe data-src="sotomayor.html" title="B"></iframe></div></figure>
</div></section>

<section><h2>3 · The full bench</h2>
<div class="ask">Anything that looks wrong on any justice?</div>
<p class="note">Hover a portrait to see the original. "Talking demo" cycles the mouth shapes; real lip-sync comes when they join the Forge.</p>
<div class="bar"><button data-m="idle" class="on">Idle</button><button data-m="demo">Talking demo</button><button id="peek">Show originals</button></div>
<div class="grid">{grid}</div></section>
<script>
function load(mode){{document.querySelectorAll('iframe[data-src]').forEach(f=>{{f.src=f.dataset.src+'?embed=1&mode='+mode}})}}
document.querySelectorAll('.bar').forEach(bar=>bar.querySelectorAll('button[data-m]').forEach(b=>b.onclick=()=>{{
  bar.querySelectorAll('button[data-m]').forEach(x=>x.classList.toggle('on',x===b));
  bar.parentElement.querySelectorAll('iframe[data-src]').forEach(f=>{{f.src=f.dataset.src+'?embed=1&mode='+b.dataset.m}})}}));
document.getElementById('peek').onclick=e=>{{document.body.classList.toggle('peek');e.target.classList.toggle('on')}};
load('idle');
</script></body></html>"""
open(os.path.join(OUT, "index.html"), "w", encoding="utf8").write(html)
print(os.path.join(OUT, "index.html"))
