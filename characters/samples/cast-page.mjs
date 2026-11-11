// The Red Flag Theory Season 1 cast picker: every person in their own show's
// look, a face and the clothes chosen separately. Data: brands/redflag/cast.mjs
// (the character files in brands/redflag/characters/, one per person). Built into characters/samples/redflag-cast.html by
// tools/redflag-cast-sheet.mjs. Picks stay in this browser (localStorage
// "rf-cast"); window.__picks() returns them.
import { lookById, stageOf, drawFigure, frameFor, autoPerformance, cardFor, applyScene } from "../core/index.mjs";
import CAST from "../../brands/redflag/cast.mjs";

const $ = (id) => document.getElementById(id);
const KEY = "rf-cast";
let store = { geoEyes: "", people: {} };
try { store = { ...store, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { /* private window */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private window */ } };
window.__picks = () => JSON.parse(JSON.stringify(store));
const pickOf = (id) => (store.people[id] ??= { face: "", outfits: [] });

const ui = { framing: "full", group: "all", t0: performance.now() };
const scratch = document.createElement("canvas"); // one layer canvas for every still drawing
const TALK = ["explain", "point", "shrug", "think", "hips"];

// geo-minimal eye options (Ak, 2 Nov: "give me some examples and I will decide")
const GEO = lookById("geo");
const GEO_EYES = [
  { id: "dots", name: "Dots (as now)", blurb: "Clean and calm; side-eye and eye-roll can't show.", look: GEO },
  { id: "own", name: "White eyes with lids", blurb: "Each person's own eyes, resting lids; eye acting works.", look: { ...GEO, eyes: undefined } },
  { id: "googly", name: "Big round whites", blurb: "Bigger and more cartoony; eye acting reads from far.", look: { ...GEO, eyes: "googly" } },
];
const lookFor = (p) => (p.look === "geo" ? (GEO_EYES.find((g) => g.id === store.geoEyes) ?? GEO_EYES[0]).look : lookById(p.look));

// an unknown face or outfit id falls back to the first, as before (not to the chosen one)
const cardOf = (p, faceId, outfitId) => cardFor(p, {
  face: p.faces.some((f) => f.id === faceId) ? faceId : p.faces[0].id,
  outfit: p.outfits.some((o) => o.id === outfitId) ? outfitId : p.outfits[0].id,
});

function paintRoom(ctx, W, H, look, floorAt = 0.78) {
  const [wall, floor] = stageOf(look);
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = floor; ctx.fillRect(0, H * floorAt, W, H * (1 - floorAt));
  const g = ctx.createRadialGradient(W * 0.5, H * 0.25, 0, W * 0.5, H * 0.25, W * 0.8);
  g.addColorStop(0, "rgba(255,255,255,0.18)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function fit(cv, aspect) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(W * aspect);
  if (W < 16) return null;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { ctx, W, H };
}
// one person, still or moving, in a box
function drawOne(ctx, card, look, framing, box, t, moving, layer = scratch) {
  const c = { ...card, framing };
  const f = frameFor(c, look, framing, box);
  const state = autoPerformance(t, { seed: card.seed, talking: moving, pose: moving ? TALK[Math.floor(t / 2.6) % TALK.length] : "rest", poseK: 1, blinkRate: card.blinkRate });
  drawFigure(ctx, c, { look, S: f.S, x: f.x, y: f.y, state, layerSize: { w: ctx.canvas.width, h: ctx.canvas.height }, layerCanvas: layer });
}

// ---- header progress + group tabs --------------------------------------------------------------
const people = CAST.people;
const done = (p) => { const k = pickOf(p.id); const need = +(p.target.match(/\d+/)?.[0] ?? 1); return !!k.face && k.outfits.length >= Math.min(need, p.outfits.length); };
function paintProgress() {
  const n = people.filter(done).length;
  $("progress").innerHTML = `<b>${n}</b> of ${people.length} ready <i style="--k:${n / people.length}"></i>`;
  for (const g of CAST.groups) {
    const ps = people.filter((p) => p.group === g.id);
    const el = document.querySelector(`[data-group="${g.id}"] em`); if (el) el.textContent = `${ps.filter(done).length}/${ps.length}`;
  }
}
$("tabs").innerHTML = `<button data-group="all" aria-pressed="true" title="Show the whole cast.">Everyone</button>` + CAST.groups.map((g) => `<button data-group="${g.id}" aria-pressed="false" title="Show only ${g.title}.">${g.title} <em></em></button>`).join("");
$("tabs").querySelectorAll("button").forEach((b) => { b.onclick = () => {
  ui.group = b.dataset.group;
  $("tabs").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  document.querySelectorAll(".grp").forEach((s) => { s.hidden = ui.group !== "all" && s.dataset.g !== ui.group; });
  $("geo").hidden = ui.group !== "all" && ui.group !== "week";
}; });

// ---- geo-minimal eyes decision -----------------------------------------------------------------
const geoPeople = ["margo", "leo", "clara", "chloe", "kevin", "jenny"].map((id) => people.find((p) => p.id === id)).filter(Boolean);
const geoRows = GEO_EYES.map((g) => {
  const fig = document.createElement("button");
  fig.className = "geoopt"; fig.dataset.id = g.id; fig.title = `Use these eyes (${g.name}) for every Geo-minimal character.`;
  fig.innerHTML = `<canvas></canvas><span><b>${g.name}</b><small>${g.blurb}</small></span>`;
  fig.onclick = () => { store.geoEyes = g.id; save(); paintGeo(); dirtyAll(); };
  $("geogrid").append(fig);
  return { g, fig, cv: fig.querySelector("canvas"), layer: document.createElement("canvas") };
});
function paintGeo() { for (const r of geoRows) r.fig.setAttribute("aria-pressed", store.geoEyes === r.g.id); $("geonow").textContent = store.geoEyes ? GEO_EYES.find((g) => g.id === store.geoEyes).name : "not decided"; }
function drawGeo(t) {
  for (const r of geoRows) {
    const f = fit(r.cv, 0.42); if (!f) continue;
    paintRoom(f.ctx, f.W, f.H, r.g.look, 0.8);
    const cell = f.W / geoPeople.length;
    geoPeople.forEach((p, i) => drawOne(f.ctx, cardOf(p, pickOf(p.id).face || "A", pickOf(p.id).outfits[0] || "o1"), r.g.look, "head", { x: i * cell + cell * 0.04, y: f.H * 0.06, w: cell * 0.92, h: f.H * 0.94 }, t + i * 0.7, i % 2 === Math.floor(t / 2.6) % 2, r.layer));
  }
}

// ---- one section per person --------------------------------------------------------------------
const cards = [];
for (const g of CAST.groups) {
  const sec = document.createElement("section");
  sec.className = "grp"; sec.dataset.g = g.id;
  sec.innerHTML = `<h2>${g.title} <small>${g.sub}</small></h2>`;
  $("main").append(sec);
  for (const p of people.filter((x) => x.group === g.id)) {
    const look = lookById(p.look);
    const el = document.createElement("article");
    el.className = "person"; el.id = p.id; el.style.setProperty("--sig", p.signature);
    el.innerHTML = `
      <header><i class="sw"></i><div><h3>${p.name}</h3><p>${p.role}</p></div>
        <dl><dt>Look</dt><dd>${look.name}</dd><dt>Signature</dt><dd>${p.signatureName}${p.proposed ? " <em>proposed</em>" : ""}</dd><dt>Keep</dt><dd class="need">${p.target} outfits</dd></dl>
        <span class="count"></span></header>
      <div class="body">
        <div class="pv"><canvas></canvas><span class="pvlabel"></span></div>
        <div class="choose">
          <h4>Face <small>pick one</small></h4><div class="faces"></div>
          <h4>Clothes <small>pick ${p.target} · hover to try on</small></h4><div class="outfits"></div>
        </div>
      </div>
      <footer>${p.source && p.source !== "already built" ? `From the ${p.source}.` : "Already built; face A is the approved one."}</footer>`;
    sec.append(el);
    const c = { p, el, pv: el.querySelector(".pv canvas"), pvLayer: document.createElement("canvas"), hover: "", visible: false, dirty: true, tiles: [] };
    for (const f of p.faces) {
      const b = document.createElement("button");
      b.className = "tile face"; b.title = `Pick face ${f.id} for ${p.name ?? p.id}.`; b.innerHTML = `<canvas></canvas><span>${f.id} · ${f.label}</span>`;
      b.onclick = () => { pickOf(p.id).face = f.id; save(); c.dirty = true; paint(c); paintProgress(); };
      el.querySelector(".faces").append(b);
      c.tiles.push({ kind: "face", id: f.id, b, cv: b.querySelector("canvas") });
    }
    for (const o of p.outfits) {
      const b = document.createElement("button");
      b.className = "tile outfit"; b.title = `Add this outfit to ${p.name ?? p.id}'s picks, or take it off again.`; b.innerHTML = `<canvas></canvas><span>${o.label}</span><i class="tick">✓</i>`;
      b.onclick = () => { const k = pickOf(p.id); k.outfits = k.outfits.includes(o.id) ? k.outfits.filter((x) => x !== o.id) : [...k.outfits, o.id]; save(); c.dirty = true; paint(c); paintProgress(); };
      b.onmouseenter = () => { c.hover = o.id; }; b.onmouseleave = () => { c.hover = ""; };
      b.onfocus = () => { c.hover = o.id; }; b.onblur = () => { c.hover = ""; };
      el.querySelector(".outfits").append(b);
      c.tiles.push({ kind: "outfit", id: o.id, b, cv: b.querySelector("canvas") });
    }
    new IntersectionObserver(([e]) => { c.visible = e.isIntersecting; }, { rootMargin: "400px" }).observe(el);
    cards.push(c);
    paint(c);
  }
}
function paint(c) {
  const k = pickOf(c.p.id);
  for (const t of c.tiles) t.b.setAttribute("aria-pressed", t.kind === "face" ? k.face === t.id : k.outfits.includes(t.id));
  const need = +(c.p.target.match(/\d+/)?.[0] ?? 1);
  c.el.querySelector(".count").textContent = `${k.face ? "Face " + k.face : "No face yet"} · ${k.outfits.length} outfit${k.outfits.length === 1 ? "" : "s"}`;
  c.el.classList.toggle("ready", done(c.p));
  c.el.querySelector(".need").classList.toggle("met", k.outfits.length >= need);
}
const dirtyAll = () => { for (const c of cards) c.dirty = true; };

// the still tiles: faces in head framing with the current outfit; outfits in the page framing with the current face
function drawTiles(c) {
  const k = pickOf(c.p.id), look = lookFor(c.p);
  const face = k.face || "A", outfit = k.outfits[0] || "o1";
  for (const t of c.tiles) {
    const f = fit(t.cv, t.kind === "face" ? 1 : ui.framing === "full" ? 1.5 : 1.1); if (!f) continue;
    paintRoom(f.ctx, f.W, f.H, look, t.kind === "face" ? 0.86 : 0.84);
    const card = t.kind === "face" ? cardOf(c.p, t.id, outfit) : cardOf(c.p, face, t.id);
    drawOne(f.ctx, card, look, t.kind === "face" ? "head" : ui.framing, { x: f.W * 0.06, y: f.H * 0.05, w: f.W * 0.88, h: f.H * 0.92 }, 0.4, false);
  }
  c.dirty = false;
}
function drawPreview(c, t) {
  const f = fit(c.pv, 1.2); if (!f) return;
  const k = pickOf(c.p.id), look = lookFor(c.p);
  const outfit = c.hover || k.outfits[k.outfits.length - 1] || "o1";
  paintRoom(f.ctx, f.W, f.H, look, 0.84);
  f.ctx.fillStyle = "rgba(0,0,0,0.16)"; f.ctx.beginPath(); f.ctx.ellipse(f.W / 2, f.H * 0.9, f.W * 0.2, f.H * 0.02, 0, 0, 6.3); f.ctx.fill();
  drawOne(f.ctx, cardOf(c.p, k.face || "A", outfit), look, ui.framing, { x: f.W * 0.08, y: f.H * 0.05, w: f.W * 0.84, h: f.H * 0.86 }, t, true, c.pvLayer);
  applyScene(look, f.ctx, { w: f.W, h: f.H, t });
  c.el.querySelector(".pvlabel").textContent = (c.p.outfits.find((o) => o.id === outfit) ?? c.p.outfits[0]).label;
}

let geoVisible = true;
new IntersectionObserver(([e]) => { geoVisible = e.isIntersecting; }).observe($("geo"));
function frame(now) {
  const t = (now - ui.t0) / 1000;
  if (geoVisible && !$("geo").hidden) drawGeo(t);
  let budget = 3; // still tiles: a few people per frame so scrolling stays smooth
  for (const c of cards) {
    if (!c.visible || c.el.closest(".grp").hidden) continue;
    if (c.dirty && budget-- > 0) drawTiles(c);
    drawPreview(c, t);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.querySelectorAll("button[data-framing]").forEach((b) => { b.onclick = () => {
  ui.framing = b.dataset.framing;
  document.querySelectorAll("button[data-framing]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  document.body.dataset.framing = ui.framing; dirtyAll();
}; });
window.addEventListener("resize", dirtyAll);
// picks live in whichever browser made them, so they travel by copy and paste
$("copy").onclick = async () => {
  const people = Object.fromEntries(Object.entries(store.people).filter(([, k]) => k.face || k.outfits.length));
  const text = "RF-PICKS " + JSON.stringify({ geoEyes: store.geoEyes, people });
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch { /* no clipboard: show it to copy by hand */ }
  $("copied").hidden = false;
  $("copiedtext").value = text;
  $("copiedmsg").textContent = ok ? "Copied. Paste it into the chat with Claude." : "Select all of this, copy it, and paste it into the chat with Claude.";
};
$("copiedclose").onclick = () => { $("copied").hidden = true; };
paintGeo(); paintProgress();
