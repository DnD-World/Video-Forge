// ---------------------------------------------------------------------------
// The steps column of the "B" layout (Ak's pick, 26 Oct 2026), shared by every
// kind of video so they look and behave the same: the steps top to bottom, a
// glowing line through the ones done, a one-line status under each, the step
// you are on open in place, and a fold that shrinks it to its numbers so the
// preview gets the room. Styles: .forge-studio-left / .forge-stepper in forge.css.
// ---------------------------------------------------------------------------

import { useState, type MutableRefObject, type ReactNode } from "react";

export interface StepDef<Id extends string> {
  id: Id;
  title: string;
  sub: string;
  /** one plain line: what is done in this step so far */
  status: string;
}

/** Folded or open, remembered per screen. */
export function useFolded(key: string): [boolean, (f: boolean) => void] {
  const [folded, setState] = useState(() => {
    try { return localStorage.getItem(key) === "1"; } catch { return false; }
  });
  return [folded, (f: boolean) => { setState(f); try { localStorage.setItem(key, f ? "1" : "0"); } catch { /* fine */ } }];
}

export function StepColumn<Id extends string>({
  steps, current, onGo, width, folded, setFolded, children, foot, title = "Your video, step by step", flareRef, onFlare, decor,
}: {
  steps: StepDef<Id>[];
  current: Id;
  onGo: (id: Id) => void;
  /** the column's width while open, in pixels (Script wants more room) */
  width: number;
  folded: boolean;
  setFolded: (f: boolean) => void;
  /** the open step's panel */
  children: ReactNode;
  /** under the steps: the Next button, or nothing */
  foot?: ReactNode;
  title?: string;
  flareRef?: MutableRefObject<HTMLElement | null>;
  onFlare?: () => void;
  /** corner ornaments, drawn first */
  decor?: ReactNode;
}) {
  const at = steps.findIndex((x) => x.id === current);
  return (
    <aside
      ref={flareRef}
      onClick={onFlare}
      className={`forge-studio-left panel-hud hud-flare-target relative min-h-0 ${folded ? "folded" : ""}`}
      style={{ width: folded ? 84 : width }}
      aria-label={title}
    >
      {decor}
      <button
        className="forge-fold"
        onClick={(e) => { e.stopPropagation(); setFolded(!folded); }}
        aria-label={folded ? "Open the steps" : "Fold the steps away"}
        data-tip={folded ? "Opens the steps column again." : "Folds the steps to their numbers, so the preview gets the room."}
      >
        {folded ? "›" : "‹"}
      </button>
      {!folded && <div className="label-etched forge-stepper-title" data-tip={`The ${steps.length} steps, in order. The one you are on is open.`}>{title}</div>}
      <ol className="forge-stepper">
        {steps.map((st, i) => {
          const state = st.id === current ? "on" : i < at ? "done" : "";
          return (
            <li key={st.id} className={`forge-sstep ${state}`}>
              <button
                className="head"
                onClick={() => { if (folded && st.id === current) setFolded(false); onGo(st.id); }}
                aria-current={state === "on" ? "step" : undefined}
                data-tip={`Step ${i + 1} of ${steps.length}: ${st.title} (${st.sub.toLowerCase()}). ${state === "on" ? "You are here." : "Click to go there."}`}
              >
                <span className="n">{state === "done" ? "✓" : i + 1}</span>
                {!folded && (
                  <span className="t">
                    {st.title}
                    <small>{st.status}</small>
                  </span>
                )}
              </button>
              {!folded && st.id === current && <div className="body">{children}</div>}
            </li>
          );
        })}
      </ol>
      {!folded && foot && <footer className="forge-studio-foot">{foot}</footer>}
    </aside>
  );
}

/** The Next button at the foot of the column. */
export function NextStep({ label, onClick, tip }: { label: string; onClick: () => void; tip: string }) {
  return (
    <button className="forge-next" data-tip={tip} onClick={onClick}>
      Next: {label} →
    </button>
  );
}
