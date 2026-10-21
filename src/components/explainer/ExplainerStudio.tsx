// ---------------------------------------------------------------------------
// The Explainer screen (Ak, 21 Oct 2026): animated explainer videos drawn by
// code, as their own kind of video next to the puppet videos.
//
//   left    the style: the built-in Stravelakis look, or styles the user
//           imported from the AI Style Atlas (with the how-to)
//   centre  shape, puppet spots, a live preview, the 4-picture storyboard and
//           what the checks found
//   right   Script (write the scenes with a model), Look (colours, tint,
//           font) and Make (render + GIF, clip, still, thumbnails, captions,
//           chapters)
//
// The live preview runs the same drawing code as the render
// (explainer/stage/stage.mjs), so what plays here is what comes out.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HudButton } from "../ui/HudButton";
import { Tabs } from "../ui/Tabs";
import { Toggle } from "../ui/Toggle";
import { Slider } from "../ui/Slider";
import { createStage } from "../../../explainer/stage/stage.mjs";
import { holePath } from "../../../explainer/core/frame.mjs";
import { validateSpec } from "../../../explainer/core/spec.mjs";
import { BUNDLED_FONTS } from "../../../explainer/core/fonts.mjs";
import { TINT_PRESETS } from "../../../explainer/core/tint.mjs";
import { SCHEMES } from "../../../explainer/kits/stravelakis.mjs";
import { estimateSeconds } from "../../../explainer/core/prompts.mjs";
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

type Look = { scheme: string; custom: boolean; background: string; accent: string; tint: string; tintAmount: number; font: string };
type Draft = { style: string; format: Format; puppets: number; shape: SpotShape; script: string; words: Word[] | null; audio: string | null; spec: Spec; look: Look; provider: string };

const DEFAULT_DRAFT: Draft = {
  style: BUILT_IN, format: "16:9", puppets: 0, shape: "circle", script: "", words: null, audio: null,
  spec: sample as unknown as Spec, provider: "groq",
  look: { scheme: "night", custom: false, background: "#3a0d16", accent: "#f2b880", tint: "none", tintAmount: 1, font: "Sora" },
};

function loadDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem("vf.explainer.draft") ?? "null");
    if (d && d.spec) return { ...DEFAULT_DRAFT, ...d, look: { ...DEFAULT_DRAFT.look, ...d.look } };
  } catch { /* storage unavailable: start fresh */ }
  return DEFAULT_DRAFT;
}

