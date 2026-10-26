// ---------------------------------------------------------------------------
// Render controls.
//
// Deliberately minimal: pick a length, optionally attach a narration WAV,
// press render, watch a bar, open the folder. The point of this first pass is
// to make the pipeline visible and provable end to end, not to be a full
// export dialog.
//
// The narration WAV is chosen by hand here rather than picked up automatically
// from the Narration panel — that panel currently keeps its result in local
// component state, so there's nothing global to read. Lifting it into the
// project store is the follow-up that makes this automatic.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { NumberField } from "../ui/NumberField";
import { HudButton } from "../ui/HudButton";
import { Toggle } from "../ui/Toggle";
import { autoClean } from "../../lib/media/autoClean";
import { useProjectStore } from "../../store/useProjectStore";
import { useSettingsStore } from "../../store/useSettingsStore";

/** More shapes from the same project in one go (Ak, 13 Oct 2026). Positions are
 *  fractions of the frame, so the cast lands in the same places on each. */
const SHAPES = [
  { id: "9:16", w: 1080, h: 1920, label: "Tall 9:16", tip: "Tall, for TikTok, Instagram Reels and YouTube Shorts." },
  { id: "1:1", w: 1080, h: 1080, label: "Square 1:1", tip: "Square, for Instagram and Facebook feeds." },
  { id: "4:5", w: 1080, h: 1350, label: "Portrait 4:5", tip: "A little taller than square: what Instagram's feed shows biggest." },
  { id: "16:9", w: 1920, h: 1080, label: "Wide 16:9", tip: "Wide, for YouTube, websites and presentations." },
] as const;
type Nar = { filePath: string; segments: { speakerId: string; speakerLabel: string; text: string; startMs: number; endMs: number }[]; analysis: unknown };

interface RenderResult {
  outputPath: string;
  frames: number;
}

