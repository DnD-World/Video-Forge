// ---------------------------------------------------------------------------
// Many videos from one spreadsheet (Ak, 13 Oct 2026: "mass prepare and render
// … with a googlesheet").
//
// One row per video. The sheet is a Google Sheet shared "anyone with the link
// can view" — read as CSV through Google's own export address, so there is no
// Google Cloud, no key and no sign-in — or a .csv file (Excel: Save As → CSV).
// The cast and the look are the ones set up in the app; a row varies the
// script, the topic, the name, the shape and a few switches. Videos are made
// one at a time, in this process, with the same runBatchJob a `--job` file
// uses, so a sheet of fifty runs overnight unattended.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import { request } from "../net/http";
import { parseCsv, sheetCsvUrl } from "./sheet";
export { parseCsv, sheetCsvUrl };
import { runBatchJob, type BatchJob, type JobSpeaker } from "./runJob";
import type { RenderContext } from "../render/renderVideo";

export async function fetchSheet(url: string): Promise<string> {
  const res = await request(sheetCsvUrl(url), { method: "GET", timeoutMs: 30000 });
  if (res.status >= 400) {
    throw new Error(
      res.status === 401 || res.status === 403 || /accounts\.google\.com/.test(res.body.slice(0, 2000))
        ? "Google would not share the sheet. In the sheet: Share → General access → Anyone with the link (Viewer)."
        : `The sheet could not be read (${res.status}).`
    );
  }
  if (/^\s*<!doctype html|^\s*<html/i.test(res.body)) {
    throw new Error("That link opened a web page, not a sheet. In the sheet: Share → Anyone with the link (Viewer), and paste that link.");
  }
  return res.body;
}

/** What one row asks for, in the job's own terms. */
export interface ManyRow {
  name: string;
  script: string;
  topic?: string;
  template?: string;
  format?: "9:16" | "16:9";
  music?: "auto" | "none";
  backgrounds?: "auto" | "none";
  language?: string;
}

export interface ManyRequest {
  rows: ManyRow[];
  cast: JobSpeaker[];
  /** The app's current look, as a preset (written next to the jobs). */
  preset: unknown;
  /** Folder name for this run's videos, under the output folder. */
  runName: string;
}

export type ManyEvent =
  | { type: "row"; index: number; status: "working" | "done" | "failed"; pct?: number; note?: string; outputPath?: string; error?: string }
  | { type: "finished"; done: number; failed: number; folder: string };

export async function runMany(
  req: ManyRequest,
  ctx: Omit<RenderContext, "onProgress"> & { mediaDir: string },
  onEvent: (e: ManyEvent) => void,
  shouldStop: () => boolean
): Promise<void> {
  const safe = (s: string) => s.replace(/[^\p{L}\p{N}._ ·-]+/gu, "_").slice(0, 80) || "video";
  const folder = path.join(ctx.outputDir, "many", safe(req.runName));
  const work = path.join(folder, ".jobs");
  await fsp.mkdir(work, { recursive: true });
  const presetPath = path.join(work, "look.preset.json");
  await fsp.writeFile(presetPath, JSON.stringify(req.preset, null, 1));
  let done = 0;
  let failed = 0;
  for (const [index, row] of req.rows.entries()) {
    if (shouldStop()) break;
    onEvent({ type: "row", index, status: "working", pct: 0, note: "starting" });
    try {
      const scriptPath = path.join(work, `${index + 1}.script.txt`);
      await fsp.writeFile(scriptPath, row.script, "utf8");
      const job: BatchJob = {
        scriptPath,
        cast: req.cast,
        ...(row.template ? { preset: row.template } : { presetPath }),
        topic: row.topic,
        format: row.format,
        music: row.music ?? "auto",
        backgrounds: row.backgrounds ?? "auto",
        language: row.language,
        outputName: row.name,
      };
      const result = await runBatchJob(job, {
        ...ctx,
        onProgress: (pct, note) => onEvent({ type: "row", index, status: "working", pct, note }),
      });
      const named = path.join(folder, `${safe(row.name)}.mp4`);
      await fsp.rm(named, { force: true });
      await fsp.rename(result.outputPath, named);
      done++;
      onEvent({ type: "row", index, status: "done", pct: 100, outputPath: named });
    } catch (e) {
      failed++;
      onEvent({ type: "row", index, status: "failed", error: e instanceof Error ? e.message : String(e) });
    }
  }
  onEvent({ type: "finished", done, failed, folder });
}