/** The scene list as it will be drawn: the written scenes + this screen's choices. */
function effectiveSpec(d: Draft): Spec {
  const s: Spec = { ...d.spec, style: BUILT_IN, format: d.format, scheme: d.look.scheme, font: d.look.font };
  s.puppets = d.puppets ? { count: d.puppets, shape: d.shape } : undefined;
  s.colors = d.look.custom ? { background: d.look.background, accent: d.look.accent } : undefined;
  s.tint = d.look.tint !== "none" ? { preset: d.look.tint, amount: d.look.tintAmount } : undefined;
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
  const [tab, setTab] = useState<"script" | "look" | "make">("script");
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

  const act = async (label: string, fn: () => Promise<void>) => {
    setMessage(null);
    setBusy({ job: label, pct: 0.01, note: label });
    try { await fn(); } catch (e) { setMessage({ tone: "bad", text: String((e as Error).message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, "") }); }
    finally { setBusy(null); }
  };

  // ---- actions -------------------------------------------------------------------------
  const writeScenes = () => act("Writing the scenes…", async () => {
    const r = await window.byok.explainer.writeScenes({ script: d.script, words: d.words ?? undefined, format: d.format, provider: d.provider, base: { style: BUILT_IN } });
    if (r.problems.length || !r.spec) { setMessage({ tone: "bad", text: `${r.model} could not write a valid scene list after ${r.attempts} tries: ${r.problems.join("; ")}` }); return; }
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

  return (
    <div className="flex flex-1 gap-3 px-3 pb-3 min-h-0">
      {/* LEFT: style */}
      <aside className="panel-hud w-[300px] shrink-0 p-4 flex flex-col gap-3 overflow-y-auto">
        <div className="label-etched">Style</div>
        <StyleCard active={isBuiltIn} title="Mint Meander" sub="Stravelakis brand · pattern tiles · ready to use" tip="The built-in style: Sora type, navy and mint, Truchet tiles. Every frame is checked automatically." onClick={() => set({ style: BUILT_IN })} />
        {imported.map((s) => (
          <StyleCard key={s.id} active={d.style === s.id} title={s.name} sub={`${s.family} · imported · experimental`} tip={s.look} onClick={() => set({ style: s.id })}
            onRemove={async () => { await window.byok.explainer.removeStyle(s.id); if (d.style === s.id) set({ style: BUILT_IN }); refreshStyles(); }} />
        ))}
        <HudButton data-tip="Bring in a style from Futurepedia's AI Style Atlas by pasting its Copy prompt. Step-by-step help inside." onClick={() => setShowImport(true)}>+ Import a style</HudButton>
        <p className="text-xs text-neutral-400 leading-relaxed">Imported styles stay on this computer. A top model rewrites the whole animation for your topic, so they are slower and marked experimental.</p>
      </aside>

      {/* CENTRE: shape, preview, storyboard, checks */}
      <main className="panel-hud flex-1 min-w-0 p-4 flex flex-col gap-3 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2">
          {FORMATS.map((f) => <HudButton key={f.id} data-tip={f.tip} active={d.format === f.id} onClick={() => { set({ format: f.id }); setCheck(null); }}>{f.label}</HudButton>)}
          <span className="mx-2 text-neutral-500">|</span>
          {[0, 1, 2, 3].map((n) => <HudButton key={n} data-tip={n ? `Leave room for ${n} puppet${n > 1 ? "s" : ""} — the explainer becomes their background.` : "No puppets: the story uses the whole frame."} active={d.puppets === n} onClick={() => { set({ puppets: n }); setCheck(null); }}>{n ? `${n} puppet${n > 1 ? "s" : ""}` : "No puppets"}</HudButton>)}
          {d.puppets > 0 && (["circle", "rounded", "square"] as SpotShape[]).map((sh) => <HudButton key={sh} data-tip={`Puppet spots shaped as ${sh}s — match the puppet video's frame.`} active={d.shape === sh} onClick={() => set({ shape: sh })}>{sh}</HudButton>)}
        </div>

        {isBuiltIn ? <LivePreview spec={spec} problems={problems} /> : <ImportedPreview page={importedPage} name={styleName} />}

        {isBuiltIn && check && <CheckView check={check} />}
        {message && <div data-tip="What just happened." className={`rounded-xl px-3 py-2 text-sm ${message.tone === "good" ? "bg-emerald-400/10 text-emerald-200 border border-emerald-400/30" : "bg-rose-400/10 text-rose-200 border border-rose-400/30"}`}>{message.text}</div>}
        {busy && (
          <div className="flex items-center gap-3" data-tip="Working — this can take a while for long videos.">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round(busy.pct * 100)}%` }} /></div>
            <span className="text-xs text-neutral-300">{busy.note}</span>
            <HudButton tone="crit" data-tip="Stop the job that is running." onClick={() => window.byok.explainer.cancel()}>Cancel</HudButton>
          </div>
        )}
      </main>

      {/* RIGHT: script, look, make */}
      <aside className="panel-hud w-[380px] shrink-0 p-4 flex flex-col gap-3 min-h-0">
        <div data-tip="Script: what it says. Look: colours, tint, font. Make: check, extras and render."><Tabs tabs={[{ id: "script", label: "Script" }, { id: "look", label: "Look" }, { id: "make", label: "Make" }]} active={tab} onChange={setTab} /></div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1">
          {tab === "script" && (
            <ScriptTab d={d} set={set} providers={providers} isBuiltIn={isBuiltIn} busy={!!busy}
              onUseNarration={useNarration} onWrite={writeScenes} onGenerate={generateImported} onHandToClaude={handToClaude} onLoadPage={loadPage} problems={problems} />
          )}
          {tab === "look" && <LookTab look={d.look} setLook={setLook} isBuiltIn={isBuiltIn} />}
          {tab === "make" && (
            <MakeTab isBuiltIn={isBuiltIn} canRender={isBuiltIn ? problems.length === 0 : !!importedPage && !importedPage.errors.length} extras={extras} setExtras={setExtras}
              hasWords={!!d.words?.length} audio={d.audio} onCheck={runCheck} onRender={render} busy={!!busy} made={made} />
          )}
        </div>
      </aside>

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
function LivePreview({ spec, problems }: { spec: Spec; problems: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [t, setT] = useState(1.5);
  const [playing, setPlaying] = useState(false);
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
    const tick = (now: number) => {
      setT((x) => { const n = x + (now - last) / 1000; return n >= stage.R.duration ? 0 : n; });
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stage]);
  const [W, H] = SIZES[spec.format];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center rounded-2xl bg-black/40 p-2" style={{ height: "min(52vh, 560px)" }}>
        {stage ? <canvas ref={canvasRef} style={{ height: "100%", aspectRatio: `${W}/${H}`, maxWidth: "100%", borderRadius: 12 }} data-tip="Live preview — the same drawing code as the final video." />
          : <div className="self-center text-sm text-rose-200 max-w-md">The scene list has problems, so there is nothing to show yet:<ul className="list-disc pl-5 mt-1">{problems.slice(0, 6).map((p) => <li key={p}>{p}</li>)}</ul></div>}
      </div>
      {stage && (
        <div className="flex items-center gap-3">
          <HudButton data-tip={playing ? "Pause the preview." : "Play the preview."} onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</HudButton>
          <input type="range" min={0} max={stage.R.duration} step={0.01} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} className="flex-1" data-tip="Drag through the explainer." />
          <span className="text-xs tabular-nums text-neutral-300 w-24 text-right">{t.toFixed(1)} / {stage.R.duration.toFixed(1)} s</span>
        </div>
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
        <div className="label-etched">What the explainer says</div>
        <textarea value={d.script} onChange={(e) => set({ script: e.target.value, words: null })} rows={8} className="resize-y" placeholder="Paste the narration or write what to explain…" data-tip="The script. Only what is written here appears on screen — the model is told not to add facts." />
        <div className="flex flex-wrap gap-2">
          <HudButton data-tip="Take the current puppet project's narration: its words and when each is spoken, so the pictures land on the words." onClick={p.onUseNarration}>Use this project's narration</HudButton>
        </div>
        <div className="text-xs text-neutral-400">{d.words?.length ? `Timed to ${d.words.length} narration words${d.audio ? " · its audio goes into the video" : ""}.` : `About ${estimateSeconds(d.script || "x")} s when read aloud (no narration timing).`}</div>
      </section>
      <section className="flex flex-col gap-2">
        <div className="label-etched">Model</div>
        {withKeys.length === 0 ? <div className="text-sm text-amber-200">No AI key saved. Add one under Settings (gear, top right) — Groq or Gemini work well and have free tiers.</div> : (
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
          {jsonError && <div className="text-xs text-rose-300">{jsonError}</div>}
          {p.problems.length > 0 && <ul className="text-xs text-rose-300 list-disc pl-5">{p.problems.map((x) => <li key={x}>{x}</li>)}</ul>}
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
          <div className="label-etched">Colours</div>
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
        <div className="label-etched">Tint</div>
        <div className="flex flex-wrap gap-2">
          {["none", ...Object.keys(TINT_PRESETS)].map((t) => <HudButton key={t} data-tip={t === "none" ? "No tint." : `Recolour the whole video in ${t} tones.`} active={look.tint === t} onClick={() => setLook({ tint: t })}>{t}</HudButton>)}
        </div>
        {look.tint !== "none" && <Slider label="Strength" value={look.tintAmount} min={0.2} max={1} step={0.05} onChange={(v) => setLook({ tintAmount: v })} format={(v) => `${Math.round(v * 100)}%`} data-tip="How strongly the tint recolours the video." />}
      </section>
      {isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched">Font</div>
          <div className="flex flex-wrap gap-2">
            {BUNDLED_FONTS.map((f) => <HudButton key={f.family} data-tip={`${f.feel} · works offline`} active={look.font === f.family} onClick={() => setLook({ font: f.family })}>{f.family}</HudButton>)}
          </div>
          <input type="search" value={googleQuery} placeholder="Search all Google Fonts (online)…" data-tip="Any Google Fonts family. Downloaded once, then it works offline too."
            onFocus={() => { if (!google) window.byok.explainer.googleFonts().then(setGoogle); }} onChange={(e) => setGoogleQuery(e.target.value)} />
          {google && google.length === 0 && <div className="text-xs text-amber-200">Google Fonts can't be reached right now — the bundled fonts still work.</div>}
          <div className="flex flex-wrap gap-2">
            {results.map((f) => <HudButton key={f.family} data-tip={`${f.category} · from Google Fonts`} active={look.font === f.family} onClick={() => setLook({ font: f.family })}>{f.family}</HudButton>)}
          </div>
          {!isBundledName(look.font) && <div className="text-xs text-neutral-400">Using "{look.font}" from Google Fonts. Letters it lacks (e.g. Greek) come from Inter.</div>}
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
}) {
  const x = p.extras;
  const tog = (k: string) => (v: boolean) => p.setExtras((e: any) => ({ ...e, [k]: v }));
  const num = (k: string) => (v: number) => p.setExtras((e: any) => ({ ...e, [k]: v }));
  return (
    <>
      {p.isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched">1 · Check</div>
          <HudButton data-tip="Walks through every frame: text big enough, inside the frame, readable, puppet spots empty. Shows the storyboard." disabled={p.busy} onClick={p.onCheck}>Check every frame</HudButton>
        </section>
      )}
      {p.isBuiltIn && (
        <section className="flex flex-col gap-2">
          <div className="label-etched">2 · Extras</div>
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
        <div className="label-etched">{p.isBuiltIn ? "3 · Render" : "Render"}</div>
        {p.audio && <div className="text-xs text-neutral-400">Narration audio goes in: {p.audio.split(/[\\/]/).pop()}</div>}
        <HudButton tone="good" data-tip="Choose where to save, then the video (and the extras) are made." disabled={p.busy || !p.canRender} onClick={p.onRender}>Render the video</HudButton>
        {!p.canRender && <div className="text-xs text-neutral-400">{p.isBuiltIn ? "Fix the scene list first (Script → Scene list)." : "Write or load the page first (Script)."}</div>}
      </section>
      {p.made.length > 0 && (
        <section className="flex flex-col gap-1">
          <div className="label-etched">Made</div>
          {p.made.map((f) => <button key={f} className="text-left text-sm underline decoration-dotted text-neutral-200" data-tip="Show this file in Explorer." onClick={() => window.byok.explainer.reveal(f)}>{f.split(/[\\/]/).pop()}</button>)}
          {p.isBuiltIn && <div className="text-xs text-neutral-400 mt-1">For puppets on top: the .spots.json next to the video says where each face goes — see the README.</div>}
        </section>
      )}
    </>
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
        {error && <div className="text-sm text-rose-300">{error}</div>}
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
