// The pilot's choosing page: per subject, its two looks side by side; click
// the one you want, add a note, and "Copy my picks" gives a short list to
// paste back into the chat.
//   node tools/puppets/pilot-page.mjs   -> puppet-run/pilot/index.html
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT = path.join(ROOT, "puppet-run", "pilot");
const jobs = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "puppets", "pilot.json"), "utf8"));
const STYLE = { pixar: "3D animated", flat: "Flat cartoon", clay: "Claymation", paper: "Paper cut-out", anime: "Anime", lifelike: "Lifelike 3D", stick2d: "2D vector stick figure", doodle: "Simple doodle" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const subjects = [...new Set(jobs.map((j) => j.slug))].map((slug) => jobs.filter((j) => j.slug === slug));
const card = (j) => {
  const file = `${j.key}.png`;
  const has = fs.existsSync(path.join(OUT, file));
  return `<label class="pick">
    <input type="radio" name="${esc(j.slug)}" value="${esc(j.style)}">
    <div class="frame">${has ? `<img src="${file}" alt="${esc(j.description)} — ${esc(STYLE[j.style] ?? j.style)}" loading="lazy">` : `<div class="none">no picture came back</div>`}</div>
    <span class="style">${esc(STYLE[j.style] ?? j.style)}</span>
    <details><summary>prompt</summary><p>${esc(j.prompt)}</p></details>
  </label>`;
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Puppet pilot</title>
<style>
:root{--bg:#0f1115;--card:#181b22;--ink:#e9ecf2;--muted:#9aa3b2;--accent:#ff4fa3;--line:#2a2f3a}
@media (prefers-color-scheme: light){:root:not([data-theme=dark]){--bg:#f4f5f8;--card:#fff;--ink:#14161b;--muted:#5d6574;--line:#dde1e8}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,Segoe UI,sans-serif;padding:24px 16px 120px}
h1{margin:0 0 4px;font-size:26px}.lead{color:var(--muted);margin:0 0 28px;max-width:70ch}
section{max-width:1100px;margin:0 auto 36px}h2{font-size:18px;margin:0 0 4px}.desc{color:var(--muted);margin:0 0 12px}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.pick{display:block;background:var(--card);border:2px solid var(--line);border-radius:14px;padding:10px;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}
.pick:hover{transform:translateY(-2px)}.pick input{position:absolute;opacity:0}
.pick:has(input:checked){border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 25%,transparent)}
.frame{aspect-ratio:1;border-radius:10px;overflow:hidden;background:#ff00ff}.frame img{width:100%;height:100%;object-fit:contain;display:block}
.none{display:grid;place-items:center;height:100%;color:#fff;font-weight:600}
.style{display:block;font-weight:600;margin:8px 2px 2px}details{color:var(--muted);font-size:12.5px}summary{cursor:pointer}
textarea{width:100%;margin-top:10px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:8px;font:inherit;min-height:44px}
.bar{position:fixed;left:0;right:0;bottom:0;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:12px 16px;display:flex;gap:12px;justify-content:center;align-items:center}
button{background:var(--accent);color:#fff;border:0;border-radius:999px;padding:10px 20px;font:600 15px system-ui;cursor:pointer}#done{color:var(--muted)}
</style></head><body>
<h1>Puppet pilot — pick a look per subject</h1>
<p class="lead">Seven subjects, two looks each, made with Nano Banana 2.1 from the new prompt rules. The pink is the background that gets cut away. Click the look you want for each subject (or none), add a note if something should change, then press <b>Copy my picks</b> and paste it into the chat.</p>
${subjects
  .map(
    (js) => `<section><h2>${esc(js[0].subject)}</h2><p class="desc">${esc(js[0].description)}</p><div class="row">${js.map(card).join("")}</div>
<textarea data-slug="${esc(js[0].slug)}" placeholder="Note for ${esc(js[0].subject)} (optional)"></textarea></section>`
  )
  .join("\n")}
<div class="bar"><button id="copy">Copy my picks</button><span id="done"></span></div>
<script>
document.getElementById("copy").onclick = async () => {
  const lines = [...document.querySelectorAll("section")].map((s) => {
    const slug = s.querySelector("textarea").dataset.slug;
    const pick = s.querySelector("input:checked")?.value ?? "none";
    const note = s.querySelector("textarea").value.trim();
    return slug + ": " + pick + (note ? " — " + note : "");
  });
  const text = "Pilot picks:\\n" + lines.join("\\n");
  try { await navigator.clipboard.writeText(text); document.getElementById("done").textContent = "Copied — paste it into the chat."; }
  catch { prompt("Copy this:", text); }
};
</script></body></html>`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);
console.log("written", path.join(OUT, "index.html"));
