// ---------------------------------------------------------------------------
// Fetch candidate sound effects from Freesound — real recordings, CC0 only.
//
//   npm run sfx:free -- ../lms/sfx/wanted.csv
//   npm run sfx:free -- ../lms/sfx/wanted.csv --per 3 --only clicker-click
//
// WHY BEFORE GENERATING ANYTHING. A clicker, a collar tag, a doorbell and a
// pair of keys are things people have recorded thousands of times, and a real
// recording of one beats a generated impression of it. It also costs nothing:
// no credits, no graphics card, no heat. Generation is for what is left over.
//
// CC0 IS NOT NEGOTIABLE, for the same reason it is not negotiable in
// soundSearch.ts: CC-BY needs per-sound credit the videos have nowhere to put,
// and CC-NC cannot be used at all. The filter is server-side AND checked again
// on the way in.
//
// WHAT IT WRITES, beside the CSV:
//   takes/<name>.free1.wav, .free2.wav …   candidates, longest-shot first
//   takes/<name>.free1.txt                 where it came from, for the record
//
// It picks nothing. Listening is the job of a person; this only gathers.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import * as keyStore from "../keyStore";
import { request } from "../net/http";
import { downloadTo } from "../net/mediaSearch";
import { ffmpegBin } from "../process/ffmpegPath";

interface Row {
  name: string;
  prompt: string;
  seconds: number;
  /** What to type into Freesound, when our own name is too specific to find.
   *  "dog-food-kibble-bowl" returns nothing; "kibble bowl" returns plenty. */
  search?: string;
}

interface Hit {
  id: number;
  name: string;
  url: string;
  previewUrl: string;
  durationSec: number;
  author: string;
  license: string;
  downloads: number;
}

function parseCsv(text: string): Row[] {
  const rows: Row[] = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    const [name, prompt, seconds, , search] = cells.map((c) => c.trim());
    if (!name || !prompt || prompt.startsWith("TODO")) continue;
    rows.push({ name, prompt, seconds: Number(seconds) || 1, search: search || undefined });
  }
  return rows;
}

/** `dog-bark-sharp` -> `dog bark sharp`. The hyphens are ours, not Freesound's. */
function queryFor(row: Row): string {
  return row.search ?? row.name.replace(/-/g, " ");
}

async function search(key: string, row: Row): Promise<Hit[]> {
  // Long enough to be the sound, short enough to be a sound effect rather than
  // a field recording with the sound somewhere inside it. Ambiences are
  // allowed to run longer — they are beds, not hits.
  const isAmbience = /ambience|crickets|chatter/.test(row.name);
  const maxSec = isAmbience ? 30 : Math.max(4, row.seconds * 4);
  const url =
    `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(queryFor(row))}` +
    `&filter=${encodeURIComponent(`license:"Creative Commons 0" duration:[0.2 TO ${maxSec}]`)}` +
    `&fields=${encodeURIComponent("id,name,duration,username,url,license,previews,num_downloads")}` +
    `&sort=downloads_desc&page_size=8&token=${encodeURIComponent(key)}`;

  const res = await request(url);
  if (res.status !== 200) throw new Error(`freesound HTTP ${res.status} — ${res.body.slice(0, 200)}`);
  const data = JSON.parse(res.body) as { results?: any[] };
  const hits: Hit[] = [];
  for (const r of data.results ?? []) {
    const preview = r.previews?.["preview-hq-mp3"] ?? r.previews?.["preview-lq-mp3"];
    if (!preview) continue;
    if (!/creative commons 0|publicdomain\/zero/i.test(r.license)) continue;
    hits.push({
      id: r.id,
      name: r.name,
      url: r.url,
      previewUrl: preview,
      durationSec: Math.round(r.duration * 10) / 10,
      author: r.username,
      license: r.license,
      downloads: r.num_downloads ?? 0,
    });
  }
  return hits;
}

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegBin(), args, { windowsHide: true });
    let err = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-400)))));
  });
}

/** One sound by its Freesound id — for when a person has found the right one
 *  and the search would only get in the way.
 *
 *  The licence is reported rather than assumed. A hand-picked sound is the one
 *  case where something that is not CC0 can get in, and "CC-BY needs a credit
 *  in every video that uses it" is a decision for a person, not a filter. */
