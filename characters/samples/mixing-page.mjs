// EXPERIMENTS #49b and #49c, side by side, for Ak to judge (A/B page):
//   A  the drawn character doing a move
//   B  the picture puppet cut into limbs, doing the same move (cutout.mjs)
//   C  the picture puppet's own head on a drawn body, doing the same move
// tools/mixing-sheet.mjs feeds it a full-body puppet picture (background
// keyed out) and its joint points, and saves the sheet as a PNG.
import { SHELF, drawFigure, drawCharacter, frameFor, autoPerformance, movesAt, solveRig, lookById, normalizeCard } from "../core/index.mjs";
import { drawCutout } from "../experiments/cutout.mjs";

const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

window.__mixing = async ({ image, limbs, card: card0, look = "sticker", moves = ["wave", "point", "shrug", "cheer", "dance", "explain"], cell = 260, cols = 4 }) => {
  const img = await loadImg(image);
  // the skin colour under the picture's face, so the drawn body matches it
  const probe = document.createElement("canvas"); probe.width = img.width; probe.height = img.height;
  const pc = probe.getContext("2d"); pc.drawImage(img, 0, 0);
  const [r, g, b] = pc.getImageData(limbs.face[0], limbs.face[1] + 25, 1, 1).data;
  const skin = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const card = normalizeCard({ ...card0, skin, look }).card;
  const L = lookById(look);

  const labelW = 140, rowH = cell * 3 + 30;
  const cv = document.createElement("canvas");
  cv.width = labelW + cols * cell; cv.height = moves.length * rowH;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, cv.width, cv.height);
  const layer = document.createElement("canvas");
  const rest = solveRig(card, L, { view: 0 });

  moves.forEach((id, r0) => {
    const m = SHELF[id];
    const span = m.hold !== null ? m.lengthMs * 1.6 : m.loop ? m.lengthMs * 2 : m.lengthMs;
    const y0 = r0 * rowH;
    ctx.fillStyle = "#e8f1f2"; ctx.font = "600 15px sans-serif"; ctx.fillText(m.name, 10, y0 + 24);
    ["A drawn", "B cut-out", "C head on body"].forEach((t, k) => { ctx.fillStyle = "#9fb3c8"; ctx.font = "12px sans-serif"; ctx.fillText(t, 10, y0 + 30 + k * cell + cell / 2); });
    for (let c = 0; c < cols; c++) {
      const ms = span * (0.15 + (0.7 * c) / (cols - 1));
      const mv = movesAt([{ startMs: 0, endMs: span, move: id }], SHELF, ms, { energy: 0.3, seed: 2 });
      const base = autoPerformance(ms / 1000, { talking: false });
      const state = { ...base, view: 0, joints: mv?.joints ?? null, hands: mv?.hands ?? null, props: mv?.props ?? [], smile: mv?.face?.smile ?? 0 };
      for (let k = 0; k < 3; k++) {
        const x0 = labelW + c * cell, yy = y0 + 30 + k * cell;
        ctx.save();
        ctx.beginPath(); ctx.rect(x0 + 2, yy + 2, cell - 4, cell - 4); ctx.clip();
        ctx.fillStyle = k === 1 ? "#2a3b52" : "#ffe6f2"; ctx.fillRect(x0, yy, cell, cell);
        const fr = frameFor(card, L, "full", { x: x0 + cell * 0.15, y: yy + cell * 0.05, w: cell * 0.7, h: cell * 0.88 });
        if (k === 0) {
          drawFigure(ctx, card, { look: L, S: fr.S, x: fr.x, y: fr.y, state, layerSize: { w: cv.width, h: cv.height }, layerCanvas: layer });
        } else if (k === 1) {
          const sk = solveRig(card, L, state);
          drawCutout(ctx, img, limbs, sk, rest, { x: fr.x, y: fr.y, h: cell * 0.86 });
        } else {
          const info = drawCharacter(ctx, card, { look: L, S: fr.S, x: fr.x, y: fr.y, state, headless: true });
          // the picture's head over the drawn neck: sized to the drawn head
          const hp = limbs.head, top = Math.min(...hp.map((p) => p[1])), bottom = Math.max(...hp.map((p) => p[1]));
          const s = (info.head.r * 2.55) / (bottom - top);
          ctx.save();
          ctx.translate(info.head.x, info.head.y + info.head.r * 0.15);
          ctx.rotate(((state.head?.rotateDeg ?? 0) + (state.joints?.head?.[0] ?? 0) * (state.joints?.w ?? 0)) * Math.PI / 180);
          ctx.scale(s, s);
          ctx.translate(-limbs.face[0], -(top + bottom) / 2);
          ctx.beginPath(); hp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.clip();
          ctx.drawImage(img, 0, 0);
          ctx.restore();
        }
        ctx.restore();
      }
    }
  });
  return cv.toDataURL("image/png");
};
