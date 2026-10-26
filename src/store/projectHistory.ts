// ---------------------------------------------------------------------------
// Undo / redo for the project, wired to the store.
//
// What is recorded: the things a person edits — the cast, script, language,
// frame and speed, look, subtitles, pauses, cards, logo, backgrounds, music
// level and sound effects (the same list the project file keeps as plain
// fields: PLAIN_FIELDS).
//
// What is NOT: the narration and the music/attached-audio entries (they carry
// megabytes of audio analysis and are rebuilt from files), and anything that
// lives outside this store (playback time, the screen you are on).
//
// Undoing puts those fields back; it never touches the narration or files.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { useProjectStore, wholeProjectHook } from "./useProjectStore";
import { defaultProject } from "./defaults";
import { PLAIN_FIELDS } from "../lib/project/projectFile";
import { type History, createHistory, record, undo as undoH, redo as redoH, canUndo, canRedo, clear } from "../lib/project/history";
import type { ProjectState } from "./types";

type Tracked = Partial<Pick<ProjectState, (typeof PLAIN_FIELDS)[number]>>;

const pick = (s: ProjectState): Tracked => {
  const out: Record<string, unknown> = {};
  for (const k of PLAIN_FIELDS) out[k] = s[k];
  return out as Tracked;
};

const sameTracked = (a: Tracked, b: Tracked) => PLAIN_FIELDS.every((k) => a[k] === b[k]);

let history: History<Tracked> = createHistory(pick(useProjectStore.getState()));
let applying = false;
let baseline = JSON.stringify(pick(defaultProject as ProjectState));

/** What the header buttons read. */
export const useHistoryUi = create<{ canUndo: boolean; canRedo: boolean }>(() => ({ canUndo: false, canRedo: false }));

const publish = () => useHistoryUi.setState({ canUndo: canUndo(history), canRedo: canRedo(history) });

function apply(next: History<Tracked>) {
  if (next === history) return;
  history = next;
  applying = true;
  try {
    useProjectStore.setState(history.present as Partial<ProjectState>);
  } finally {
    applying = false;
  }
  publish();
}

export const undoProject = () => apply(undoH(history));
export const redoProject = () => apply(redoH(history));

/** Forget the history: a new or opened project has no "before". */
export function resetHistory() {
  history = clear(pick(useProjectStore.getState()));
  publish();
}

/** The project as it is right now counts as saved. */
export function markSaved() {
  baseline = JSON.stringify(pick(useProjectStore.getState()));
}

/** Has anything the project file keeps changed since it was last saved or opened? */
export function hasUnsavedWork(): boolean {
  return JSON.stringify(pick(useProjectStore.getState())) !== baseline;
}

useProjectStore.subscribe((state) => {
  if (applying) return;
  const now = pick(state);
  if (sameTracked(now, history.present)) return;
  history = record(history, now, Date.now());
  publish();
});

wholeProjectHook.fn = resetHistory;
