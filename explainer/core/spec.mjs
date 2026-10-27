// ---------------------------------------------------------------------------
// The scene list: what a model (or a person) writes for each explainer.
//
// A style kit draws; the scene list only says WHAT happens WHEN. Keeping it
// this small is what lets a cheap, fast model write it reliably (plan §3,
// "Path 2"). validateSpec says exactly what is wrong so the error can go back
// to the model; resolveSpec turns word anchors into seconds and works out the
// frame, the puppet spots and the content box.
//
// {
//   "style": "stravelakis", "scheme": "night", "format": "9:16", "fps": 30,
//   "puppets": { "count": 2, "shape": "circle" },        // optional
//   "words": [{ "text": "Short", "start": 0.12, "end": 0.4 }, ...],   // optional
//   "scenes": [
//     { "kind": "title", "at": 0, "kicker": "Dog training", "text": "Why short sessions win" },
//     { "kind": "points", "at": { "word": 9 }, "title": "...", "items": ["...", { "text": "...", "at": 6.2 }] },
//     ...
//   ]
// }
// ---------------------------------------------------------------------------

import { FORMATS, contentBox, explainerSpots, holesFor, SPOT_SHAPES } from "./frame.mjs";
import { TINT_PRESETS, resolveTint } from "./tint.mjs";

const HEX = /^#[0-9a-f]{6}$/i;

/** Scene kinds and their fields. `items` hold strings or { text, at? }. */
export const KINDS = {
  title: { need: ["text"], optional: ["kicker"] },
  points: { need: ["items"], optional: ["title"], items: [1, 4] },
  steps: { need: ["items"], optional: ["title"], items: [2, 5] },
  number: { need: ["value", "label"], optional: ["prefix", "suffix", "from"] },
  bars: { need: ["items"], optional: ["title", "unit"], items: [2, 6] },
  compare: { need: ["left", "right"], optional: ["title"] },
  takeaway: { need: ["text"], optional: ["kicker"] },
};

/** Longest text a field may hold (characters) — beyond that it cannot stay readable. */
const MAX_CHARS = { text: 70, kicker: 28, title: 48, item: 46, label: 40, side: 24 };

export const MIN_SCENE_SEC = 1.6;

function at(spec, a, errs, where) {
  if (a == null) return null;
  if (typeof a === "number") return a;
  if (typeof a === "object" && Number.isInteger(a.word)) {
    const w = spec.words?.[a.word];
    if (!w) { errs.push(`${where}: word ${a.word} does not exist (there are ${spec.words?.length ?? 0} words)`); return null; }
    return w.start;
  }
  errs.push(`${where}: "at" must be seconds or { "word": n }`);
  return null;
}

const itemText = (it) => (typeof it === "string" ? it : it?.text);

