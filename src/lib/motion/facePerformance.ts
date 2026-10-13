// ---------------------------------------------------------------------------
// What a puppet's eyes and brows do, moment to moment.
//
// This is the half of the layered puppet that the sprite sheet could never
// express. A sheet bakes one pair of eyes and one pair of brows into each of
// its nine faces, so a character physically cannot blink in the middle of a
// word or raise a brow at a question mark. Splitting the layers apart made it
// possible; this module is what actually makes it happen.
//
// Two independent things live here because they are driven by two different
// clocks:
//
//   - BLINKING is time-driven. It has nothing to do with the script; a face
//     blinks while talking, while listening, and over silence.
//   - BROWS are script-driven. They react to punctuation, which is the only
//     emotional signal the text actually carries.
//
// PURE, like everything else on the render path: same inputs, same answer, no
// clock of its own, no randomness. Remotion renders frames out of order across
// parallel workers, so anything stateful here would produce a video whose eyes
// blink at different times depending on how the work happened to be split.
// ---------------------------------------------------------------------------

import type { NarrationSegment } from "../../store/types";
import { buildCues } from "../subtitles/wordTiming";

/** Lid state names, matching the keys in a puppet's `eyes.lids`. */
export type LidState = "open" | "half" | "closed";

// ---------------------------------------------------------------------------
// Blinking
// ---------------------------------------------------------------------------

/** A blink, start to finish. Real ones are 100–150ms; at 30fps that is about
 *  four frames, which is exactly enough for half → closed → closed → half and
 *  is why the "half" lid asset earns its place. Any faster and the eye appears
 *  to teleport shut. */
const BLINK_MS = 150;

/** Roughly one blink per window, so ~16/minute — the low end of the resting
 *  human rate. Deliberately low: an avatar that blinks at a true conversational
 *  rate reads as nervous on a 30-second clip. */
const WINDOW_MS = 3800;

/** How often a window gets a second blink right after the first. People blink
 *  in pairs more than they blink evenly, and this is most of what separates
 *  "alive" from "metronome". */
const DOUBLE_CHANCE = 0.22;

/** Stable 0..1 from a string. Same construction as idleMotion's phase — two
 *  speakers must not blink in unison, which is the single most artificial
 *  thing a pair of avatars can do. */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Where a blink sits inside window `k`, and whether it doubles. */
function windowBlinks(seed: string, k: number): number[] {
  const start = hash01(`${seed}:${k}:at`) * (WINDOW_MS - BLINK_MS * 2.5);
  const blinks = [k * WINDOW_MS + start];
  if (hash01(`${seed}:${k}:dbl`) < DOUBLE_CHANCE) {
    // 90–170ms of open eye between the two, which is what a real double blink
    // looks like; longer and it reads as two unrelated blinks.
    blinks.push(blinks[0] + BLINK_MS + 90 + hash01(`${seed}:${k}:gap`) * 80);
  }
  return blinks;
}

/**
 * The lid state at a moment.
 *
 * @param amount 0 disables blinking entirely — the same master "how alive is
 *   this face" control the head motion uses. A face that holds perfectly still
 *   but keeps blinking looks stranger than one that does neither.
 */
/** A blink as a CROSSFADE between two lid images, the way the mouth already
 *  works.
 *
 *  The stepped version returned one of three names, and a blink lasts 150ms —
 *  under four frames at 24fps. So an eyelid snapped open → half → closed → half
 *  → open in four hard swaps, in a face where everything else (sway, tilt,
 *  breathing) is a continuous sine. That mismatch is what read as choppy: not
 *  broken, just one element behaving discretely among smooth ones.
 *
 *  Same shape as visemeBlendAt on purpose. The mouth solved this problem long
 *  ago with a fade between cells, and a second mechanism for the same job would
 *  only drift from it. */
