// Header controls for the project as a whole: undo, redo, Recent projects, New project.
// Also listens for Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HudButton } from "./ui/HudButton";
import { useProjectStore } from "../store/useProjectStore";
import { useRecentStore } from "../store/useRecentStore";
import { hasUnsavedWork, markSaved, redoProject, undoProject, useHistoryUi } from "../store/projectHistory";
import { isTypingTarget, shortcutFor } from "../lib/project/history";
import { ago } from "../lib/project/recentProjects";
import { openProjectFile } from "../lib/project/projectActions";

const SURE = "You have changes you haven't saved. They will be lost. Continue?";

export function HistoryBar() {
  const { canUndo, canRedo } = useHistoryUi();
  const recent = useRecentStore((s) => s.items);
  const removeRecent = useRecentStore((s) => s.remove);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<{ text: string; gone?: string } | null>(null);
  const btnRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  // Ctrl+Z and friends. In a box you type into, the box's own undo wins.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const act = shortcutFor(e);
      if (!act) return;
      if (isTypingTarget(e.target as HTMLElement | null)) return;
      e.preventDefault();
      if (act === "undo") undoProject(); else redoProject();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 380)), top: r.bottom + 8 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const openRecent = async (path: string) => {
    if (hasUnsavedWork() && !window.confirm(SURE)) return;
    const r = await openProjectFile(path);
    if (r.kind === "cancelled") return;
    if (r.kind === "gone") { setNote({ text: r.note, gone: path }); return; }
    setNote({ text: r.note });
    if (r.kind === "done") setOpen(false);
  };

  const newProject = () => {
    if (hasUnsavedWork() && !window.confirm(`Start a new, empty project? ${SURE.replace("Continue?", "")}Undo can't bring them back.`)) return;
    useProjectStore.getState().reset();
    markSaved();
    setNote(null);
  };

  return (
    <div className="flex gap-2 items-center" role="group" aria-label="Undo, recent projects and new project">
      <HudButton
        disabled={!canUndo}
        onClick={undoProject}
        data-tip="Takes back your last change, like Ctrl+Z. Handy when a slider went too far."
      >
        ↶
      </HudButton>
      <HudButton
        disabled={!canRedo}
        onClick={redoProject}
        data-tip="Puts back the change you just took back, like Ctrl+Y."
      >
        ↷
      </HudButton>
      <span ref={btnRef} className="inline-flex">
        <HudButton
          active={open}
          onClick={() => { setOpen((v) => !v); setNote(null); }}
          data-tip="Your last few project files, newest first. Click one to open it again."
        >
          Recent ▾
        </HudButton>
      </span>
      <HudButton
        onClick={newProject}
        data-tip="Starts an empty project. It asks first if you have changes you haven't saved."
      >
        New project
      </HudButton>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[998]" data-tip="Click anywhere outside the list to close it." onClick={() => setOpen(false)} />
          <div
            className="fixed z-[999] w-[360px] max-h-[70vh] overflow-y-auto p-2 rounded-lg border border-[var(--line-hot)] bg-[#04141c] shadow-2xl"
            style={{ left: pos.left, top: pos.top }}
            role="menu"
            aria-label="Recent projects"
            data-tip="The last project files you saved or opened."
          >
            {note && (
              <div className="mb-2 p-2 text-sm rounded border border-[var(--line)] text-neutral-200" data-tip="What just happened.">
                <div>{note.text}</div>
                {note.gone && (
                  <button
                    className="btn mt-2"
                    data-tip="Takes this name off the list. It doesn't touch any file."
                    onClick={() => { removeRecent(note.gone!); setNote(null); }}
                  >
                    Remove from list
                  </button>
                )}
              </div>
            )}
            {recent.length === 0 ? (
              <div className="p-2 text-sm text-neutral-400" data-tip="Files show up here after you save or open a project.">
                Nothing yet. Projects you save or open will be listed here.
              </div>
            ) : recent.map((r) => (
              <button
                key={r.path}
                role="menuitem"
                className="block w-full text-left px-3 py-2 rounded hover:bg-white/5"
                data-tip={`Opens ${r.name}. It's saved at ${r.path}.`}
                onClick={() => void openRecent(r.path)}
              >
                <span className="block text-sm text-neutral-100 truncate">{r.name}</span>
                <span className="block text-xs text-neutral-400">{ago(r.openedAt, Date.now())}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
