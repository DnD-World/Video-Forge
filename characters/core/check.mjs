// ---------------------------------------------------------------------------
// Checks for drawn characters, by code, without a browser.
//
// A RecordingCtx stands in for a canvas: it keeps the transform, notes every
// point that gets filled or stroked, and logs every call. That is enough to
// answer the questions that matter:
//   · does any part leave the frame, in any look, view and pose?
//   · is the mouth big enough to read on a phone?
//   · do the face features stand out from the skin?
//   · is a frame identical when drawn twice (no clock, no randomness)?
// Pixel-level checks (the real canvas) run in tools/character-check.mjs.
// ---------------------------------------------------------------------------

import { contrast, toHex } from "./math.mjs";
import { LOOKS } from "./looks.mjs";
import { POSE_NAMES } from "./rig.mjs";
import { drawCharacter, frameFor } from "./draw.mjs";
import { toneColor, inkFor, setCanvasFactory } from "./paint.mjs";
import { defaultCard } from "./card.mjs";
import { RecordingCtx } from "./record.mjs";

export { RecordingCtx };

/** Use recording canvases for patterns and layers (Node, tests). */
export function useRecordingCanvases() {
  setCanvasFactory((w, h) => { const c = { width: w, height: h }; const ctx = new RecordingCtx(w, h); c.getContext = () => ctx; return c; });
}

// ---- the checks -------------------------------------------------------------------------

/** Minimum readable sizes on a phone, for a figure in a box this many px tall. */
export const PHONE_BOX = 324; // a speaker 0.3 of a 1080-wide video
export const MIN_MOUTH = { w: 8, h: 3 }; // px, for an open "AH" at PHONE_BOX, full body
export const MIN_FACE_CONTRAST = 2.5;

/**
 * The smallest size (fraction of a 1080-wide video's width, like a speaker's
 * "size") at which this character's open mouth is readable on a phone, for a
 * framing. The app warns below it.
 */
export function readableSize(card, look, framing = "full") {
  const box = { x: 0, y: 0, w: PHONE_BOX, h: PHONE_BOX };
  const { S, x, y } = frameFor(card, look, framing, box);
  const info = drawCharacter(new RecordingCtx(box.w, box.h), card, { look, S, x, y, state: { t: 0, mouth: { from: 1, to: 1, mix: 1 } } });
  const k = Math.max(MIN_MOUTH.w / info.mouth.w, MIN_MOUTH.h / info.mouth.h);
  return (PHONE_BOX * k) / 1080;
}

/** A few cards that cover the shapes (hair down, wide build, hat, long dress). */
export function sampleCards() {
  return [
    defaultCard({ name: "Dad", hair: "sidepart", wear: [{ id: "shirt" }, { id: "vest", colors: ["#3a6fb0"] }, { id: "tie" }, { id: "trousers" }, { id: "shoes" }] }),
    defaultCard({ name: "Mom", hair: "ponytail", hairColor: "#2a2320", lips: true, wear: [{ id: "shirt" }, { id: "blazer", colors: ["#8cc6f0"] }, { id: "skirt", colors: ["#8cc6f0"] }, { id: "shoes" }, { id: "bow" }] }),
    defaultCard({ name: "Philosopher", hair: "curly", beard: "full", build: "round", nose: "long", wear: [{ id: "chiton" }, { id: "himation" }, { id: "sandals" }, { id: "wreath" }] }),
    defaultCard({ name: "Kid", height: 0.8, headSize: 1.25, hair: "afro", wear: [{ id: "hoodie_up", colors: ["#e86a50"] }, { id: "shorts" }, { id: "sneakers" }, { id: "sunglasses" }] }),
  ];
}

/**
 * Run every check. Returns { problems: [{level, msg}], frames } where frames is
 * how many (look × view × pose × card) combinations were drawn.
 */
export function runChecks({ cards = sampleCards(), looks = LOOKS, views = [0, 1, 2], poses = POSE_NAMES } = {}) {
  useRecordingCanvases();
  const problems = [];
  const add = (level, msg) => { if (!problems.some((p) => p.msg === msg)) problems.push({ level, msg }); };
  let frames = 0;
  const box = { x: 0, y: 0, w: PHONE_BOX, h: PHONE_BOX };
  for (const look of looks) {
    for (const card0 of cards) {
      const card = { ...card0, look: look.id };
      const { S, x, y } = frameFor(card, look, "full", box);
      // face contrast (skin vs the line colour features are drawn in)
      if (look.fill !== "none") {
        const skin = toHex(toneColor(look, card.skin, "skin")), ink = toHex(inkFor(look, card));
        const cr = contrast(skin, ink);
        if (cr < MIN_FACE_CONTRAST) add("error", `${look.name} · ${card.name}: face features ${cr.toFixed(1)}:1 against the skin (needs ${MIN_FACE_CONTRAST})`);
      }
      for (const view of views) for (const pose of poses) {
        frames++;
        const state = { t: 1.3, view, pose, poseK: 1, talk: 1, mouth: { from: 0, to: 1, mix: 1 } };
        const ctx = new RecordingCtx(box.w, box.h);
        const info = drawCharacter(ctx, card, { look, S, x, y, state });
        const b = ctx.box, tol = box.w * 0.02;
        const where = `${look.name} · ${card.name} · ${["front", "3/4", "side"][view] ?? view} · ${pose}`;
        if (ctx.bad) add("error", `${where}: ${ctx.bad} points are not numbers`);
        if (b.x0 < -tol || b.y0 < -tol || b.x1 > box.w + tol || b.y1 > box.h + tol) add("error", `${where}: leaves the frame (${b.x0.toFixed(0)},${b.y0.toFixed(0)})–(${b.x1.toFixed(0)},${b.y1.toFixed(0)}) in a ${box.w}px box`);
        if (pose === "rest" && view === 0) {
          const need = readableSize(card, look, "full");
          if (need > 0.6) add("error", `${where}: the mouth only reads on a phone when the character is ${(need * 100).toFixed(0)}% of the video's width — too big to use`);
        }
        // the same frame twice must be the same drawing
        if (view === 1 && pose === "explain") {
          const again = new RecordingCtx(box.w, box.h);
          drawCharacter(again, card, { look, S, x, y, state });
          if (again.log.join("|") !== ctx.log.join("|")) add("error", `${where}: drawing the same frame twice gave different results`);
        }
      }
    }
  }
  return { problems, frames };
}
