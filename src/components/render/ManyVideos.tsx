// ---------------------------------------------------------------------------
// Many videos from one sheet (Make → Many videos, 13 Oct 2026).
//
// Paste a Google Sheet link (shared "anyone with the link can view") or pick
// a .csv. One row per video; the columns are listed on screen and in the blank
// sheet. The cast and the look are this project's own. Check all first — every
// row's script is matched against the cast — then Make all: one video at a
// time, in order, with a Stop. electron/batch/manyVideos.ts does the work.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useSettingsStore } from "../../store/useSettingsStore";

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
import { useProjectStore } from "../../store/useProjectStore";
import { parseScript } from "../../lib/narration/parseScript";
import { parseDramaboxScript } from "../../lib/narration/parseDramaboxScript";

type Row = Record<string, string>;
interface Check {
  ok: boolean;
  why: string;
}
interface Progress {
  status: "waiting" | "working" | "done" | "failed";
  pct?: number;
  note?: string;
  error?: string;
  outputPath?: string;
}

/** The columns, with the names people actually type for them. */
const COLS = {
  name: ["name", "title", "video", "file", "όνομα"],
  script: ["script", "text", "σενάριο"],
  topic: ["topic", "about", "θέμα"],
  template: ["template", "look", "preset"],
  format: ["format", "shape", "orientation"],
  music: ["music", "μουσική"],
  backgrounds: ["backgrounds", "background", "footage"],
  language: ["language", "lang", "γλώσσα"],
} as const;
const pick = (row: Row, key: keyof typeof COLS) => {
  for (const k of COLS[key]) if (row[k] !== undefined && row[k] !== "") return row[k];
  return "";
};

const BLANK =
  "name,script,topic,template,format,music,backgrounds,language\n" +
  '"Lesson 1","Καίτη: Καλώς ήρθατε!\nΣερίφης: [nods] Ναι, ξεκινάμε.","dogs learning to sit","","9:16","auto","auto","el"\n';

/** A sheet's "format" cell -> a shape (21 Oct 2026: square and 4:5 added). */
function shapeOf(v: string): "9:16" | "16:9" | "1:1" | "4:5" | undefined {
  if (/4[:x]5|feed/i.test(v)) return "4:5";
  if (/1[:x]1|square/i.test(v)) return "1:1";
  if (/16[:x]9|wide|land/i.test(v)) return "16:9";
  if (/9[:x]16|tall|vert|port/i.test(v)) return "9:16";
  return undefined;
}

