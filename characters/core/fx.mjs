// ---------------------------------------------------------------------------
// Whole-figure and whole-scene treatments.
//
//   applyLayer  the figure was drawn into its own layer canvas; treat the
//               layer as a whole (white sticker edge, chalk dust, the shadow
//               under cut paper, two print passes out of line, neon glow, the
//               lamp halo behind a shadow-theatre screen) and put it on `dst`
//   applyScene  effects for a whole frame (old film, vignette, print grain);
//               used by scenes and the 1930s flashback, never per avatar
//
// Deterministic like everything else: grain and flicker come from a hash of
// the frame number.
// ---------------------------------------------------------------------------

import { hash } from "./math.mjs";
import { grainPattern, newCanvas } from "./paint.mjs";
import { TAU } from "./pen.mjs";

let edgeCanvas = null;

export function applyLayer(look, dst, L, lc, { w, h, S, ink = "#3ef0ff" }) {
  switch (look.layer) {
    case "sticker": {
      // a white edge: the figure stamped 16 times around a circle, made white
      if (!edgeCanvas || edgeCanvas.width !== w || edgeCanvas.height !== h) edgeCanvas = newCanvas(w, h);
      const ec = edgeCanvas.getContext("2d");
      ec.setTransform(1, 0, 0, 1, 0, 0);
      ec.globalCompositeOperation = "source-over";
      ec.clearRect(0, 0, w, h);
      const k = Math.max(3, S * 0.022);
      for (let a = 0; a < TAU; a += TAU / 16) ec.drawImage(L, Math.cos(a) * k, Math.sin(a) * k);
      ec.globalCompositeOperation = "source-in";
      ec.fillStyle = "#ffffff";
      ec.fillRect(0, 0, w, h);
      ec.globalCompositeOperation = "source-over";
      dst.save();
      dst.shadowColor = "rgba(122,42,90,0.33)"; dst.shadowBlur = S * 0.04; dst.shadowOffsetY = S * 0.015;
      dst.drawImage(edgeCanvas, 0, 0);
      dst.restore();
      dst.drawImage(L, 0, 0);
      return;
    }
    case "chalk":
      lc.save(); lc.globalCompositeOperation = "destination-out"; lc.globalAlpha = 0.45; lc.fillStyle = grainPattern(lc); lc.fillRect(0, 0, w, h); lc.restore();
      dst.drawImage(L, 0, 0);
      return;
    case "paper":
      lc.save(); lc.globalCompositeOperation = "source-atop"; lc.globalAlpha = 0.08; lc.fillStyle = grainPattern(lc); lc.fillRect(0, 0, w, h); lc.restore();
      dst.save(); dst.shadowColor = "rgba(40,30,20,0.35)"; dst.shadowBlur = S * 0.02; dst.shadowOffsetX = S * 0.008; dst.shadowOffsetY = S * 0.012; dst.drawImage(L, 0, 0); dst.restore();
      return;
    case "riso":
      // a second pass a hair out of line (it was nearly a centimetre: "like without reading glasses")
      dst.save(); dst.globalCompositeOperation = "multiply"; dst.globalAlpha = 0.4; dst.drawImage(L, S * 0.0035, S * 0.002); dst.globalAlpha = 1; dst.drawImage(L, 0, 0); dst.restore();
      return;
    case "glow":
      dst.save(); dst.shadowColor = ink; dst.shadowBlur = S * 0.035; dst.drawImage(L, 0, 0); dst.drawImage(L, 0, 0); dst.restore();
      return;
    case "lamp":
      dst.save(); dst.shadowColor = "rgba(255,170,60,0.55)"; dst.shadowBlur = S * 0.03; dst.drawImage(L, 0, 0); dst.restore();
      return;
    default:
      dst.drawImage(L, 0, 0);
  }
}

/** Frame effects: film (grain, flicker, scratches, vignette), vignette, grain. */
export function applyScene(look, ctx, { w, h, t = 0, fps = 12 }) {
  const sc = look.scene ?? {};
  if (sc.film) {
    const fr = Math.floor(t * fps);
    ctx.save(); ctx.globalAlpha = 0.06 + 0.04 * hash(fr, 1); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); ctx.restore();
    for (let i = 0; i < 260; i++) { ctx.fillStyle = hash(fr, i) > 0.5 ? "#00000030" : "#ffffff30"; ctx.fillRect(hash(fr, i + 999) * w, hash(fr, i + 1999) * h, 2, 2); }
    if (hash(fr, 5) > 0.6) { ctx.fillStyle = "#ffffff55"; ctx.fillRect(hash(fr, 6) * w, 0, 1.5, h); }
  }
  if (sc.film || sc.vignette) {
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.27, w / 2, h / 2, w * 0.64);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, sc.vignette ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.66)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
  if (sc.grain) { ctx.save(); ctx.globalAlpha = look.id === "riso" ? 0.22 : 0.12; ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, w, h); ctx.restore(); }
}
