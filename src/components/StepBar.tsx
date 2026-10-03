// ---------------------------------------------------------------------------
// The five steps to a video, across the top of the window.
//
// Replaces three header buttons (Canvas / Narration / Backend Settings) that
// presented the app's screens as equals, when the work actually has an order.
// Every step is still clickable at any time — this shows the order, it does
// not enforce it — and the next unfinished one glows.
//
// "Done" is read from state the stores already hold. Nothing is recorded just
// to drive this bar, so it can never disagree with the screens it points at.
// ---------------------------------------------------------------------------

import { useProjectStore } from "../store/useProjectStore";
import { useVoicesStore } from "../store/useVoicesStore";
import { useUiStore, type Step } from "../store/useUiStore";
import { engineOf } from "../lib/features";

type Status = "done" | "attention" | "todo" | "optional";

interface StepInfo {
  id: Step;
  n: string;
  label: string;
  status: Status;
  /** What this step still needs, for the tooltip. */
  why: string;
}

export function useSteps(): { steps: StepInfo[]; next: Step | null } {
  const voices = useVoicesStore((s) => s.voices);
  const speakers = useProjectStore((s) => s.speakers);
  const script = useProjectStore((s) => s.script);
  const narration = useProjectStore((s) => s.narration);
  const lastRenderPath = useUiStore((s) => s.lastRenderPath);

  const missingVoice = speakers.filter((sp) =>
    engineOf(sp) === "piper" ? !sp.voiceId : !sp.chatterboxVoiceRef
  );

  const steps: StepInfo[] = [
    {
      id: "setup",
      n: "1",
      label: "Setup",
      status: voices.length > 0 ? "done" : "attention",
      why: voices.length > 0 ? `${voices.length} voice(s) found` : "Find the free voices on this computer",
    },
    {
      id: "cast",
      n: "2",
      label: "Cast",
      status:
        speakers.length === 0 ? "todo" : missingVoice.length > 0 ? "attention" : "done",
      why:
        speakers.length === 0
          ? "Add at least one speaker"
          : missingVoice.length > 0
            ? `Pick a voice for ${missingVoice.map((s) => s.label).join(", ")}`
            : `${speakers.length} speaker(s), all with voices`,
    },
    {
      id: "script",
      n: "3",
      label: "Script",
      status: narration ? "done" : script.trim() ? "attention" : "todo",
      why: narration
        ? "Voice track made"
        : script.trim()
          ? "Script written — make the voice track"
          : "Write or paste a script",
    },
    {
      id: "look",
      n: "4",
      label: "Look",
      status: "optional",
      why: "Optional — background, subtitles, frame",
    },
    {
      id: "render",
      n: "5",
      label: "Render",
      status: lastRenderPath ? "done" : "todo",
      why: lastRenderPath ? "Video made" : "Make the video file",
    },
  ];

  const next = steps.find((s) => s.status !== "done" && s.status !== "optional")?.id ?? null;
  return { steps, next };
}

const MARK: Record<Status, string> = {
  done: "✓",
  attention: "!",
  todo: "○",
  optional: "·",
};

/** Which step the current screen belongs to, for the "you are here" mark. */
function currentStep(view: string, sceneTab: string): Step | null {
  if (view === "settings") return "setup";
  if (view === "narration") return "script";
  if (sceneTab === "render") return "render";
  return null;
}

export function StepBar() {
  const { steps, next } = useSteps();
  const goTo = useUiStore((s) => s.goTo);
  const view = useUiStore((s) => s.view);
  const sceneTab = useUiStore((s) => s.sceneTab);
  const here = currentStep(view, sceneTab);

  return (
    <nav aria-label="Steps" className="flex items-center gap-1 flex-wrap">
      {steps.map((s, i) => {
        const isNext = s.id === next;
        const isHere = s.id === here;
        const tone =
          s.status === "done"
            ? "text-emerald-300 border-emerald-400/30"
            : s.status === "attention"
              ? "text-amber-300 border-amber-400/40"
              : "text-neutral-400 border-accent/20";
        return (
          <div key={s.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-accent/40 px-0.5" aria-hidden>›</span>}
            <button
              onClick={() => goTo(s.id)}
              title={s.why}
              aria-current={isHere ? "step" : undefined}
              className={`label-etched px-2.5 py-1.5 border flex items-center gap-1.5 transition-colors hover:text-accent-bright hover:border-accent
                ${tone}
                ${isHere ? "!border-accent !text-accent-bright" : ""}
                ${isNext ? "hud-breathe shadow-[0_0_12px_-2px_var(--accent)] !border-accent" : ""}`}
            >
              <span className="font-mono text-xs opacity-80" aria-hidden>
                {MARK[s.status]}
              </span>
              <span>
                {s.n} · {s.label}
              </span>
              <span className="sr-only">
                {s.status === "done" ? "(done)" : s.status === "attention" ? "(needs attention)" : ""}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
