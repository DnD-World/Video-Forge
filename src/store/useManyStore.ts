// ---------------------------------------------------------------------------
// Many videos from one sheet — the run's state, outside any screen (26 Oct
// 2026). A batch can run for hours; its progress has to survive switching to
// the puppet video or the explainer and back, so it lives here and the batch
// events are listened to once, for the whole app (initManyEvents in App.tsx).
// electron/batch/manyVideos.ts does the work.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { useProjectStore } from "./useProjectStore";
import { useSettingsStore } from "./useSettingsStore";
import { parseScript } from "../lib/narration/parseScript";
import { parseDramaboxScript } from "../lib/narration/parseDramaboxScript";
import { plainError } from "../lib/plainError";
import { activeCard } from "../../characters/core/index.mjs";

export type Row = Record<string, string>;
export interface RowCheck { ok: boolean; why: string; lines: number }
export interface RowProgress {
  status: "waiting" | "working" | "done" | "failed";
  pct?: number;
  note?: string;
  error?: string;
  outputPath?: string;
}

/** The columns, with the names people actually type for them. */
export const COLS = {
  name: ["name", "title", "video", "file", "όνομα"],
  script: ["script", "text", "σενάριο"],
  topic: ["topic", "about", "θέμα"],
  template: ["template", "look", "preset"],
  format: ["format", "shape", "orientation"],
  music: ["music", "μουσική"],
  backgrounds: ["backgrounds", "background", "footage"],
  language: ["language", "lang", "γλώσσα"],
} as const;
export const pick = (row: Row, key: keyof typeof COLS) => {
  for (const k of COLS[key]) if (row[k] !== undefined && row[k] !== "") return row[k];
  return "";
};

export const BLANK_SHEET =
  "name,script,topic,template,format,music,backgrounds,language\n" +
  '"Lesson 1","Καίτη: Καλώς ήρθατε!\nΣερίφης: [nods] Ναι, ξεκινάμε.","dogs learning to sit","","9:16","auto","auto","el"\n';

/** A sheet's "format" cell -> a shape. */
export function shapeOf(v: string): "9:16" | "16:9" | "1:1" | "4:5" | undefined {
  if (/4[:x]5|feed/i.test(v)) return "4:5";
  if (/1[:x]1|square/i.test(v)) return "1:1";
  if (/16[:x]9|wide|land/i.test(v)) return "16:9";
  if (/9[:x]16|tall|vert|port/i.test(v)) return "9:16";
  return undefined;
}

/** "<sheet or file name> · 13 Oct 19.40 · 12 videos" — the folder the videos land in. */
function runNameFor(source: string, count: number): string {
  let name = "sheet";
  const file = source.trim().split(/[\\/]/).pop() ?? "";
  if (/docs\.google\.com/.test(source)) name = "Google Sheet";
  else if (file) name = file.replace(/\.(csv|tsv|txt)$/i, "").slice(0, 40) || "sheet";
  const d = new Date();
  const when = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
  return `${name} · ${when} · ${count} video${count === 1 ? "" : "s"}`;
}

/** Every row's script, checked against this project's cast. */
export function checkRows(rows: Row[]): RowCheck[] {
  const speakers = useProjectStore.getState().speakers;
  const cast = speakers.map((s) => ({ id: s.id, label: s.label }));
  return rows.map((row) => {
    const script = pick(row, "script");
    if (!script) return { ok: false, why: "no script", lines: 0 };
    if (!cast.length) return { ok: false, why: "add speakers in Puppet video → Cast first", lines: 0 };
    const plain = parseScript(script, cast);
    const prose = plain.segments.length ? null : parseDramaboxScript(script, speakers.map((s) => ({ id: s.id, label: s.label, openingPhrase: s.openingPhrase })) as never);
    const lines = plain.segments.length || (prose as { blocks?: unknown[] } | null)?.blocks?.length || 0;
    if (!lines) return { ok: false, why: `no line starts with a cast name (${cast.map((c) => c.label).join(", ")})`, lines: 0 };
    if (plain.unmatchedLines.length) return { ok: true, why: `${lines} lines · ${plain.unmatchedLines.length} not matched to anyone (skipped)`, lines };
    return { ok: true, why: `${lines} lines`, lines };
  });
}

interface ManyState {
  source: string;
  rows: Row[];
  problem: string;
  loading: boolean;
  progress: Record<number, RowProgress>;
  running: boolean;
  finished: string;
  setSource: (s: string) => void;
  load: (from: { url?: string; file?: string }) => Promise<void>;
  makeAll: () => Promise<void>;
  stop: () => void;
}

