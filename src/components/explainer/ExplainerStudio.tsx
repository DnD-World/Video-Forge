// ---------------------------------------------------------------------------
// The Explainer screen (Ak, 21 Oct 2026): animated explainer videos drawn by
// code, as their own kind of video next to the puppet videos.
//
// THE "B" LAYOUT (Ak's pick, 26 Oct 2026), the same as the puppet video:
//   left    four steps — Style (built in, or imported from the AI Style
//           Atlas), Script (write the scenes with a model), Look (shape,
//           puppet spots, colours, tint, font), Make (check, extras, render)
//   right   the live preview, filling the room, with a strip of its scenes and
//           words under it; then the storyboard and what the checks found
//
// The live preview runs the same drawing code as the render
// (explainer/stage/stage.mjs), so what plays here is what comes out.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { plainError } from "../../lib/plainError";
import { HudButton } from "../ui/HudButton";
import { Toggle } from "../ui/Toggle";
import { Slider } from "../ui/Slider";
import { NextStep, StepColumn, useFolded } from "../ui/StepColumn";
import { TimelineStrip } from "../canvas/TimelineStrip";
import { createStage } from "../../../explainer/stage/stage.mjs";
import { holePath } from "../../../explainer/core/frame.mjs";
import { validateSpec } from "../../../explainer/core/spec.mjs";
import { BUNDLED_FONTS } from "../../../explainer/core/fonts.mjs";
import { TINT_PRESETS } from "../../../explainer/core/tint.mjs";
import { SCHEMES } from "../../../explainer/kits/stravelakis.mjs";
import { estimateSeconds } from "../../../explainer/core/prompts.mjs";
import { DEFAULT_AMOUNT, SOUNDS, countCues, planSfx, type SfxCue } from "../../../explainer/core/sfx.mjs";
import { loadSfxAudio, playCue, type SfxAudio } from "./sfxPreview";
import type { Format, Spec, Word, SpotShape } from "../../../explainer/types";
import sample from "../../../explainer/samples/how-it-works.json";
import { useProjectStore } from "../../store/useProjectStore";
import type { ExCheck, ImportedStyleCard } from "../../global";

const FORMATS: { id: Format; label: string; tip: string }[] = [
  { id: "16:9", label: "16:9 wide", tip: "Wide, for YouTube and computer screens." },
  { id: "9:16", label: "9:16 tall", tip: "Tall, for Shorts, TikTok and Reels." },
  { id: "1:1", label: "1:1 square", tip: "Square, for feeds." },
  { id: "4:5", label: "4:5 feed", tip: "Instagram's tall feed post (1080×1350) — it shows bigger than square in the feed." },
];
const SIZES: Record<Format, [number, number]> = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] };
const ATLAS_URL = "https://www.futurepedia.io/resources/ai-style-atlas/view";
const BUILT_IN = "stravelakis";

type ExStep = "style" | "script" | "look" | "make";
const EX_STEPS: { id: ExStep; title: string; sub: string }[] = [
  { id: "style", title: "Style", sub: "How it is drawn" },
  { id: "script", title: "Script", sub: "What it says" },
  { id: "look", title: "Look", sub: "Shape, colours and letters" },
  { id: "make", title: "Make", sub: "Check, extras, render" },
];
/** How wide the steps column is for each step. */
const EX_WIDTH: Record<ExStep, number> = { style: 380, script: 480, look: 440, make: 440 };

type Look = { scheme: string; custom: boolean; background: string; accent: string; tint: string; tintAmount: number; font: string };
type Sfx = { on: boolean; amount: number };
type Draft = { style: string; format: Format; puppets: number; shape: SpotShape; script: string; words: Word[] | null; audio: string | null; spec: Spec; look: Look; provider: string; sfx: Sfx };

const DEFAULT_DRAFT: Draft = {
  style: BUILT_IN, format: "16:9", puppets: 0, shape: "circle", script: "", words: null, audio: null,
  spec: sample as unknown as Spec, provider: "groq", sfx: { on: true, amount: DEFAULT_AMOUNT },
  look: { scheme: "night", custom: false, background: "#3a0d16", accent: "#f2b880", tint: "none", tintAmount: 1, font: "Sora" },
};

function loadDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem("vf.explainer.draft") ?? "null");
    if (d && d.spec) return { ...DEFAULT_DRAFT, ...d, look: { ...DEFAULT_DRAFT.look, ...d.look }, sfx: { ...DEFAULT_DRAFT.sfx, ...d.sfx } };
  } catch { /* storage unavailable: start fresh */ }
  return DEFAULT_DRAFT;
}

/** The scene list as it will be drawn: the written scenes + this screen's choices. */
function effectiveSpec(d: Draft): Spec {
  const s: Spec = { ...d.spec, style: BUILT_IN, format: d.format, scheme: d.look.scheme, font: d.look.font };
  s.puppets = d.puppets ? { count: d.puppets, shape: d.shape } : undefined;
  s.colors = d.look.custom ? { background: d.look.background, accent: d.look.accent } : undefined;
  s.tint = d.look.tint !== "none" ? { preset: d.look.tint, amount: d.look.tintAmount } : undefined;
  s.sfx = { on: d.sfx.on, amount: d.sfx.amount };
  if (d.words?.length) s.words = d.words;
  else delete s.words;
  return s;
}

/** Fonts for the live preview: same files the render uses, loaded into this window. */
const loadedFonts = new Set<string>();
async function ensurePreviewFont(family: string) {
  for (const f of [family, "Inter"]) {
    if (loadedFonts.has(f)) continue;
    const faces = await window.byok.explainer.fontData(f);
    await Promise.all(faces.map(async (x) => {
      const face = new FontFace(f, new Uint8Array(x.data).buffer as ArrayBuffer, { weight: String(x.weight), ...(x.range ? { unicodeRange: x.range } : {}) });
      await face.load();
      document.fonts.add(face);
    }));
    loadedFonts.add(f);
  }
}

