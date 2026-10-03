// ---------------------------------------------------------------------------
// The first thing a new user sees: four big choices and no controls.
//
// Before this the app opened straight onto an empty canvas between two rails
// of sliders, with nothing to say what to do first. The sample is the point:
// two built-in characters, a short script and voices already picked, so the
// first video is "make the voice track, then render" — two clicks — and the
// rest of the app can be learned by changing a working project.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useUiStore } from "../store/useUiStore";
import { useVoicesStore } from "../store/useVoicesStore";
import { BUILTIN_CAST, builtinSpeaker } from "../store/builtinCast";

/** Short on purpose: the sample exists to get to a finished video quickly. */
const SAMPLE_SCRIPT = `Καίτη: Γεια σας! Σήμερα μιλάμε για το γιατί οι σκύλοι λατρεύουν τα χάδια στην κοιλιά.
Σερίφης: Εγώ ξέρω την απάντηση. Είναι θέμα εμπιστοσύνης!
Καίτη: Ακριβώς. Όταν ένας σκύλος σου δείχνει την κοιλιά του, σου λέει ότι νιώθει ασφαλής.
Σερίφης: Και ότι θέλει κι άλλα χάδια. Πολλά χάδια.
Καίτη: Την επόμενη φορά, προσέξτε τη γλώσσα του σώματος. Τα λέμε σύντομα!`;

function Choice({
  title, body, onClick, primary,
}: {
  title: string;
  body: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left border p-4 transition-colors hover:border-accent hover:bg-accent/5 ${
        primary ? "border-accent bg-accent/10" : "border-accent/30"
      }`}
    >
      <div className={`font-display uppercase tracking-[0.1em] ${primary ? "text-accent-bright" : "text-neutral-100"}`}>
        {title}
      </div>
      <p className="text-sm text-neutral-400 mt-1">{body}</p>
    </button>
  );
}

export function Welcome() {
  const open = useUiStore((s) => s.welcomeOpen);
  const setOpen = useUiStore((s) => s.setWelcomeOpen);
  const goTo = useUiStore((s) => s.goTo);
  const setSceneTab = useUiStore((s) => s.setSceneTab);
  const setWelcomeSeen = useSettingsStore((s) => s.setWelcomeSeen);
  const speakers = useProjectStore((s) => s.speakers);
  const script = useProjectStore((s) => s.script);
  const [error, setError] = useState<string | null>(null);

  const hasWork = speakers.length > 0 || script.trim().length > 0;

  const close = () => {
    setWelcomeSeen(true);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  const confirmReplace = () =>
    !hasWork || window.confirm("This replaces the project you have open now. Continue?");

  const startSample = async () => {
    if (!confirmReplace()) return;
    setError(null);
    const puppetDir = await window.byok?.storage?.puppetDir().catch(() => null);
    if (!puppetDir) {
      setError("Couldn't find the built-in characters — try Start fresh instead.");
      return;
    }
    const p = useProjectStore.getState();
    p.reset();
    p.setLanguage("el");
    const cast = BUILTIN_CAST.filter((c) => c.label === "Καίτη" || c.label === "Σερίφης");
    cast.forEach((c, i) => p.addSpeakerFrom(builtinSpeaker(c, puppetDir, i)));

    // Give each speaker a different Greek voice if there are enough of them,
    // so the sample is ready to narrate without a trip to Cast.
    const voices = useVoicesStore.getState().voices;
    const greek = voices.filter((v) => /^el[_-]/i.test(v.name));
    const pool = greek.length > 0 ? greek : voices;
    useProjectStore.getState().speakers.forEach((sp, i) => {
      const v = pool[i % Math.max(1, pool.length)];
      if (v) p.updateSpeaker(sp.id, { ttsEngine: "piper", voiceId: v.onnxPath });
    });
    p.setScript(SAMPLE_SCRIPT);
    close();
    goTo(voices.length > 0 ? "script" : "setup");
  };

  const startFresh = () => {
    if (!confirmReplace()) return;
    useProjectStore.getState().reset();
    close();
    goTo("cast");
  };

  const openProject = () => {
    close();
    goTo("look");
    setSceneTab("presets");
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={close}
    >
      <div
        className="panel-hud relative w-full max-w-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="welcome-title" className="title-deco uppercase text-2xl">
            Welcome
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Make a talking-character video in five steps: Setup › Cast › Script ›
            Look › Render. The steps stay across the top — the next one glows.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {hasWork && (
            <Choice
              primary
              title="Continue"
              body="Pick up the project you were working on. It saves itself as you go."
              onClick={close}
            />
          )}
          <Choice
            primary={!hasWork}
            title="Try the sample"
            body="Two built-in characters and a short Greek script, ready to go. Fastest way to a first video."
            onClick={startSample}
          />
          <Choice
            title="Start fresh"
            body="An empty project. You'll add speakers first."
            onClick={startFresh}
          />
          <Choice
            title="Open a saved project"
            body="Takes you to Look › Presets, where projects and looks are opened and saved."
            onClick={openProject}
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end">
          <button className="label-etched underline hover:text-accent-bright" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
