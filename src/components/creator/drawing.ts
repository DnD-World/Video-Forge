// ---------------------------------------------------------------------------
// Drawing for the character creator: still pictures (the picture lists, the
// roster) and moving clips (the stage and the preview strip). Same engine as
// the video (characters/core), so what the creator shows is what renders.
//
// One clock for every moving canvas (subscribe), paused while the window is
// hidden, so a dozen clips cost one animation loop.
// ---------------------------------------------------------------------------

import {
  SHELF, autoPerformance, characterState, drawFigure, followAt, frameFor, lookById, movesAt, performAt,
  type CharacterCard, type CharacterState, type Look,
} from "../../../characters/core/index.mjs";

export type Framing = "head" | "waist" | "full";

/** A look by id; for geo-minimal, the brand may ask for each person's own eyes (Red Flag does). */
export function lookFor(id: string, settings?: { geoEyes?: string }): Look {
  const look = lookById(id);
  return id === "geo" && settings?.geoEyes === "own" ? ({ ...look, eyes: undefined } as Look) : look;
}

// one layer canvas for every drawing (the look's whole-figure effects draw through it)
let layer: HTMLCanvasElement | null = null;
const layerCanvas = () => (layer ??= document.createElement("canvas"));

/** Fit a canvas to its box on screen (sharp on high-density screens). */
export function fit(cv: HTMLCanvasElement, maxDpr = 2): { ctx: CanvasRenderingContext2D; W: number; H: number } | null {
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (W < 8 || H < 8) return null;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H };
}

/** Where the figure goes in a W×H box for a framing (a little air round it). */
function box(W: number, H: number, framing: Framing, pad = 0.06) {
  return { x: W * pad, y: H * pad, w: W * (1 - 2 * pad), h: H * (1 - 2 * pad) * (framing === "full" ? 0.97 : 1) };
}

/** Draw one figure in a state. */
export function drawIn(cv: HTMLCanvasElement, card: CharacterCard, look: Look, framing: Framing, state: Partial<CharacterState>, o: { mirror?: boolean; pad?: number; maxDpr?: number; fitTo?: CharacterCard } = {}) {
  const f = fit(cv, o.maxDpr);
  if (!f) return;
  const c = { ...card, framing };
  // fitTo: size the picture by another card (the widest option), so a row of options shares one scale
  const fr = frameFor(o.fitTo ? { ...o.fitTo, framing } : c, look, framing, box(f.W, f.H, framing, o.pad));
  // a soft floor shadow under full figures, so they stand on something
  if (framing === "full") {
    const g = f.ctx.createRadialGradient(f.W / 2, fr.y, 0, f.W / 2, fr.y, f.W * 0.32);
    g.addColorStop(0, "rgba(0,0,0,0.38)"); g.addColorStop(1, "rgba(0,0,0,0)");
    f.ctx.save(); f.ctx.translate(0, fr.y); f.ctx.scale(1, 0.18); f.ctx.translate(0, -fr.y);
    f.ctx.fillStyle = g; f.ctx.fillRect(0, fr.y - f.W * 0.32, f.W, f.W * 0.64); f.ctx.restore();
  }
  drawFigure(f.ctx, c, { look, S: fr.S, x: fr.x, y: fr.y, mirror: o.mirror, state, layerSize: { w: f.W, h: f.H }, layerCanvas: layerCanvas() });
}

/** A still: resting, eyes open, a hint of a smile. */
export function drawStill(cv: HTMLCanvasElement, card: CharacterCard, look: Look, framing: Framing, view = 0, fitTo?: CharacterCard) {
  const state = autoPerformance(0.35, { seed: card.seed ?? 1, talking: false, pose: "rest", view });
  drawIn(cv, card, look, framing, state, { fitTo });
}

// ---- moving clips --------------------------------------------------------------------------------

export interface Clip {
  id: string;
  label: string;
  tip: string;
  /** A move from the motion library; none = standing, breathing, blinking (and talking, if asked). */
  move?: string;
  talking?: boolean;
  /** 0 front · 1 three-quarter · 2 profile. */
  view?: number;
  /** Hair, hems and earrings trail the body (follow-through). */
  follow?: boolean;
  /** A chair under them. */
  chair?: boolean;
  framing?: Framing;
}

