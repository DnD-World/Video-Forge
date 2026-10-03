import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useChatterboxVoicesStore } from "../../store/useChatterboxVoicesStore";
import { useVoicesStore } from "../../store/useVoicesStore";
import { parseScript } from "../../lib/narration/parseScript";
import { Slider } from "../ui/Slider";
import { Picker } from "../ui/Picker";
import { Hint } from "../ui/Hint";
import { ErrorNote } from "../ui/ErrorNote";
import { FEATURES, engineOf } from "../../lib/features";
import { checkScriptLines, type LineProblem } from "../../lib/narration/checkScriptLines";
import { useUiStore } from "../../store/useUiStore";

const LANGUAGES = [
  { code: "el", label: "Greek" },
  { code: "en", label: "English" },
];

interface NarrationResult {
  filePath: string;
  segments: { speakerId: string; speakerLabel: string; text: string; startMs: number; endMs: number }[];
}

/**
 * Step ③ — the script, and the voice track made from it.
 *
 * Voices are NOT chosen here any more: they live on the speaker, in Cast, and
 * this screen shows them read-only with a link back. Two places to set one
 * thing is how they drifted apart before.
 *
 * The order on screen is the order of work: who's speaking → write (or have
 * the AI write) → check → make the voice track.
 */
export default function NarrationPanel() {
  const speakers = useProjectStore((s) => s.speakers);
  const script = useProjectStore((s) => s.script);
  const setScript = useProjectStore((s) => s.setScript);
  const language = useProjectStore((s) => s.language);
  const setLanguage = useProjectStore((s) => s.setLanguage);
  const setNarration = useProjectStore((s) => s.setNarration);
  const pauseSameMs = useProjectStore((s) => s.pauseSameMs);
  const pauseTurnMs = useProjectStore((s) => s.pauseTurnMs);
  const setPauses = useProjectStore((s) => s.setPauses);
  const exaggeration = useSettingsStore((s) => s.defaults.chatterboxExaggeration);
  const cfgWeight = useSettingsStore((s) => s.defaults.chatterboxCfgWeight);
  const piperPythonPath = useSettingsStore((s) => s.defaults.piperPythonPath);
  const piperVoices = useVoicesStore((s) => s.voices);

  const serverRunning = useChatterboxVoicesStore((s) => s.serverRunning);

  const goTo = useUiStore((s) => s.goTo);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [problems, setProblems] = useState<LineProblem[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<unknown>(null);
  const [unmatchedLines, setUnmatchedLines] = useState<string[]>([]);
  const [result, setResult] = useState<NarrationResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [showDraft, setShowDraft] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<unknown>(null);

  // GLM-5.2 took 274s on a real key here — well inside the 5 minute timeout,
  // but a button that just says "Drafting…" for four and a half minutes is
  // indistinguishable from a hang. A ticking counter is the whole fix.
  const [draftSec, setDraftSec] = useState(0);
  useEffect(() => {
    if (!drafting) return;
    setDraftSec(0);
    const id = window.setInterval(() => setDraftSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [drafting]);

  const runDraft = async () => {
    // Every one of these used to be a silent `return`, which is exactly why
    // the button appeared to do nothing at all. Always say why.
    setDraftError(null);
    if (speakers.length === 0) {
      setDraftError("Add at least one speaker in the Cast step first — the draft is written as dialogue between your speakers.");
      return;
    }
    if (!topic.trim()) {
      setDraftError("Enter a topic first.");
      return;
    }
    if (script.trim() && !window.confirm("This will replace your current script. Continue?")) return;

    setDrafting(true);
    try {
      const languageName = LANGUAGES.find((l) => l.code === language)?.label ?? language;
      const draft = await window.byok.llm.draftScript({
        topic,
        speakerLabels: speakers.map((s) => s.label),
        languageName,
        tone: tone.trim() || undefined,
      });
      setScript(draft);
    } catch (e: any) {
      setDraftError(e);
    } finally {
      setDrafting(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    setResult(null);
    setAudioUrl(null);

    const { segments, unmatchedLines: unmatched } = parseScript(script, speakers);
    setUnmatchedLines(unmatched);

    if (segments.length === 0) {
      setGenError("No line in the script matched a speaker's name. Press Check script to see which lines and why.");
      setGenerating(false);
      return;
    }

    const speakerById = new Map(speakers.map((s) => [s.id, s]));
    const missingVoice = segments.find((seg) => {
      const sp = speakerById.get(seg.speakerId);
      if (!sp) return true;
      return engineOf(sp) === "piper" ? !sp.voiceId : !sp.chatterboxVoiceRef;
    });
    if (missingVoice) {
      const sp = speakerById.get(missingVoice.speakerId);
      setGenError(`${missingVoice.speakerLabel} has no voice yet — pick one in the Cast step.`);
      setGenerating(false);
      return;
    }

    // Chatterbox needs its server up; Piper starts its own on demand, so a
    // Piper-only script must not be blocked by a stopped Chatterbox.
    if (!serverRunning && segments.some((seg) => engineOf(speakerById.get(seg.speakerId)!) === "chatterbox")) {
      setGenError("Chatterbox server isn't running — start it in Setup, or switch those speakers to Piper.");
      setGenerating(false);
      return;
    }

    try {
      const resolvedSegments = segments.map((seg) => {
        const sp = speakerById.get(seg.speakerId)!;
        const usePiper = engineOf(sp) === "piper";
        return {
          speakerId: seg.speakerId,
          speakerLabel: seg.speakerLabel,
          text: seg.text,
          language,
          engine: usePiper ? ("piper" as const) : ("chatterbox" as const),
          piperPythonPath: usePiper ? piperPythonPath : undefined,
          piperOnnxPath: usePiper ? sp.voiceId : undefined,
          voiceMode: sp.chatterboxVoiceMode ?? "predefined",
          predefinedVoiceId: sp.chatterboxVoiceMode === "clone" ? undefined : sp.chatterboxVoiceRef,
          referenceAudioFilename: sp.chatterboxVoiceMode === "clone" ? sp.chatterboxVoiceRef : undefined,
          exaggeration,
          cfgWeight,
        };
      });

      const res = await window.byok.tts.generateNarration(
        resolvedSegments,
        speakers.map((s) => s.id),
        { sameMs: pauseSameMs, turnMs: pauseTurnMs }
      );
      setResult(res);
      // Publish it so the render bar can attach it and match its length
      // without the user hand-picking the file, and so the waveform can be
      // driven by the real audio instead of the placeholder animation.
      setNarration({
        filePath: res.filePath,
        segments: res.segments,
        analysis: res.analysis,
      });
      const buf = await window.byok.storage.readFile(res.filePath);
      const blob = new Blob([buf], { type: "audio/wav" });
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      setGenError(e);
    } finally {
      setGenerating(false);
    }
  };

  // ---- helpers for the screen below -------------------------------------

  const needsVoice = (sp: (typeof speakers)[number]) =>
    engineOf(sp) === "piper" ? !sp.voiceId : !sp.chatterboxVoiceRef;

  const voiceName = (sp: (typeof speakers)[number]) => {
    if (engineOf(sp) === "chatterbox") return sp.chatterboxVoiceRef ?? null;
    if (!sp.voiceId) return null;
    return (
      piperVoices.find((v) => v.onnxPath === sp.voiceId)?.name ??
      sp.voiceId.split(/[\\/]/).pop()?.replace(/\.onnx$/, "") ??
      null
    );
  };

  const runCheck = () => {
    const found = checkScriptLines(script, speakers, { needsVoice });
    setProblems(found);
    return found;
  };

  // A check describes the script it was run on. Editing the script makes it
  // stale, so it is dropped rather than left on screen describing old text.
  useEffect(() => {
    setProblems(null);
  }, [script]);

  /** Put the cursor on a line, so a problem in the list takes you to it. */
  const jumpToLine = (line: number) => {
    const ta = textareaRef.current;
    if (!ta || line < 1) return;
    const lines = script.split("\n");
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    const end = start + (lines[line - 1]?.length ?? 0);
    ta.focus();
    ta.setSelectionRange(start, end);
    // Roughly scroll the line into view: textarea has no API for it.
    const lineHeight = ta.scrollHeight / Math.max(1, lines.length);
    ta.scrollTop = Math.max(0, (line - 3) * lineHeight);
  };

  const openTextFile = async () => {
    const p = await window.byok.dialog.openFile([{ name: "Text", extensions: ["txt", "md"] }]);
    if (!p) return;
    if (script.trim() && !window.confirm("This will replace your current script. Continue?")) return;
    try {
      const buf = await window.byok.storage.readFile(p);
      setScript(new TextDecoder("utf-8").decode(buf));
    } catch (e) {
      setGenError(e);
    }
  };

  /** Check first; only go on to spend time on voices if nothing would fail. */
  const checkThenGenerate = async () => {
    const found = runCheck();
    const errors = found.filter((p) => p.severity === "error");
    if (errors.length > 0) {
      const ok = window.confirm(
        `${errors.length} problem(s) found — those lines will be skipped or fail.\n\nMake the voice track anyway?`
      );
      if (!ok) return;
    }
    await generate();
  };

  const example = useMemo(() => {
    const a = speakers[0]?.label ?? "Anna";
    const b = speakers[1]?.label ?? a;
    return (
      `${a}: Welcome! Today we're talking about why dogs love belly rubs.\n` +
      `${b}: Is it really about trust?\n` +
      `${a} [quietly, like a secret]: Mostly. Let me show you.`
    );
  }, [speakers]);

  const errorCount = problems?.filter((p) => p.severity === "error").length ?? 0;
  const warnCount = problems?.filter((p) => p.severity === "warn").length ?? 0;

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full">
      <div>
        <h2 className="label-lit text-base">③ Script</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Write what your speakers say, check it, then make the voice track. The
          voice track is what the video is timed to.
        </p>
      </div>

      {FEATURES.chatterbox &&
        !serverRunning &&
        speakers.some((sp) => engineOf(sp) === "chatterbox") && (
          <p className="text-sm text-accent-bright border border-accent-deep/40 bg-accent-deep/10 px-3 py-2">
            Chatterbox server isn't running — start it from Setup, or set those speakers to Piper.
          </p>
        )}

      {/* 1 — who is speaking (read-only: voices are set in Cast) */}
      <section className="border border-accent/25 bg-metal-800/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="label-lit text-sm">
            1 · Who's speaking
            <Hint>
              Each line of the script starts with one of these names. Their voices
              are chosen in the Cast step, on the left.
            </Hint>
          </h3>
          <button
            className="label-etched underline hover:text-accent-bright"
            onClick={() => goTo("cast")}
          >
            Change in Cast
          </button>
        </div>
        {speakers.length === 0 ? (
          <p className="text-sm text-accent-bright">
            No speakers yet.{" "}
            <button className="underline" onClick={() => goTo("cast")}>
              Add one in Cast
            </button>{" "}
            first.
          </p>
        ) : (
          <ul className="space-y-1">
            {speakers.map((sp) => {
              const name = voiceName(sp);
              return (
                <li key={sp.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: sp.borderColor }}
                    aria-hidden
                  />
                  <span className="text-neutral-100 min-w-[100px] font-mono">{sp.label}</span>
                  {name && !needsVoice(sp) ? (
                    <span className="text-neutral-400">✓ {name}</span>
                  ) : (
                    <span className="text-accent-bright">! no voice yet — pick one in Cast</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-3 pt-1">
          <span className="label-etched text-sm">Language</span>
          <Picker
            aria-label="Language"
            className="min-w-[180px]"
            value={language}
            options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
            onChange={setLanguage}
          />
        </div>
      </section>

      {/* 2 — the words */}
      <section className="border border-accent/25 bg-metal-800/60 p-4 space-y-3">
        <h3 className="label-lit text-sm">
          2 · What they say
          <Hint>
            One line per speech: the speaker's name, a colon, then the words. To
            say <em>how</em> a line is spoken, put it in square brackets before
            the colon — <code>Name [whispering]: …</code>. Anything after the
            colon is read out loud.
          </Hint>
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowDraft((v) => !v)}
            aria-expanded={showDraft}
            className="btn cut-sm px-3 py-1.5 text-sm font-display uppercase tracking-[0.1em] hover:text-accent-bright"
          >
            ✦ Write it for me (AI)
          </button>
          <button
            onClick={openTextFile}
            className="btn cut-sm px-3 py-1.5 text-sm font-display uppercase tracking-[0.1em] hover:text-accent-bright"
          >
            Open a text file…
          </button>
        </div>

        {showDraft && (
          <div className="border border-accent/20 bg-metal-900/60 p-3 space-y-2">
            <p className="text-sm">
              Say what the video is about and the AI writes a first draft as a
              conversation between your speakers. You can edit it freely
              afterwards. Needs a free NVIDIA key (Setup step).
              <Hint label="Which AI is this?">
                GLM-5.2, through NVIDIA's free API. It is slow — a few minutes is
                normal, and it gives up at five.
              </Hint>
            </p>
            <input
              type="text"
              placeholder="Topic, e.g. 'why dogs love belly rubs'…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-metal-900 border border-accent/25 px-3 py-2 text-base text-neutral-100 outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder="Tone (optional), e.g. 'playful', 'informative'…"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-metal-900 border border-accent/25 px-3 py-2 text-base text-neutral-100 outline-none focus:border-accent"
            />
            <button
              onClick={runDraft}
              // Only ever disabled while a request is in flight. Disabling it for
              // missing input is what hid the reason from the user.
              disabled={drafting}
              className="btn cut-sm px-4 py-2 text-sm font-display uppercase tracking-[0.1em] hover:text-accent-bright disabled:opacity-40"
            >
              {drafting ? `Writing… ${draftSec}s` : "Write the draft"}
            </button>
            {drafting && (
              <p className="text-sm text-neutral-500">
                A few minutes is normal. You can keep working elsewhere in the app.
              </p>
            )}
            {draftError != null && <ErrorNote error={draftError} />}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={10}
          placeholder={`For example:\n\n${example}`}
          aria-label="Script"
          className="w-full bg-metal-900 border border-accent/25 px-3 py-2 text-base text-neutral-100 outline-none focus:border-accent resize-y font-mono"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={runCheck}
            disabled={!script.trim()}
            className="btn cut-sm px-4 py-2 text-sm font-display uppercase tracking-[0.1em] hover:text-accent-bright disabled:opacity-40"
          >
            Check script
          </button>
          {problems && (
            <span className="text-sm">
              {errorCount === 0 && warnCount === 0 ? (
                <span className="text-emerald-300">✓ Looks good — ready for voices.</span>
              ) : (
                <>
                  {errorCount > 0 && <span className="text-red-300">{errorCount} to fix</span>}
                  {errorCount > 0 && warnCount > 0 && " · "}
                  {warnCount > 0 && <span className="text-amber-300">{warnCount} worth a look</span>}
                </>
              )}
            </span>
          )}
        </div>

        {problems && problems.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {problems.map((p, i) => (
              <li
                key={i}
                className={`border-l-2 pl-3 ${p.severity === "error" ? "border-red-400/70" : "border-amber-400/70"}`}
              >
                {p.line > 0 ? (
                  <button
                    className="label-etched underline hover:text-accent-bright mr-2"
                    onClick={() => jumpToLine(p.line)}
                  >
                    Line {p.line}
                  </button>
                ) : null}
                <span className={p.severity === "error" ? "text-red-300" : "text-amber-300"}>
                  {p.problem}
                </span>{" "}
                <span className="text-neutral-300">{p.fix}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3 — pacing (optional) */}
      <section className="border border-accent/25 bg-metal-800/60 p-4 space-y-3">
        <h3 className="label-lit text-sm">
          3 · Pauses <span className="label-etched normal-case">(optional)</span>
          <Hint>
            Silence added between lines. Two people replying with no gap at all
            sounds stitched together, so a short pause makes it feel like a real
            conversation. Takes effect the next time you make the voice track.
          </Hint>
        </h3>
        <Slider
          label="Pause between lines" value={pauseSameMs} min={0} max={800} step={10}
          hint="When the same person keeps talking."
          onChange={(v) => setPauses({ sameMs: Math.round(v) })}
          format={(v) => `${(v / 1000).toFixed(2)} s`}
        />
        <Slider
          label="Pause between speakers" value={pauseTurnMs} min={0} max={1500} step={10}
          hint="When the other person replies."
          onChange={(v) => setPauses({ turnMs: Math.round(v) })}
          format={(v) => `${(v / 1000).toFixed(2)} s`}
        />
      </section>

      {/* 4 — make it */}
      <section className="border border-accent/25 bg-metal-800/60 p-4 space-y-3">
        <h3 className="label-lit text-sm">
          4 · Make the voice track
          <Hint>
            Each line is spoken by its speaker's voice and joined into one audio
            file. Subtitles and mouth movement are timed from it. Piper voices run
            on this computer's processor, not the graphics card.
          </Hint>
        </h3>

        {unmatchedLines.length > 0 && (
          <div className="text-sm text-accent-bright border border-accent-deep/40 bg-accent-deep/10 px-3 py-2">
            {unmatchedLines.length} line(s) didn't match a speaker and were skipped. Press
            Check script to see why.
          </div>
        )}

        <button
          onClick={checkThenGenerate}
          disabled={generating || !script.trim()}
          className="btn cut-sm btn-primary px-4 py-2 text-sm font-display font-semibold uppercase tracking-[0.1em] text-accent-bright disabled:opacity-40"
        >
          {generating ? "Making the voice track…" : "▶ Make the voice track"}
        </button>
        {genError != null && <ErrorNote error={genError} />}

        {audioUrl && result && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-300">
              ✓ Done — {result.segments.length} lines. Listen below, then go on to{" "}
              <button className="underline" onClick={() => goTo("look")}>
                Look
              </button>{" "}
              or straight to{" "}
              <button className="underline" onClick={() => goTo("render")}>
                Render
              </button>
              .
            </p>
            <audio src={audioUrl} controls className="w-full" />
            <details className="text-sm">
              <summary className="cursor-pointer text-neutral-400">Line timings</summary>
              <p className="text-neutral-500 mt-1 break-all">Saved to: {result.filePath}</p>
              <div className="space-y-1 mt-2">
                {result.segments.map((seg, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-accent-bright shrink-0">
                      {(seg.startMs / 1000).toFixed(1)}s–{(seg.endMs / 1000).toFixed(1)}s
                    </span>
                    <span className="shrink-0">{seg.speakerLabel}:</span>
                    <span>{seg.text}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </section>
    </div>
  );
}
