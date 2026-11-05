// The Red Flag Theory family in every look, side by side, drawn live by the
// real engine. Cards: brands/redflag/characters.json. Built into
// characters/samples/redflag.html by tools/redflag-sheet.mjs.
import { LOOKS, lookById, stageOf, drawFigure, frameFor, autoPerformance, normalizeCard, applyScene, HAIR_STYLES } from "../core/index.mjs";
import FAMILY from "../../brands/redflag/characters.json";

const family = FAMILY.characters.map((c) => ({ ...c, card: normalizeCard(c.card).card }));
const GROUPS = [
  ["Sunday show ✓", "Locked: paper cut-out (Ak, 2 Nov).", ["paper"]],
  ["Flashbacks ✓", "Chosen: \"X years ago\" scenes switch to this look (Ak, 2 Nov).", ["hose2"]],
  ["The other days", "Notebook looks and calm, adult options.", ["sticker", "glass", "mid", "riso", "noir", "geo", "stick", "corp"]],
  ["Everything else", "The rest of the engine, for completeness.", null],
];
const TALK = ["explain", "point", "shrug", "think", "hips"];
const TURN = 2.6; // seconds each person talks

const ui = { framing: "full", facing: false, phone: false, playing: true, t0: performance.now(), paused: 0 };
let picks = [];
try { picks = JSON.parse(localStorage.getItem("rf-picks") || "[]"); } catch { picks = []; }
const savePicks = () => { try { localStorage.setItem("rf-picks", JSON.stringify(picks)); } catch { /* private window */ } };

const $ = (id) => document.getElementById(id);
const rows = [];
const used = new Set();
// one row = one look drawn with a set of people; key is what ☆ Pick remembers
function addRow(sec, id, people, key, label) {
  const look = lookById(id);
  const fig = document.createElement("figure");
  fig.dataset.look = key;
  fig.innerHTML = `<figcaption><div><b></b><small></small></div><button class="star" aria-pressed="false" title="Mark as a favourite">☆ Pick</button></figcaption><div class="stage"><canvas></canvas></div>`;
  fig.querySelector("b").textContent = look.name;
  fig.querySelector("small").textContent = look.blurb;
  sec.querySelector(".rows").append(fig);
  const row = { look, people, key, label, fig, cv: fig.querySelector("canvas"), visible: false, layers: [] };
  fig.querySelector(".star").onclick = () => { picks = picks.includes(key) ? picks.filter((p) => p !== key) : [...picks, key]; savePicks(); paintPicks(); };
  new IntersectionObserver(([e]) => { row.visible = e.isIntersecting; }, { rootMargin: "300px" }).observe(fig);
  rows.push(row);
}
function addSection(title, sub, folded = false) {
  const sec = document.createElement(folded ? "details" : "section");
  sec.className = "group";
  sec.innerHTML = folded ? `<summary><h2>${title} <small>${sub}</small></h2></summary><div class="rows"></div>` : `<h2>${title} <small>${sub}</small></h2><div class="rows"></div>`;
  $("main").append(sec);
  return sec;
}
for (const [title, sub, ids] of GROUPS) {
  if (!ids) continue; // "everything else" goes last, after the other days
  const sec = addSection(title, sub);
  for (const id of ids.filter((x) => lookById(x))) { used.add(id); addRow(sec, id, family, id, lookById(id).name); }
}

// face extras: the new marks on Lucas and Amber, so each one is seen in the Sunday looks
{
  const by = (id) => family.find((p) => p.card.name.toLowerCase().startsWith(id));
  const v = (p, name, over) => ({ ...p, card: normalizeCard({ ...p.card, name, darkCircles: false, ...over }).card });
  const lucas = by("lucas"), amber = by("amber");
  const extras = [v(lucas, "Plain", {}), v(lucas, "Dark circles", { darkCircles: true }), v(lucas, "Bruise: cheek", { bruise: "cheek" }), v(lucas, "Bruise: black eye", { bruise: "eye" }), v(amber, "Makeup: soft", { makeup: "soft" }), v(amber, "Makeup: bold", { makeup: "bold" })];
  const sec = addSection("Face extras", "Dark circles, bruises and eye makeup (new in Video Forge).");
  for (const id of ["paper", "sitcom", "hose2"]) addRow(sec, id, extras, `extras:${id}`, `Extras · ${lookById(id).name}`);
}

