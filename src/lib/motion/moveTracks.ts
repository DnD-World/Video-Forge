// ---------------------------------------------------------------------------
// Script tags → moves from the motion library, per speaker (27 Oct 2026, #48).
//
// "[walks in]", "[gives the box to Maria]", "[sits down]", "[dances]" become
// move spans on that speaker's track; the preview and every render worker
// call this with the same narration, so the same script always moves the
// same way. Shared by App.tsx (preview) and remotion/VideoComposition.tsx.
//
// Relative imports only (no "@/"): Remotion's own webpack renders this too.
// ---------------------------------------------------------------------------

import { SHELF, PROP_NAMES, readMoveTag, moveLengthMs, movesAt, type MoveSpan, type MoveState } from "../../../characters/core/index.mjs";
import type { NarrationSegment } from "../../store/types";

/** A move starts a breath before its line, like a gesture does. */
const LEAD_MS = 150;

export interface CastMember { id: string; label: string; x: number; size: number }

/**
 * Every speaker's move spans from the tags on their lines. A pair move
 * ("gives … to Maria") also puts the partner's half on the partner's track,
 * at the same moment; with no name and exactly two speakers, the other one
 * is the partner. Holding moves last as long as the line; loops too.
 */
export function buildSpeakerMoveTracks(segments: NarrationSegment[], cast: CastMember[]): Record<string, MoveSpan[]> {
  const tracks: Record<string, MoveSpan[]> = {};
  const push = (id: string, s: MoveSpan) => (tracks[id] ??= []).push(s);
  let seed = 1;
  for (const seg of segments) {
    for (const tag of seg.tags ?? []) {
      const hit = readMoveTag(tag, SHELF, { props: PROP_NAMES, cast });
      if (!hit) continue;
      const move = SHELF[hit.move];
      const start = Math.max(0, seg.startMs - LEAD_MS);
      const own = moveLengthMs(move, { style: hit.style });
      const end = move.hold !== null || move.loop ? Math.max(start + own, seg.endMs) : start + own;
      push(seg.speakerId, { startMs: start, endMs: end, move: move.id, style: hit.style, prop: hit.prop, target: hit.target, seed: seed++ });
      if (move.pair) {
        const partner = hit.target ?? (cast.length === 2 ? cast.find((c) => c.id !== seg.speakerId)?.id : undefined);
        if (partner && SHELF[move.pair.partner]) push(partner, { startMs: start, endMs: end, move: move.pair.partner, style: hit.style, prop: hit.prop, target: seg.speakerId, seed: seed++ });
      }
    }
  }
  for (const id of Object.keys(tracks)) tracks[id].sort((a, b) => a.startMs - b.startMs);
  return tracks;
}

/** The move state for a speaker at a moment (null when no move is on). */
export function moveAt(spans: MoveSpan[] | undefined, timeMs: number, energy = 0.5): MoveState | null {
  return movesAt(spans, SHELF, timeMs, { energy });
}

/**
 * Where the speaker is drawn, as a shift from their home spot in fractions of
 * the frame width: off the left or right edge, part way across, or next to
 * the partner. Also whether they are off stage altogether — before a walk-in
 * from an edge, after a walk-out to one — so nobody stands at home and then
 * teleports out to walk in.
 */
export function stagePlacement(
  spans: MoveSpan[] | undefined,
  state: MoveState | null,
  me: CastMember,
  cast: CastMember[],
  timeMs: number,
): { dx: number; hidden: boolean; facing: "left" | "right" | null } {
  const off = (side: string) => (side === "left" ? -(me.x + me.size * 0.6) : side === "right" ? 1 - me.x + me.size * 0.6 : 0);
  const at = (end: string, target?: string | null) => {
    if (end !== "partner") return off(end);
    const p = cast.find((c) => c.id === target);
    if (!p) return 0;
    // close enough to touch: half a box short of the partner's spot
    return p.x - me.x - Math.sign(p.x - me.x) * (me.size + p.size) * 0.32;
  };
  if (state?.travel) {
    const { from, to, p } = state.travel;
    const a = at(from, state.target), b = at(to, state.target);
    return { dx: a + (b - a) * p, hidden: false, facing: state.facing };
  }
  // off stage between moves: after the last travel that ended at an edge, or
  // before the first travel that starts from one
  let where: string | null = null;
  for (const s of spans ?? []) {
    const m = SHELF[s.move];
    if (!m?.path) continue;
    if (timeMs >= s.endMs) where = m.path.to;
    else if (where === null && timeMs < s.startMs) { where = m.path.from; break; }
  }
  const away = where === "left" || where === "right";
  return { dx: away ? off(where!) : 0, hidden: away, facing: null };
}

/**
 * A picture puppet has no legs to walk with, so while it travels it bobs
 * like footsteps instead (#49a: puppets share the drawn characters' moves).
 * Returns a CSS transform fragment; empty for a drawn character, who walks.
 */
export function travelBob(state: MoveState | null, timeMs: number, size: number, drawn: boolean): string {
  if (drawn || !state?.travel || state.travel.p <= 0 || state.travel.p >= 1) return "";
  const step = Math.abs(Math.sin((timeMs / 1000) * Math.PI * 2));
  return ` translateY(${(-step * size * 0.035).toFixed(2)}px) rotate(${((step - 0.5) * 3 * (state.facing === "left" ? -1 : 1)).toFixed(2)}deg)`;
}

/**
 * A speaker's sound-bar ring goes where the speaker goes: shifted while they
 * walk, left out while they are off stage (the music's own track stays put).
 */
export function placeTracks<T extends { speakerIndex: number | null; anchor: { x: number; y: number; size: number } | null }>(
  tracks: T[],
  stages: { dx: number; hidden: boolean }[],
): T[] {
  if (!stages.some((s) => s.dx || s.hidden)) return tracks;
  return tracks.flatMap((t) => {
    const st = t.speakerIndex === null ? null : stages[t.speakerIndex];
    if (!st || !t.anchor) return [t];
    if (st.hidden) return [];
    return [{ ...t, anchor: { ...t.anchor, x: t.anchor.x + st.dx } }];
  });
}
