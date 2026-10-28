// A contact sheet of moves: each row a move, each column a moment in it,
// drawn on a real canvas by the engine. tools/moves-sheet.mjs saves it as PNG
// (proof pictures for checks and for Ak's A/B pages).
import { stageOf, SHELF, LOOKS, drawFigure, frameFor, autoPerformance, movesAt } from "../core/index.mjs";
import { sampleCards } from "../core/check.mjs";

const BG = new Proxy({}, { get: (_, k) => stageOf(String(k))[0] });

window.__sheet = ({ moves, cols = 6, cell = 220, look = "sticker", style = "neutral", framing = "full", who = 0, view = null, preset = null }) => {
  const list = (moves?.length ? moves : Object.keys(SHELF)).filter((id) => SHELF[id]);
  const cv = document.createElement("canvas");
  const labelW = 150;
  cv.width = labelW + cols * cell; cv.height = list.length * cell;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, cv.width, cv.height);
  const layer = document.createElement("canvas");
  list.forEach((id, r) => {
    const m = SHELF[id];
    const span = m.hold !== null ? m.lengthMs * 1.8 : m.loop ? m.lengthMs * 2 : m.lengthMs;
    ctx.fillStyle = "#e8f1f2"; ctx.font = "600 15px sans-serif"; ctx.fillText(m.name, 10, r * cell + 26);
    ctx.fillStyle = "#9fb3c8"; ctx.font = "12px sans-serif"; ctx.fillText(`[${m.phrases[0] ?? id}]`, 10, r * cell + 46); ctx.fillText(style, 10, r * cell + 64);
    for (let c = 0; c < cols; c++) {
      const ms = (span * c) / (cols - 1);
      const x0 = labelW + c * cell, y0 = r * cell;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0 + 2, y0 + 2, cell - 4, cell - 4); ctx.clip();
      ctx.fillStyle = BG[look] ?? "#24395a"; ctx.fillRect(x0, y0, cell, cell);
      ctx.fillStyle = "rgba(0,0,0,0.07)"; ctx.fillRect(x0, y0 + cell * 0.9, cell, cell * 0.1);
      const pr = preset ? DRAWN_PRESETS.find((p) => p.id === preset) : null;
      const card = pr ? { ...normalizeCard({ ...pr.card, name: pr.name }).card, look } : { ...sampleCards()[who], look };
      const fr = frameFor(card, look, framing, { x: x0 + cell * 0.1, y: y0 + cell * 0.04, w: cell * 0.8, h: cell * 0.88 });
      const mv = movesAt([{ startMs: 0, endMs: span, move: id, style }], SHELF, ms, { energy: 0.4, seed: 1 });
      let x = fr.x, mirror = false;
      if (mv?.travel) {
        const at = { here: x, left: x0 - cell * 0.05, right: x0 + cell * 1.05 };
        x = at[mv.travel.from] + (at[mv.travel.to] - at[mv.travel.from]) * mv.travel.p;
        if (mv.facing) mirror = mv.facing === "left";
      }
      const base = autoPerformance(ms / 1000, { talking: false });
      const state = {
        ...base, view: view ?? base.view,
        joints: mv?.joints ?? null, hands: mv?.hands ?? null, props: mv?.props ?? [], smile: mv?.face?.smile ?? 0,
        brows: mv?.face?.brows ? { left: mv.face.brows, right: mv.face.brows } : base.brows,
        lid: mv?.face?.lids ? { from: mv.face.lids, to: mv.face.lids, mix: 1 } : base.lid,
      };
      drawFigure(ctx, card, { look, S: fr.S, x, y: fr.y, mirror, state, layerSize: { w: cv.width, h: cv.height }, layerCanvas: layer });
      ctx.restore();
      ctx.fillStyle = "rgba(13,27,42,0.6)"; ctx.font = "11px sans-serif"; ctx.fillText(`${(ms / 1000).toFixed(2)} s`, x0 + 8, y0 + 16);
    }
  });
  return cv.toDataURL("image/png");
};
window.__looks = LOOKS.map((l) => l.id);