/** The preview strip, in Ak's order: idle, talk, hair, sit, stand, walk, wave, dance, then acted moves. */
export const CLIPS: Clip[] = [
  { id: "idle", label: "Idle", tip: "Standing between lines: breathing, blinking, a small sway." },
  { id: "talk", label: "Talking", talking: true, framing: "waist", tip: "Talking: the mouth shapes and the hands that go with the words." },
  { id: "hair", label: "Hair motion", move: "cheer", follow: true, tip: "A cheer with a jump, so you see the hair and clothes swing and settle." },
  { id: "sit", label: "Sitting", move: "ual-sit-idle", chair: true, tip: "Sitting on a chair." },
  { id: "stand", label: "Stand up", move: "stand-up", chair: true, tip: "Getting up from the chair." },
  { id: "walk", label: "Side walk", move: "ual-walk", view: 2, follow: true, tip: "Walking seen from the side: the profile, the stride, the hair." },
  { id: "wave", label: "Wave", move: "wave-hello", follow: true, tip: "Waving hello." },
  { id: "dance", label: "Dance", move: "ual-dance", follow: true, tip: "A little dance." },
  { id: "laugh", label: "Big laugh", move: "laugh-big", follow: true, tip: "A big laugh, copied from a real person." },
  { id: "shrug", label: "Shrug", move: "shrug-acted", tip: "A shrug, copied from a real person." },
  { id: "surprised", label: "Surprised", move: "surprised", tip: "Surprised, copied from a real person." },
];

/** How long one loop of a clip is, ms. */
export function clipLength(clip: Clip): number {
  const m = clip.move ? SHELF[clip.move] : null;
  if (!m) return clip.talking ? 7800 : 6000;
  return Math.round(Math.min(m.lengthMs, 7000) + 1500);
}

const TALK = ["explain", "point", "shrug", "think", "hips"];

/** The state of a clip at time t (ms since it started). */
export function clipFrame(clip: Clip, t: number, seed = 2): { state: CharacterState; mirror: boolean } {
  const len = clipLength(clip), ms = t % len, view = clip.view ?? 0;
  if (!clip.move) {
    const state = autoPerformance(ms / 1000, { seed, talking: !!clip.talking, pose: clip.talking ? TALK[Math.floor(ms / 2600) % TALK.length] : "rest", poseK: 1, view });
    return { state, mirror: false };
  }
  const end = Math.min(SHELF[clip.move].lengthMs, 7000) + 300;
  const spans = [{ startMs: 300, endMs: end, move: clip.move, seed: 2 }];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const perf: any = performAt({ poseSpans: [], moveSpans: spans as any, shelf: SHELF }, ms, { view, energy: 0.6, seed: 2 });
  const ap = autoPerformance(ms / 1000, { seed, talking: false });
  const props = [...(perf.props ?? []), ...(clip.chair ? [{ id: "chair", hand: "F", open: 0 }] : [])];
  const state: any = characterState({ timeMs: ms, viseme: 0, mix: 1, head: ap.head ?? undefined, active: false, view, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props, face: perf.faceCue } as any, breath: perf.breath });
  state.lid = ap.lid;
  if (clip.follow) {
    state.follow = followAt((x) => {
      const mv: any = movesAt(spans as any, SHELF, Math.max(0, x), { energy: 0.6, seed: 2 });
      const J = mv?.joints, w = J ? J.w ?? 1 : 0, root = J?.root ? [J.root[0] * w, J.root[1] * w] : [0, 0];
      return { x: root[0], y: root[1], rot: ((J?.head ? J.head[0] * w : 0) * Math.PI) / 180, hipX: root[0], hipY: root[1] };
    }, ms);
  }
  return { state, mirror: perf.facing === "left" };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ---- one clock -------------------------------------------------------------------------------------
// The stage draws every frame. The small clips TAKE TURNS: a couple of them per frame, round the
// strip, so eleven moving characters never slow the big one down (measured 7 Nov: drawing all of
// them every frame dropped the screen to 24 frames a second; taking turns keeps it near 60).

type Tick = (now: number) => void;
const subs = new Set<Tick>();
const turns: Tick[] = [];
let next = 0;
const PER_FRAME = 2;
let raf = 0;
const loop = (now: number) => {
  raf = 0;
  if (!document.hidden) {
    for (const s of subs) s(now);
    for (let i = 0; i < Math.min(PER_FRAME, turns.length); i++) turns[(next++) % turns.length](now);
  }
  if (subs.size || turns.length) raf = requestAnimationFrame(loop);
};
/** Run `fn` every frame (or, with `takeTurns`, in turn with the other small ones) until the returned function is called. */
export function subscribe(fn: Tick, takeTurns = false): () => void {
  if (takeTurns) turns.push(fn); else subs.add(fn);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => { if (takeTurns) { const i = turns.indexOf(fn); if (i >= 0) turns.splice(i, 1); } else subs.delete(fn); };
}

/**
 * The main colour, lifted until it glows on a dark screen (navy becomes a clear blue); the
 * same hue, so it still reads as theirs. The true colour stays for the colour chip.
 */
export function litColor(hex: string, minLight = 0.62): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? "");
  if (!m) return "#76ffc2";
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const L = Math.max(l, minLight), S = Math.min(1, Math.max(s, l < 0.3 ? 0.55 : s));
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), mm = L - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [R, G, B].map((v) => Math.round(Math.min(1, Math.max(0, v + mm)) * 255).toString(16).padStart(2, "0")).join("");
}

/** Does this person want less motion? (Then clips show one still frame.) */
export const calmMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
