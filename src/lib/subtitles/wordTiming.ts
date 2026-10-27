// ---------------------------------------------------------------------------
// Turns narration segments into on-screen subtitle cues with per-word timing.
//
// The honest limitation, stated up front: TTS gives us the start and end of a
// whole spoken line, not of each word. Rather than pull in a forced aligner
// (another model, another multi-GB dependency, another thing to break), word
// timings are ESTIMATED by distributing the line's duration across its words
// in proportion to how long each word is.
//
// That is not frame-accurate, but for a highlight that moves along with the
// voice it reads as correct — errors stay well under a syllable on normal
// sentences. If word-level accuracy ever genuinely matters, this is the one
// function to replace, and nothing else has to change.
//
// Pure and deterministic: safe inside the render path.
// ---------------------------------------------------------------------------

import type { NarrationSegment } from "../../store/types";

export interface TimedWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface SubtitleCue {
  speakerId: string;
  speakerLabel: string;
  startMs: number;
  endMs: number;
  words: TimedWord[];
}

/** Trailing punctuation earns a little extra time, because a comma or full
 *  stop is where a voice actually slows down. Without this the highlight
 *  drifts ahead of the audio across a long sentence. */
function weightOf(word: string): number {
  const pause = /[,.;:!?…]$/.test(word) ? 2.5 : 0;
  return Math.max(1, word.length) + pause;
}

/**
 * Splits one segment into cues of at most `maxChars` printable characters, so
 * a long line becomes several sequential cues instead of overflowing the frame.
 */
function cuesForSegment(
  seg: NarrationSegment,
  maxChars: number,
  pauses: number[]
): SubtitleCue[] {
  const words = seg.text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // MEASURED BEATS ESTIMATED, ALWAYS. When forced alignment has told us when
  // each word was really said, every guess below is skipped — there is nothing
  // left to drift.
  if (seg.words && seg.words.length === words.length) {
    const timed: TimedWord[] = seg.words.map((w) => ({
      text: w.text,
      startMs: w.startMs,
      endMs: w.endMs,
    }));
    return groupIntoCues(seg, timed, maxChars);
  }

  const totalMs = Math.max(1, seg.endMs - seg.startMs);
  const weights = words.map(weightOf);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  // Walk the words once, converting weight into elapsed time as we go, so
  // rounding never accumulates into a drift by the end of the line.
  const timed: TimedWord[] = [];
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    const startMs = seg.startMs + Math.round((acc / weightSum) * totalMs);
    acc += weights[i];
    const endMs = seg.startMs + Math.round((acc / weightSum) * totalMs);
    timed.push({ text: words[i], startMs, endMs });
  }

  // ANCHOR THE ESTIMATE TO THE AUDIO.
  //
  // Everything above is a guess from letter counts, and a guess DRIFTS: one
  // slow word early on pushes every later word out, and by the end of a long
  // line the highlight is a phrase ahead of the voice. Ak saw exactly that and
  // I twice fixed a different layer of it.
  //
  // `pauses` are moments where the voice measurably stopped. A speaker pauses
  // at punctuation, so a pause is almost always a sentence or clause boundary —
  // which means it can be matched to a word boundary that follows punctuation,
  // and the words between two anchors re-spread over the time actually taken.
  //
  // That is forced alignment at the phrase level. It is not per-word truth, but
  // the error can no longer accumulate past the next pause, which is what makes
  // drift visible.
  const inside = pauses.filter((ms) => ms > seg.startMs + 150 && ms < seg.endMs - 150);
  if (inside.length > 0 && words.length > 2) {
    const anchors: { index: number; ms: number }[] = [];
    for (const ms of inside) {
      let best = -1;
      let bestCost = Infinity;
      for (let i = 1; i < words.length; i++) {
        const punctuated = /[,.;:!?…·]$/.test(words[i - 1]);
        // A boundary after punctuation is where a voice really stops, so it is
        // preferred strongly over a boundary in the middle of a phrase.
        const cost = Math.abs(timed[i].startMs - ms) + (punctuated ? 0 : 700);
        if (cost < bestCost) { bestCost = cost; best = i; }
      }
      // Too far from any plausible boundary means this pause belongs to
      // something else — a breath mid-phrase — and forcing it would be worse
      // than leaving the estimate alone.
      if (best > 0 && bestCost < 1600 && !anchors.some((a) => a.index === best)) {
        anchors.push({ index: best, ms });
      }
    }
    anchors.sort((a, b) => a.index - b.index);

    // Monotonic only. An anchor that would move a boundary backwards past its
    // predecessor is dropped rather than reordering the line.
    const kept = anchors.filter((a, i) => i === 0 || a.ms > anchors[i - 1].ms);

    let fromIdx = 0;
    let fromMs = seg.startMs;
    for (const a of [...kept, { index: words.length, ms: seg.endMs }]) {
      const span = a.ms - fromMs;
      const sub = weights.slice(fromIdx, a.index);
      const subSum = sub.reduce((x, y) => x + y, 0) || 1;
      let run = 0;
      for (let i = fromIdx; i < a.index; i++) {
        timed[i].startMs = Math.round(fromMs + (run / subSum) * span);
        run += weights[i];
        timed[i].endMs = Math.round(fromMs + (run / subSum) * span);
      }
      fromIdx = a.index;
      fromMs = a.ms;
    }
  }

  return groupIntoCues(seg, timed, maxChars);
}

