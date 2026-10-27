// ---------------------------------------------------------------------------
// Sound effects for an explainer: WHERE they fall, WHICH sound, HOW loud.
//
// Pure and deterministic: the same scene list always gives the same cues, so
// the preview, the render and the tests agree. Nothing here makes a sound or
// touches a file; explainer/stage + tools/lib/explainerRun.mjs mix the cues
// from the sounds that already ship in sfx/library (no new sounds are made).
//
//   whoosh  every scene change (felt early in the tile transition, so it leads the picture)
//   riser   a soft build-up that ends exactly where the last scene begins
//   pop     an element appears: list/step items, a number, a chart, a heading
//   ding    the closing line lands (and the "after" side of a comparison)
//
// Rules: never two cues closer than MIN_GAP_SEC (the more important one
// wins); cues that fall on a spoken word are quieter; a calm or "subtle"
// setting keeps only the big moments (whooshes, riser, final ding).
// ---------------------------------------------------------------------------

import { resolveSpec } from "./spec.mjs";

export const MIN_GAP_SEC = 0.25;
export const DEFAULT_AMOUNT = 0.6;
/** A cue that lands while someone is speaking is this much of its volume. */
export const SPEECH_DUCK = 0.55;
/** The whoosh is felt this long after a scene starts: early in the 0.7 s tile transition, so it leads the picture. */
export const WHOOSH_AT = 0.25;

/**
 * The sounds, by role. `file` is a name in sfx/library (without .wav).
 * `lead` = seconds from the start of the file to the moment you "feel" it,
 * measured on the files (50 ms loudness steps, 26 Oct 2026): the cue's time
 * is that moment, the mixer starts the file `lead` earlier.
 */
export const SOUNDS = {
  whoosh: { file: "whoosh-soft", lead: 0.37, gain: 0.55, maxLen: 1.3, label: "whoosh" },
  riser: { file: "whoosh-soft", lead: 1.23, gain: 0.4, reverse: true, skip: 0.4, label: "riser" },
  pop: { file: "pop-in", lead: 0.02, gain: 0.5, label: "pop" },
  tick: { file: "notification-pop", lead: 0.02, gain: 0.42, label: "soft pop" },
  ding: { file: "ding-correct", lead: 0.02, gain: 0.38, maxLen: 1.4, label: "ding" },
};

/** Higher wins when two cues are too close. */
const PRIORITY = { riser: 5, ding: 4, whoosh: 3, tick: 2, pop: 1 };

/** Where the sounds come from, for the credits file next to a render. */
export const SFX_CREDITS = {
  source: "Video Forge sound-effects library (sfx/library)",
  made: "Made on this computer with Stable Audio Open (tools/make-sfx.py).",
  licence: "Stable Audio Open: Stability AI Community License. Free for commercial use below USD 1M yearly revenue; the maker owns the outputs. The model was trained only on CC0, CC-BY and CC Sampling+ recordings (Freesound).",
  attribution: "No attribution is required.",
};

/** Settings from a scene list (UI or file). `sfx` may be absent: on, default amount. */
export function sfxSettings(spec) {
  const s = spec?.sfx ?? {};
  const amount = typeof s.amount === "number" ? Math.min(1, Math.max(0, s.amount)) : DEFAULT_AMOUNT;
  return { on: s.on !== false, amount };
}

/** 0 = big moments only, 1 = plus pops on elements, 2 = lively (every reveal). */
export function densityFor(amount, calm) {
  if (calm || amount < 0.35) return 0;
  return amount < 0.75 ? 1 : 2;
}

/** Overall loudness of the effects for an amount 0..1 (never silent, never loud). */
export const volumeFor = (amount) => 0.45 + 0.55 * amount;

const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * The cues for a scene list, sorted by time.
 * Each: { t, kind, sound, gain, scene, why }.
 *   t     seconds, when the effect is felt
 *   gain  0..1 (kind volume × amount × speech reduction)
 * Returns { on, amount, level, cues }. Off → no cues.
 */
