// `type` on VisemeId is load-bearing: it's a type-only export, and importing it
// as a value makes this module unusable by any tool that erases types per-file
// instead of whole-program (isolatedModules, Node's --experimental-strip-types).
import { graphemeToViseme, HALF, VISEME, type MouthId, type VisemeId } from "./visemeMap";

export interface WordTiming { word: string; start: number; end: number; } // seconds
export interface VisemeFrame { t: number; viseme: MouthId; }             // seconds

const OPEN: Record<number, MouthId> = { [VISEME.AH]: HALF.AH, [VISEME.OH]: HALF.OH, [VISEME.OO]: HALF.OH, [VISEME.EE]: HALF.EE };
const CONSONANT = new Set<number>([VISEME.MBP, VISEME.FV, VISEME.L, VISEME.CH_SH]);
/** In fast speech these read as the shape next door; fewer, steadier shapes. */
const FAST_MERGE: Record<number, VisemeId> = { [VISEME.OO]: VISEME.OH, [VISEME.CH_SH]: VISEME.EE };

/**
 * Words → mouth shapes over time (13 Oct 2026, "more subtle mouth movements,
 * so that the mouth flows" — Ak). Five rules on top of letters-to-shapes:
 *
 *  1. HOLD: a shape stays at least ~100 ms (or `minHoldFrames`, whichever is
 *     longer) — shorter ones flicker.
 *  2. FAST SPEECH: when a letter gets under 90 ms, OO is read as OH and SH as
 *     EE; a consonant under 60 ms inside a word is skipped (except M·B·P, the
 *     lips really do close for those).
 *  3. SHORT VOWELS are small: under 110 ms, the half-open shape.
 *  4. IN-BETWEENS: one full open shape to another goes through the target's
 *     half shape first, when there is time for both.
 *  5. PAUSES: the mouth closes between words only when the gap is real
 *     (over 120 ms); otherwise it carries on into the next word.
 */
export function buildVisemeTrack(
  words: WordTiming[],
  fps: number,
  minHoldFrames = 2
): VisemeFrame[] {
  const frames: VisemeFrame[] = [];
  const minHold = Math.max(minHoldFrames / fps, 0.1);
  const push = (t: number, v: MouthId) => {
    const last = frames[frames.length - 1];
    if (last && last.viseme === v) return; // dedupe repeats
    if (last && t - last.t < minHold) return; // enforce the hold
    frames.push({ t, viseme: v });
  };
  for (const [wi, w] of words.entries()) {
    const prev = words[wi - 1];
    if (prev && w.start - prev.end > 0.12) push(prev.end, VISEME.NEUTRAL);
    const vs = graphemeToViseme(w.word);
    const dur = w.end - w.start;
    const per = dur / Math.max(1, vs.length);
    vs.forEach((raw, i) => {
      const t = w.start + i * per;
      let v: MouthId = per < 0.09 ? FAST_MERGE[raw] ?? raw : raw;
      if (per < 0.06 && CONSONANT.has(v) && v !== VISEME.MBP && i > 0 && i < vs.length - 1) return;
      if (per < 0.11 && OPEN[v] !== undefined) v = OPEN[v];
      const last = frames[frames.length - 1];
      // in-between: full open → another full open, with room for two holds
      if (last && OPEN[last.viseme] !== undefined && OPEN[v] !== undefined && last.viseme !== v && per >= minHold * 2 && t - last.t >= minHold) {
        push(t, OPEN[v]);
        push(t + minHold, v);
        return;
      }
      push(t, v);
    });
  }
  // trailing rest
  const lastWord = words[words.length - 1];
  if (lastWord) frames.push({ t: lastWord.end, viseme: VISEME.NEUTRAL });
  return frames;
}

/** A viseme mid-change: the cell being left, the cell being entered, and how
 *  far through. `mix` of 1 means the change is complete. */
export interface VisemeBlend {
  from: MouthId;
  to: MouthId;
  mix: number;
}

/**
 * Same lookup as visemeAt, but reporting the outgoing cell too, so the avatar
 * can cross-fade instead of cutting.
 *
 * A hard cut between two photoreal mouth shapes is what makes sprite lip-sync
 * read as cheap — the eye sees a substitution rather than a movement. A fade of
 * even a couple of frames turns it into motion. `fadeSec` of 0 gives the old
 * hard cut back.
 *
 * Still pure: derived entirely from `t` and the track, so a render worker
 * handling frame 900 in isolation computes the same blend as the preview.
 */
export function visemeBlendAt(
  track: VisemeFrame[],
  t: number,
  fadeSec: number
): VisemeBlend {
  let lo = 0;
  let hi = track.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (track[mid].t <= t) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (idx < 0) return { from: VISEME.NEUTRAL, to: VISEME.NEUTRAL, mix: 1 };

  const to = track[idx].viseme;
  const from = idx > 0 ? track[idx - 1].viseme : VISEME.NEUTRAL;
  if (fadeSec <= 0 || from === to) return { from, to, mix: 1 };

  const mix = Math.min(1, Math.max(0, (t - track[idx].t) / fadeSec));
  return { from, to, mix };
}

/** Viseme in effect at time `t` (seconds). Binary search rather than a scan:
 *  this is called once per speaker per frame, so on a 10-minute 30fps render
 *  a linear walk over a few thousand keyframes turns into tens of millions of
 *  comparisons for no reason. Tracks are always built in ascending `t`. */
export function visemeAt(track: VisemeFrame[], t: number): MouthId {
  let lo = 0;
  let hi = track.length - 1;
  let v: MouthId = VISEME.NEUTRAL;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (track[mid].t <= t) {
      v = track[mid].viseme;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return v;
}
