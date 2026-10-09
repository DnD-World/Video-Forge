// ---------------------------------------------------------------------------
// Make the sound effects a course needs, before anything is rendered.
//
//   npm run sfx -- ../lms/sfx/wanted.csv
//   npm run sfx -- ../lms/sfx/wanted.csv --takes 2 --budget 3400
//   npm run sfx -- ../lms/sfx/wanted.csv --only clicker-click --takes 3
//
// WHY BEFOREHAND. A render stops when a script asks for a sound the library
// does not have. That is the right behaviour for one video and a bad one for a
// series: the failure lands in the middle of a queue, hours in. Making every
// sound first removes the failure point instead of catching it.
//
// WHY ELEVENLABS AND NOT tools/make-sfx.py. The local Stable Audio run held the
// laptop's graphics card at 88 °C and its short foley was the weaker of the
// two. ElevenLabs runs on their machines, and the key is already in the vault.
//
// THE COST IS CHECKED, NOT HOPED. 40 credits per second of sound when the
// length is given, and it always is here. The run adds up the whole bill
// before the first request and refuses to start if it would pass --budget; it
// also reads the account's remaining credits before and after, so the number
// in the log is the account's, not an estimate.
//
// WHAT IT WRITES, beside the CSV:
//   takes/<name>.take1.wav, .take2.wav …   every take, kept for choosing
//   library/<name>.wav                    take 1, until a different one is picked
//
// Resumable: a take that already exists is not paid for twice.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import * as keyStore from "../keyStore";
import { wrapPcmAsWav } from "../tts/elevenlabsEngine";

const BASE = "https://api.elevenlabs.io/v1";
const CREDITS_PER_SECOND = 40;

interface Row {
  name: string;
  prompt: string;
  seconds: number;
}

/** The CSV is hand-written and every prompt contains commas, so quotes matter. */
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
    const [name, prompt, seconds] = cells.map((c) => c.trim());
    if (!name || !prompt || prompt.startsWith("TODO")) continue;
    rows.push({ name, prompt, seconds: Number(seconds) || 1 });
  }
  return rows;
}

async function remainingCredits(apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/user/subscription`, { headers: { "xi-api-key": apiKey } });
    if (!res.ok) return null;
    const s = (await res.json()) as { character_count: number; character_limit: number };
    return s.character_limit - s.character_count;
  } catch {
    return null;
  }
}

async function exists(file: string): Promise<boolean> {
  return fsp.access(file).then(() => true, () => false);
}

/** 44.1k PCM is Pro and above; below that the same call at 24k succeeds —
 *  the same fallback the speech engine makes, for the same reason. */
async function generate(apiKey: string, row: Row): Promise<Buffer> {
  const body = JSON.stringify({
    text: row.prompt,
    duration_seconds: row.seconds,
    // Above the default 0.3: these are literal foley descriptions, and a
    // creative reading of "one clicker click" is a worse clicker click.
    prompt_influence: 0.6,
  });
  for (const rate of [44100, 24000]) {
    const res = await fetch(`${BASE}/sound-generation?output_format=pcm_${rate}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body,
    });
    if (res.ok) return wrapPcmAsWav(Buffer.from(await res.arrayBuffer()), rate);
    const text = await res.text();
    if ((res.status === 401 || res.status === 403) && /tier|subscription|plan|pro/i.test(text)) {
      continue;
    }
    if (res.status === 401) throw new Error("ElevenLabs refused the key. Check it in Backend Settings.");
    if (res.status === 429) throw new Error(`ElevenLabs: too many requests, or the credits are gone. ${text.slice(0, 200)}`);
    throw new Error(`ElevenLabs ${res.status} — ${text.slice(0, 300)}`);
  }
  throw new Error("ElevenLabs refused both 44.1k and 24k PCM for this account.");
}

export async function makeSfxEleven(argv: string[]): Promise<void> {
  const csvPath = path.resolve(argv[0]);
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const takes = Number(flag("--takes") ?? 1);
  const budget = Number(flag("--budget") ?? 1500);
  const only = flag("--only");

  const dir = path.dirname(csvPath);
  const takesDir = path.join(dir, "takes");
  const libraryDir = path.join(dir, "library");
  await fsp.mkdir(takesDir, { recursive: true });
  await fsp.mkdir(libraryDir, { recursive: true });

  let rows = parseCsv(await fsp.readFile(csvPath, "utf8"));
  if (only) rows = rows.filter((r) => only.split(",").includes(r.name));

  // The whole bill, before anything is spent.
  const todo: { row: Row; take: number; file: string }[] = [];
  for (const row of rows) {
    for (let t = 1; t <= takes; t++) {
      const file = path.join(takesDir, `${row.name}.take${t}.wav`);
      if (!(await exists(file))) todo.push({ row, take: t, file });
    }
  }
  const bill = Math.ceil(todo.reduce((sum, j) => sum + j.row.seconds * CREDITS_PER_SECOND, 0));

  const apiKey = await keyStore.getKey("elevenlabs");
  if (!apiKey) {
    const saved = await keyStore.listKeys();
    throw new Error(
      `No ElevenLabs key saved — add one in Backend Settings. ` +
        `Keys saved now: ${saved.length ? saved.join(", ") : "none"}.`
    );
  }
  const before = await remainingCredits(apiKey);

  console.log(`${todo.length} take(s) to make, about ${bill} credits.`);
  console.log(`Account has ${before ?? "an unknown number of"} credits left. Budget for this run: ${budget}.`);
  if (bill > budget) throw new Error(`That is over the budget of ${budget}. Nothing was spent.`);
  if (before !== null && bill > before) throw new Error(`The account has only ${before}. Nothing was spent.`);

  let n = 0;
  for (const job of todo) {
    n++;
    const wav = await generate(apiKey, job.row);
    await fsp.writeFile(job.file, wav);
    console.log(`[${n}/${todo.length}] ${job.row.name} take ${job.take}`);
  }

  // Take 1 is the default until someone picks another. An existing library
  // file is left alone — it may be a take somebody already chose.
  for (const row of rows) {
    const lib = path.join(libraryDir, `${row.name}.wav`);
    const first = path.join(takesDir, `${row.name}.take1.wav`);
    if (!(await exists(lib)) && (await exists(first))) await fsp.copyFile(first, lib);
  }

  const after = await remainingCredits(apiKey);
  if (before !== null && after !== null) {
    console.log(`\nSpent ${before - after} credits. ${after} left.`);
  }
}