export function blinkBlendAt(
  seed: string,
  timeMs: number,
  amount = 1,
  fadeMs = 45
): { from: LidState; to: LidState; mix: number } {
  const hard = blinkAt(seed, timeMs, amount);
  if (fadeMs <= 0) return { from: hard, to: hard, mix: 1 };

  // Look a fade ahead and behind. Where the two disagree there is an edge to
  // smooth, and how far through the fade we are gives the mix.
  const before = blinkAt(seed, timeMs - fadeMs, amount);
  const after = blinkAt(seed, timeMs + fadeMs, amount);

  if (before !== hard) {
    // Just entered `hard` — find how long ago, to the resolution of a step.
    let ago = fadeMs;
    for (let d = 1; d <= fadeMs; d += 3) {
      if (blinkAt(seed, timeMs - d, amount) !== hard) { ago = d; break; }
    }
    return { from: before, to: hard, mix: Math.min(1, ago / fadeMs) };
  }
  if (after !== hard) {
    let until = fadeMs;
    for (let d = 1; d <= fadeMs; d += 3) {
      if (blinkAt(seed, timeMs + d, amount) !== hard) { until = d; break; }
    }
    return { from: hard, to: after, mix: 1 - Math.min(1, until / fadeMs) };
  }
  return { from: hard, to: hard, mix: 1 };
}

export function blinkAt(seed: string, timeMs: number, amount = 1): LidState {
  if (amount <= 0 || timeMs < 0) return "open";

  // The previous window is checked too: a blink placed near the end of its
  // window finishes inside the next one, and missing that would clip it.
  const k = Math.floor(timeMs / WINDOW_MS);
  for (const kk of [k - 1, k]) {
    if (kk < 0) continue;
    for (const start of windowBlinks(seed, kk)) {
      const p = (timeMs - start) / BLINK_MS;
      if (p < 0 || p > 1) continue;
      // Down and up are not symmetric: a real blink snaps shut and opens more
      // slowly, so the closed phase sits early rather than in the middle.
      if (p < 0.18) return "half";
      if (p < 0.62) return "closed";
      return "half";
    }
  }
  return "open";
}

// ---------------------------------------------------------------------------
// Brows
// ---------------------------------------------------------------------------

/**
 * Punctuation → brow set.
 *
 * Note `;` — in Greek that is the QUESTION MARK, not a semicolon, and this app
 * is Greek-first. Getting this wrong would leave every Greek question with a
 * flat, uninterested face.
 *
 * The names are the conventional brow-set keys (`puppet/*.spec.json`). A puppet
 * missing one falls back rather than drawing no brow at all — see `resolveBrow`.
 * This table is the whole emotional vocabulary and is meant to be retuned: to
 * get the sceptical single raised brow the puppets are capable of, give one
 * side "happy" and the other "serious" for a question.
 */
const BROW_FOR: { test: RegExp; set: string }[] = [
  // Ellipsis first — "…" and "..." would otherwise match the full-stop rule.
  { test: /(…|\.\.\.)$/, set: "sad" },
  { test: /[;?]$/, set: "happy" },
  { test: /!$/, set: "angry" },
];

/** The resting face. Not `undefined`: a puppet asked for no brow set draws no
 *  brows at all, which reads as missing art rather than as a neutral face. */
export const BROW_REST = "serious";

export interface BrowSpan {
  startMs: number;
  endMs: number;
  set: string;
}

// ---------------------------------------------------------------------------
// What the script SAYS the line feels
// ---------------------------------------------------------------------------

/**
 * A feeling tag from the script → what the face does for that whole line.
 *
 * WHY THIS BEATS PUNCTUATION. Punctuation is all the face had, so a line could
 * only ask a question or shout. The scripts have carried a feeling on nearly
 * every line all along — `[curiosity]`, `[nervousness]`, `[amazed]` — and 3,600
 * of those tags were being thrown away at the door.
 *
 * Punctuation still applies ON TOP: a mood span covers the line, a question
 * mark inside it wins for its own moment, because it is the later span.
 *
 * `lid` and `rest` are for puppets that have those layers. Anything missing
 * falls back — a face without a "raised" brow uses its resting one rather than
 * drawing nothing.
 */
export interface MoodFace {
  brow?: string;
  /** The eyes' resting state while this feeling lasts. Blinks still happen. */
  lid?: "wide" | "half";
  /** Use the closed-smile mouth between words instead of the neutral one. */
  smile?: boolean;
  head?: HeadGestureKind;
}