// the prepared drawn characters, in a grid (one look), named
import { DRAWN_PRESETS, normalizeCard } from "../core/index.mjs";
window.__presets = ({ look = "sticker", cols = 6, cell = 200 }) => {
  const rows = Math.ceil(DRAWN_PRESETS.length / cols);
  const cv = document.createElement("canvas");
  cv.width = cols * cell; cv.height = rows * (cell + 24);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, cv.width, cv.height);
  const layer = document.createElement("canvas");
  DRAWN_PRESETS.forEach((p, i) => {
    const x0 = (i % cols) * cell, y0 = Math.floor(i / cols) * (cell + 24);
    ctx.fillStyle = BG[look] ?? "#24395a"; ctx.fillRect(x0 + 2, y0 + 2, cell - 4, cell - 4);
    const card = { ...normalizeCard({ name: p.name, ...p.card }).card, look };
    const fr = frameFor(card, look, "full", { x: x0 + 8, y: y0 + 6, w: cell - 16, h: cell - 12 });
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2, y0 + 2, cell - 4, cell - 4); ctx.clip();
    drawFigure(ctx, card, { look, S: fr.S, x: fr.x, y: fr.y, state: autoPerformance(0.4, { seed: i, talking: false }), layerSize: { w: cv.width, h: cv.height }, layerCanvas: layer });
    ctx.restore();
    ctx.fillStyle = "#e8f1f2"; ctx.font = "600 13px sans-serif"; ctx.fillText(p.name, x0 + 8, y0 + cell + 16);
  });
  return cv.toDataURL("image/png");
};

// faces close up: beards and smiles at every turn (front → side)
window.__faces = ({ look = "sticker", cell = 200 }) => {
  const views = [0, 0.5, 1, 1.5, 2];
  const rows = [
    { label: "full beard", over: { beard: "full", moustache: "thick", hairColor: "#5a3825" } },
    { label: "short beard", over: { beard: "short", hairColor: "#262a33" } },
    { label: "stubble", over: { beard: "stubble", hairColor: "#262a33" } },
    { label: "goatee", over: { beard: "goatee", moustache: "thin", hairColor: "#a8322b" } },
    { label: "smile", over: { expression: "smile" } },
    { label: "big smile", over: { expression: "smile" }, smile: 0.6 },
    { label: "grumpy", over: { expression: "grumpy" } },
  ];
  const cv = document.createElement("canvas");
  cv.width = 120 + views.length * cell; cv.height = rows.length * cell;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, cv.width, cv.height);
  const layer = document.createElement("canvas");
  rows.forEach((r, i) => {
    ctx.fillStyle = "#e8f1f2"; ctx.font = "600 14px sans-serif"; ctx.fillText(r.label, 10, i * cell + cell / 2);
    views.forEach((v, j) => {
      const x0 = 120 + j * cell, y0 = i * cell;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2, y0 + 2, cell - 4, cell - 4); ctx.clip();
      ctx.fillStyle = BG[look] ?? "#24395a"; ctx.fillRect(x0, y0, cell, cell);
      const card = { ...normalizeCard({ name: "F", ...r.over }).card, look };
      const fr = frameFor(card, look, "head", { x: x0 + 6, y: y0 + 6, w: cell - 12, h: cell - 12 });
      drawFigure(ctx, card, { look, S: fr.S, x: fr.x, y: fr.y, state: { t: 0, view: v, smile: r.smile ?? 0 }, layerSize: { w: cv.width, h: cv.height }, layerCanvas: layer });
      ctx.restore();
    });
  });
  return cv.toDataURL("image/png");
};

