// ---------------------------------------------------------------------------
// Many videos from one sheet — its own screen in the "B" layout (26 Oct 2026;
// before, a tab inside Make). One row per video; the cast and the look are
// this project's own, each row brings its script.
//
//   left    four steps: Cast & look (from the puppet video), the Sheet, Check,
//           Make (one video at a time, with a Stop)
//   right   the board: every video, its state and its progress
//
// The run's state lives in store/useManyStore.ts, so a batch keeps reporting
// while you work on something else.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { BLANK_SHEET, checkRows, pick, useManyStore } from "../../store/useManyStore";
import { NextStep, StepColumn, useFolded } from "../ui/StepColumn";
import { ErrorLine } from "../ui/ErrorLine";

type ManyStep = "cast" | "sheet" | "check" | "make";
const STEPS: { id: ManyStep; title: string; sub: string }[] = [
  { id: "cast", title: "Cast & look", sub: "From your puppet video" },
  { id: "sheet", title: "Sheet", sub: "One row per video" },
  { id: "check", title: "Check", sub: "Every script against the cast" },
  { id: "make", title: "Make", sub: "One video at a time" },
];
const WIDTH: Record<ManyStep, number> = { cast: 400, sheet: 460, check: 420, make: 420 };

export function ManyVideosStudio({ onEditProject }: { onEditProject: () => void }) {
  const [step, setStep] = useState<ManyStep>("sheet");
  const [folded, setFolded] = useFolded("vf.many.stepsFolded");
  const speakers = useProjectStore((s) => s.speakers);
  const render = useProjectStore((s) => s.render);
  const { rows, problem, running, progress, finished, source } = useManyStore();
  const checks = useMemo(() => checkRows(rows), [rows, speakers]);
  const ready = checks.filter((c) => c.ok).length;
  const done = Object.values(progress).filter((p) => p.status === "done").length;
  const failed = Object.values(progress).filter((p) => p.status === "failed").length;

  const status: Record<ManyStep, string> = {
    cast: speakers.length ? `${speakers.map((s) => s.label).join(", ")} · ${render.format}` : "No cast yet — set it up in Puppet video",
    sheet: rows.length ? `${rows.length} row${rows.length > 1 ? "s" : ""} from ${/docs\.google\.com/.test(source) ? "a Google Sheet" : source.split(/[\\/]/).pop() || "the sheet"}` : "No sheet read yet",
    check: rows.length ? `${ready} of ${rows.length} ready` : "Read a sheet first",
    make: running ? `Making… ${done} of ${ready} done` : finished ? finished.split(" — ")[0] : ready ? `Ready to make ${ready}` : "Nothing ready yet",
  };
  const at = STEPS.findIndex((x) => x.id === step);
  const nextStep = STEPS[at + 1];
  const nextButton = nextStep ? <NextStep label={nextStep.title} tip={`Goes on to step ${at + 2}: ${nextStep.title} (${nextStep.sub.toLowerCase()}).`} onClick={() => setStep(nextStep.id)} /> : null;

  return (
    <div className="forge-studio flex flex-1 gap-3 px-3 pb-3 min-h-0">
      <StepColumn
        steps={STEPS.map((x) => ({ ...x, status: status[x.id] }))}
        current={step}
        onGo={setStep}
        width={WIDTH[step]}
        folded={folded}
        setFolded={setFolded}
        title="Many videos, step by step"
        foot={nextButton}
      >
        {step === "cast" && <CastStep onEditProject={onEditProject} />}
        {step === "sheet" && <SheetStep />}
        {step === "check" && <CheckStep />}
        {step === "make" && <MakeStep ready={ready} />}
        {problem && <div className="mt-3"><ErrorLine text={problem} tip="Something stopped the sheet or the run. The message says what to do next." /></div>}
      </StepColumn>

      <main className="panel-hud flex-1 min-w-0 min-h-0 p-5 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="label-etched" data-tip="Every video the sheet will make, in order.">The videos</div>
            <div className="text-2xl font-semibold mt-1" data-tip="How many videos are made, failed and ready.">
              {rows.length ? `${done} made · ${failed} failed · ${ready} ready` : "No sheet yet"}
            </div>
          </div>
          {running && <div className="forge-many-pulse" data-tip="A video is being made right now.">making</div>}
        </div>
        {rows.length > 0 && (
          <div className="forge-many-total" data-tip="How far the whole run is.">
            <i style={{ width: `${ready ? Math.round((100 * (done + failed)) / ready) : 0}%` }} />
          </div>
        )}
        {rows.length === 0 ? (
          <div className="forge-many-empty" data-tip="Read a sheet in step 2 and its videos appear here.">
            <b>One row of a spreadsheet = one video.</b>
            <span>Your cast and look stay the same; each row brings its own script. Read a sheet in step 2.</span>
          </div>
        ) : (
          <div className="forge-many-board">
            {rows.map((row, i) => {
              const c = checks[i];
              const p = progress[i];
              const state = p?.status ?? (c.ok ? "ready" : "bad");
              const first = pick(row, "script").split("\n")[0];
              return (
                <div key={i} className={`card ${state}`} data-tip={c.ok ? `Script: ${c.why}.` : `Not ready: ${c.why}. Fix this row in the sheet, then read it again.`}>
                  <div className="top">
                    <b>{pick(row, "name") || `video ${i + 1}`}</b>
                    <span className="st">
                      {p?.status === "working" ? `${p.pct ?? 0}%` : p?.status === "done" ? "✓ made" : p?.status === "failed" ? "✗ failed" : p?.status === "waiting" ? "waiting" : c.ok ? "ready" : "⚠ check"}
                    </span>
                  </div>
                  <span className="line">{first.length > 90 ? first.slice(0, 88) + "…" : first}</span>
                  <span className="why">{p?.status === "working" ? p.note : p?.status === "failed" ? p.error : c.why}</span>
                  {p?.status === "working" && <i style={{ width: `${p.pct ?? 0}%` }} />}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CastStep({ onEditProject }: { onEditProject: () => void }) {
  const speakers = useProjectStore((s) => s.speakers);
  const render = useProjectStore((s) => s.render);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-300" data-tip="Every video in the sheet uses the cast and look you set up in the puppet video.">Every video uses the cast and the look of your puppet video. Each row of the sheet only brings its script (and, if you like, its own shape, music and backgrounds).</p>
      {speakers.length ? (
        <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
          {speakers.map((s) => (
            <li key={s.id} className="chip" style={{ borderColor: s.borderColor }} data-tip={`A speaker. Lines in the sheet that start with “${s.label}:” are spoken by them.`}>{s.label}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-amber-200" data-tip="There is nobody to speak the lines yet.">No speakers yet.</p>
      )}
      <p className="text-xs text-neutral-400" data-tip="The shape and size every video will have, unless its row says otherwise.">Shape: {render.format} · {render.width}×{render.height}</p>
      <button className="btn" onClick={onEditProject} data-tip="Opens the puppet video, where you change the cast and the look. Come back here after.">Change the cast or the look</button>
    </div>
  );
}

function SheetStep() {
  const { source, setSource, load, loading } = useManyStore();
  const blank = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([BLANK_SHEET], { type: "text/csv" }));
    a.download = "video-forge-many-videos.csv";
    a.click();
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste a Google Sheet link (or a .csv file path)" className="flex-1 min-w-0"
          data-tip="In the sheet, press Share and set it to “Anyone with the link”, then copy the link. No keys needed." />
        <button className="btn" disabled={!source.trim() || loading}
          // A path to a .csv on this computer works in the same box.
          onClick={() => void load(/^([a-z]:[\\/]|\\\\|\/)/i.test(source.trim()) ? { file: source.trim().replace(/^"|"$/g, "") } : { url: source })}
          data-tip="Read the sheet's rows.">
          {loading ? "Reading…" : "Read"}
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn" onClick={async () => { const p = await window.byok.dialog.openFile([{ name: "Sheet (CSV)", extensions: ["csv", "tsv", "txt"] }]); if (p) void load({ file: p }); }}
          data-tip="A sheet saved as CSV — in Excel: File → Save As → CSV UTF-8.">Or pick a CSV file</button>
        <button className="btn" onClick={blank} data-tip="An empty sheet with the right columns and one example row. Open it in Google Sheets or Excel.">Get a blank sheet</button>
      </div>
      <details className="forge-sec" open>
        <summary data-tip="Which columns the sheet can have. Only script is required.">Columns</summary>
        <ul className="text-sm text-neutral-400 space-y-1 pt-2">
          <li><b data-tip="The only column you must have: the lines to speak, one per line, like “Name: words”.">script</b> — the lines, «Name: words», one per line (required)</li>
          <li><b data-tip="What to call the finished video file.">name</b> — the video's file name</li>
          <li><b data-tip="A few words about the video, used to pick background clips.">topic</b> — a few words, for choosing background clips</li>
          <li><b data-tip="The name of a look to use, for example “News desk”. Empty means this project’s look.">template</b> — a look by name (empty = this project's look)</li>
          <li><b data-tip="The video shape: 9:16 tall, 16:9 wide, 1:1 square or 4:5.">format</b> — 9:16, 16:9, 1:1 or 4:5 · <b data-tip="Music for this video: auto picks one, none leaves it out.">music</b> / <b data-tip="Background clips for this video: auto picks them, none leaves them out.">backgrounds</b> — auto or none · <b data-tip="The language code, for example el for Greek or en for English.">language</b> — el, en…</li>
        </ul>
      </details>
    </div>
  );
}

function CheckStep() {
  const rows = useManyStore((s) => s.rows);
  const speakers = useProjectStore((s) => s.speakers);
  const checks = useMemo(() => checkRows(rows), [rows, speakers]);
  if (!rows.length) return <p className="text-sm text-neutral-400" data-tip="The check needs a sheet to look at.">Read a sheet first (step 2).</p>;
  const bad = checks.map((c, i) => ({ c, i })).filter((x) => !x.c.ok);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-neutral-300" data-tip="Every row's script was matched against your cast: each line must start with a speaker's name.">{checks.length - bad.length} of {rows.length} rows are ready. Each script was matched against your cast.</p>
      {bad.length > 0 && (
        <>
          <div className="label-etched" data-tip="Rows that will be skipped until they are fixed in the sheet.">Not ready</div>
          {bad.map(({ c, i }) => (
            <p key={i} className="text-sm text-amber-200 m-0" data-tip="Fix this row in the sheet, then read the sheet again.">⚠ {pick(rows[i], "name") || `video ${i + 1}`}: {c.why}</p>
          ))}
        </>
      )}
    </div>
  );
}

function MakeStep({ ready }: { ready: number }) {
  const { running, finished, makeAll, stop } = useManyStore();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-300" data-tip="Each ready row becomes one video, made one after the other.">The videos are made one after the other. You can leave it running overnight, and switch to other work in the app meanwhile.</p>
      {!running ? (
        <button className="btn btn-primary" disabled={!ready} onClick={() => void makeAll()} data-tip="Make every ready row, one video at a time.">Make all {ready}</button>
      ) : (
        <button className="btn" onClick={stop} data-tip="Finish the video being made, then stop.">Stop after this one</button>
      )}
      {finished && <p className="text-sm text-neutral-300" data-tip="How the run ended, and the folder the videos are in.">{finished}</p>}
    </div>
  );
}

/** What the Make tab inside the puppet video shows now: the way to this screen. */
export function ManyVideosPointer({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-neutral-300" data-tip="Making many videos from a spreadsheet has its own screen now.">Many videos from one sheet has its own screen, with every video's progress on view.</p>
      <button className="btn btn-primary" onClick={onOpen} data-tip="Opens the Many videos screen.">Open Many videos</button>
    </section>
  );
}