async function fetchById(key: string, id: string): Promise<Hit> {
  const url =
    `https://freesound.org/apiv2/sounds/${encodeURIComponent(id)}/?` +
    `fields=${encodeURIComponent("id,name,duration,username,url,license,previews,num_downloads")}` +
    `&token=${encodeURIComponent(key)}`;
  const res = await request(url);
  if (res.status !== 200) throw new Error(`freesound HTTP ${res.status} — ${res.body.slice(0, 160)}`);
  const r = JSON.parse(res.body) as any;
  const preview = r.previews?.["preview-hq-mp3"] ?? r.previews?.["preview-lq-mp3"];
  if (!preview) throw new Error(`sound ${id} has no preview to download`);
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    previewUrl: preview,
    durationSec: Math.round(r.duration * 10) / 10,
    author: r.username,
    license: r.license,
    downloads: r.num_downloads ?? 0,
  };
}

export async function getSfxFreesound(argv: string[]): Promise<void> {
  const csvPath = path.resolve(argv[0]);
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const per = Number(flag("--per") ?? 3);
  const only = flag("--only");

  const dir = path.dirname(csvPath);
  const takesDir = path.join(dir, "takes");
  await fsp.mkdir(takesDir, { recursive: true });

  let rows = parseCsv(await fsp.readFile(csvPath, "utf8"));
  if (only) rows = rows.filter((r) => only.split(",").includes(r.name));

  const key = await keyStore.getKey("freesound");
  if (!key) throw new Error("No Freesound key saved — add one in Backend Settings.");

  // `--ids name=123,name=456` takes exactly the sounds a person picked out on
  // the site, and skips searching entirely.
  const ids = flag("--ids");
  if (ids) {
    for (const pair of ids.split(",")) {
      const [name, id] = pair.split("=");
      const hit = await fetchById(key, id.trim());
      const stem = path.join(takesDir, `${name.trim()}.pick`);
      await downloadTo(hit.previewUrl, `${stem}.mp3`);
      await ffmpeg([
        "-hide_banner", "-loglevel", "error", "-y", "-i", `${stem}.mp3`,
        "-af", "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02",
        "-ac", "1", "-ar", "24000", `${stem}.wav`,
      ]);
      await fsp.rm(`${stem}.mp3`, { force: true });
      await fsp.writeFile(
        `${stem}.txt`,
        `${hit.name}\nby ${hit.author}\n${hit.durationSec}s, ${hit.downloads} downloads\n${hit.license}\n${hit.url}\n`
      );
      const cc0 = /creative commons 0|publicdomain\/zero/i.test(hit.license);
      console.log(
        `${name.trim()} pick  ${hit.durationSec}s  ${hit.name.slice(0, 40)}  ` +
          `${cc0 ? "CC0" : `NOT CC0 — ${hit.license}`}`
      );
    }
    return;
  }

  const empty: string[] = [];
  for (const row of rows) {
    let hits: Hit[];
    try {
      hits = await search(key, row);
    } catch (e) {
      console.log(`${row.name}: ${e instanceof Error ? e.message : String(e)}`);
      empty.push(row.name);
      continue;
    }
    if (!hits.length) {
      console.log(`${row.name}: nothing CC0 came back`);
      empty.push(row.name);
      continue;
    }
    let n = 0;
    for (const hit of hits.slice(0, per)) {
      n++;
      const stem = path.join(takesDir, `${row.name}.free${n}`);
      const mp3 = `${stem}.mp3`;
      if (await fsp.access(`${stem}.wav`).then(() => true, () => false)) continue;
      await downloadTo(hit.previewUrl, mp3);
      // Everything the course's audio is: mono, 24 kHz. Levelled, because
      // Freesound recordings arrive anywhere from whisper to clipping, and
      // then trimmed of leading silence so the sound lands on its cue rather
      // than half a second after it.
      await ffmpeg([
        "-hide_banner", "-loglevel", "error", "-y", "-i", mp3,
        "-af", "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,loudnorm=I=-20:TP=-1.5",
        "-ac", "1", "-ar", "24000", `${stem}.wav`,
      ]);
      await fsp.rm(mp3, { force: true });
      await fsp.writeFile(
        `${stem}.txt`,
        `${hit.name}\nby ${hit.author}\n${hit.durationSec}s, ${hit.downloads} downloads\n${hit.license}\n${hit.url}\n`
      );
      console.log(`${row.name} free${n}  ${hit.durationSec}s  ${hit.name.slice(0, 50)}`);
    }
  }

  if (empty.length) {
    console.log(`\nNothing found for ${empty.length}: ${empty.join(", ")}`);
    console.log("Those are the ones worth generating.");
  }
}
