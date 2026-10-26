import { ExplainerStudio } from "./components/explainer/ExplainerStudio";
import { HudButton } from "./components/ui/HudButton";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { Toggle } from "./components/ui/Toggle";
import { SpeakerAvatar } from "./components/canvas/SpeakerAvatar";
import { PuppetAvatar } from "./components/canvas/PuppetAvatar";
import { CharacterAvatar } from "./components/canvas/CharacterAvatar";
import { facingView, lookById } from "../characters/core/index.mjs";
import { WaveformScene } from "./components/canvas/WaveformScene";
import { BackgroundScene } from "./components/canvas/BackgroundScene";
import { SubtitleScene } from "./components/canvas/SubtitleScene";
import { usePreviewPlayer } from "./lib/motion/usePreviewPlayer";
import { buildCues } from "./lib/subtitles/wordTiming";
import { buildSpeakerVisemeTracks } from "./lib/visemes/speakerTracks";
import { visemeBlendAt } from "./lib/visemes/timeline";
import { useFileUrls } from "./lib/assets/useFileUrls";
import { useSubtitleFont } from "./lib/assets/useSubtitleFont";
import { usePuppets } from "./lib/puppets/usePuppets";
import { AiBadge } from "../remotion/AiBadge";
import { viewFor } from "./lib/motion/facing";
import { CastPanel } from "./components/panels/CastPanel";
import { ScenePanel } from "./components/panels/ScenePanel";
import { buildTracks } from "./lib/waveform/buildTracks";
import BackendPanel from "./components/settings/BackendPanel";
import NarrationPanel from "./components/settings/NarrationPanel";
import { useProjectStore } from "./store/useProjectStore";
import { useSettingsStore } from "./store/useSettingsStore";
import { deriveAccentShades, rgbTripleToHex } from "./lib/color/deriveShades";
import { headMotion, motionTransform } from "./lib/motion/idleMotion";
import {
  blinkAt, browAt, buildSpeakerBrowTracks,
  buildSpeakerHeadTracks, headPoseAt, buildSpeakerPoseTracks, poseAt,
} from "./lib/motion/facePerformance";
import { sampleAnalysis } from "./lib/waveform/audioAnalysis";
import { useCornerFlare } from "./lib/motion/useCornerFlare";
import { SparkField } from "./components/ui/SparkField";
import { TipLayer } from "./components/ui/TipLayer";
import { autoClean } from "./lib/media/autoClean";
import videoMark from "./assets/video-mark.jpg";
import imageMark from "./assets/image-mark.jpg";
import { VISEME } from "./lib/visemes/visemeMap";

/** Two corner-bracket accents — the recurring HUD-panel detail. Drop this
 *  inside any element with position:relative that uses .panel-hud. Always
 *  breathes (cheap — two small elements, not the whole panel body). */
function HudCorners() {
  return (
    <>
      <span className="hud-corner tl hud-breathe" />
      <span className="hud-corner br hud-breathe" />
    </>
  );
}

/** Snap step for avatar dragging — 5% of the frame in each axis. */
const SNAP_GRID = 0.05;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** A side rail that can fold away to a spine.
 *
 *  At the 1280px minimum window width the two 384px rails leave the preview
 *  267px wide for a 1080x1920 frame — too small to judge subtitle size or
 *  waveform detail, which is most of what the preview is for. Folding one rail
 *  hands that width straight to the canvas. */
