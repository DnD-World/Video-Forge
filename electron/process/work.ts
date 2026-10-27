// ---------------------------------------------------------------------------
// What the app is busy with, so closing the window can ask first and — if you
// close anyway — stop exactly the work this app started.
//
// A render, a Many-videos batch and a narration each register here while they
// run. Nothing here looks at processes by name: stopping a render aborts its
// own controller, and the render code then ends the process tree it started
// (electron/process/childTree.ts, by process id).
//
// No electron import on purpose: tools/lib/work.test.mjs runs this file.
// ---------------------------------------------------------------------------

interface Work {
  label: string;
  /** Asks the work to stop. Absent for work that cannot be interrupted. */
  abort?: () => void;
}

const active = new Set<Work>();

/** Register work. Call the returned function when it ends (even on failure). */
export function startWork(label: string, controller?: AbortController): () => void {
  const w: Work = { label, abort: controller ? () => controller.abort() : undefined };
  active.add(w);
  return () => {
    active.delete(w);
  };
}

/** Names of everything running now, e.g. ["a video", "a batch of videos"]. */
export function busyWith(): string[] {
  return [...active].map((w) => w.label);
}

export function isBusy(): boolean {
  return active.size > 0;
}

/** Ask every stoppable job to stop. Returns how many were asked. */
export function abortAllWork(): number {
  let n = 0;
  for (const w of active) {
    if (w.abort) {
      w.abort();
      n++;
    }
  }
  return n;
}

/** The question shown when the window is closed while work is running. */
export function closeQuestion(labels: string[]): { message: string; detail: string } {
  const what = labels.length === 0 ? "work" : [...new Set(labels)].join(" and ");
  return {
    message: `Still making ${what}.`,
    detail:
      "If you quit now it is stopped and thrown away — the video is not finished and cannot be resumed. " +
      "Paid voice lines already made are kept.",
  };
}
