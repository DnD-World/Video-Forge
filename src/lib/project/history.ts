// ---------------------------------------------------------------------------
// Undo / redo, as plain logic with no app in it.
//
// A history holds snapshots of "the parts of the project worth undoing". The
// snapshots share their unchanged pieces (the store never edits in place), so
// 100 of them cost little.
//
//   * Changes that arrive close together (a slider drag, typing) are ONE step:
//     a change within `coalesceMs` of the previous change replaces the newest
//     state instead of adding a step.
//   * At most `cap` steps are kept; the oldest fall off.
//   * Doing something new after undoing clears the redo steps.
//
// No imports on purpose: tools/lib/history.test.mjs runs this file.
// ---------------------------------------------------------------------------

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** When the last change was recorded (ms), for the coalescing window. */
  lastAt: number;
}

export const COALESCE_MS = 500;
export const HISTORY_CAP = 100;

export function createHistory<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [], lastAt: -Infinity };
}

/** Record that the project now looks like `next`. Pass the same clock every
 *  time. Recording the state we are already in changes nothing. */
export function record<T>(h: History<T>, next: T, now: number, opts: { coalesceMs?: number; cap?: number } = {}): History<T> {
  const coalesceMs = opts.coalesceMs ?? COALESCE_MS;
  const cap = opts.cap ?? HISTORY_CAP;
  if (next === h.present) return h;
  const burst = h.past.length > 0 && h.future.length === 0 && now - h.lastAt <= coalesceMs;
  if (burst) return { ...h, present: next, lastAt: now };
  const past = [...h.past, h.present];
  while (past.length > cap) past.shift();
  return { past, present: next, future: [], lastAt: now };
}

export const canUndo = <T,>(h: History<T>) => h.past.length > 0;
export const canRedo = <T,>(h: History<T>) => h.future.length > 0;

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const past = h.past.slice(0, -1);
  return { past, present: h.past[h.past.length - 1], future: [h.present, ...h.future], lastAt: -Infinity };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  const [next, ...future] = h.future;
  return { past: [...h.past, h.present], present: next, future, lastAt: -Infinity };
}

/** Start over from `state` (a new or opened project has no "before"). */
export function clear<T>(state: T): History<T> {
  return createHistory(state);
}

/** True when the keyboard event is aimed at something the user types into, in
 *  which case that field's own undo should handle the key. */
export function isTypingTarget(el: { tagName?: string; isContentEditable?: boolean; type?: string } | null | undefined): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const t = (el.type ?? "text").toLowerCase();
    return !["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image"].includes(t);
  }
  return false;
}

/** Which action a key press asks for, or null. */
export function shortcutFor(e: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): "undo" | "redo" | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "z") return e.shiftKey ? "redo" : "undo";
  if (k === "y" && !e.shiftKey) return "redo";
  return null;
}