/** Words of the project's narration (measured when aligned, estimated otherwise). */
function narrationWords(): { script: string; words: Word[]; audio: string | null } | null {
  const n = useProjectStore.getState().narration;
  if (!n?.segments?.length) return null;
  const words: Word[] = [];
  for (const seg of n.segments) {
    if (seg.words?.length) for (const w of seg.words) words.push({ text: w.text, start: w.startMs / 1000, end: w.endMs / 1000 });
    else {
      const parts = seg.text.split(/\s+/).filter(Boolean);
      const span = (seg.endMs - seg.startMs) / 1000 / Math.max(1, parts.length);
      parts.forEach((p, i) => words.push({ text: p, start: seg.startMs / 1000 + i * span, end: seg.startMs / 1000 + (i + 0.9) * span }));
    }
  }
  return { script: n.segments.map((s) => s.text).join(" "), words, audio: n.filePath ?? null };
}

export function ExplainerStudio() {
  const [d, setD] = useState<Draft>(loadDraft);
  const set = useCallback((patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch })), []);
  const setLook = (patch: Partial<Look>) => setD((x) => ({ ...x, look: { ...x.look, ...patch } }));
  useEffect(() => { try { localStorage.setItem("vf.explainer.draft", JSON.stringify(d)); } catch { /* fine */ } }, [d]);

  const [imported, setImported] = useState<ImportedStyleCard[]>([]);
  const [providers, setProviders] = useState<{ id: string; label: string; hasKey: boolean }[]>([]);
  const [tab, setTab] = useState<ExStep>(() => {
    try { const v = localStorage.getItem("vf.explainer.step"); return v === "style" || v === "look" || v === "make" ? v : "script"; } catch { return "script"; }
  });
  useEffect(() => { try { localStorage.setItem("vf.explainer.step", tab); } catch { /* fine */ } }, [tab]);
  const [folded, setFolded] = useFolded("vf.explainer.stepsFolded");
  const [busy, setBusy] = useState<{ job: string; pct: number; note: string } | null>(null);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [check, setCheck] = useState<ExCheck | null>(null);
  const [importedPage, setImportedPage] = useState<(ExCheck & { id: string; file: string }) | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [made, setMade] = useState<string[]>([]);

  const refreshStyles = useCallback(() => window.byok.explainer.styles().then((r) => setImported(r.imported)), []);
  useEffect(() => {
    refreshStyles();
    window.byok.explainer.providers().then(setProviders);
    return window.byok.explainer.onProgress((p) => setBusy(p.pct >= 1 ? null : p));
  }, [refreshStyles]);

  const isBuiltIn = d.style === BUILT_IN;
  const spec = useMemo(() => effectiveSpec(d), [d]);
  const problems = useMemo(() => validateSpec(spec), [spec]);
  const plan = useMemo(() => (problems.length ? null : planSfx(spec)), [spec, problems]);
  // the library sounds for hearing the cues in the preview; null = none on this computer
  const [sfxAudio, setSfxAudio] = useState<SfxAudio | null | undefined>(undefined);
  useEffect(() => { loadSfxAudio().then(setSfxAudio); }, []);

  const act = async (label: string, fn: () => Promise<void>) => {
    setMessage(null);
    setBusy({ job: label, pct: 0.01, note: label });
    try { await fn(); } catch (e) { setMessage({ tone: "bad", text: plainError(e, "Fix that, then press the same button again.") }); }
    finally { setBusy(null); }
  };

  // ---- actions -------------------------------------------------------------------------
  const writeScenes = () => act("Writing the scenes…", async () => {
    const r = await window.byok.explainer.writeScenes({ script: d.script, words: d.words ?? undefined, format: d.format, provider: d.provider, base: { style: BUILT_IN } });
    if (r.problems.length || !r.spec) { setMessage({ tone: "bad", text: `${r.model} could not write a valid scene list after ${r.attempts} tries: ${r.problems.join("; ")}. Press Write the scenes to try again, or pick another model.` }); return; }
    set({ spec: { ...r.spec, words: undefined } as Spec });
    setCheck(null);
    setMessage({ tone: "good", text: `${r.model} wrote ${r.spec.scenes.length} scenes in ${(r.ms / 1000).toFixed(1)} s (${r.attempts} ${r.attempts === 1 ? "try" : "tries"}). Check it, then render.` });
  });

  const runCheck = () => act("Checking every frame…", async () => {
    const r = await window.byok.explainer.check(spec);
    setCheck(r);
    setMessage(r.errors.length ? { tone: "bad", text: `${r.errors.length} problem${r.errors.length > 1 ? "s" : ""} found — see the list under the storyboard.` } : { tone: "good", text: `All checks pass (${r.frames} frames).` });
  });

  const [extras, setExtras] = useState({ gif: false, gifFrom: 0, gifTo: 6, clip: false, clipFrom: 0, clipTo: 10, still: false, stillAt: 2, thumbs: true, captions: true, chapters: true });
  const render = () => act("Rendering…", async () => {
    const out = await window.byok.dialog.saveFile("explainer.mp4", [{ name: "Video", extensions: ["mp4"] }]);
    if (!out) return;
    if (isBuiltIn) {
      const r = await window.byok.explainer.render({
        spec, out, audio: d.audio ?? undefined,
        extras: {
          gif: extras.gif ? { from: extras.gifFrom, to: extras.gifTo } : undefined,
          clip: extras.clip ? { from: extras.clipFrom, to: extras.clipTo } : undefined,
          still: extras.still ? extras.stillAt : undefined,
          thumbs: extras.thumbs, captions: extras.captions && !!d.words?.length, chapters: extras.chapters,
        },
      });
      setMade(r.made);
      if (r.sfx?.libraryMissing) { setMessage({ tone: "bad", text: "The video is made, but without sound effects: the sound library was not found on this computer." }); return; }
    } else if (importedPage) {
      const r = await window.byok.explainer.importedRender({ id: importedPage.id, out, audio: d.audio ?? undefined, tint: d.look.tint !== "none" ? { preset: d.look.tint, amount: d.look.tintAmount } : undefined });
      setMade(r.made);
    }
    setMessage({ tone: "good", text: "Done — the files are listed under Make." });
  });

  const importedRequest = () => ({ styleId: d.style, content: d.script, format: d.format, words: d.words ?? undefined, puppets: d.puppets ? { count: d.puppets, shape: d.shape } : undefined, duration: d.words?.length ? undefined : estimateSeconds(d.script || "x") });
  const generateImported = () => act("A top model is writing the explainer…", async () => {
    const r = await window.byok.explainer.importedGenerate({ ...importedRequest(), provider: d.provider });
    setImportedPage(r);
    setMessage(r.errors.length ? { tone: "bad", text: r.errors.map((x) => x.msg).join("; ") } : { tone: "good", text: `${r.model} wrote it in ${(r.ms / 60000).toFixed(1)} min. Look at the storyboard, then render.` });
  });
  const handToClaude = () => act("Writing the prompt…", async () => {
    const r = await window.byok.explainer.importedPrompt(importedRequest());
    setMessage({ tone: "good", text: `Prompt saved (${Math.round(r.chars / 1000)}k characters) and shown in Explorer. Paste it into Claude, save the HTML it gives you, then press "Load Claude's page".` });
  });
  const loadPage = () => act("Checking the page…", async () => {
    const file = await window.byok.dialog.openFile([{ name: "HTML page", extensions: ["html", "htm"] }]);
    if (!file) return;
    const r = await window.byok.explainer.importedLoad(file);
    setImportedPage(r);
    setMessage(r.errors.length ? { tone: "bad", text: r.errors.map((x) => x.msg).join("; ") } : { tone: "good", text: "Page loaded and checked." });
  });

  const useNarration = () => {
    const n = narrationWords();
    if (!n) { setMessage({ tone: "bad", text: "This project has no narration yet — make one in Script (puppet video), or type the script here." }); return; }
    set({ script: n.script, words: n.words, audio: n.audio });
    setMessage({ tone: "good", text: `Using the project's narration: ${n.words.length} words, ${n.words[n.words.length - 1].end.toFixed(0)} s.` });
  };

  const styleName = isBuiltIn ? "Mint Meander (Stravelakis)" : imported.find((s) => s.id === d.style)?.name ?? d.style;

  const canRender = isBuiltIn ? problems.length === 0 : !!importedPage && !importedPage.errors.length;
  const status: Record<ExStep, string> = {
    style: styleName,
    script: d.words?.length ? `Timed to ${d.words.length} narration words` : d.script.trim() ? `About ${estimateSeconds(d.script)} s when read` : "Showing the sample — write your own",
    look: `${d.format} · ${d.puppets ? `${d.puppets} puppet${d.puppets > 1 ? "s" : ""}` : "no puppets"} · ${d.look.custom ? "my colours" : d.look.scheme} · ${d.look.font}`,
    make: made.length ? `${made.length} file${made.length > 1 ? "s" : ""} made` : canRender ? "Ready to render" : "Not ready yet",
  };
  const at = EX_STEPS.findIndex((x) => x.id === tab);
  const nextStep = EX_STEPS[at + 1];
  const nextButton = nextStep ? <NextStep label={nextStep.title} tip={`Goes on to step ${EX_STEPS.indexOf(nextStep) + 1}: ${nextStep.title} (${nextStep.sub.toLowerCase()}).`} onClick={() => setTab(nextStep.id)} /> : null;

  return (
    <div className="forge-studio flex flex-1 gap-3 px-3 pb-3 min-h-0">
      {/* LEFT: the four steps; the one you are on is open in place */}
      <StepColumn
        steps={EX_STEPS.map((x) => ({ ...x, status: status[x.id] }))}
        current={tab}
        onGo={setTab}
        width={EX_WIDTH[tab]}
        folded={folded}
        setFolded={setFolded}
        title="Your explainer, step by step"
        foot={nextButton}
      >
        <div className="flex flex-col gap-4">
          {tab === "style" && (
            <>
              <StyleCard active={isBuiltIn} title="Mint Meander" sub="Stravelakis brand · pattern tiles · ready to use" tip="The built-in style: Sora type, navy and mint, Truchet tiles. Every frame is checked automatically." onClick={() => set({ style: BUILT_IN })} />
              {imported.map((s) => (
                <StyleCard key={s.id} active={d.style === s.id} title={s.name} sub={`${s.family} · imported · experimental`} tip={s.look} onClick={() => set({ style: s.id })}
                  onRemove={async () => { await window.byok.explainer.removeStyle(s.id); if (d.style === s.id) set({ style: BUILT_IN }); refreshStyles(); }} />
              ))}
              <HudButton data-tip="Bring in a style from Futurepedia's AI Style Atlas by pasting its Copy prompt. Step-by-step help inside." onClick={() => setShowImport(true)}>+ Import a style</HudButton>
              <p className="text-xs text-neutral-400 leading-relaxed" data-tip="Imported styles are made by an online helper each time, so they are slower and may be rough.">Imported styles stay on this computer. A top model rewrites the whole animation for your topic, so they are slower and marked experimental.</p>
            </>
          )}
          {tab === "script" && (
            <ScriptTab d={d} set={set} providers={providers} isBuiltIn={isBuiltIn} busy={!!busy}
              onUseNarration={useNarration} onWrite={writeScenes} onGenerate={generateImported} onHandToClaude={handToClaude} onLoadPage={loadPage} problems={problems} />
          )}
          {tab === "look" && (
            <>
              <section className="flex flex-col gap-2">
                <div className="label-etched" data-tip="The shape of the video, and whether puppets sit on top of it.">Shape</div>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => <HudButton key={f.id} data-tip={f.tip} active={d.format === f.id} onClick={() => { set({ format: f.id }); setCheck(null); }}>{f.label}</HudButton>)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3].map((n) => <HudButton key={n} data-tip={n ? `Leave room for ${n} puppet${n > 1 ? "s" : ""} — the explainer becomes their background.` : "No puppets: the story uses the whole frame."} active={d.puppets === n} onClick={() => { set({ puppets: n }); setCheck(null); }}>{n ? `${n} puppet${n > 1 ? "s" : ""}` : "No puppets"}</HudButton>)}
                </div>
                {d.puppets > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(["circle", "rounded", "square"] as SpotShape[]).map((sh) => <HudButton key={sh} data-tip={`Puppet spots shaped as ${sh}s — match the puppet video's frame.`} active={d.shape === sh} onClick={() => set({ shape: sh })}>{sh}</HudButton>)}
                  </div>
                )}
              </section>
              <LookTab look={d.look} setLook={setLook} isBuiltIn={isBuiltIn} />
            </>
          )}
          {tab === "make" && (
            <MakeTab isBuiltIn={isBuiltIn} canRender={canRender} extras={extras} setExtras={setExtras}
              sfx={d.sfx} setSfx={(p) => set({ sfx: { ...d.sfx, ...p } })} cues={plan?.cues ?? []} duration={plan?.duration ?? 0} heard={!!sfxAudio}
              hasWords={!!d.words?.length} audio={d.audio} onCheck={runCheck} onRender={render} busy={!!busy} made={made} />
          )}
        </div>
      </StepColumn>

      {/* RIGHT: the live preview, then the storyboard and what the checks found */}
      <main className="panel-hud flex-1 min-w-0 min-h-0 p-4 flex flex-col gap-3 overflow-y-auto">
        {isBuiltIn ? <LivePreview spec={spec} problems={problems} cues={plan?.cues ?? []} audio={sfxAudio} /> : <ImportedPreview page={importedPage} name={styleName} />}

        {isBuiltIn && check && <CheckView check={check} />}
        {message && <div data-tip={message.tone === "good" ? "What just happened." : "Something went wrong. The message says what to fix."} className={`rounded-xl px-3 py-2 text-sm ${message.tone === "good" ? "bg-emerald-400/10 text-emerald-200 border border-emerald-400/30" : "bg-rose-400/10 text-rose-200 border border-rose-400/30"}`}>{message.text}</div>}
        {busy && (
          <div className="flex items-center gap-3" data-tip="Working — this can take a while for long videos.">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round(busy.pct * 100)}%` }} /></div>
            <span className="text-xs text-neutral-300">{busy.note}</span>
            <HudButton tone="crit" data-tip="Stop the job that is running." onClick={() => window.byok.explainer.cancel()}>Cancel</HudButton>
          </div>
        )}
      </main>

      {showImport && <ImportDialog onClose={() => setShowImport(false)} onImported={(id) => { refreshStyles(); set({ style: id }); setShowImport(false); }} />}
    </div>
  );
}

// ---- pieces -------------------------------------------------------------------------------

function StyleCard({ active, title, sub, tip, onClick, onRemove }: { active: boolean; title: string; sub: string; tip: string; onClick: () => void; onRemove?: () => void }) {
  return (
    <div className={`rounded-2xl border p-3 ${active ? "border-[var(--accent)] bg-white/5" : "border-white/10"}`}>
      <button className="text-left w-full" data-tip={tip} onClick={onClick}>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-neutral-400">{sub}</div>
      </button>
      {onRemove && <button className="text-xs text-neutral-500 hover:text-rose-300 mt-1" data-tip="Remove this imported style from this computer." onClick={onRemove}>Remove</button>}
    </div>
  );
}

/** The built-in style, drawn live by the same code as the render. */
function LivePreview({ spec, problems, cues, audio }: { spec: Spec; problems: string[]; cues: SfxCue[]; audio: SfxAudio | null | undefined }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [t, setT] = useState(1.5);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(t);
  const cueRef = useRef({ cues, audio });
  cueRef.current = { cues, audio };
  useEffect(() => { if (!playing) tRef.current = t; }, [t, playing]);
  const [fontsReady, setFontsReady] = useState(false);
  const stage = useMemo(() => {
    if (problems.length) return null;
    try {
      return createStage(spec, (W, H) => { const c = document.createElement("canvas"); c.width = W; c.height = H; c.getContext("2d", { willReadFrequently: true }); return c; });
    } catch { return null; }
  }, [spec, problems]);
  useEffect(() => { setFontsReady(false); ensurePreviewFont(spec.font ?? "Sora").then(() => setFontsReady(true)).catch(() => setFontsReady(true)); }, [spec.font]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !stage) return;
    c.width = stage.R.W; c.height = stage.R.H;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    stage.draw(ctx, t);
    // preview only: dashed outlines where the puppets will sit (never in the render)
    if (stage.R.holes.length) {
      ctx.save();
      ctx.setLineDash([18, 12]);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(118,255,194,0.85)";
      for (const h of stage.R.holes) { ctx.beginPath(); holePath(ctx, h); ctx.stroke(); }
      ctx.restore();
    }
  }, [stage, t, fontsReady]);
  useEffect(() => {
    if (!playing || !stage) return;
    let raf = 0, last = performance.now();
    cueRef.current.audio?.ctx.resume().catch(() => undefined);
    const tick = (now: number) => {
      // the sound effects play as the head passes the moment each one starts
      const from = tRef.current, to = from + (now - last) / 1000;
      const { cues: cs, audio: au } = cueRef.current;
      if (au) for (const c of cs) { const s = c.t - SOUNDS[c.kind].lead; if (s > from && s <= to) playCue(au, c); }
      tRef.current = to >= stage.R.duration ? 0 : to;
      setT(tRef.current);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stage]);
  const [W, H] = SIZES[spec.format];
  return (
    // The preview takes the room the screen has (the "B" layout); the strip
    // under it shows the scenes and the narration's words, and jumps on click.
    <div className="forge-ex-preview flex flex-col items-center gap-3">
      <div className="forge-ex-frame">
        {stage ? <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "contain", aspectRatio: `${W}/${H}` }} data-tip="Live preview — the same drawing code as the final video." />
          : <div className="self-center text-sm text-rose-200 max-w-md" data-tip="The scene list cannot be drawn yet. Fix the lines listed here, or press Sample under Script to start again.">The scene list has problems, so there is nothing to show yet:<ul className="list-disc pl-5 mt-1">{problems.slice(0, 6).map((p) => <li key={p}>{p}</li>)}</ul></div>}
      </div>
      {stage && (
        <>
          <div className="forge-transport">
            <button className="play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} data-tip={playing ? "Pause the preview." : audio && cues.length ? "Play the preview. You hear the sound effects here; the narration goes in when you render." : "Play the preview. No sound here: you hear the sound effects and narration in the rendered video."}>
              {playing ? "❚❚" : "▶"}
            </button>
            <input type="range" min={0} max={stage.R.duration} step={0.01} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }}
              style={{ ["--p" as string]: `${(100 * t) / stage.R.duration}%` }} aria-label="Position in the explainer" data-tip="Drag through the explainer." />
            <span className="time" data-tip="Where you are in the preview, and how long it is.">{t.toFixed(1)} / {stage.R.duration.toFixed(1)} s</span>
          </div>
          <TimelineStrip
            durationMs={stage.R.duration * 1000}
            timeMs={t * 1000}
            top={stage.R.scenes.map((sc, i) => ({ startMs: sc.start * 1000, endMs: sc.end * 1000, tip: `Scene ${i + 1}${sc.kind ? `: ${sc.kind}` : ""}, ${sc.start.toFixed(1)}–${sc.end.toFixed(1)} s` }))}
            bottom={(stage.R.words ?? []).map((w) => ({ startMs: w.start * 1000, endMs: w.end * 1000, color: "rgba(118,255,194,.5)", tip: `“${w.text}” at ${w.start.toFixed(1)} s` }))}
            tip="The whole explainer: its scenes (top) and the narration's words (bottom), if it is timed to one. Click or drag to jump there."
            emptyText="The explainer's timeline appears here"
            emptyTip="Once there is a scene list, its scenes show here."
            onSeek={(ms) => { setPlaying(false); setT(ms / 1000); }}
          />
        </>
      )}
    </div>
  );
}

function ImportedPreview({ page, name }: { page: (ExCheck & { id: string }) | null; name: string }) {
  if (!page) return <div className="rounded-2xl bg-black/40 p-6 text-sm text-neutral-300" data-tip="Imported styles are written by a model first; the storyboard appears here.">Style: <b>{name}</b>. Write your content under Script, then let a model write the explainer (or hand the prompt to Claude). Its storyboard appears here.</div>;
  return <Storyboard frames={page.storyboard} />;
}

function Storyboard({ frames }: { frames: { t: number; url: string; kind?: string }[] }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2" data-tip="Storyboard: one picture per scene, taken where it has settled.">
      {frames.map((f, i) => (
        <figure key={i} className="m-0">
          <img src={f.url} alt="" className="w-full rounded-xl block" />
          <figcaption className="text-xs text-neutral-400 mt-1">{i + 1}. {f.kind ?? ""} · {f.t.toFixed(1)} s</figcaption>
        </figure>
      ))}
    </div>
  );
}

function CheckView({ check }: { check: ExCheck }) {
  return (
    <div className="flex flex-col gap-2">
      <Storyboard frames={check.storyboard} />
      <div className="rounded-xl border border-white/10 p-3 text-sm" data-tip="What the automatic checks measured on every frame.">
        <div className="mb-1">{check.errors.length ? <b className="text-rose-300">{check.errors.length} problem{check.errors.length > 1 ? "s" : ""}</b> : <b className="text-emerald-300">All checks pass</b>} <span className="text-neutral-400">· {check.frames} frames · slowest {check.msMax.toFixed(0)} ms</span></div>
        {[...check.errors, ...check.warnings].map((x, i) => <div key={i} className={x.level === "error" ? "text-rose-300" : "text-amber-200"}>{x.level === "error" ? "✕" : "!"} {x.msg}{x.t != null ? ` (at ${x.t.toFixed(1)} s)` : ""}</div>)}
      </div>
    </div>
  );
}

function ScriptTab(p: {
  d: Draft; set: (x: Partial<Draft>) => void; providers: { id: string; label: string; hasKey: boolean }[]; isBuiltIn: boolean; busy: boolean; problems: string[];
  onUseNarration: () => void; onWrite: () => void; onGenerate: () => void; onHandToClaude: () => void; onLoadPage: () => void;
}) {
  const { d, set } = p;
  const [json, setJson] = useState(() => JSON.stringify(d.spec, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  useEffect(() => setJson(JSON.stringify(d.spec, null, 2)), [d.spec]);
  const withKeys = p.providers.filter((x) => x.hasKey);
  return (
    <>
      <section className="flex flex-col gap-2">
        <div className="label-etched" data-tip="Your words. The pictures are built from them.">What the explainer says</div>
        <textarea value={d.script} onChange={(e) => set({ script: e.target.value, words: null })} rows={8} className="resize-y" placeholder="Paste the narration or write what to explain…" data-tip="The script. Only what is written here appears on screen — the model is told not to add facts." />
        <div className="flex flex-wrap gap-2">
          <HudButton data-tip="Take the current puppet project's narration: its words and when each is spoken, so the pictures land on the words." onClick={p.onUseNarration}>Use this project's narration</HudButton>
        </div>
        <div className="text-xs text-neutral-400" data-tip="Whether the pictures are timed to a real voice, or to a guess of how long it takes to read.">{d.words?.length ? `Timed to ${d.words.length} narration words${d.audio ? " · its audio goes into the video" : ""}.` : `About ${estimateSeconds(d.script || "x")} s when read aloud (no narration timing).`}</div>
      </section>
      <section className="flex flex-col gap-2">
        <div className="label-etched" data-tip="Which online helper writes the scenes. You need a key for it in Settings.">Model</div>
        {withKeys.length === 0 ? <div className="text-sm text-amber-200 flex flex-wrap items-center gap-2" data-tip="The online helper needs a key (like a password) from you. Groq and Gemini have free ones.">No AI key saved. Groq or Gemini work well and have free tiers. <HudButton data-tip="Opens Settings, where you paste the key." onClick={() => window.dispatchEvent(new Event("forge:open-settings"))}>Open Settings</HudButton></div> : (
          <div className="flex flex-wrap gap-2">
            {withKeys.map((x) => <HudButton key={x.id} data-tip={`Use your ${x.label} key.`} active={d.provider === x.id} onClick={() => set({ provider: x.id })}>{x.label}</HudButton>)}
          </div>
        )}
        {p.isBuiltIn ? (
          <HudButton data-tip="The model writes the scene list (what appears when). Problems the checker finds go back to it automatically." disabled={p.busy || !d.script.trim() || !withKeys.length} onClick={p.onWrite}>Write the scenes</HudButton>
        ) : (
          <div className="flex flex-col gap-2">
            <HudButton data-tip="Your key's best model writes the whole animation in this style. Needs a top model (GPT-5.5, Gemini Pro, Claude via OpenRouter); takes minutes." disabled={p.busy || !d.script.trim() || !withKeys.length} onClick={p.onGenerate}>Write it with my key (experimental)</HudButton>
            <HudButton data-tip="Saves the full prompt as a file and shows it in Explorer. Paste it into Claude (your subscription, no extra cost)." disabled={p.busy || !d.script.trim()} onClick={p.onHandToClaude}>Hand to Claude</HudButton>
            <HudButton data-tip="Pick the .html page Claude gave you; it is checked and shown as a storyboard." disabled={p.busy} onClick={p.onLoadPage}>Load Claude's page</HudButton>
          </div>
        )}
      </section>
      {p.isBuiltIn && (
        <details className="flex flex-col gap-2">
          <summary className="label-etched" data-tip="The scene list the model wrote — edit it by hand if you like.">Scene list (advanced)</summary>
          <textarea value={json} rows={14} className="font-mono text-xs resize-y mt-2" data-tip="Edit and press Apply. Mistakes are listed in plain words."
            onChange={(e) => setJson(e.target.value)} />
          <div className="flex gap-2 items-center">
            <HudButton data-tip="Use this edited scene list." onClick={() => { try { set({ spec: JSON.parse(json) }); setJsonError(null); } catch (e) { setJsonError(String((e as Error).message)); } }}>Apply</HudButton>
            <HudButton data-tip="Go back to the sample explainer." onClick={() => set({ spec: sample as unknown as Spec })}>Sample</HudButton>
          </div>
          {jsonError && <div className="text-xs text-rose-300" data-tip="The scene list text is not valid, so Apply did nothing. Fix this line, or press Sample to start again.">{jsonError} Fix it, or press Sample to start again.</div>}
          {p.problems.length > 0 && <ul className="text-xs text-rose-300 list-disc pl-5" data-tip="Problems found in the scene list. Fix them, then Apply again.">{p.problems.map((x) => <li key={x}>{x}</li>)}</ul>}
        </details>
      )}
    </>
  );
}

function LookTab({ look, setLook, isBuiltIn }: { look: Look; setLook: (x: Partial<Look>) => void; isBuiltIn: boolean }) {
  const [googleQuery, setGoogleQuery] = useState("");
  const [google, setGoogle] = useState<{ family: string; category: string }[] | null>(null);
  const results = useMemo(() => (google ?? []).filter((f) => googleQuery.length >= 2 && f.family.toLowerCase().includes(googleQuery.toLowerCase())).slice(0, 12), [google, googleQuery]);
  return (
    <>
      {isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched" data-tip="The colours of the whole animation.">Colours</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SCHEMES).map(([id, s]) => <HudButton key={id} data-tip={s.label} active={!look.custom && look.scheme === id} onClick={() => setLook({ scheme: id, custom: false })}>{id}</HudButton>)}
            <HudButton data-tip="Pick your own background and accent; the rest is worked out and kept readable." active={look.custom} onClick={() => setLook({ custom: true })}>my colours</HudButton>
          </div>
          {look.custom && (
            <div className="flex gap-4 items-center text-sm">
              <label className="flex items-center gap-2" data-tip="Background colour.">Background <input type="color" value={look.background} onChange={(e) => setLook({ background: e.target.value })} data-tip="Background colour." /></label>
              <label className="flex items-center gap-2" data-tip="Accent colour: highlights, numbers, tiles.">Accent <input type="color" value={look.accent} onChange={(e) => setLook({ accent: e.target.value })} data-tip="Accent colour." /></label>
            </div>
          )}
        </section>
      )}
      <section className="flex flex-col gap-2">
        <div className="label-etched" data-tip="A colour wash over the whole animation. Optional.">Tint</div>
        <div className="flex flex-wrap gap-2">
          {["none", ...Object.keys(TINT_PRESETS)].map((t) => <HudButton key={t} data-tip={t === "none" ? "No tint." : `Recolour the whole video in ${t} tones.`} active={look.tint === t} onClick={() => setLook({ tint: t })}>{t}</HudButton>)}
        </div>
        {look.tint !== "none" && <Slider label="Strength" value={look.tintAmount} min={0.2} max={1} step={0.05} onChange={(v) => setLook({ tintAmount: v })} format={(v) => `${Math.round(v * 100)}%`} data-tip="How strongly the tint recolours the video." />}
      </section>
      {isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched" data-tip="The letter style used on screen.">Font</div>
          <div className="flex flex-wrap gap-2">
            {BUNDLED_FONTS.map((f) => <HudButton key={f.family} data-tip={`${f.feel} · works offline`} active={look.font === f.family} onClick={() => setLook({ font: f.family })}>{f.family}</HudButton>)}
          </div>
          <input type="search" value={googleQuery} placeholder="Search all Google Fonts (online)…" data-tip="Any Google Fonts family. Downloaded once, then it works offline too."
            onFocus={() => { if (!google) window.byok.explainer.googleFonts().then(setGoogle); }} onChange={(e) => setGoogleQuery(e.target.value)} />
          {google && google.length === 0 && <div className="text-xs text-amber-200" data-tip="The font list needs the internet. Check your connection and click the search box again.">Google Fonts can't be reached right now — the bundled fonts still work.</div>}
          <div className="flex flex-wrap gap-2">
            {results.map((f) => <HudButton key={f.family} data-tip={`${f.category} · from Google Fonts`} active={look.font === f.family} onClick={() => setLook({ font: f.family })}>{f.family}</HudButton>)}
          </div>
          {!isBundledName(look.font) && <div className="text-xs text-neutral-400" data-tip="This font comes from Google Fonts. Where it has no letter, Inter fills in.">Using "{look.font}" from Google Fonts. Letters it lacks (e.g. Greek) come from Inter.</div>}
        </section>
      )}
    </>
  );
}
const isBundledName = (f: string) => BUNDLED_FONTS.some((b) => b.family === f);

function MakeTab(p: {
  isBuiltIn: boolean; canRender: boolean; hasWords: boolean; audio: string | null; busy: boolean; made: string[];
  extras: { gif: boolean; gifFrom: number; gifTo: number; clip: boolean; clipFrom: number; clipTo: number; still: boolean; stillAt: number; thumbs: boolean; captions: boolean; chapters: boolean };
  setExtras: (f: (x: any) => any) => void; onCheck: () => void; onRender: () => void;
  sfx: Sfx; setSfx: (p: Partial<Sfx>) => void; cues: SfxCue[]; duration: number; heard: boolean;
}) {
  const x = p.extras;
  const tog = (k: string) => (v: boolean) => p.setExtras((e: any) => ({ ...e, [k]: v }));
  const num = (k: string) => (v: number) => p.setExtras((e: any) => ({ ...e, [k]: v }));
  return (
    <>
      {p.isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched" data-tip="Step 1: look for problems before you make the video.">1 · Check</div>
          <HudButton data-tip="Walks through every frame: text big enough, inside the frame, readable, puppet spots empty. Shows the storyboard." disabled={p.busy} onClick={p.onCheck}>Check every frame</HudButton>
        </section>
      )}
      {p.isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched" data-tip="Step 2: little sounds that land on the pictures, like a swish when the scene changes.">2 · Sound effects</div>
          <Toggle label="Sound effects" checked={p.sfx.on} onChange={(v) => p.setSfx({ on: v })} data-tip="Adds small sounds: a swish when the scene changes, a pop when something appears. They are mixed into the video." />
          {p.sfx.on && (
            <>
              <Slider label="How many" value={p.sfx.amount} min={0} max={1} step={0.05} onChange={(v) => p.setSfx({ amount: v })}
                format={(v) => (v < 0.35 ? "subtle" : v < 0.75 ? "balanced" : "lively")} data-tip="Subtle: only scene changes and the ending. Lively: a sound for almost everything that appears." />
              <CueStrip cues={p.cues} duration={p.duration} />
              <div className="text-xs text-neutral-400" data-tip="Where the sounds fall, and whether you can hear them while previewing.">
                {p.cues.length ? `${p.cues.length} sounds placed${Object.entries(countCues(p.cues)).map(([k, n]) => ` · ${n}× ${SOUNDS[k as keyof typeof SOUNDS].label}`).join("")}. ` : "No sounds placed. "}
                {p.heard ? "Press play in the preview to hear them." : "You hear them in the rendered video."}
              </div>
            </>
          )}
        </section>
      )}
      {p.isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched" data-tip="Step 3: pick extra files to make along with the video.">3 · Extras</div>
          <Toggle label="Thumbnails (3 × 1280×720)" checked={x.thumbs} onChange={tog("thumbs")} data-tip="Three YouTube thumbnails: title, key number, takeaway." />
          <Toggle label="Chapter list for YouTube" checked={x.chapters} onChange={tog("chapters")} data-tip="00:00 lines for the video description (YouTube needs 3+ chapters of 10 s)." />
          <Toggle label={p.hasWords ? "Captions (.srt + .vtt)" : "Captions (need the project's narration)"} checked={x.captions && p.hasWords} onChange={tog("captions")} data-tip="Caption files from the narration's word times — good for YouTube search." />
          <Toggle label="GIF" checked={x.gif} onChange={tog("gif")} data-tip="A GIF of part of the video (up to 15 s, 540 px wide). The background holds still to keep the file small." />
          {x.gif && <div className="flex gap-2"><Slider label="From (s)" value={x.gifFrom} min={0} max={120} step={0.5} onChange={num("gifFrom")} data-tip="GIF start." /><Slider label="To (s)" value={x.gifTo} min={0.5} max={135} step={0.5} onChange={num("gifTo")} data-tip="GIF end (max 15 s after the start)." /></div>}
          <Toggle label="Short clip (MP4)" checked={x.clip} onChange={tog("clip")} data-tip="A short MP4 cut from the video, for social posts." />
          {x.clip && <div className="flex gap-2"><Slider label="From (s)" value={x.clipFrom} min={0} max={600} step={0.5} onChange={num("clipFrom")} data-tip="Clip start." /><Slider label="To (s)" value={x.clipTo} min={0.5} max={600} step={0.5} onChange={num("clipTo")} data-tip="Clip end." /></div>}
          <Toggle label="Still picture (PNG)" checked={x.still} onChange={tog("still")} data-tip="One frame as a full-size picture." />
          {x.still && <Slider label="At (s)" value={x.stillAt} min={0} max={600} step={0.1} onChange={num("stillAt")} data-tip="Which moment." />}
        </section>
      )}
      <section className="flex flex-col gap-2">
        <div className="label-etched" data-tip="The last step: make the video file.">{p.isBuiltIn ? "4 · Render" : "Render"}</div>
        {p.audio && <div className="text-xs text-neutral-400" data-tip="This voice recording will be inside the finished video.">Narration audio goes in: {p.audio.split(/[\\/]/).pop()}</div>}
        <HudButton tone="good" data-tip="Choose where to save, then the video (and the extras) are made." disabled={p.busy || !p.canRender} onClick={p.onRender}>Render the video</HudButton>
        {!p.canRender && <div className="text-xs text-neutral-400" data-tip="The Render button stays off until this is done.">{p.isBuiltIn ? "Fix the scene list first (Script → Scene list)." : "Write or load the page first (Script)."}</div>}
      </section>
      {p.made.length > 0 && (
        <section className="flex flex-col gap-1">
          <div className="label-etched" data-tip="The files that were just made. Click one to show it in its folder.">Made</div>
          {p.made.map((f) => <button key={f} className="text-left text-sm underline decoration-dotted text-neutral-200" data-tip="Show this file in Explorer." onClick={() => window.byok.explainer.reveal(f)}>{f.split(/[\\/]/).pop()}</button>)}
          {p.isBuiltIn && <div className="text-xs text-neutral-400 mt-1" data-tip="A small file saying where each puppet face should be placed on top of the video.">For puppets on top: the .spots.json next to the video says where each face goes — see the README.</div>}
        </section>
      )}
    </>
  );
}

/** A thin bar for the whole video with one tick per sound effect; hover a tick to see what it is. */
function CueStrip({ cues, duration }: { cues: SfxCue[]; duration: number }) {
  if (!cues.length || !duration) return null;
  return (
    <div className="relative h-6 rounded-md bg-white/5 border border-white/10" data-tip="Every sound effect on the video's timeline, left to right. Hover a mark to see what it is.">
      {cues.map((c) => (
        <span key={`${c.kind}-${c.t}`} className="absolute top-1 bottom-1 w-[3px] -ml-px rounded-full"
          style={{ left: `${(100 * c.t) / duration}%`, background: c.kind === "whoosh" || c.kind === "riser" ? "rgba(118,255,194,.9)" : c.kind === "ding" ? "rgba(255,214,120,.95)" : "rgba(255,255,255,.7)" }}
          data-tip={`${c.t.toFixed(1)} s: ${SOUNDS[c.kind].label} (${c.why})`} />
      ))}
    </div>
  );
}

/** Import a style from the AI Style Atlas, with the step-by-step how-to. */
function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: (id: string) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-6" onClick={onClose} data-tip="Click outside to close.">
      <div className="panel-hud max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()} data-tip="Import a style.">
        <h2 className="text-xl font-semibold m-0">Import a style from the AI Style Atlas</h2>
        <ol className="list-decimal pl-5 text-sm leading-relaxed text-neutral-200 m-0">
          <li>Open the atlas in your browser: <code className="select-all">{ATLAS_URL}</code> <button className="underline text-xs ml-1" data-tip="Copy the address." onClick={() => { navigator.clipboard.writeText(ATLAS_URL); setCopied(true); }}>{copied ? "copied" : "copy"}</button></li>
          <li>Find a style you like. Press <b>Explainer</b> on its card to watch it move.</li>
          <li>Press its <b>Copy prompt</b> button. The whole prompt (a long text with code) is now copied.</li>
          <li>Click in the box below and paste (Ctrl+V). Then press <b>Import</b>.</li>
          <li>Pick the style on the left, write your script, and either let a top model write it with your key, or press <b>Hand to Claude</b> and paste the saved prompt into Claude.</li>
        </ol>
        <p className="text-xs text-neutral-400 m-0">The styles belong to their creator. Video Forge doesn't include them; your copy stays on this computer. Imported styles are experimental: a model writes a new animation each time.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="font-mono text-xs" placeholder="Paste the Copy prompt here…" data-tip="Paste the whole prompt from the atlas." />
        {error && <div className="text-sm text-rose-300" data-tip="The style could not be added. Check you pasted the whole prompt from the atlas, then try again.">{error} Check you pasted the whole prompt, then press Import again.</div>}
        <div className="flex gap-2 justify-end">
          <HudButton data-tip="Close without importing." onClick={onClose}>Cancel</HudButton>
          <HudButton tone="good" data-tip="Read the prompt and add the style." disabled={!text.trim()} onClick={async () => {
            try { const r = await window.byok.explainer.importStyle(text); onImported(r.id); } catch (e) { setError(String((e as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, "")); }
          }}>Import</HudButton>
        </div>
      </div>
    </div>
  );
}
