// An error, said in plain words, with what to do and the raw text folded away.
//
// Every panel used to print `e.message` in red. That is the right information
// for whoever wrote the code and the wrong information for whoever is making a
// video. This keeps both: the sentence on top, the original under "Details",
// and a button to the step that fixes it when there is one.

import { useState } from "react";
import { friendlyError } from "../../lib/errors/friendly";
import { useUiStore, type Step } from "../../store/useUiStore";

const STEP_NAMES: Record<Step, string> = {
  setup: "Setup",
  cast: "Cast",
  script: "Script",
  look: "Look",
  render: "Render",
};

export function ErrorNote({ error }: { error: unknown }) {
  const [open, setOpen] = useState(false);
  const goTo = useUiStore((s) => s.goTo);
  const f = friendlyError(error);
  const showDetail = f.detail && f.detail !== f.message;
  return (
    <div
      role="alert"
      className="text-sm border border-red-500/40 bg-red-500/10 px-3 py-2 space-y-1"
    >
      <p className="text-red-300">✕ {f.message}</p>
      {f.hint && <p className="text-neutral-300">{f.hint}</p>}
      <div className="flex items-center gap-3">
        {f.step && (
          <button className="underline hover:text-accent-bright" onClick={() => goTo(f.step!)}>
            Go to {STEP_NAMES[f.step]}
          </button>
        )}
        {showDetail && (
          <button
            className="text-xs text-neutral-500 underline hover:text-neutral-300"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide details" : "Details"}
          </button>
        )}
      </div>
      {open && showDetail && (
        <pre className="text-xs text-neutral-500 whitespace-pre-wrap break-all">{f.detail}</pre>
      )}
    </div>
  );
}