const MOOD: Record<string, MoodFace> = {
  // Warm, pleased, fond — the largest group by far, about 900 lines.
  positive: { brow: "happy", smile: true },
  enthusiasm: { brow: "happy", smile: true },
  excitement: { brow: "happy", smile: true },
  excited: { brow: "happy", smile: true },
  amusement: { brow: "happy", smile: true, head: "bob" },
  adoration: { brow: "happy", smile: true },
  admiration: { brow: "happy", smile: true },
  hope: { brow: "happy", smile: true },
  proud: { brow: "happy", smile: true },
  laughs: { brow: "happy", smile: true, head: "bob" },
  giggles: { brow: "happy", smile: true, head: "bob" },
  mischievously: { brow: "happy", smile: true },
  // Teaching, insisting, disapproving. "firm" is the heavy brow drawing; a
  // puppet without one falls back to its resting brows.
  //
  // "[serious]" IS NOT ANGRY. It is on 1,500 lines and in these scripts it
  // means "calm, teaching tone". Drawn with the serious brows, the first render
  // had all three of them glaring through a lesson about chewed slippers —
  // Καίτη smiling with a scowl on top. The resting face is what calm looks
  // like; the heavy brows are kept for the lines that really are firm.
  serious: {},
  seriousness: {},
  determination: { brow: "firm" },
  frustration: { brow: "firm", head: "shake" },
  annoyance: { brow: "firm" },
  negative: { brow: "firm", head: "shake" },
  sarcastic: { brow: "confused" },
  // Taken aback.
  amazed: { brow: "raised", lid: "wide" },
  surprise: { brow: "raised", lid: "wide" },
  awe: { brow: "raised", lid: "wide" },
  gasp: { brow: "raised", lid: "wide" },
  // Uneasy.
  nervousness: { brow: "worried" },
  tension: { brow: "worried" },
  panicked: { brow: "worried", lid: "wide" },
  trembling: { brow: "worried" },
  agitation: { brow: "worried" },
  sadness: { brow: "worried", head: "droop" },
  reluctantly: { brow: "worried", head: "droop" },
  // Asking, wondering.
  curiosity: { head: "tilt" },
  curious: { head: "tilt" },
  interest: { head: "tilt" },
  confusion: { brow: "confused", head: "tilt" },
  // Yes and no, asked for in the script (Ak, 12 Oct 2026): [nods], [shakes head].
  nods: { head: "nod" },
  nod: { head: "nod" },
  agrees: { head: "nod" },
  yes: { head: "nod" },
  "shakes head": { head: "shake" },
  shakes: { head: "shake" },
  disagrees: { head: "shake" },
  no: { brow: "firm", head: "shake" },
  // Settled.
  neutral: {},
  tired: { lid: "half" },
  sighs: { lid: "half" },
};

/** The face for a feeling, or nothing when the tag is not one we dress. */
export function moodFace(mood: string | undefined): MoodFace | undefined {
  return mood ? MOOD[mood] : undefined;
}

/** Spans of feeling per speaker — one per line that carries a tag.
 *
 *  Separate from the brow track because a feeling drives more than brows: the
 *  eyes rest differently, the mouth rests differently, and the head moves. */
export function buildSpeakerMoodTracks(
  segments: NarrationSegment[]
): Record<string, { startMs: number; endMs: number; mood: string }[]> {
  const tracks: Record<string, { startMs: number; endMs: number; mood: string }[]> = {};
  for (const seg of segments) {
    if (!seg.mood) continue;
    (tracks[seg.speakerId] ??= []).push({
      startMs: seg.startMs,
      endMs: seg.endMs,
      mood: seg.mood,
    });
  }
  return tracks;
}

/** The feeling in play for this speaker at this moment. */
export function moodAt(
  spans: { startMs: number; endMs: number; mood: string }[] | undefined,
  timeMs: number
): string | undefined {
  let mood: string | undefined;
  for (const s of spans ?? []) {
    if (timeMs >= s.startMs && timeMs < s.endMs) mood = s.mood;
  }
  return mood;
}

/** Brows lead the voice slightly — they move as the phrase turns, not after
 *  it lands. A brow that rises on the question mark itself is always late. */
const BROW_LEAD_MS = 220;
/** And hold a moment after, rather than snapping back the instant the word
 *  ends, which looks like a twitch. */
const BROW_HOLD_MS = 320;

/**
 * Brow spans per speaker, from the punctuation in their lines.
 *
 * Built off `buildCues` for the same reason the viseme tracks are: those word
 * timings are what the subtitles and the mouth already use, and a brow driven
 * by an independently-derived clock would drift against the face it belongs to.
 */
