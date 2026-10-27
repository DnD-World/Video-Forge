// A contact sheet of moves: each row a move, each column a moment in it,
// drawn on a real canvas by the engine. tools/moves-sheet.mjs saves it as PNG
// (proof pictures for checks and for Ak's A/B pages).
import { SHELF, LOOKS, drawFigure, frameFor, autoPerformance, movesAt } from "../core/index.mjs";
import { sampleCards } from "../core/check.mjs";

const BG = { sticker: "#ffe6f2", stick: "#efe2cf", sitcom: "#c7a6e8", hose: "#cfc6b4", corp: "#fbf4ec", geo: "#1f1a4a", karag: "#f6e3b4", pop: "#ffd400" };

window.__sheet = ({ moves, cols = 6, cell = 220, look = "sticker", style = "neutral", framing = "full", who = 0, view = null }) => {
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
      const card = { ...sampleCards()[who], look };
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