export function planSfx(spec, over = {}) {
  const set = { ...sfxSettings(spec), ...over };
  const R = spec.scenes?.[0]?.start != null ? spec : resolveSpec(spec);
  const level = densityFor(set.amount, R.calm);
  if (!set.on) return { on: false, amount: set.amount, level, duration: R.duration, cues: [] };
  const words = R.words ?? [];
  const n = R.scenes.length;
  const cand = [];
  const add = (t, kind, scene, why) => { if (t >= 0.05 && t <= R.duration - 0.1) cand.push({ t: r3(t), kind, scene, why }); };

  R.scenes.forEach((s, i) => {
    const last = i === n - 1;
    // a build-up into the closing scene (when there are enough scenes before it)
    const riser = last && n >= 3 && (s.kind === "takeaway" || s.kind === "title");
    if (i > 0) {
      if (riser) add(s.start, "riser", i, "build-up into the last scene");
      else add(s.start + WHOOSH_AT, "whoosh", i, "scene change");
    }
    if (level === 0) {
      if (s.kind === "takeaway") add(s.start + 0.35, "ding", i, "the closing line lands");
      return;
    }
    const items = Array.isArray(s.items) ? s.items : [];
    switch (s.kind) {
      case "title": add(s.start + 0.3, "pop", i, "the title appears"); break;
      case "points": case "steps":
        items.forEach((it, j) => add(it.at + 0.05, "pop", i, `item ${j + 1} appears`));
        break;
      case "number": add(s.start + 0.55, "tick", i, "the number starts counting"); break;
      case "bars":
        items.forEach((_, j) => { if (j === 0 || level === 2) add(s.start + 0.55 + j * 0.22, "pop", i, `bar ${j + 1} grows`); });
        break;
      case "compare":
        add(s.start + 0.55, "pop", i, "the first side appears");
        add(s.start + Math.max(1.2, (s.end - s.start) * 0.42), "ding", i, "the second side appears");
        break;
      case "takeaway": add(s.start + 0.35, "ding", i, "the closing line lands"); break;
      default: break;
    }
  });

  // never two cues within MIN_GAP_SEC: the most important stays, then the earlier one
  const order = [...cand].sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || a.t - b.t);
  const kept = [];
  for (const c of order) if (kept.every((k) => Math.abs(k.t - c.t) >= MIN_GAP_SEC - 1e-9)) kept.push(c);
  kept.sort((a, b) => a.t - b.t || PRIORITY[b.kind] - PRIORITY[a.kind]);

  const vol = volumeFor(set.amount);
  const cues = kept.map((c) => {
    const spoken = words.some((w) => c.t >= w.start - 0.03 && c.t <= w.end);
    const g = SOUNDS[c.kind].gain * vol * (spoken ? SPEECH_DUCK : 1);
    return { ...c, sound: SOUNDS[c.kind].file, gain: r3(g), spoken };
  });
  return { on: true, amount: set.amount, level, duration: R.duration, cues };
}

/** Counts by kind, e.g. { whoosh: 6, pop: 9, ding: 1, riser: 1 } — for a one-line summary. */
export function countCues(cues) {
  const out = {};
  for (const c of cues) out[c.kind] = (out[c.kind] ?? 0) + 1;
  return out;
}

/** The credits text written next to a render that used the sounds. */
export function creditsText(cues) {
  const files = [...new Set(cues.map((c) => c.sound))].sort();
  return [
    "Sound effects in this video",
    "",
    `Sounds used: ${files.join(", ")}`,
    `Source: ${SFX_CREDITS.source}`,
    SFX_CREDITS.made,
    `Licence: ${SFX_CREDITS.licence}`,
    SFX_CREDITS.attribution,
    "",
    `${cues.length} effects placed:`,
    ...cues.map((c) => `  ${c.t.toFixed(2)} s  ${SOUNDS[c.kind].label} (${c.sound}) - ${c.why}`),
    "",
  ].join("\n");
}