export function buildSpeakerBrowTracks(
  segments: NarrationSegment[]
): Record<string, BrowSpan[]> {
  const tracks: Record<string, BrowSpan[]> = {};

  for (const seg of segments) {
    // THE LINE'S OWN FEELING FIRST, under everything else. Pushed before the
    // punctuation spans so that where they overlap the punctuation wins —
    // `browAt` takes the last span covering the moment — which is what you
    // want: a fond line that happens to ask a question raises its brows for
    // the question and goes back to fond afterwards.
    const face = moodFace(seg.mood);
    if (face?.brow) {
      (tracks[seg.speakerId] ??= []).push({
        startMs: Math.max(0, seg.startMs - BROW_LEAD_MS),
        endMs: seg.endMs + BROW_HOLD_MS,
        set: face.brow,
      });
    }
    const cues = buildCues([seg], Number.MAX_SAFE_INTEGER);
    for (const cue of cues) {
      for (const w of cue.words) {
        const hit = BROW_FOR.find((r) => r.test.test(w.text));
        if (!hit) continue;
        (tracks[seg.speakerId] ??= []).push({
          startMs: Math.max(0, w.startMs - BROW_LEAD_MS),
          endMs: w.endMs + BROW_HOLD_MS,
          set: hit.set,
        });
      }
    }
  }

  return tracks;
}

/** The brow set at a moment. Later spans win where two overlap — a short line
 *  ending "…;" should ask the question, not trail off. */
export function browAt(spans: BrowSpan[] | undefined, timeMs: number): string {
  if (!spans) return BROW_REST;
  let set = BROW_REST;
  for (const s of spans) {
    if (timeMs >= s.startMs && timeMs < s.endMs) set = s.set;
  }
  return set;
}

// ---------------------------------------------------------------------------
// Head pose
// ---------------------------------------------------------------------------

/**
 * Rotation and offset of the HEAD GROUP, inside the avatar.
 *
 * Distinct from `idleMotion`, which moves the whole disk. This moves the head
 * relative to the shoulders, which is the thing a sprite sheet could never do
 * and the reason every layer was anchored to the head in the first place: one
 * transform here carries the eyes, brows and mouth with it, correctly, for
 * free.
 */
export interface HeadPose {
  /** Degrees, positive = clockwise. */
  rotateDeg: number;
  /** Offsets as a fraction of head width. */
  dx: number;
  dy: number;
}

export const HEAD_STILL: HeadPose = { rotateDeg: 0, dx: 0, dy: 0 };

export type HeadGestureKind = "tilt" | "shake" | "droop" | "bob" | "nod";

export interface HeadSpan {
  startMs: number;
  endMs: number;
  kind: HeadGestureKind;
}

/**
 * Punctuation → head gesture, deliberately parallel to `BROW_FOR`.
 *
 * The two are read from the same marks on purpose: a question raises the brows
 * AND cocks the head, because in a real performance those happen together. Two
 * independent tables would let them drift into disagreeing about the same
 * sentence.
 */
const HEAD_FOR: { test: RegExp; kind: HeadGestureKind }[] = [
  // Laughter first: "χαχα!" is a laugh, not an exclamation, and the general
  // `!` rule below would otherwise claim it. Both the Greek χα and the Latin
  // ha are matched, because a Greek script routinely carries both.
  { test: /^(χα|χά|χο|ha|he){2,}[!.…]*$/i, kind: "bob" },
  // A spoken yes nods and a spoken no shakes — the word alone, not "nothing"
  // or "Νοέμβριος".
  { test: /^(ναι|ναί|yes|yeah|yep|μάλιστα|βεβαίως)[!.,…]*$/i, kind: "nod" },
  { test: /^(όχι|οχι|no|nope)[!.,…]*$/i, kind: "shake" },
  { test: /(…|\.\.\.)$/, kind: "droop" },
  { test: /[;?]$/, kind: "tilt" },
  { test: /!$/, kind: "shake" },
];

/** A gesture runs a little longer than the brow it accompanies: the head is
 *  heavier than an eyebrow and settles more slowly. */
const HEAD_LEAD_MS = 180;
const HEAD_HOLD_MS = 520;

/* ---------------- arm poses ---------------- */

export interface PoseSpan {
  startMs: number;
  endMs: number;
  pose: string;
}