// the other days: each host on the notebook's look first, then two alternatives
const hosts = FAMILY.hosts.map((c) => ({ ...c, card: normalizeCard(c.card).card }));
const dayHead = document.createElement("div");
dayHead.className = "dayhead";
dayHead.innerHTML = `<h2 class="big">The other days ✓</h2><p>Locked (Ak, 2 Nov): Monday–Wednesday geo-minimal, Thursday–Friday stained glass, Saturday and Sunday paper cut-out. Hosts' signature colours are proposals.</p>`;
$("main").append(dayHead);
for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
  const people = hosts.filter((h) => h.day === day);
  const sec = addSection(`${day} · ${people[0].show}`, people.map((h) => `${h.card.name}: ${h.role}`).join(" "));
  sec.classList.add("day");
  const id = FAMILY.looks[day]; // locked (Ak, 2 Nov)
  addRow(sec, id, people, `${day}:${id}`, `${day} · ${lookById(id).name}`);
}
{
  const rest = LOOKS.map((l) => l.id).filter((id) => !used.has(id));
  const [title, sub] = GROUPS[GROUPS.length - 1];
  const sec = addSection(title, `${sub} (${rest.length})`, true);
  for (const id of rest) addRow(sec, id, family, id, lookById(id).name);
}

function paintPicks() {
  for (const r of rows) {
    const on = picks.includes(r.key);
    r.fig.classList.toggle("picked", on);
    const b = r.fig.querySelector(".star"); b.setAttribute("aria-pressed", on); b.textContent = on ? "★ Picked" : "☆ Pick";
  }
  const labelOf = (k) => rows.find((r) => r.key === k)?.label ?? k;
  $("picks").innerHTML = picks.length ? picks.map((id) => `<a href="#" data-go="${id}">${labelOf(id)}</a>`).join("") : "<span>None yet. Press ☆ Pick on the looks you like.</span>";
  $("picks").querySelectorAll("a").forEach((a) => { a.onclick = (e) => { e.preventDefault(); document.querySelector(`figure[data-look="${a.dataset.go}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }; });
}

// a quiet room: wall, floor, a lamp's pool of light. Real rooms come later.
function room(ctx, W, H, look) {
  const [wall, floor] = stageOf(look);
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
  const fy = H * 0.7;
  ctx.fillStyle = floor; ctx.fillRect(0, fy, W, H - fy);
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(0, fy - H * 0.012, W, H * 0.012);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.6);
  g.addColorStop(0, "rgba(255,255,255,0.16)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function draw(row, t) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(row.cv.clientWidth * dpr), H = Math.round(W * 9 / 16);
  if (W < 32) return;
  if (row.cv.width !== W || row.cv.height !== H) { row.cv.width = W; row.cv.height = H; }
  const ctx = row.cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  room(ctx, W, H, row.look);
  const family = row.people;
  const speaker = Math.floor(t / TURN) % family.length;
  const cell = W / Math.max(family.length, 2);
  const x0 = (W - cell * family.length) / 2;
  const cards = family.map((p) => ({ ...p.card, look: row.look.id, framing: ui.framing }));
  const fits = cards.map((card, i) => frameFor(card, row.look, ui.framing, { x: x0 + i * cell + cell * 0.05, y: H * 0.08, w: cell * 0.9, h: H * 0.92 }));
  // full body: one shared scale with the feet on one floor line, so heights compare
  const shared = ui.framing === "full" ? Math.min(...fits.map((f) => f.S)) : 0;
  family.forEach((p, i) => {
    const card = cards[i];
    // waist and head: one shared size too, shrunk about the bottom edge so shoulders fit the cell
    const zk = shared ? 1 : Math.min(...fits.map((f) => f.S)) * (ui.framing === "head" ? 0.68 : 0.74) / fits[i].S;
    const { S, x, y } = shared ? { S: shared, x: fits[i].x, y: H * 0.85 } : { S: fits[i].S * zk, x: fits[i].x, y: H + (fits[i].y - H) * zk };
    if (shared) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath(); ctx.ellipse(x, y, S * 0.16, S * 0.025, 0, 0, 6.3); ctx.fill();
    }
    const talking = i === speaker;
    const beat = Math.floor(t / TURN);
    const pose = talking ? TALK[(beat + i) % TALK.length] : "rest";
    const k = talking ? Math.min(1, (t % TURN) / 0.4, (TURN - (t % TURN)) / 0.4) : 1;
    const state = autoPerformance(t, { seed: p.card.seed, talking, pose, poseK: k, view: ui.facing ? 0.55 : 0, blinkRate: p.card.blinkRate });
    if (!row.layers[i]) row.layers[i] = document.createElement("canvas");
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 + i * cell, 0, cell, H); ctx.clip();
    drawFigure(ctx, card, { look: row.look, S, x, y, mirror: ui.facing && i >= family.length / 2, state, layerSize: { w: W, h: H }, layerCanvas: row.layers[i] });
    ctx.restore();
  });
  applyScene(row.look, ctx, { w: W, h: H, t });
  row.fig.querySelectorAll(".who span").forEach((s, i) => s.classList.toggle("on", i === speaker));
}

for (const r of rows) {
  const who = document.createElement("div");
  who.className = "who";
  const n = r.people.length, pad = n === 1 ? 25 : 0;
  who.style.cssText = `grid-template-columns:repeat(${n},1fr);left:${pad}%;right:${pad}%`;
  who.innerHTML = r.people.map((p) => `<span style="--sig:${p.signature}">${p.card.name}</span>`).join("");
  r.fig.querySelector(".stage").append(who);
}

function frame(now) {
  const t = ui.playing ? (now - ui.t0) / 1000 : ui.paused;
  if (ui.playing) ui.paused = t;
  for (const r of rows) if (r.visible) draw(r, t);
  if (hairVisible) drawHair(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// hair library: every style the engine has, on Lucas's head; a click tries it on him everywhere
const lucas = family.find((p) => p.id === "lucas");
const hairUi = { look: "paper" };
const tiles = HAIR_STYLES.map((h) => {
  const b = document.createElement("button");
  b.className = "hair"; b.dataset.hair = h; b.title = `Try the ${h} hair on Lucas, everywhere on this page.`;
  b.innerHTML = `<canvas></canvas><span>${h}</span>`;
  b.onclick = () => { lucas.card = { ...lucas.card, hair: h }; paintHair(); };
  $("hairgrid").append(b);
  return { h, b, cv: b.querySelector("canvas"), layer: document.createElement("canvas") };
});
function paintHair() {
  for (const tl of tiles) tl.b.setAttribute("aria-pressed", tl.h === lucas.card.hair);
  $("hairnow").textContent = lucas.card.hair;
}
function drawHair(t) {
  const look = lookById(hairUi.look);
  for (const tl of tiles) {
    const W = Math.round(tl.cv.clientWidth * Math.min(2, window.devicePixelRatio || 1)), H = W;
    if (W < 16) continue;
    if (tl.cv.width !== W) { tl.cv.width = W; tl.cv.height = H; }
    const ctx = tl.cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = stageOf(look)[0]; ctx.fillRect(0, 0, W, H);
    const card = { ...lucas.card, hair: tl.h, look: look.id, framing: "head" };
    const { S, x, y } = frameFor(card, look, "head", { x: W * 0.05, y: H * 0.04, w: W * 0.9, h: H * 0.96 });
    drawFigure(ctx, card, { look, S, x, y, state: autoPerformance(t, { seed: 3, talking: false, pose: "rest" }), layerSize: { w: W, h: H }, layerCanvas: tl.layer });
  }
}
document.querySelectorAll("[data-hairlook]").forEach((b) => { b.onclick = () => { hairUi.look = b.dataset.hairlook; document.querySelectorAll("[data-hairlook]").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawHair(ui.paused); }; });
let hairVisible = false;
new IntersectionObserver(([e]) => { hairVisible = e.isIntersecting; }).observe($("hairgrid"));
paintHair();

// the cast strip at the top
$("cast").innerHTML = family.map((p) => `<li style="--sig:${p.signature}"><i></i><div><b>${p.card.name}</b> <span>${p.role}</span><small>Signature colour: ${p.signatureName} (proposed)</small></div></li>`).join("");

document.querySelectorAll("button[data-framing]").forEach((b) => { b.onclick = () => { ui.framing = b.dataset.framing; document.body.dataset.framing = ui.framing; document.querySelectorAll("button[data-framing]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }; });
$("facing").onclick = (e) => { ui.facing = !ui.facing; e.currentTarget.setAttribute("aria-pressed", ui.facing); };
$("phone").onclick = (e) => { ui.phone = !ui.phone; e.currentTarget.setAttribute("aria-pressed", ui.phone); document.body.classList.toggle("phone", ui.phone); };
$("play").onclick = (e) => { ui.playing = !ui.playing; if (ui.playing) ui.t0 = performance.now() - ui.paused * 1000; e.currentTarget.textContent = ui.playing ? "❚❚ Pause" : "▶ Play"; };
paintPicks();
window.__seek = (t) => { ui.playing = false; ui.paused = t; for (const r of rows) draw(r, t); };
window.__set = (o) => Object.assign(ui, o);
