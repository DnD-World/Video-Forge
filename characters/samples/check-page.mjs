// The page tools/character-check.mjs opens in a hidden Electron window: the
// real engine on a real canvas. Exposes window.__check (pixel determinism per
// look) and window.__sheet (every look × the test characters, as a PNG).
import { LOOKS, drawFigure, frameFor, autoPerformance } from "../core/index.mjs";
import { sampleCards } from "../core/check.mjs";

const cards = sampleCards();

function drawCell(ctx, card, look, box, t, { view = 1, pose = "explain", mirror = false } = {}) {
  const { S, x, y } = frameFor(card, look, "full", box);
  const state = autoPerformance(t, { seed: 1, talking: true, pose, view });
  return drawFigure(ctx, card, { look, S, x, y, mirror, state, layerSize: { w: ctx.canvas.width, h: ctx.canvas.height } });
}

/** Draw each look twice on a real canvas; the pixels must match exactly. */
window.__check = () => {
  const out = [];
  for (const look of LOOKS) {
    const pix = [];
    for (let k = 0; k < 2; k++) {
      const c = document.createElement("canvas"); c.width = 360; c.height = 360;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const t0 = performance.now();
      for (const card of cards.slice(0, 2)) drawCell(ctx, { ...card, look: look.id }, look, { x: 0, y: 0, w: 360, h: 360 }, 1.9, { view: 1, pose: "wave" });
      const ms = performance.now() - t0;
      const d = ctx.getImageData(0, 0, 360, 360).data;
      let ink = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++;
      pix.push({ d, ms, ink });
    }
    let diff = 0; for (let i = 0; i < pix[0].d.length; i++) if (pix[0].d[i] !== pix[1].d[i]) diff++;
    out.push({ id: look.id, name: look.name, diff, ink: pix[0].ink, ms: Math.max(pix[0].ms, pix[1].ms) });
  }
  return out;
};

/** A sheet: one row per look, the test characters at front / 3/4 / side. */
window.__sheet = (cell = 150) => {
  const views = [0, 1, 2];
  const W = cell * cards.length * views.length, H = cell * LOOKS.length;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  LOOKS.forEach((look, r) => {
    ctx.fillStyle = r % 2 ? "#e9e4d8" : "#f4efe4"; ctx.fillRect(0, r * cell, W, cell);
    if (["chalk", "neon", "blueprint", "shadow"].includes(look.id)) { ctx.fillStyle = { chalk: "#2f4a3a", neon: "#0a0820", blueprint: "#1d4e89", shadow: "#d2445e" }[look.id]; ctx.fillRect(0, r * cell, W, cell); }
    cards.forEach((card, i) => views.forEach((view, v) => {
      const box = { x: (i * views.length + v) * cell, y: r * cell, w: cell, h: cell };
      ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      drawCell(ctx, { ...card, look: look.id }, look, box, 1.4 + i, { view, pose: ["rest", "explain", "point"][v], mirror: false });
      ctx.restore();
    }));
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.font = "600 12px sans-serif"; ctx.fillText(look.name, 6, r * cell + 15);
  });
  return c.toDataURL("image/png");
};
window.__ready = true;