export function ManyVideos() {
  const speakers = useProjectStore((s) => s.speakers);
  const project = useProjectStore((s) => s);
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<string>("");

  useEffect(
    () =>
      window.byok?.batch?.onEvent((raw) => {
        const e = raw as { type: string; index?: number; status?: Progress["status"]; pct?: number; note?: string; error?: string; outputPath?: string; done?: number; failed?: number; folder?: string };
        if (e.type === "row" && e.index !== undefined) {
          setProgress((p) => ({ ...p, [e.index!]: { status: e.status!, pct: e.pct, note: e.note, error: e.error, outputPath: e.outputPath } }));
        }
        if (e.type === "finished") {
          setRunning(false);
          setFinished(`${e.done} made, ${e.failed} failed — in ${e.folder}`);
        }
      }),
    []
  );

  const load = async (source: { url?: string; file?: string }) => {
    setProblem("");
    setLoading(true);
    setProgress({});
    setFinished("");
    try {
      const r = await window.byok.batch.readSheet(source);
      setRows(r.filter((x) => pick(x, "script")));
      if (!r.length) setProblem("The sheet has no rows under its header.");
    } catch (e) {
      setProblem(e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") : String(e));
    } finally {
      setLoading(false);
    }
  };

  // CHECK ALL: every row's script against this project's cast.
  const checks: Check[] = useMemo(() => {
    const cast = speakers.map((s) => ({ id: s.id, label: s.label }));
    return rows.map((row) => {
      const script = pick(row, "script");
      if (!script) return { ok: false, why: "no script" };
      if (!cast.length) return { ok: false, why: "add speakers in Cast first" };
      const plain = parseScript(script, cast);
      const prose = plain.segments.length ? null : parseDramaboxScript(script, speakers.map((s) => ({ id: s.id, label: s.label, openingPhrase: s.openingPhrase })) as never);
      const lines = plain.segments.length || (prose as { blocks?: unknown[] } | null)?.blocks?.length || 0;
      if (!lines) return { ok: false, why: `no line starts with a cast name (${cast.map((c) => c.label).join(", ")})` };
      if (plain.unmatchedLines.length) return { ok: true, why: `${lines} lines · ${plain.unmatchedLines.length} not matched to anyone (skipped)` };
      return { ok: true, why: `${lines} lines` };
    });
  }, [rows, speakers]);

  const good = checks.filter((c) => c.ok).length;

  const makeAll = async () => {
    setFinished("");
    const cast = speakers.map((s) => ({
      label: s.label,
      openingPhrase: s.openingPhrase,
      puppetPath: s.puppetPath,
      sheetPath: s.sheetPath,
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
    const r = await window.byok.batch.runMany({ rows: list, cast, preset, runName: runNameFor(url, list.length), aiLabel: useSettingsStore.getState().aiLabel });
    if (!r.ok) return setProblem(r.problem ?? "could not start");
    setRunning(true);
  };

  const blank = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([BLANK], { type: "text/csv" }));
    a.download = "video-forge-many-videos.csv";
    a.click();
  };

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-neutral-400">
        One row per video. Uses this project's cast and look; each row brings its own script.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Google Sheet link (or a .csv file path)"
          className="flex-1 min-w-0"
          data-tip="In the sheet: Share → General access → Anyone with the link (Viewer). Then copy the link. No Google account setup or keys needed."
        />
        <button
          className="btn"
          disabled={!url.trim() || loading}
          // A path to a .csv on this computer works in the same box.
          onClick={() => void load(/^([a-z]:[\\/]|\\\\|\/)/i.test(url.trim()) ? { file: url.trim().replace(/^"|"$/g, "") } : { url })}
          data-tip="Read the sheet's rows."
        >
          {loading ? "Reading…" : "Read"}
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          className="btn"
          onClick={async () => {
            const p = await window.byok.dialog.openFile([{ name: "Sheet (CSV)", extensions: ["csv", "tsv", "txt"] }]);
            if (p) void load({ file: p });
          }}
          data-tip="A sheet saved as CSV — in Excel: File → Save As → CSV UTF-8."
        >
          Or pick a CSV file
        </button>
        <button className="btn" onClick={blank} data-tip="An empty sheet with the right columns and one example row. Open it in Google Sheets or Excel.">
          Get a blank sheet
        </button>
      </div>
      <details className="forge-sec">
        <summary data-tip="Which columns the sheet can have. Only script is required.">Columns</summary>
        <ul className="text-sm text-neutral-400 space-y-1 pt-2">
          <li><b>script</b> — the lines, «Name: words», one per line (required)</li>
          <li><b>name</b> — the video's file name</li>
          <li><b>topic</b> — a few words, for choosing background clips</li>
          <li><b>template</b> — a look by name, e.g. «News desk» (empty = this project's look)</li>
          <li><b>format</b> — 9:16, 16:9, 1:1 or 4:5 · <b>music</b> / <b>backgrounds</b> — auto or none · <b>language</b> — el, en…</li>
        </ul>
      </details>

      {problem && <p className="text-sm text-red-400">{problem}</p>}

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="label-etched">{good} of {rows.length} ready</div>
          <div className="forge-many">
            {rows.map((row, i) => {
              const c = checks[i];
              const p = progress[i];
              return (
                <div key={i} className={`row ${p?.status ?? (c.ok ? "ready" : "bad")}`}>
                  <b>{pick(row, "name") || `video ${i + 1}`}</b>
                  <span>
                    {p?.status === "working"
                      ? `${p.pct ?? 0}% · ${p.note ?? ""}`
                      : p?.status === "done"
                        ? "✓ made"
                        : p?.status === "failed"
                          ? `✗ ${p.error ?? "failed"}`
                          : `${c.ok ? "✓" : "⚠"} ${c.why}`}
                  </span>
                  {p?.status === "working" && <i style={{ width: `${p.pct ?? 0}%` }} />}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            {!running ? (
              <button className="btn btn-primary" disabled={!good} onClick={() => void makeAll()} data-tip="Make every ✓ row, one video at a time. You can leave it running overnight.">
                Make all {good}
              </button>
            ) : (
              <button className="btn" onClick={() => void window.byok.batch.stopMany()} data-tip="Finish the video being made, then stop.">
                Stop after this one
              </button>
            )}
          </div>
          {finished && <p className="text-sm text-neutral-300">{finished}</p>}
        </div>
      )}
    </section>
  );
}