/** Script tag → arm pose. The pose names are the ones Image Forge cuts. */
const POSE_FOR: Record<string, string> = {
  waves: "wave", wave: "wave", greets: "wave", "waves hello": "wave", "waves goodbye": "wave",
  points: "point", point: "point", "points to the side": "point", shows: "point",
  shrugs: "shrug", shrug: "shrug",
  explains: "explain", explaining: "explain", gestures: "explain",
};

/** A line that opens with a greeting waves without being asked. */
const GREETING = /^(γει[αά]|γεια σας|καλώς ήρθ|καλημέρα|καλησπέρα|hello|hi|hey|welcome|good (morning|evening)|bye|αντίο|τα λέμε)/i;

const POSE_HOLD_MS = 1600;

/**
 * When each speaker's arms do something. A pose is held for about a second
 * and a half at the start of its line, then the arms go back to rest — a hand
 * left up for a whole paragraph reads as a frozen frame, not a wave.
 */
export function buildSpeakerPoseTracks(segments: NarrationSegment[]): Record<string, PoseSpan[]> {
  const tracks: Record<string, PoseSpan[]> = {};
  for (const seg of segments) {
    const tags = seg.tags ?? (seg.mood ? [seg.mood] : []);
    const pose = tags.map((t) => POSE_FOR[t]).find(Boolean) ?? (GREETING.test(seg.text.trim()) ? "wave" : undefined);
    if (!pose) continue;
    (tracks[seg.speakerId] ??= []).push({
      startMs: Math.max(0, seg.startMs - 150),
      endMs: Math.min(seg.endMs, seg.startMs + POSE_HOLD_MS),
      pose,
    });
  }
  return tracks;
}

/** The pose at a moment, or undefined for arms at rest. */
export function poseAt(spans: PoseSpan[] | undefined, timeMs: number): string | undefined {
  return spans?.find((s) => timeMs >= s.startMs && timeMs < s.endMs)?.pose;
}

/** Yes and no in the tags: [nods] and [shakes head] reach the head even when
 *  a feeling came first on the line. */
const HEAD_TAG: Record<string, HeadGestureKind> = { nods: "nod", nod: "nod", "shakes head": "shake", "shakes his head": "shake", "shakes her head": "shake" };

export function buildSpeakerHeadTracks(
  segments: NarrationSegment[]
): Record<string, HeadSpan[]> {
  const tracks: Record<string, HeadSpan[]> = {};

  for (const seg of segments) {
    // A gesture for the line's feeling, at the top of the line only. It runs
    // for about a second and settles: a head that tilts for a whole paragraph
    // is a head stuck sideways, not a curious one.
    const face = moodFace(seg.mood);
    const tagged = (seg.tags ?? []).map((t) => HEAD_TAG[t]).find(Boolean);
    if (tagged && tagged !== face?.head) {
      (tracks[seg.speakerId] ??= []).push({
        startMs: Math.max(0, seg.startMs - HEAD_LEAD_MS),
        endMs: Math.min(seg.endMs, seg.startMs + 1100),
        kind: tagged,
      });
    }
    if (face?.head) {
      (tracks[seg.speakerId] ??= []).push({
        startMs: Math.max(0, seg.startMs - HEAD_LEAD_MS),
        endMs: Math.min(seg.endMs, seg.startMs + 1100),
        kind: face.head,
      });
    }
    const cues = buildCues([seg], Number.MAX_SAFE_INTEGER);
    for (const cue of cues) {
      for (const w of cue.words) {
        const hit = HEAD_FOR.find((r) => r.test.test(w.text));
        if (!hit) continue;
        (tracks[seg.speakerId] ??= []).push({
          startMs: Math.max(0, w.startMs - HEAD_LEAD_MS),
          endMs: w.endMs + HEAD_HOLD_MS,
          kind: hit.kind,
        });
      }
    }
  }

  return tracks;
}

/** Smooth 0→1→0 across a span: rises, holds, falls. Linear in and out reads
 *  as a mechanism sliding rather than as a head moving. */
function arc(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  const ease = (x: number) => x * x * (3 - 2 * x);
  if (p < 0.28) return ease(p / 0.28);
  if (p > 0.62) return ease((1 - p) / 0.38);
  return 1;
}

