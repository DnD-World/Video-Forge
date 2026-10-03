// ---------------------------------------------------------------------------
// Render controls.
//
// Step ⑤. The voice track from the Script step is attached automatically; a
// different WAV can still be picked by hand. A render is never started by one
// click: it holds the graphics card for minutes to hours (CLAUDE.md), so the
// first click shows how long it will take and asks.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { NumberField } from "../ui/NumberField";
import { HudButton } from "../ui/HudButton";
import { Toggle } from "../ui/Toggle";
import { useProjectStore } from "../../store/useProjectStore";
import { useUiStore } from "../../store/useUiStore";
import { ErrorNote } from "../ui/ErrorNote";

/** Frames per second this app renders at on the reference machine (laptop RTX
 *  3070, 1080x1920): 12,720 frames in 14.5 minutes, measured 13 Aug 2026 — see
 *  PLAN.md. Pixel count is the same in both orientations, so one number does. */
const MEASURED_RENDER_FPS = 14.6;
/** Bundling, browser start-up and the final mux — roughly constant. */
const RENDER_OVERHEAD_MIN = 0.5;

function estimateMinutes(durationSec: number, fps: number): number {
  return (durationSec * fps) / MEASURED_RENDER_FPS / 60 + RENDER_OVERHEAD_MIN;
}

function formatMinutes(min: number): string {
  if (min < 1.5) return "about a minute";
  if (min < 60) return `about ${Math.round(min)} minutes`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return `about ${h} h ${m} min`;
}

interface RenderResult {
  outputPath: string;
  frames: number;
}