/** Words with times in, display-sized cues out. Shared so that measured and
 *  estimated timings cannot be grouped by two different rules.
 *
 *  READABLE PAGES (Ak, 26 Oct 2026: "serious subtitle issues" in lesson
 *  101.1). Cutting purely at maxChars ended pages mid-sentence ("Δεν είναι
 *  ενοχή. Είναι καθαρός" / "φόβος …") and on dangling little words ("…αλλού
 *  το"). Now:
 *   · a new sentence starts a new page;
 *   · a sentence too long for one page is cut into EVEN pages, at a comma
 *     when one is near the middle;
 *   · a page never ends on a short word ("το", "να", "και", "the") — it moves
 *     to the next page.
 *  With no length limit (the mouth and face timing ask for one cue per line)
 *  the line stays whole, exactly as before. */
function groupIntoCues(
  seg: NarrationSegment,
  timed: TimedWord[],
  maxChars: number
): SubtitleCue[] {
  const cue = (group: TimedWord[]): SubtitleCue => ({
    speakerId: seg.speakerId,
    speakerLabel: seg.speakerLabel,
    startMs: group[0].startMs,
    endMs: group[group.length - 1].endMs,
    words: group,
  });
  if (timed.length === 0) return [];
  if (!Number.isFinite(maxChars) || maxChars >= Number.MAX_SAFE_INTEGER) return [cue(timed)];

  const out: SubtitleCue[] = [];
  for (const sentence of splitSentences(timed)) {
    for (const page of pagesOf(sentence, maxChars)) out.push(cue(page));
  }
  return out;
}

const SENTENCE_END = /[.!?…;·]["»”')\]]*$/;
const COMMA = /[,:—–-]["»”')\]]*$/;
/** Words too small to end a page on (articles, pronouns, little joining words). */
const WEAK = /^(το|τα|τη|την|της|τον|του|των|τις|τους|ο|η|οι|ένα|μια|μία|να|θα|και|κι|σε|στο|στη|στην|στον|στα|στις|στους|με|για|από|ότι|πως|που|αν|ή|δεν|μη|μην|σου|μου|μας|σας|the|a|an|to|of|and|or|in|on|at|for|with|is|are|i|you|my|your|but|if|that)$/i;
const len = (ws: TimedWord[]) => ws.reduce((n, w, i) => n + w.text.length + (i ? 1 : 0), 0);

function splitSentences(words: TimedWord[]): TimedWord[][] {
  const out: TimedWord[][] = [];
  let cur: TimedWord[] = [];
  for (const w of words) {
    cur.push(w);
    if (SENTENCE_END.test(w.text)) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

/** One sentence as pages of at most maxChars, as even as the words allow. */
function pagesOf(words: TimedWord[], maxChars: number): TimedWord[][] {
  if (len(words) <= maxChars || words.length < 2) return [words];
  const n = Math.ceil(len(words) / maxChars);
  const target = len(words) / n;
  // Choose the cut after word i (1..length-1) that lands nearest an even share,
  // preferring commas and refusing to end the first page on a weak word.
  let best = -1, bestCost = Infinity;
  for (let i = 1; i < words.length; i++) {
    const head = words.slice(0, i), tail = words.slice(i);
    if (len(head) > maxChars) break;
    if (len(tail) > maxChars * (n - 1)) continue; // the rest must still fit the planned pages
    const last = head[head.length - 1].text.replace(/[^\p{L}\p{N}]/gu, "");
    let cost = Math.abs(len(head) - target);
    if (COMMA.test(head[head.length - 1].text)) cost -= maxChars * 0.35;
    if (WEAK.test(last)) cost += maxChars;
    if (tail.length === 1) cost += maxChars * 0.5; // no one-word last page
    if (cost < bestCost) { bestCost = cost; best = i; }
  }
  if (best < 1) best = 1;
  return [words.slice(0, best), ...pagesOf(words.slice(best), maxChars)];
}

export function buildCues(
  segments: NarrationSegment[],
  maxChars = 42,
  /** Moments, in ms, where the narration audio measurably went quiet. Supplied
   *  by whoever built the narration, because only they have the audio. Without
   *  them every timing here is an estimate from letter counts. */
  pauses: number[] = []
): SubtitleCue[] {
  const cues = segments.flatMap((seg) => cuesForSegment(seg, maxChars, pauses));
  // NO BLINKS. Between two pages of running speech the screen went empty for a
  // moment (the space between one word's end and the next word's start). A
  // page now stays up until the next one starts when the gap is short. Only for
  // display pages — the per-line cues used for mouth timing keep exact ends.
  if (Number.isFinite(maxChars) && maxChars < Number.MAX_SAFE_INTEGER) {
    for (let i = 0; i + 1 < cues.length; i++) {
      const gap = cues[i + 1].startMs - cues[i].endMs;
      if (gap > 0 && gap < 700) cues[i] = { ...cues[i], endMs: cues[i + 1].startMs };
    }
  }
  return cues;
}

/** The cue on screen at `timeMs`, or null between cues. */
export function cueAt(cues: SubtitleCue[], timeMs: number): SubtitleCue | null {
  // Linear scan. Cue counts are in the hundreds even for a 10-minute video,
  // and staying linear keeps this trivially correct; revisit only if profiling
  // ever says otherwise.
  for (const c of cues) {
    if (timeMs >= c.startMs && timeMs < c.endMs) return c;
  }
  return null;
}
