// Save, open and start-over for whole project files. One copy, used by the
// Presets panel and by the header's Recent / New buttons.

import { useProjectStore } from "../../store/useProjectStore";
import { useRecentStore } from "../../store/useRecentStore";
import { markSaved } from "../../store/projectHistory";
import { plainError } from "../plainError";
import { projectToDoc, docToProject } from "./projectFile";

const fileName = (p: string) => p.split(/[\\/]/).pop() ?? p;

export type OpenOutcome =
  | { kind: "done"; note: string }
  | { kind: "cancelled" }
  /** The file is no longer where it was (moved, renamed, deleted). */
  | { kind: "gone"; note: string }
  | { kind: "failed"; note: string };

/** Ask where to save, then write the project there. Returns a line for the user, or null if they cancelled. */
export async function saveProjectFile(): Promise<string | null> {
  const target = await window.byok.dialog.saveFile("project.byokproj.json", [
    { name: "BYOK project", extensions: ["json"] },
  ]);
  if (!target) return null;
  // Everything the autosave keeps (music, sound effects, backgrounds, logo,
  // cards, attached audio…) goes in the file too. The audio analyses are
  // megabytes; the file paths are enough to rebuild them on open.
  const doc = projectToDoc(useProjectStore.getState());
  const json = JSON.stringify(doc, null, 2);
  await window.byok.storage.writeFile(target, new TextEncoder().encode(json).buffer as ArrayBuffer);
  markSaved();
  useRecentStore.getState().add(target);
  return `Saved project to ${fileName(target)}`;
}

/** Open a project file. With no path, asks the user to pick one. */
export async function openProjectFile(path?: string): Promise<OpenOutcome> {
  const src = path ?? (await window.byok.dialog.openFile([{ name: "BYOK project", extensions: ["json"] }]));
  if (!src) return { kind: "cancelled" };
  const store = useProjectStore.getState();
  try {
    const buf = await window.byok.storage.readFile(src);
    const opened = docToProject(JSON.parse(new TextDecoder().decode(buf)));
    if (!opened.ok) {
      return { kind: "failed", note: `${opened.message} Pick a project file that was saved from Video Forge.` };
    }
    store.loadProject(opened.project);
    markSaved();
    useRecentStore.getState().add(src);
    // Rebuild the analysis from the audio files the project points at, exactly
    // like the autosave does on startup.
    const music = useProjectStore.getState().music;
    if (music?.filePath) {
      try {
        const analysis = await window.byok.audio.analyzeFile(music.filePath);
        if (analysis) useProjectStore.getState().setMusic({ ...music, analysis });
      } catch {
        /* the file moved: the track is still listed, its waveform idles */
      }
    }
    const attached = useProjectStore.getState().attachedAudio;
    if (attached?.filePath) {
      try {
        const analysis = await window.byok.audio.analyzeFile(attached.filePath);
        if (analysis) useProjectStore.getState().setAttachedAudio({ ...attached, analysis });
      } catch {
        /* same */
      }
    }
    const n = useProjectStore.getState().narration;
    if (n?.filePath) {
      try {
        const analysis = await window.byok.audio.analyzeFile(
          n.filePath,
          n.segments,
          useProjectStore.getState().speakers.map((s) => s.id)
        );
        if (analysis) useProjectStore.getState().setNarration({ ...n, analysis });
      } catch {
        return { kind: "done", note: `Loaded, but its narration file is missing — regenerate to get the waveform back.` };
      }
    }
    return { kind: "done", note: `Opened ${fileName(src)}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/ENOENT|no such file/i.test(msg)) {
      return { kind: "gone", note: `${fileName(src)} isn't there any more — it was moved, renamed or deleted.` };
    }
    return { kind: "failed", note: `Couldn't read that project — ${plainError(e, "Pick a project file that was saved from Video Forge.")}` };
  }
}