export function RenderBar() {
  const render = useProjectStore((s) => s.render);
  const fps = useProjectStore((s) => s.fps);
  const musicWaveform = useProjectStore((s) => s.musicWaveform);
  const musicColor = useProjectStore((s) => s.musicColor);
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
  const [pct, setPct] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<unknown>(null);
  /** The "are you sure" box is open — renders hold the graphics card for a
   *  long time, so they are never started by a single click. */
  const [confirming, setConfirming] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, tick] = useState(0);
  const goTo = useUiStore((s) => s.goTo);
  const setLastRenderPath = useUiStore((s) => s.setLastRenderPath);
  const estimate = estimateMinutes(effectiveDuration, fps);

  // Once a second while rendering, so elapsed and remaining time move.
  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [busy]);
  const [result, setResult] = useState<RenderResult | null>(null);

  // Subscribe once. The unsubscribe matters: without it every remount would
  // stack another listener and progress would arrive multiplied.
  const busyRef = useRef(busy);
  busyRef.current = busy;
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

  async function start() {
    setConfirming(false);
    setStartedAt(Date.now());
    setBusy(true);
    setError(null);
    setResult(null);
    setPct(0);
    setNote("Starting…");

    try {
      const res = await window.byok.render.start({
        musicWaveform,
        musicColor,
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
          waveform: sp.waveform,
          // Paths, not URLs — main copies the files into the render's public
          // dir. The puppet wins over the sheet there, as it does in the
          // preview; both are sent so that precedence lives in exactly one
          // place rather than being decided twice.
          sheetPath: sp.sheetPath,
          puppetPath: sp.puppetPath,
        })),
        width: render.width,
        height: render.height,
        fps,
        durationSec: effectiveDuration,
        audioFilePath: effectiveAudioPath,
        // Whichever audio is actually in the video is the one that drives the
        // waveform.
        analysis: audioPath ? attachedAudio?.analysis ?? null : narration?.analysis ?? null,
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
        backgroundCrossfadeMs,
        subtitles,
        visemeFadeMs,
        idleMotion,
        // Same reasoning: subtitles are only meaningful against the narration
        // whose timings produced them.
        narrationSegments: audioPath ? [] : narration?.segments ?? [],
      });

      if (res.ok) {
        setResult({ outputPath: res.outputPath, frames: res.frames });
        setLastRenderPath(res.outputPath);
        setNote("Done");
        setPct(100);
      } else {
        setError(res.error ?? "The render stopped without saying why.");
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-neutral-400">
        Makes the finished video file. Everything you see in the preview is
        exactly what you get.
      </p>

      {!narration && !audioPath && (
        <div className="text-sm border border-amber-400/40 bg-amber-400/10 px-3 py-2">
          <span className="text-amber-300">No voice track yet</span> — the video
          would be silent, with no subtitles or talking.{" "}
          <button className="underline hover:text-accent-bright" onClick={() => goTo("script")}>
            Make one in Script
          </button>
          .
        </div>
      )}

      {narration && narrationSec && (
        <div className="border border-accent/25 bg-metal-800/60 px-3 py-2 space-y-2">
          <p className="text-sm text-neutral-300">
            Narration ready — {narrationSec}s, {narration.segments.length} lines.
            {audioPath ? " (overridden below)" : " Attached automatically."}
          </p>
          <Toggle
            label="Match video length to narration"
            checked={matchNarration}
            onChange={setMatchNarration}
          />
        </div>
      )}

      <label className="flex items-center gap-3">
        <span className="label-etched whitespace-nowrap">Length</span>
        <NumberField
          aria-label="Video length in seconds"
          className="w-28"
          min={1}
          max={600}
          value={effectiveDuration}
          disabled={busy || (matchNarration && !!narrationSec && !audioPath)}
          onChange={(n) => setDurationSec(Math.max(1, Math.min(600, Math.round(n))))}
        />
        <span className="label-etched">sec</span>
      </label>

      <div className="flex items-center gap-2">
        <HudButton onClick={pickAudio}>
          {analyzing
            ? "Analysing…"
            : audioPath
              ? "Change Audio"
              : narration
                ? "Use Different Audio"
                : "Attach Audio"}
        </HudButton>
        {audioPath && (
          <button
            onClick={() => {
              setAudioPath(null);
              setAttachedAudio(null);
            }}
            className="label-etched underline hover:text-accent-bright"
          >
            clear
          </button>
        )}
      </div>
      {audioPath && (
        <p className="text-xs text-neutral-500 break-all">{audioPath}</p>
      )}

      {!busy && !confirming && (
        <HudButton active onClick={() => setConfirming(true)}>
          ▶ Render Video
        </HudButton>
      )}

      {confirming && !busy && (
        <div className="border border-accent/40 bg-accent/5 px-3 py-3 space-y-2 text-sm">
          <p>
            This will take <strong className="text-accent-bright">{formatMinutes(estimate)}</strong>{" "}
            for a {effectiveDuration}-second video at {fps} fps.
          </p>
          <p className="text-neutral-300">
            It uses the graphics card the whole time, so the computer will be
            slow and warm. Close other heavy programs first — anything running AI
            models, like Ollama or Hermes.
          </p>
          <div className="flex gap-2 pt-1">
            <HudButton active onClick={start}>
              Start render
            </HudButton>
            <HudButton onClick={() => setConfirming(false)}>Cancel</HudButton>
          </div>
        </div>
      )}

      {busy && (
        <div className="flex flex-col gap-1">
          <div className="h-2 bg-black/50 border border-accent/30">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400">
            {pct}% · {note}
          </p>
          {startedAt && (
            <p className="text-xs text-neutral-500">
              {(() => {
                const elapsedMin = (Date.now() - startedAt) / 60000;
                // Remaining from progress once there is some to go on; the
                // up-front estimate until then.
                const remaining =
                  pct >= 5 ? (elapsedMin * (100 - pct)) / pct : Math.max(0, estimate - elapsedMin);
                return `${Math.floor(elapsedMin)} min so far · ${formatMinutes(remaining)} left`;
              })()}
            </p>
          )}
        </div>
      )}

      {error != null && <ErrorNote error={error} />}

      {result && !busy && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-emerald-300">✓ Your video is ready.</p>
          <p className="text-xs text-neutral-400 break-all">{result.outputPath}</p>
          <div className="flex gap-2">
            <HudButton active onClick={() => window.byok.storage.openOutputDir()}>
              Show in folder
            </HudButton>
            <HudButton onClick={() => setConfirming(true)}>Render again</HudButton>
          </div>
        </div>
      )}
    </section>
  );
}