// shoes close up: every kind at every turn, and mid-walk side on
window.__shoes = ({ look = "sticker", cell = 220 }) => {
  const cols = [{ v: 0 }, { v: 0.5 }, { v: 1 }, { v: 2 }, { v: 2, walk: true }];
  const kinds = ["shoes", "sneakers", "boots", "sandals", null];
  const cv = document.createElement("canvas");
  cv.width = 110 + cols.length * cell; cv.height = kinds.length * cell;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, cv.width, cv.height);
  const layer = document.createElement("canvas");
  kinds.forEach((kind, i) => {
    ctx.fillStyle = "#e8f1f2"; ctx.font = "600 14px sans-serif"; ctx.fillText(kind ?? "barefoot", 10, i * cell + cell / 2);
    cols.forEach((c, j) => {
      const x0 = 110 + j * cell, y0 = i * cell;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2, y0 + 2, cell - 4, cell - 4); ctx.clip();
      ctx.fillStyle = BG[look] ?? "#24395a"; ctx.fillRect(x0, y0, cell, cell);
      ctx.fillStyle = "rgba(0,0,0,0.07)"; ctx.fillRect(x0, y0 + cell * 0.86, cell, cell * 0.14);
      const wear = [{ id: "jeans", colors: ["#3a6fb0"] }, ...(kind ? [{ id: kind, colors: kind === "sneakers" ? ["#f2f2f2", "#d7261e"] : kind === "boots" ? ["#5a3622"] : kind === "sandals" ? ["#7a4a24"] : ["#16181d"] }] : [])];
      const card = { ...normalizeCard({ name: "F", wear }).card, look };
      const S = cell * 2.4;
      const state = { t: 0.4, view: c.v, ...(c.walk ? { walk: { phase: 1.1, amount: 1 } } : {}) };
      drawFigure(ctx, card, { look, S, x: x0 + cell / 2 - (c.v >= 2 ? cell * 0.06 : 0), y: y0 + cell * 0.88, state, layerSize: { w: cv.width, h: cv.height }, layerCanvas: layer });
      ctx.restore();
    });
  });
  return cv.toDataURL("image/png");
};

// QC: flashes. Plays a sequence of moves at 30 fps through the motion layer
// and finds pixels that change colour for ONE frame and change back (a flash
// or a stray line), per look. Returns counts and the worst frame, marked.
import { performAt, characterState as cs2, SHELF as SH2, LOOKS as LK2 } from "../core/index.mjs";
window.__flicker = ({ looks = null, preset = "dnd-dwarf", moves = ["walk-in", "wave", "cheer", "explain", "dance", "drink", "sit-down", "stand-up"], size = 260 }) => {
  const pr = DRAWN_PRESETS.find((p) => p.id === preset);
  const spans = []; let t = 300;
  if (!moves.length) t = 4000; // standing still, breathing: any flash is a real one
  for (const id of moves) { const m = SH2[id]; const len = m.loop ? m.lengthMs * 2 : m.hold !== null ? m.lengthMs * 1.4 : m.lengthMs; spans.push({ startMs: t, endMs: t + len, move: id, seed: 1, dist: m.path ? 1.6 : undefined }); t += len + 400; }
  const out = [];
  const layer = document.createElement("canvas");
  for (const L of (looks ?? LK2.map((l) => l.id))) {
    const card = { ...normalizeCard({ ...pr.card, name: pr.name }).card, look: L };
    const cv = Object.assign(document.createElement("canvas"), { width: size, height: size });
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    const frames = [];
    for (let ms = 0; ms < t; ms += 1000 / 30) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = BG[L]; ctx.fillRect(0, 0, size, size);
      const fr = frameFor(card, L, "full", { x: size * 0.15, y: size * 0.05, w: size * 0.7, h: size * 0.9 });
      const perf = performAt({ moveSpans: spans, shelf: SH2 }, ms, { view: 0, energy: 0.5, seed: 1 });
      const st = cs2({ timeMs: ms, viseme: 0, view: 0, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue, facing: perf.facing, travel: null }, breath: perf.breath });
      drawFigure(ctx, card, { look: L, S: fr.S, x: fr.x, y: fr.y, mirror: perf.facing === "left", state: st, layerSize: { w: size, h: size }, layerCanvas: layer });
      frames.push(ctx.getImageData(0, 0, size, size).data.slice());
    }
    let total = 0, worst = 0, worstAt = 0;
    for (let i = 1; i < frames.length - 1; i++) {
      const a = frames[i - 1], b = frames[i], c = frames[i + 1];
      let n = 0;
      for (let p = 0; p < a.length; p += 4) {
        const dac = Math.abs(a[p] - c[p]) + Math.abs(a[p + 1] - c[p + 1]) + Math.abs(a[p + 2] - c[p + 2]);
        const dab = Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);
        if (dac < 30 && dab > 160) n++;
      }
      total += n;
      if (n > worst) { worst = n; worstAt = i; }
    }
    out.push({ look: L, frames: frames.length, flashPixels: total, worstFrame: worstAt, worstPixels: worst });
  }
  return out;
};