export const useManyStore = create<ManyState>((set, get) => ({
  source: "",
  rows: [],
  problem: "",
  loading: false,
  progress: {},
  running: false,
  finished: "",
  setSource: (source) => set({ source }),

  load: async (from) => {
    set({ problem: "", loading: true, progress: {}, finished: "" });
    try {
      const r = await window.byok.batch.readSheet(from);
      set({ rows: r.filter((x) => pick(x, "script")), source: from.file ?? from.url ?? get().source });
      if (!r.length) set({ problem: "The sheet has no rows under its header. Add one row per video, then read it again." });
    } catch (e) {
      set({ problem: plainError(e, "Check the link is shared as “Anyone with the link”, or pick the CSV file again.") });
    } finally {
      set({ loading: false });
    }
  },

  makeAll: async () => {
    const { rows, source } = get();
    const project = useProjectStore.getState();
    const speakers = project.speakers;
    const checks = checkRows(rows);
    set({ finished: "", problem: "" });
    const cast = speakers.map((s) => ({
      label: s.label,
      openingPhrase: s.openingPhrase,
      puppetPath: s.puppetPath,
      sheetPath: s.sheetPath,
      character: activeCard(s) ?? undefined,
      engine: (s.ttsEngine === "dramabox" ? "gemini" : s.ttsEngine ?? "gemini") as "gemini",
      geminiMode: s.geminiMode,
      geminiModel: s.geminiModel,
      geminiVoice: s.geminiVoice,
      pitch: s.pitch,
      speed: s.speed,
      breathMs: s.breathMs,
      elevenVoiceId: s.elevenVoiceId,
      borderColor: s.borderColor,
    }));
    // The project's own look, carried as a preset — speakers included, so
    // positions, frames and waveforms are exactly as on screen.
    const preset = {
      render: project.render,
      fps: project.fps,
      speakers: project.speakers,
      musicWaveform: project.musicWaveform,
      musicColor: project.musicColor,
      subtitles: project.subtitles,
      backgroundDim: project.backgroundDim,
      backgroundBlur: project.backgroundBlur,
      backgroundCrossfadeMs: project.backgroundCrossfadeMs,
    };
    const list = rows
      .map((row, i) => ({ row, ok: checks[i]?.ok }))
      .filter((x) => x.ok)
      .map(({ row }, i) => ({
        name: pick(row, "name") || `video-${i + 1}`,
        script: pick(row, "script"),
        topic: pick(row, "topic") || undefined,
        template: pick(row, "template") || undefined,
        format: shapeOf(pick(row, "format")),
        music: (/^(no|none|off|όχι)$/i.test(pick(row, "music")) ? "none" : "auto") as "auto" | "none",
        backgrounds: (/^(no|none|off|όχι)$/i.test(pick(row, "backgrounds")) ? "none" : "auto") as "auto" | "none",
        language: pick(row, "language") || undefined,
      }));
    // PAID VOICES: a sheet can run overnight, so a paid voice is only used when
    // the user switched that on (Settings), up to the cap they set — and they
    // are told the worst case here, before anything starts.
    const st = useSettingsStore.getState();
    const paid = { allow: st.paidInBatch, maxCredits: st.paidBatchMaxCredits };
    if (speakers.some((s) => s.ttsEngine === "elevenlabs")) {
      if (!paid.allow) {
        set({ problem: "This cast uses a paid ElevenLabs voice, and paid voices are switched off for batches. Turn them on in Settings → Paid voices (and set a cap), or give the speakers a free voice." });
        return;
      }
      const most = paid.maxCredits > 0 ? `${paid.maxCredits.toLocaleString("en-US")} characters` : "no limit (no cap is set)";
      const money = paid.maxCredits > 0 ? ` — about ${((paid.maxCredits / 1000) * st.elevenPricePer1000Usd).toFixed(2)} USD at ${st.elevenPricePer1000Usd.toFixed(2)} USD per 1,000 characters` : "";
      const sheetChars = list.reduce((n, r) => n + (r.script?.length ?? 0), 0);
      if (!window.confirm(`This batch uses a paid ElevenLabs voice.\n\nThe scripts in this sheet are about ${sheetChars.toLocaleString("en-US")} characters in all (every character of an ElevenLabs line is a credit).\nIt will stop buying at: ${most}${money}.\nLines already bought on an earlier run are reused for free.\n\nStart?`)) return;
    }
    const r = await window.byok.batch.runMany({ rows: list, cast, preset, runName: runNameFor(source, list.length), aiLabel: st.aiLabel, paid });
    if (!r.ok) {
      set({ problem: plainError(r.problem ?? "could not start", "Fix that, then press Make all again.") });
      return;
    }
    // every ready row starts as "waiting", so the board shows the queue at once
    const progress: Record<number, RowProgress> = {};
    checks.forEach((c, i) => { if (c.ok) progress[i] = { status: "waiting" }; });
    set({ running: true, progress });
  },

  stop: () => void window.byok.batch.stopMany(),
}));

/** Listen to the batch's events once, for the whole app. Returns the unsubscribe. */
export function initManyEvents(): () => void {
  return (
    window.byok?.batch?.onEvent((raw) => {
      const e = raw as { type: string; index?: number; status?: RowProgress["status"]; pct?: number; note?: string; error?: string; outputPath?: string; done?: number; failed?: number; folder?: string };
      if (e.type === "row" && e.index !== undefined) {
        const rowIndex = readyIndexToRow(e.index);
        useManyStore.setState((s) => ({ progress: { ...s.progress, [rowIndex]: { status: e.status!, pct: e.pct, note: e.note, error: e.error, outputPath: e.outputPath } } }));
      }
      if (e.type === "finished") useManyStore.setState({ running: false, finished: `${e.done} made, ${e.failed} failed — in ${e.folder}` });
    }) ?? (() => {})
  );
}

/** The batch numbers only the READY rows (0, 1, 2…); the board shows every row. */
function readyIndexToRow(readyIndex: number): number {
  const checks = checkRows(useManyStore.getState().rows);
  let n = -1;
  for (let i = 0; i < checks.length; i++) {
    if (checks[i].ok) n++;
    if (n === readyIndex) return i;
  }
  return readyIndex;
}