/**
 * The pose at a moment: a continuous idle sway, plus whatever gesture the
 * script asks for.
 *
 * HONEST NAMING: this leans the WHOLE CHARACTER, not the head alone. The
 * layered puppet separates the FEATURES (eyes, brows, mouth) from the base,
 * but the base itself is one drawing of head *and* shoulders — measured, not
 * assumed: kaiti.png carries opaque pixels from y=17 to y=1021 of 1024. There
 * is no seam to pivot a neck at, so a true head-on-shoulders tilt needs the
 * head exported as its own layer, which the current art cannot supply.
 *
 * A whole-body lean still reads well on chibi proportions at these angles, and
 * it is what the gesture vocabulary below is tuned for. Do not raise the
 * amplitudes to "make the tilt more obvious" — past a few degrees the missing
 * neck becomes visible and it starts to look like the character is toppling.
 *
 * @param amount the master "how alive is this" control, shared with blinking
 *   and the body's idle drift. 0 is genuinely still.
 */
export function headPoseAt(
  seed: string,
  spans: HeadSpan[] | undefined,
  timeMs: number,
  amount = 1
): HeadPose {
  if (amount <= 0) return HEAD_STILL;

  // Idle sway scales with the setting; GESTURES largely do not. A gesture is a
  // punctuation beat the script asked for, so halving it at the default 0.5
  // simply made questions and emphasis illegible — turning the ambient life
  // down should not mute the performance.
  const gesture = 0.65 + 0.35 * amount;

  const t = timeMs / 1000;
  const p = hash01(seed) * Math.PI * 2;

  // Idle sway — small, and on periods that don't divide into each other or
  // into the body's own drift, so the head never locks in step with the
  // shoulders and start reading as one rigid piece.
  let rotateDeg = Math.sin(t * (Math.PI * 2) / 8.3 + p) * 1.4 * amount;
  let dx = Math.sin(t * (Math.PI * 2) / 11.7 + p * 1.4) * 0.012 * amount;
  let dy = 0;

  for (const s of spans ?? []) {
    if (timeMs < s.startMs || timeMs >= s.endMs) continue;
    const a = arc((timeMs - s.startMs) / (s.endMs - s.startMs)) * gesture;
    if (a <= 0) continue;

    if (s.kind === "tilt") {
      // Cocked to one side, consistently per character rather than randomly —
      // a person tilts their head the same way each time, and alternating it
      // looks like a glitch.
      const side = hash01(`${seed}:tilt`) < 0.5 ? -1 : 1;
      rotateDeg += side * 6.5 * a;
      dx += side * 0.02 * a;
    } else if (s.kind === "shake") {
      // A damped oscillation, not a sustained wobble: it hits hardest at the
      // start and dies out, which is what emphasis actually looks like.
      const local = (timeMs - s.startMs) / 1000;
      rotateDeg += Math.sin(local * Math.PI * 2 * 5.5) * 4.2 * a * Math.exp(-local * 2.2);
      dx += Math.sin(local * Math.PI * 2 * 5.5) * 0.014 * a * Math.exp(-local * 2.2);
    } else if (s.kind === "bob") {
      // Laughing: the head throws BACK and bounces, rather than nodding
      // forward. The vertical bounce runs at twice the rotation's rate — the
      // head comes up once per laugh but bobs on each syllable, which is what
      // separates a laugh from a nod.
      const local = (timeMs - s.startMs) / 1000;
      rotateDeg += -3.5 * a + Math.sin(local * Math.PI * 2 * 3.2) * 2.2 * a;
      dy += -0.014 * a + Math.abs(Math.sin(local * Math.PI * 2 * 6.4)) * 0.02 * a;
    } else if (s.kind === "nod") {
      // Yes: the head dips twice and comes back up, the second dip smaller.
      // Down and up only — a nod that also turns reads as a "maybe".
      const local = (timeMs - s.startMs) / 1000;
      dy += Math.max(0, Math.sin(local * Math.PI * 2 * 2.4)) * 0.03 * a * Math.exp(-local * 1.6);
      rotateDeg += Math.max(0, Math.sin(local * Math.PI * 2 * 2.4)) * 1.2 * a * Math.exp(-local * 1.6);
    } else {
      // Droop: down and slightly forward, the trailing-off gesture.
      rotateDeg += 3 * a;
      dy += 0.022 * a;
    }
  }

  return { rotateDeg, dx, dy };
}