/** Everything wrong with a scene list, as plain sentences. Empty = good. */
export function validateSpec(spec) {
  const errs = [];
  if (!spec || typeof spec !== "object") return ["the scene list is not an object"];
  if (!FORMATS[spec.format]) errs.push(`format must be one of ${Object.keys(FORMATS).join(", ")}`);
  if (spec.calm != null && typeof spec.calm !== "boolean") errs.push("calm must be true or false");
  if (spec.sfx != null) {
    if (typeof spec.sfx !== "object" || (spec.sfx.on != null && typeof spec.sfx.on !== "boolean")) errs.push('sfx must look like { "on": true, "amount": 0–1 }');
    else if (spec.sfx.amount != null && !(typeof spec.sfx.amount === "number" && spec.sfx.amount >= 0 && spec.sfx.amount <= 1)) errs.push("sfx.amount must be a number from 0 (subtle) to 1 (lively)");
  }
  if (spec._note != null && typeof spec._note !== "string") errs.push("_note must be text");
  if (spec.puppets) {
    const n = spec.puppets.count;
    if (![0, 1, 2, 3].includes(n)) errs.push("puppets.count must be 0–3");
    if (spec.puppets.shape && !SPOT_SHAPES.includes(spec.puppets.shape)) errs.push(`puppets.shape must be ${SPOT_SHAPES.join(", ")}`);
  }
  if (spec.font != null && (typeof spec.font !== "string" || !spec.font.trim() || spec.font.length > 60)) errs.push("font must be a family name, e.g. \"Inter\"");
  if (spec.colors != null) {
    if (!HEX.test(spec.colors.background ?? "") || !HEX.test(spec.colors.accent ?? "")) errs.push('colors needs "background" and "accent" as #rrggbb');
    if (spec.colors.text != null && !HEX.test(spec.colors.text)) errs.push('colors.text must be #rrggbb');
  }
  if (spec.tint != null) {
    if (typeof spec.tint === "string" ? !TINT_PRESETS[spec.tint] : !resolveTint(spec.tint)) errs.push(`tint must be one of ${Object.keys(TINT_PRESETS).join(", ")} or { "dark": "#rrggbb", "light": "#rrggbb", "amount": 0–1 }`);
  }
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) { errs.push("scenes must be a non-empty list"); return errs; }
  let prev = -Infinity;
  spec.scenes.forEach((s, i) => {
    const where = `scene ${i + 1} (${s?.kind ?? "?"})`;
    const k = KINDS[s?.kind];
    if (!k) { errs.push(`${where}: kind must be one of ${Object.keys(KINDS).join(", ")}`); return; }
    for (const f of k.need) if (s[f] == null || s[f] === "") errs.push(`${where}: missing "${f}"`);
    for (const f of Object.keys(s)) if (!["kind", "at", ...k.need, ...k.optional].includes(f)) errs.push(`${where}: unknown field "${f}"`);
    const t = at(spec, s.at ?? (i === 0 ? 0 : undefined), errs, where);
    if (t == null && i > 0) errs.push(`${where}: missing "at"`);
    if (t != null) {
      if (t < prev + MIN_SCENE_SEC) errs.push(`${where}: starts ${(t - prev).toFixed(2)} s after the last scene; give each scene at least ${MIN_SCENE_SEC} s`);
      prev = t;
    }
    for (const f of ["text", "kicker", "title", "label"]) if (typeof s[f] === "string" && s[f].length > MAX_CHARS[f]) errs.push(`${where}: "${f}" is ${s[f].length} characters; keep it under ${MAX_CHARS[f]}`);
    if (k.items) {
      if (!Array.isArray(s.items)) errs.push(`${where}: items must be a list`);
      else {
        const [lo, hi] = k.items;
        if (s.items.length < lo || s.items.length > hi) errs.push(`${where}: needs ${lo}–${hi} items, has ${s.items.length}`);
        s.items.forEach((it, j) => {
          const txt = s.kind === "bars" ? it?.label : itemText(it);
          if (!txt) errs.push(`${where}: item ${j + 1} has no text`);
          else if (txt.length > MAX_CHARS.item) errs.push(`${where}: item ${j + 1} is ${txt.length} characters; keep it under ${MAX_CHARS.item}`);
          if (s.kind === "bars" && !(typeof it?.value === "number" && it.value >= 0)) errs.push(`${where}: item ${j + 1} needs a number "value" ≥ 0`);
        });
      }
    }
    if (s.kind === "number" && typeof s.value !== "number") errs.push(`${where}: "value" must be a number`);
    // the number is drawn huge on one line: words around it must stay short (move the rest to "label")
    if (s.kind === "number" && `${s.prefix ?? ""}${s.suffix ?? ""}`.length > 10) errs.push(`${where}: "prefix" + "suffix" are ${`${s.prefix ?? ""}${s.suffix ?? ""}`.length} characters; keep them under 10 and put the words in "label"`);
    if (s.kind === "compare") for (const side of ["left", "right"]) {
      const v = s[side];
      if (!v || typeof v.title !== "string" || !Array.isArray(v.items) || v.items.length < 1 || v.items.length > 3) errs.push(`${where}: "${side}" needs { "title", "items": 1–3 }`);
      else if (v.title.length > MAX_CHARS.side) errs.push(`${where}: "${side}.title" is too long (max ${MAX_CHARS.side})`);
      else v.items.forEach((it, j) => { const tx = itemText(it); if (!tx || tx.length > MAX_CHARS.item) errs.push(`${where}: "${side}" item ${j + 1} is missing or too long`); });
    }
  });
  return errs;
}

/**
 * Normalise a VALID scene list: absolute start/end per scene and per item,
 * the frame size, puppet holes and the content box.
 */
export function resolveSpec(spec) {
  const { width: W, height: H } = FORMATS[spec.format];
  const fps = spec.fps ?? 30;
  const errs = [];
  const starts = spec.scenes.map((s, i) => at(spec, s.at ?? 0, errs, `scene ${i + 1}`) ?? 0);
  const lastWord = spec.words?.length ? spec.words[spec.words.length - 1].end : 0;
  const duration = spec.duration ?? Math.max(starts[starts.length - 1] + 4, lastWord + 0.8);
  const scenes = spec.scenes.map((s, i) => {
    const start = starts[i], end = i + 1 < starts.length ? starts[i + 1] : duration;
    const out = { ...s, start, end, index: i };
    if (Array.isArray(s.items)) {
      // items without their own time are spread over the first 60 % of the scene
      const n = s.items.length, span = Math.min(0.6 * (end - start), 0.9 * n);
      out.items = s.items.map((it, j) => {
        const base = typeof it === "string" ? { text: it } : { ...it };
        const t = at(spec, base.at, errs, `scene ${i + 1} item ${j + 1}`);
        return { ...base, at: t ?? start + 0.45 + (n > 1 ? (span * j) / n : 0) };
      });
    }
    return out;
  });
  const slots = spec.slots ?? (spec.puppets?.count ? explainerSpots(spec.format, spec.puppets.count, spec.puppets.shape ?? "circle") : []);
  const holes = holesFor(slots, W, H, spec.puppets?.shape ?? "circle");
  return {
    W, H, fps, duration, scenes, slots, holes, box: contentBox(W, H, holes),
    scheme: spec.scheme ?? "night", style: spec.style ?? "stravelakis", words: spec.words ?? [],
    font: spec.font ?? "Sora", colors: spec.colors ?? null, tint: resolveTint(spec.tint),
    // calm: the background holds still (GIFs: only the story moves, so the file stays small)
    calm: spec.calm === true,
    // sound effects: { on, amount } — planned by core/sfx.mjs
    sfx: spec.sfx,
  };
}