export function RenderBar() {
  const render = useProjectStore((s) => s.render);
  const fps = useProjectStore((s) => s.fps);
  const musicWaveform = useProjectStore((s) => s.musicWaveform);
  const musicColor = useProjectStore((s) => s.musicColor);
  const cards = useProjectStore((s) => s.cards);
  const logo = useProjectStore((s) => s.logo);
  const speakers = useProjectStore((s) => s.speakers);
  const narration = useProjectStore((s) => s.narration);
  const subtitles = useProjectStore((s) => s.subtitles);
  const visemeFadeMs = useProjectStore((s) => s.visemeFadeMs);
  const idleMotion = useProjectStore((s) => s.idleMotion);
  const attachedAudio = useProjectStore((s) => s.attachedAudio);
  const music = useProjectStore((s) => s.music);
  const musicVolume = useProjectStore((s) => s.musicVolume);
  const musicDuck = useProjectStore((s) => s.musicDuck);
  const sfx = useProjectStore((s) => s.sfx);
  const backgrounds = useProjectStore((s) => s.backgrounds);
  const backgroundDim = useProjectStore((s) => s.backgroundDim);
  const backgroundBlur = useProjectStore((s) => s.backgroundBlur);
  const backgroundColorLook = useProjectStore((s) => s.backgroundColorLook);
  const backgroundCrossfadeMs = useProjectStore((s) => s.backgroundCrossfadeMs);
  const setAttachedAudio = useProjectStore((s) => s.setAttachedAudio);
  const [analyzing, setAnalyzing] = useState(false);

  const [durationSec, setDurationSec] = useState(5);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [matchNarration, setMatchNarration] = useState(true);

  // The combined narration's length is the end of its last segment. Rounded up
  // so the final word is never clipped by a partial second.
  const narrationSec = narration
    ? Math.max(1, Math.ceil(Math.max(...narration.segments.map((s) => s.endMs)) / 1000))
    : null;

  // A hand-picked file always wins — that's the override. Otherwise the most
  // recent narration is used automatically.
  const effectiveAudioPath = audioPath ?? narration?.filePath ?? null;
  const effectiveDuration =
    matchNarration && narrationSec && !audioPath ? narrationSec : durationSec;
  const [busy, setBusy] = useState(false);
  const aiLabel = useSettingsStore((s) => s.aiLabel);
  const setAiLabel = useSettingsStore((s) => s.setAiLabel);
  const language = useProjectStore((s) => s.language);
  const twinLang = language === "el" ? "en" : "el";
  const [extraShapes, setExtraShapes] = useState<string[]>([]);
  const [twin, setTwin] = useState(false);
  const [made, setMade] = useState<string[]>([]);
  const [pct, setPct] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RenderResult | null>(null);

  // Subscribe once. The unsubscribe matters: without it every remount would
  // stack another listener and progress would arrive multiplied.
  const busyRef = useRef(busy);
  busyRef.current = busy;
  /** Set by Stop, so the next video in a multi-video render is not started. */
  const stopRef = useRef(false);
  useEffect(() => {
    // Optional-chained: `window.byok` exists only inside Electron. An unguarded
    // call here throws during mount and takes the WHOLE app down, which is a
    // blank window that looks like a styling fault rather than a missing bridge.
    return window.byok?.render?.onProgress(({ pct, note }) => {
      if (!busyRef.current) return;
      setPct(pct);
      if (note) setNote(note);
    });
  }, []);

  async function pickAudio() {
    const p = await window.byok.dialog.openFile([
      { name: "Audio", extensions: ["wav"] },
    ]);
    if (!p) return;
    setAudioPath(p);
    // Analyse it immediately so the waveform reacts to the attached file the
    // same way it reacts to generated narration. Without this the file plays
    // in the render while the waveform animates to a sine wave — which is
    // exactly what it used to do.
    setAnalyzing(true);
    try {
      const analysis = await window.byok.audio.analyzeFile(p);
      setAttachedAudio({ filePath: p, analysis });
    } catch (e) {
      setAttachedAudio({ filePath: p, analysis: null });
      setError(
        `Attached the audio, but couldn't analyse it (${e instanceof Error ? e.message : String(e)}). ` +
          "It will still play; the waveform just won't follow it. 16-bit PCM WAV analyses reliably."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  /** draft: a quick look — a third of the size, 3 pictures a second, full
   *  sound — opened by itself when ready (Ak, 12 Oct 2026). */
  async function start(draft = false, o: { width?: number; height?: number; nar?: Nar; stem?: string; inLoop?: boolean } = {}): Promise<string | null> {
    if (!o.inLoop) {
      stopRef.current = false;
      setBusy(true);
      setError(null);
      setResult(null);
      setMade([]);
    }
    setPct(0);
    setNote(o.stem ? `Starting ${o.stem}…` : "Starting…");
    const narSec = o.nar ? Math.max(1, Math.ceil(Math.max(...o.nar.segments.map((x) => x.endMs)) / 1000)) : null;

    try {
      const res = await window.byok.render.start({
        musicWaveform,
        musicColor,
        // Welded on after the render, so nothing inside the lesson shifts.
        introPath: cards.introPath,
        outroPath: cards.outroPath,
        logo: logo.filePath ? logo : null,
        // Only the fields the video needs — the sprite sheet and voice
        // assignments aren't used by the renderer yet.
        speakers: speakers.map((sp) => ({
          id: sp.id,
          label: sp.label,
          x: sp.x,
          y: sp.y,
          size: sp.size,
          bgColor: sp.bgColor,
          borderColor: sp.borderColor,
          bgOpacity: sp.bgOpacity,
          borderOpacity: sp.borderOpacity,
          outlineShape: sp.outlineShape,
          frameWidth: sp.frameWidth,
          gestures: sp.gestures,
          facing: sp.facing,
          sitting: sp.sitting,
          waveform: sp.waveform,
          // Paths, not URLs — main copies the files into the render's public
          // dir. The puppet wins over the sheet there, as it does in the
          // preview; both are sent so that precedence lives in exactly one
          // place rather than being decided twice.
          sheetPath: sp.sheetPath,
          puppetPath: sp.puppetPath,
          // a drawn character is JSON and wins over both (same rule everywhere)
          character: sp.character,
        })),
        width: o.width ?? (draft ? even(render.width / 3) : render.width),
        height: o.height ?? (draft ? even(render.height / 3) : render.height),
        fileStem: o.stem,
        fps: draft ? 3 : fps,
        crf: draft ? 32 : undefined,
        durationSec: narSec ?? effectiveDuration,
        audioFilePath: o.nar ? o.nar.filePath : effectiveAudioPath,
        // Whichever audio is actually in the video is the one that drives the
        // waveform.
        analysis: (o.nar ? o.nar.analysis : audioPath ? attachedAudio?.analysis ?? null : narration?.analysis ?? null) as never,
        // Music plays under whatever the main audio is — including a
        // hand-attached file, which it has no quarrel with. Only the ducking
        // needs the narration, and that falls back to "never duck" on its own.
        musicFilePath: music?.filePath ?? null,
        musicAnalysis: music?.analysis ?? null,
        musicVolume,
        musicDuck,
        // Effects are placed against the video's own clock, so unlike the
        // backgrounds they survive a swapped audio file.
        sfx: sfx.map((c) => ({
          filePath: c.filePath,
          atMs: c.atMs,
          volume: c.volume,
          label: c.label,
        })),
        // Backgrounds are timed against the narration that planned them, so
        // they go the same way the subtitles do: a hand-attached file has
        // nothing to do with those scene boundaries.
        backgrounds: audioPath
          ? []
          : backgrounds
              .filter((b) => b.filePath)
              .map((b) => ({
                startMs: b.startMs,
                endMs: b.endMs,
                filePath: b.filePath,
                sourceSec: b.hit?.durationSec ?? 0,
                query: b.query,
              })),
        backgroundDim,
        // Blur never reached an in-app render before 12 Oct 2026 — only jobs set it.
        backgroundBlur,
        backgroundColorLook,
        backgroundCrossfadeMs,
        subtitles,
        aiLabel,
        visemeFadeMs,
        idleMotion,
        // Same reasoning: subtitles are only meaningful against the narration
        // whose timings produced them.
        narrationSegments: o.nar ? o.nar.segments : audioPath ? [] : narration?.segments ?? [],
      });

      if (res.ok) {
        setResult({ outputPath: res.outputPath, frames: res.frames });
        setMade((m) => [...m, res.outputPath]);
        setNote(draft ? "Draft ready — opening it" : "Done");
        setPct(100);
        if (draft) void window.byok.storage.openPath(res.outputPath);
        // Old background clips go once the video is safely out (Settings limit).
        if (!o.inLoop) void autoClean().then((msg) => msg && setNote(`Done. ${msg}`));
        return res.outputPath;
      }
      setError(res.error ?? "Render failed.");
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      if (!o.inLoop) setBusy(false);
    }
  }

  /** The finished video, plus every extra shape and the twin language — one
   *  after another, never two at once (one render at a time on this machine). */
  async function renderAll() {
    if (!extraShapes.length && !twin) return void start(false);
    stopRef.current = false;
    setBusy(true);
    setError(null);
    setResult(null);
    setMade([]);
    try {
      const shapes = [{ w: render.width, h: render.height, id: "" }, ...SHAPES.filter((x) => extraShapes.includes(x.id) && !(x.w === render.width && x.h === render.height)).map((x) => ({ w: x.w, h: x.h, id: x.id.replace(":", "x") }))];
      const langs: { tag: string; nar?: Nar }[] = [{ tag: language }];
      if (twin) {
        setNote(`Translating the script and making the ${twinLang === "el" ? "Greek" : "English"} narration…`);
        langs.push({ tag: twinLang, nar: (await window.byok.tts.twinNarration(twinLang, { pricePer1000: useSettingsStore.getState().elevenPricePer1000Usd })) as Nar });
      }
      for (const l of langs) {
        for (const sh of shapes) {
          if (stopRef.current) return;
          const stem = [l.tag, sh.id].filter(Boolean).join("-");
          const ok = await start(false, { width: sh.w, height: sh.h, nar: l.nar, stem: langs.length > 1 || sh.id ? stem : undefined, inLoop: true });
          if (!ok) return;
        }
      }
      setNote(`Done — ${langs.length * shapes.length} videos`);
      void autoClean();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const lengthText = effectiveDuration ? `${Math.floor(effectiveDuration / 60)}:${String(Math.round(effectiveDuration % 60)).padStart(2, "0")}` : "—";
  const ready = !!(narration || audioPath);
  return (
    <section className="flex flex-col gap-4">
      <div className="forge-make-sum" data-tip="The video is exactly as long as the narration — nothing to set by hand.">
        <span className="label-etched">Length</span>
        <b>{ready ? lengthText : "—"}</b>
        <small>{ready ? `follows the narration · ${narration?.segments.length ?? 0} lines` : "make the narration in the Script step first"}</small>
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="btn"
          disabled={busy || !ready}
          onClick={() => start(true)}
          data-tip="A quick look: small, 3 pictures a second, with the full sound. Ready in a fraction of the time, and opens by itself."
        >
          Quick draft
        </button>
        <button
          className="btn btn-primary"
          disabled={busy || !ready}
          onClick={() => void renderAll()}
          data-tip="The finished video, full quality — plus any extra shapes and the other language ticked below, one after another."
        >
          {busy ? "Rendering…" : extraShapes.length || twin ? `Render ${(1 + extraShapes.length) * (twin ? 2 : 1)} videos` : "Render video"}
        </button>
      </div>

      <div className="flex flex-col gap-2" data-tip="The same video in more shapes, made one after another. Your project's own shape is always made.">
        <span className="label-etched">Also as</span>
        <div className="flex flex-wrap gap-2">
          {SHAPES.filter((x) => !(x.w === render.width && x.h === render.height)).map((x) => (
            <button
              key={x.id}
              className="btn"
              aria-pressed={extraShapes.includes(x.id)}
              onClick={() => setExtraShapes((v) => (v.includes(x.id) ? v.filter((y) => y !== x.id) : [...v, x.id]))}
              data-tip={`${x.tip} Click to add or remove.`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <Toggle
          label={`Also in ${twinLang === "el" ? "Greek" : "English"}`}
          checked={twin}
          onChange={setTwin}
          data-tip={`The same video in ${twinLang === "el" ? "Greek" : "English"}: the script is translated and the same characters speak it, with matching subtitles. Uses your Gemini key.`}
        />
        <Toggle
          label="Made with Video Forge"
          checked={aiLabel}
          onChange={setAiLabel}
          data-tip="A small honest label in a corner of the video, in our look — viewers trust it more, and EU rules ask for AI videos to be marked. Also written into the file's own notes."
        />
      </div>

      {busy && (
        <div className="flex flex-col gap-1">
          <div className="forge-progress"><i style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-neutral-400">{pct}% · {note}</p>
          <button
            className="btn"
            onClick={() => {
              stopRef.current = true;
              void window.byok.render.cancel();
            }}
            data-tip="Stop making the video now. What is half made is thrown away; the narration is kept."
          >
            Stop
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400 break-words">{error}</p>}

      {result && !busy && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-400 break-all">{note} — {made.length > 1 ? made.map((m) => m.split(/[\\/]/).pop()).join(", ") : result.outputPath.split(/[\\/]/).pop()}</p>
          <div className="flex gap-2">
            <button className="btn" onClick={() => window.byok.storage.openPath(result.outputPath)} data-tip="Play the video in your usual player.">Play it</button>
            <button className="btn" onClick={() => window.byok.storage.openOutputDir()} data-tip="Open the folder where your videos are saved.">Open folder</button>
          </div>
        </div>
      )}
    </section>
  );
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