function Rail({
  title, side, open, onToggle, flareRef, onFlare, children,
}: {
  title: string;
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  flareRef: MutableRefObject<HTMLElement | null>;
  onFlare: () => void;
  children: ReactNode;
}) {
  // ‹ collapses a left rail and expands a right one, so the arrow always points
  // the way the panel will move.
  const glyph = open ? (side === "left" ? "‹" : "›") : side === "left" ? "›" : "‹";
  return (
    <aside
      ref={flareRef}
      onClick={onFlare}
      className={`panel-hud hud-flare-target relative min-h-0 transition-[width] duration-200 ${
        open ? "w-96 p-5" : "w-9 px-0 py-3"
      }`}
    >
      <HudCorners />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={open ? `Collapse ${title}` : `Expand ${title}`}
        aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        // Was h-6 w-6 — a 24px target for the control that reshapes the whole
        // window, and the one you reach for most on a 1280px screen. 36px with
        // its own chamfered plate, so it reads as a control rather than as a
        // stray glyph floating in the corner of the panel.
        // The Forge look: a round tab on the panel's inner edge, half over the
        // gap, so it never sits on top of a panel's title (it did, in the
        // top corner, once the chamfer that used to make room for it went).
        className={`absolute top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full grid place-items-center text-base leading-none
          text-accent bg-black border border-[rgba(118,255,194,.35)]
          hover:border-accent hover:shadow-[0_0_14px_-2px_rgba(118,255,194,.6)]
          transition ${side === "left" ? "-right-4" : "-left-4"}`}
      >
        {glyph}
      </button>
      {open ? (
        children
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          data-tip={`Opens the ${title} panel again.`}
          className="label-etched absolute inset-x-0 top-10 mx-auto whitespace-nowrap hover:text-accent-bright"
          style={{ writingMode: "vertical-rl" }}
        >
          {title}
        </button>
      )}
    </aside>
  );
}

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Step = "cast" | "script" | "look" | "make";
const STEPS: { id: Step; title: string; sub: string }[] = [
  { id: "cast", title: "Cast", sub: "Who speaks" },
  { id: "script", title: "Script", sub: "What they say" },
  { id: "look", title: "Look", sub: "How it looks and sounds" },
  { id: "make", title: "Make", sub: "Preview, render, publish" },
];