// consecutive frames (30 fps) of one move through the motion layer, for QC by eye
window.__frames = ({ move = "drink", look = "sticker", preset = "dnd-dwarf", from = 0, n = 12, cell = 200, step = 1 }) => {
  const pr = DRAWN_PRESETS.find((p) => p.id === preset);
  const card = { ...normalizeCard({ ...pr.card, name: pr.name }).card, look };
  const m = SH2[move];
  const spans = [{ startMs: 200, endMs: 200 + (m.hold !== null ? m.lengthMs * 1.4 : m.lengthMs), move, seed: 1 }];
  const cols = 6, rows = Math.ceil(n / cols);
  const cv = Object.assign(document.createElement("canvas"), { width: cols * cell, height: rows * cell });
  const ctx = cv.getContext("2d");
  const layer = document.createElement("canvas");
  for (let i = 0; i < n; i++) {
    const ms = from + (i * step * 1000) / 30;
    const x0 = (i % cols) * cell, y0 = Math.floor(i / cols) * cell;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, cell, cell); ctx.clip();
    ctx.fillStyle = BG[look]; ctx.fillRect(x0, y0, cell, cell);
    const fr = frameFor(card, look, "waist", { x: x0 + 6, y: y0 + 6, w: cell - 12, h: cell - 12 });
    const perf = performAt({ moveSpans: spans, shelf: SH2 }, ms, { view: 0, energy: 0.5, seed: 1 });
    const st = cs2({ timeMs: ms, viseme: 0, view: 0, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath });
    drawFigure(ctx, card, { look, S: fr.S, x: fr.x, y: fr.y, state: st, layerSize: { w: cv.width, h: cv.height }, layerCanvas: layer });
    ctx.fillStyle = "#000"; ctx.font = "11px sans-serif"; ctx.fillText(Math.round(ms) + "ms", x0 + 4, y0 + 12);
    ctx.restore();
  }
  return cv.toDataURL("image/png");
};
import { punchPattern as __pp, hatchPattern as __hp } from "../core/paint.mjs";
window.__pat = () => {
  const out = {};
  for (const [name, mk] of [["punch", (x) => __pp(x, "#ffffff", false)], ["hatch", (x) => __hp(x, "#ffffff")]]) {
    const c = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
    const x = c.getContext("2d");
    x.fillStyle = "#553311"; x.fillRect(0, 0, 64, 64);
    x.fillStyle = mk(x); x.beginPath(); x.rect(0, 0, 64, 64); x.fill();
    const d = x.getImageData(0, 0, 64, 64).data; let light = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 150) light++;
    out[name] = light;
  }
  return out;
};
window.__pat2 = () => {
  const c = Object.assign(document.createElement("canvas"), { width: 400, height: 400 });
  const x = c.getContext("2d");
  x.fillStyle = "#553311"; x.fillRect(0, 0, 400, 400);
  const card = { ...normalizeCard({ name: "k", wear: [{ id: "tshirt", colors: ["#2255aa"] }, { id: "trousers", colors: ["#2255aa"] }] }).card, look: "karag" };
  drawFigure(x, card, { look: "karag", S: 380, x: 200, y: 390, state: {}, layerSize: { w: 400, h: 400 }, layerCanvas: document.createElement("canvas") });
  const d = x.getImageData(0, 0, 400, 400).data; let light = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 230 && d[i + 1] > 220 && d[i + 2] > 180) light++;
  return { light, url: c.toDataURL() };
};