export default function App() {
  // THE FOUR STEPS (Ak, 11 Oct 2026): Cast → Script → Look → Make, with
  // Settings behind a gear. `view` is what the centre shows; it follows the
  // step, so the rest of this file keeps reading one value.
  const [step, setStep] = useState<Step>("cast");
  const [settingsOpen, setSettingsOpen] = useState(false);
  // WHAT KIND OF VIDEO (21 Oct 2026): puppet videos (the four steps) or
  // explainers (animated, drawn by code — src/components/explainer). Remembered.
  const [mode, setModeState] = useState<"puppet" | "explainer">(() => {
    try { return localStorage.getItem("vf.mode") === "explainer" ? "explainer" : "puppet"; } catch { return "puppet"; }
  });
  const setMode = (m: "puppet" | "explainer") => { setModeState(m); setSettingsOpen(false); try { localStorage.setItem("vf.mode", m); } catch { /* fine */ } };
  const view: "canvas" | "settings" | "narration" = settingsOpen ? "settings" : step === "script" ? "narration" : "canvas";
  const goStep = (s: Step) => { setSettingsOpen(false); setStep(s); };
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [castOpen, setCastOpen] = useState(true);
  const [sceneOpen, setSceneOpen] = useState(true);

  const fps = useProjectStore((s) => s.fps);
  const render = useProjectStore((s) => s.render);
  const speakers = useProjectStore((s) => s.speakers);
  const updateSpeaker = useProjectStore((s) => s.updateSpeaker);
  const musicWaveform = useProjectStore((s) => s.musicWaveform);
  const musicColor = useProjectStore((s) => s.musicColor);
  const narration = useProjectStore((s) => s.narration);
  const subtitles = useProjectStore((s) => s.subtitles);
  const attachedAudio = useProjectStore((s) => s.attachedAudio);
  const visemeFadeMs = useProjectStore((s) => s.visemeFadeMs);
  const idleMotion = useProjectStore((s) => s.idleMotion);
  const music = useProjectStore((s) => s.music);
  // Loaded here rather than in the Subtitles panel: the canvas has to draw in
  // it whether or not that panel is open.
  useSubtitleFont(subtitles.fontFamily, subtitles.fontWeight ?? 800);
  const backgrounds = useProjectStore((s) => s.backgrounds);
  const backgroundDim = useProjectStore((s) => s.backgroundDim);
  const backgroundCrossfadeMs = useProjectStore((s) => s.backgroundCrossfadeMs);

  // Attached audio wins, matching the render bar: whatever ends up in the
  // video is what the preview animates to.
  const activeAnalysis = attachedAudio?.analysis ?? narration?.analysis ?? null;

  // One clock shared by every canvas overlay — the narration's own audio
  // while it plays, so lips, subtitles and voices cannot drift apart.
  const musicVolume = useProjectStore((s) => s.musicVolume);
  const musicDuck = useProjectStore((s) => s.musicDuck);
  const player = usePreviewPlayer({
    voicePath: attachedAudio?.filePath ?? narration?.filePath ?? null,
    voiceAnalysis: activeAnalysis,
    musicPath: music?.filePath ?? null,
    musicVolume,
    musicDuck,
  });
  const previewTimeMs = player.timeMs;

  // Who is talking right now, for the "speaking heads move a little more" cue.
  // Read from the same analysis the waveform uses so the two never disagree.
  const activeSpeakerId = useMemo(() => {
    const m = sampleAnalysis(activeAnalysis, previewTimeMs);
    if (!m || m.speaker < 0) return null;
    return speakers[m.speaker]?.id ?? null;
  }, [activeAnalysis, previewTimeMs, speakers]);
  // With no narration yet, a sample line — so subtitle choices show on screen
  // while you make them (Ak, 12 Oct 2026). Never rendered: the render has its
  // own segments.
  const projectLanguage = useProjectStore((s) => s.language);
  const aiLabel = useSettingsStore((s) => s.aiLabel);
  const cues = useMemo(() => {
    if (narration?.segments?.length) return buildCues(narration.segments, subtitles.maxChars);
    // GREEK AND ENGLISH TAKING TURNS (Ak, 13 Oct 2026), so a font and size
    // can be judged in both alphabets — accents and all — before any voice
    // exists. The project's own language goes first.
    const el = "Έτσι θα φαίνονται οι υπότιτλοί σου στο βίντεο.";
    const en = "This is how your subtitles will look in the video.";
    const pair = projectLanguage === "el" ? [el, en] : [en, el];
    const first = speakers[0];
    return buildCues(
      Array.from({ length: 60 }, (_, i) => ({
        speakerId: first?.id ?? "sample",
        speakerLabel: first?.label ?? "",
        text: pair[i % 2],
        startMs: i * 4000,
        endMs: i * 4000 + 3800,
      })),
      subtitles.maxChars
    );
  }, [narration, subtitles.maxChars, projectLanguage, speakers]);

  // Lip-sync, driven by exactly the same word timings as the subtitles.
  const visemeTracks = useMemo(
    () => buildSpeakerVisemeTracks(narration?.segments ?? [], fps),
    [narration, fps]
  );
  const sheetUrls = useFileUrls(speakers.map((sp) => sp.sheetPath));
  // A stand-in background for the Look step while the video has none yet,
  // so dim, blur and colour can be judged by eye: the newest downloaded clip
  // in the right shape (Ak, 12 Oct 2026).
  const backgroundBlur = useProjectStore((s) => s.backgroundBlur);
  const backgroundColorLook = useProjectStore((s) => s.backgroundColorLook);
  const [sampleClip, setSampleClip] = useState<string | null>(null);
  useEffect(() => {
    if (step !== "look" || backgrounds.length > 0) return;
    let alive = true;
    window.byok?.media?.library?.().then((items) => {
      const vids = items.filter((i) => i.kind === "video").sort((a, b) => b.modifiedMs - a.modifiedMs);
      if (alive) setSampleClip(vids[0]?.filePath ?? null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [step, backgrounds.length]);
  const sampleUrls = useFileUrls(sampleClip ? [sampleClip] : [], "video/mp4");
  const backgroundUrls = useFileUrls(
    backgrounds.map((b) => b.filePath),
    "video/mp4"
  );
  // The clips as the timing code wants them: it has no business knowing about
  // providers, thumbnails or why a scene was chosen.
  const backgroundClips = useMemo(
    () =>
      backgrounds.map((b) => ({
        startMs: b.startMs,
        endMs: b.endMs,
        sourceSec: b.hit?.durationSec ?? 0,
        filePath: b.filePath,
      })),
    [backgrounds]
  );
  const { puppets } = usePuppets(speakers.map((sp) => sp.puppetPath));
  const browTracks = useMemo(
    () => buildSpeakerBrowTracks(narration?.segments ?? []),
    [narration]
  );
  // Arm poses from [waves], [points]… and greetings (12 Oct 2026).
  const poseTracks = useMemo(
    () => buildSpeakerPoseTracks(narration?.segments ?? [], Object.fromEntries(speakers.map((sp) => [sp.id, sp.gestures ?? 0.5]))),
    [narration, speakers]
  );
  const headTracks = useMemo(
    () => buildSpeakerHeadTracks(narration?.segments ?? []),
    [narration]
  );
  const speakerColors = useMemo(
    () => Object.fromEntries(speakers.map((sp) => [sp.id, sp.borderColor])),
    [speakers]
  );
  const tracks = useMemo(
    () => buildTracks(speakers, musicWaveform, musicColor),
    [speakers, musicWaveform, musicColor]
  );
  const accentColor = useSettingsStore((s) => s.accentColor);
  const motionEnabled = useSettingsStore((s) => s.motionEnabled);
  const [forgeGoing, setForgeGoing] = useState(false);

  // the frame's own proportions, so square and 4:5 preview correctly too
  const frameRatio = render.width / render.height;

  // The autosave stores the narration's path and timings but not its analysis —
  // a ten-minute spectrum is megabytes and localStorage would refuse it. The
  // WAV is still on disk, so re-analyse it once on startup and the waveform
  // comes back to life without the user regenerating anything.
  const setNarration = useProjectStore((s) => s.setNarration);
  const setAttachedAudio = useProjectStore((s) => s.setAttachedAudio);
  const setMusic = useProjectStore((s) => s.setMusic);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Opened with --project: that project replaces the autosave before
      // anything below looks at the store.
      const doc = (await window.byok.project.startup()) as
        | { kind?: string; project?: Parameters<ReturnType<typeof useProjectStore.getState>["loadProject"]>[0] }
        | null;
      if (!cancelled && doc?.kind === "byok-project" && doc.project) {
        useProjectStore.getState().loadProject(doc.project);
      }
      const n = useProjectStore.getState().narration;
      if (n?.filePath && !n.analysis) {
        try {
          const analysis = await window.byok.audio.analyzeFile(
            n.filePath,
            n.segments,
            useProjectStore.getState().speakers.map((s) => s.id)
          );
          if (!cancelled && analysis) setNarration({ ...n, analysis });
        } catch {
          // The file was moved or deleted. Keeping the segments is still worth
          // it — subtitles and lip-sync work, the waveform just idles.
        }
      }
      const a = useProjectStore.getState().attachedAudio;
      if (a?.filePath && !a.analysis) {
        try {
          const analysis = await window.byok.audio.analyzeFile(a.filePath);
          if (!cancelled && analysis) setAttachedAudio({ ...a, analysis });
        } catch {
          /* same */
        }
      }
      const m = useProjectStore.getState().music;
      if (m?.filePath && !m.analysis) {
        try {
          const analysis = await window.byok.audio.analyzeFile(m.filePath);
          if (!cancelled && analysis) setMusic({ ...m, analysis });
        } catch {
          /* same: the track still plays, its waveform just idles */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setNarration, setAttachedAudio, setMusic]);

  // Recolor every accent-* class + glow effect live, including on first
  // mount (so a previously chosen color persists across restarts).
  useEffect(() => {
    const { base, bright, deep } = deriveAccentShades(accentColor);
    const root = document.documentElement.style;
    root.setProperty("--accent-rgb", base);
    root.setProperty("--accent-bright-rgb", bright);
    root.setProperty("--accent-deep-rgb", deep);
    // Deco Noir needs the same accent as COLOURS, not channels — color-mix()
    // and gradients can't take a bare "R G B" triple. `setAccent` writes all
    // four of its properties from one hex, so nothing here can leave the
    // channel form and the colour form disagreeing.
    //
    // The shades are still handed over explicitly rather than left to the
    // library to derive: this app's own accent-bright / accent-deep classes
    // read the same two values, and letting each side compute its own would
    // reintroduce exactly the drift this replaced.
    window.DecoNoir?.setAccent(accentColor, {
      hi: rgbTripleToHex(bright),
      lo: rgbTripleToHex(deep),
    });
  }, [accentColor]);

  // Deco Noir's behaviour layer: the brushed ground, film grain and the
  // edge-proximity border glow on keys. Mounted once — it installs document
  // level listeners, so re-running it would stack them.
  //
  // `spark` and `reveal` are off deliberately. Sparks fire on every click in
  // an app where clicking is constant work rather than an occasional flourish,
  // and reveal-on-scroll belongs to a marketing page, not a control surface
  // the user is already looking at.
  // Downloaded background clips are trimmed to the Settings limit at start-up.
  useEffect(() => {
    void autoClean().then((msg) => msg && console.log(`[video-forge] ${msg}`));
  }, []);

  useEffect(() => {
    window.DecoNoir?.init({
      // One ground, tinted from --accent, so it follows the Appearance picker
      // instead of being a fixed steel or gold that fights a chosen colour.
      // The Forge look replaces the ground and grain with SparkField.
      ground: "off",
      grain: false,
      glow: false,
      spark: false,
      reveal: false,
    });
  }, []);


  // The grain is ambient motion, so it answers to the app's own motion toggle
  // as well as to prefers-reduced-motion.
  useEffect(() => {
    document.body.dataset.tex = motionEnabled ? "on" : "off";
  }, [motionEnabled]);

  // Gates the breathing glow / click flash / corner flare CSS effects.
  // prefers-reduced-motion is handled entirely in CSS and always wins
  // regardless of this — this is the separate, explicit app-level toggle.
  useEffect(() => {
    document.documentElement.setAttribute("data-hud-motion", motionEnabled ? "on" : "off");
  }, [motionEnabled]);

  const asideFlare = useCornerFlare<HTMLElement>();
  const mainFlare = useCornerFlare<HTMLElement>();
  const sceneFlare = useCornerFlare<HTMLElement>();

  // Measure the room the preview has, then size the frame to fit inside it —
  // rather than the reverse. CSS can't express "contain" here: aspect-ratio
  // plus max-width/max-height clamps one axis and lets the other keep its
  // specified size, which silently un-squares the frame. Computing it means
  // the preview is always as large as the space genuinely allows, in both
  // orientations, and the SVG gets exact pixel dimensions for free.
  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const canvasSize = useMemo(() => {
    const ratio = frameRatio;
    // 58px is kept free under the frame for the transport bar.
    const w = Math.floor(Math.min(stageSize.w, Math.max(0, stageSize.h - 58) * ratio));
    return { w: Math.max(0, w), h: Math.max(0, Math.floor(w / ratio)) };
  }, [stageSize, frameRatio]);

  // Avatar dragging. The listeners live on window rather than the avatar so a
  // fast drag that outruns the cursor doesn't drop the gesture the moment the
  // pointer leaves the small disk.
  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: PointerEvent) => {
      const el = canvasRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let x = (e.clientX - r.left) / r.width;
      let y = (e.clientY - r.top) / r.height;
      if (snapToGrid) {
        x = Math.round(x / SNAP_GRID) * SNAP_GRID;
        y = Math.round(y / SNAP_GRID) * SNAP_GRID;
      }
      updateSpeaker(draggingId, { x: clamp01(x), y: clamp01(y) });
    };
    const onUp = () => setDraggingId(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingId, snapToGrid, updateSpeaker]);

  return (
    // No background class here on purpose: the brushed-metal ground is a fixed
    // layer behind the whole app, and an opaque shell would paint over it.
    //
    // The shell is lifted above it: #dn-field is position:fixed with z-index 0,
    // and a positioned element paints above non-positioned in-flow content
    // regardless of DOM order. Panels escape that on their own by being
    // position:relative, but loose text in a static container would not. The
    // library's own demo lifts its wrapper the same way.
    <div className="relative z-[1] h-full w-full flex flex-col text-neutral-200">

      <SparkField moving={motionEnabled} />
      <TipLayer />

      {/* Top bar — the Forge look (11 Oct 2026). The twin marks are the switch
          between the two Forges: this app's mark is lit, Image Forge's is
          greyed, and clicking it slides the light over and opens Image Forge. */}
      <header className="panel-hud forge-bar relative m-3 px-4 py-2 flex items-center gap-4">
        <div className={`forge-twin ${forgeGoing ? "going" : ""}`}>
          <div className="lamp" />
          <button className="slot-mark" title="Video Forge" aria-label="Video Forge (this app)" tabIndex={-1}>
            <img src={videoMark} alt="" />
          </button>
          <button
            className="slot-mark off"
            title="Open Image Forge"
            aria-label="Open Image Forge"
            onClick={async () => {
              setForgeGoing(true);
              const ok = await window.byok.forge.openImageForge();
              setTimeout(() => setForgeGoing(false), 900);
              if (!ok) alert("Image Forge isn't installed on this computer yet.");
            }}
          >
            <img src={imageMark} alt="" />
          </button>
        </div>
        <div className="forge-name">
          Video Forge
          <small>AI video generator · BYOK</small>
        </div>
        <div className="ml-auto flex gap-2 items-center" role="group" aria-label="Kind of video">
          <HudButton data-tip="Puppet videos: talking characters, in four steps." active={mode === "puppet" && !settingsOpen} onClick={() => setMode("puppet")}>Puppet video</HudButton>
          <HudButton data-tip="Explainers: animated pictures, words and charts drawn by code, timed to a narration — with or without puppets on top." active={mode === "explainer" && !settingsOpen} onClick={() => setMode("explainer")}>Explainer</HudButton>
        </div>
        <button
          className={`forge-gear ml-3 ${settingsOpen ? "on" : ""}`}
          title="Settings — keys and preferences"
          aria-label="Settings"
          aria-pressed={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
        >
          ⚙
        </button>
      </header>

      {!settingsOpen && mode === "puppet" && (
      <nav className="forge-steps mx-3 mb-3" aria-label="Steps">
        {STEPS.map((st, i) => {
          const at = STEPS.findIndex((x) => x.id === step);
          const state = !settingsOpen && st.id === step ? "on" : i < at ? "done" : "";
          return (
            <button key={st.id} className={`forge-step panel-hud ${state}`} data-tip={`Step ${i + 1} of 4: ${st.title} (${st.sub.toLowerCase()}). Click to go there.`} onClick={() => goStep(st.id)} aria-current={state === "on" ? "step" : undefined}>
              <span className="n">{i + 1}</span>
              <span className="t">{st.title}<small>{st.sub}</small></span>
            </button>
          );
        })}
      </nav>
      )}

      {mode === "explainer" && !settingsOpen ? <ExplainerStudio /> : (
      <div className="flex flex-1 gap-3 px-3 pb-3 min-h-0">
        {/* LEFT: the cast — step 1 only */}
        {view === "canvas" && step === "cast" && (
        <Rail
          title="Cast"
          side="left"
          open={castOpen}
          onToggle={() => setCastOpen((v) => !v)}
          flareRef={asideFlare.ref}
          onFlare={asideFlare.fire}
        >
          <CastPanel />
        </Rail>
        )}

        {/* CENTER: preview canvas, narration, or backend settings */}
        <main
          ref={mainFlare.ref}
          onClick={mainFlare.fire}
          // No place-items-center here: a centred grid item has an indefinite
          // height, so the stage's h-full resolved against nothing and never
          // shrank when the window did. The stage stretches; the centring
          // happens inside it.
          //
          // `items-stretch` is stated rather than left to the default, and that
          // is not belt-and-braces. The stretch IS the layout: the stage is
          // measured to size the canvas, so anything that lets it shrink to its
          // content collapses it to zero and keeps it there. Leaving it implicit
          // is what let a stylesheet turn the whole preview off by accident.
          className={`panel-hud hud-flare-target relative flex-1 p-6 min-h-0 ${
            view === "canvas" ? "grid items-stretch" : "overflow-hidden"
          }`}
        >
          <HudCorners />
          {view === "settings" ? (
            <div className="w-full h-full flex flex-col">
              <button className="btn self-start mb-3" onClick={() => setSettingsOpen(false)} data-tip="Back to the step you were on">
                ← Back to {STEPS.find((x) => x.id === step)?.title}
              </button>
              <BackendPanel />
            </div>
          ) : view === "narration" ? (
            <div className="w-full h-full">
              <NarrationPanel />
            </div>
          ) : (
            <div ref={stageRef} className="min-w-0 min-h-0 flex flex-col items-center justify-center gap-3">
            <div
              ref={canvasRef}
              className="slot-recessed relative grid place-items-center overflow-hidden"
              style={{ width: canvasSize.w, height: canvasSize.h }}
            >
              {/* Under everything, as in the render. */}
              <BackgroundScene
                clips={backgroundClips}
                urls={backgroundUrls}
                timeMs={previewTimeMs}
                fps={fps}
                crossfadeMs={backgroundCrossfadeMs}
                dim={backgroundDim}
                blurPx={backgroundBlur * canvasSize.w}
                colorLook={backgroundColorLook}
                sampleUrl={step === "look" ? sampleUrls[sampleClip ?? ""] ?? null : null}
              />

              <WaveformScene
                tracks={tracks}
                width={canvasSize.w}
                height={canvasSize.h}
                timeMs={previewTimeMs}
                analysis={activeAnalysis}
                musicAnalysis={music?.analysis ?? null}
              />

              {/* Only while actually dragging — a permanent grid would fight
                  the preview, but an invisible snap feels like drift. */}
              {draggingId && snapToGrid && (
                <div
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(var(--accent-rgb), 0.18) 1px, transparent 1px)," +
                      "linear-gradient(to bottom, rgba(var(--accent-rgb), 0.18) 1px, transparent 1px)",
                    backgroundSize: `${SNAP_GRID * 100}% ${SNAP_GRID * 100}%`,
                  }}
                />
              )}

              {/* Only on an empty frame — once there is narration it sat behind
                  the subtitles and read as part of them. */}
              {!narration && !attachedAudio && (
                <span className="label-etched text-center leading-relaxed relative z-10">
                  {render.format} · {fps} FPS
                  <br />
                  {render.width}×{render.height}
                </span>
              )}

              {speakers.map((sp) => {
                // The puppet wins when a speaker has both. Resolved once here
                // rather than inside the JSX, so the render's identical rule
                // (electron/render/renderVideo.ts) has something to match.
                const loaded = sp.puppetPath ? puppets[sp.puppetPath] : undefined;
                const track = visemeTracks[sp.id];
                const blend = track
                  ? visemeBlendAt(track, previewTimeMs / 1000, visemeFadeMs / 1000)
                  : { from: VISEME.NEUTRAL, to: VISEME.NEUTRAL, mix: 1 };
                return (
                <div
                  key={sp.id}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraggingId(sp.id);
                  }}
                  title="Drag to reposition"
                  style={{
                    position: "absolute",
                    left: `${sp.x * 100}%`,
                    top: `${sp.y * 100}%`,
                    // Dragging freezes the idle motion: a head that keeps
                    // breathing while you're trying to place it fights the mouse.
                    transform:
                      "translate(-50%, -50%)" +
                      (draggingId === sp.id
                        ? ""
                        : motionTransform(
                            headMotion(
                              sp.id,
                              previewTimeMs,
                              activeSpeakerId === sp.id,
                              idleMotion
                            ),
                            sp.size * canvasSize.w
                          )),
                    cursor: draggingId === sp.id ? "grabbing" : "grab",
                    touchAction: "none",
                  }}
                  className="z-10"
                >
                  {sp.character ? (
                    // a drawn character: same signals as the puppet, drawn by code
                    <CharacterAvatar
                      card={sp.character}
                      size={sp.size * canvasSize.w}
                      timeMs={previewTimeMs}
                      viseme={blend.to}
                      prevViseme={blend.from}
                      mix={blend.mix}
                      lidFrom={blinkAt(sp.id, previewTimeMs, idleMotion)}
                      browLeft={browAt(browTracks[sp.id], previewTimeMs)}
                      browRight={browAt(browTracks[sp.id], previewTimeMs)}
                      head={headPoseAt(sp.id, headTracks[sp.id], previewTimeMs, idleMotion)}
                      poseSpans={poseTracks[sp.id]}
                      {...facingView(sp.facing, sp, speakers.filter((o) => o.id !== sp.id), { dialogue: lookById(sp.character.look).profile ? 2 : 1 })}
                      active={activeSpeakerId === sp.id}
                      bgOpacity={sp.bgOpacity}
                      borderOpacity={sp.borderOpacity}
                      bgColor={sp.bgColor}
                      borderColor={sp.borderColor}
                      outlineShape={sp.outlineShape}
                      frameWidth={sp.frameWidth}
                      sizeFraction={sp.size}
                    />
                  ) : loaded ? (
                    <PuppetAvatar
                      puppet={loaded.puppet}
                      urls={loaded.urls}
                      urlsReady={loaded.ready}
                      viseme={blend.to}
                      prevViseme={blend.from}
                      mix={blend.mix}
                      lidLeft={blinkAt(sp.id, previewTimeMs, idleMotion)}
                      lidRight={blinkAt(sp.id, previewTimeMs, idleMotion)}
                      browLeft={browAt(browTracks[sp.id], previewTimeMs)}
                      browRight={browAt(browTracks[sp.id], previewTimeMs)}
                      head={headPoseAt(sp.id, headTracks[sp.id], previewTimeMs, idleMotion)}
                      pose={poseAt(poseTracks[sp.id], previewTimeMs)}
                      {...viewFor(sp, speakers, loaded.puppet)}
                      // size is a fraction of frame width; the render resolves
                      // it against the output width the exact same way.
                      size={sp.size * canvasSize.w}
                      bgOpacity={sp.bgOpacity}
                      borderOpacity={sp.borderOpacity}
                      bgColor={sp.bgColor}
                      borderColor={sp.borderColor}
                      outlineShape={sp.outlineShape}
                      frameWidth={sp.frameWidth}
                      sizeFraction={sp.size}
                    />
                  ) : (
                    <SpeakerAvatar
                      sheetUrl={(sp.sheetPath && sheetUrls[sp.sheetPath]) || ""}
                      viseme={blend.to}
                      prevViseme={blend.from}
                      mix={blend.mix}
                      size={sp.size * canvasSize.w}
                      bgOpacity={sp.bgOpacity}
                      borderOpacity={sp.borderOpacity}
                      bgColor={sp.bgColor}
                      borderColor={sp.borderColor}
                      outlineShape={sp.outlineShape}
                    />
                  )}
                </div>
                );
              })}

              {/* Above the avatars, matching the render's layer order. */}
              <SubtitleScene
                cues={cues}
                config={subtitles}
                width={canvasSize.w}
                height={canvasSize.h}
                timeMs={previewTimeMs}
                speakerColors={speakerColors}
              />
              {aiLabel && <AiBadge width={canvasSize.w} height={canvasSize.h} />}
            </div>
            {/* The transport: play with sound, scrub, time. Space bar too. */}
            <div className="forge-transport">
              <button
                className="play"
                onClick={player.toggle}
                disabled={!player.hasSound}
                aria-label={player.playing ? "Pause" : "Play with sound"}
                title={player.hasSound ? "Play with sound (space bar)" : "Make the narration in the Script step to hear it here"}
              >
                {player.playing ? "❚❚" : "▶"}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(1, Math.round(player.durationMs))}
                value={Math.round(Math.min(player.timeMs, player.durationMs || player.timeMs))}
                onChange={(e) => player.seek(Number(e.target.value))}
                disabled={!player.hasSound}
                style={{ ["--p" as string]: `${player.durationMs ? (100 * player.timeMs) / player.durationMs : 0}%` }}
                aria-label="Position in the video"
                data-tip="Drag to jump to any moment in the video."
              />
              {player.hasSound ? (
                <span className="time">
                  {fmtTime(player.timeMs)} / {fmtTime(player.durationMs)}
                </span>
              ) : (
                <span className="hint">No narration yet — make it in Script to hear it here</span>
              )}
            </div>
            </div>
          )}
          {!settingsOpen && step !== "make" && (
            <button
              className="forge-next"
              data-tip="Goes on to the next step."
              onClick={() => goStep(STEPS[STEPS.findIndex((x) => x.id === step) + 1].id)}
            >
              Next: {STEPS[STEPS.findIndex((x) => x.id === step) + 1].title} →
            </button>
          )}
        </main>

        {/* RIGHT: Look shows templates and the scene; Make shows render */}
        {view === "canvas" && (step === "look" || step === "make") && (
        <Rail
          title={step === "look" ? "Look" : "Make"}
          side="right"
          open={sceneOpen}
          onToggle={() => setSceneOpen((v) => !v)}
          flareRef={sceneFlare.ref}
          onFlare={sceneFlare.fire}
        >
          {step === "look" ? (
            <ScenePanel key="look" title="Look" tabs={["presets", "background", "subtitles", "music", "sfx", "motion"]} />
          ) : (
            <ScenePanel key="make" title="Make" tabs={["render", "many", "extras", "shape"]} />
          )}
        </Rail>
        )}
      </div>
      )}
    </div>
  );
}
