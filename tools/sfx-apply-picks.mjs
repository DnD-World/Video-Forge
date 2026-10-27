// Put the chosen takes into the sound library.
//
//   node tools/sfx-apply-picks.mjs ../lms/sfx '{"clicker-click":"free2", ...}'
//   node tools/sfx-apply-picks.mjs ../lms/sfx picks.json
//
// Copies takes/<name>.<take>.wav to library/<name>.wav. A sound marked "none"
// is left out and listed at the end — that list is the generation queue.
//
// Ambiences are the one thing trimmed: a cue is a beat in a lesson, not a bed,
// and a 24-second field recording laid over a line would still be playing three
// lines later. They are cut to the length wanted.csv asks for, with a short
// fade at each end.
//
// LEVELS ARE SET HERE, and by two different methods on purpose. Recordings
// arrive from Freesound anywhere between a whisper and the edge of clipping,
// and the first pass through them left some sounds inaudible under narration
// and others jumping out of the mix.
//
//   longer than 2.5s  ->  loudness (EBU R128), measured then applied
//   shorter           ->  peak normalisation
//
// A one-second click has no meaningful "loudness" — R128 wants 3 seconds of
// signal to measure — so asking for it produces a number that is mostly
// silence, and the click comes back deafening. Peak is the honest measure for
// a transient. The two targets are chosen so a click and a bed sit at about
// the same place in the mix.
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const run = promisify(execFile);

const DIR = process.argv[2] ?? '../lms/sfx';
const arg = process.argv[3] ?? '{}';
const picks = JSON.parse(arg.trim().startsWith('{') ? arg : await readFile(path.resolve(arg), 'utf8'));

const csv = await readFile(path.join(DIR, 'wanted.csv'), 'utf8');
const seconds = new Map();
for (const line of csv.split(/\r?\n/).slice(1)) {
  const m = line.match(/^([a-z0-9-]+),(?:"[^"]*"|[^,]*),([0-9.]+)/i);
  if (m) seconds.set(m[1], Number(m[2]));
}

/** Loudness of a whole file, in LUFS, measured rather than guessed. */
async function loudnessOf(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', file,
    '-af', 'loudnorm=I=-18:TP=-1.5:print_format=json', '-f', 'null', '-']);
  const json = stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1);
  return Number(JSON.parse(json).input_i);
}

/** Loudest sample in the file, in dBFS. */
async function peakOf(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', file,
    '-af', 'volumedetect', '-f', 'null', '-']);
  return Number(stderr.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1] ?? -99);
}

const LOUD_TARGET = -18;   // LUFS, for anything long enough to measure
const PEAK_TARGET = -6;    // dBFS, for clicks and other short transients

await mkdir(path.join(DIR, 'library'), { recursive: true });
const missing = [];
for (const [name, take] of Object.entries(picks)) {
  if (take === 'none') { missing.push(name); continue; }
  const src = path.join(DIR, 'takes', `${name}.${take}.wav`);
  const dst = path.join(DIR, 'library', `${name}.wav`);
  const want = seconds.get(name) ?? 1.5;
  const dur = Number((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', src])).stdout.trim());

  const long = dur > 2.5;
  const gain = long
    ? LOUD_TARGET - await loudnessOf(src)
    : PEAK_TARGET - await peakOf(src);

  const filters = [`volume=${gain.toFixed(2)}dB`, 'alimiter=limit=0.89'];
  let keep = dur;
  if (dur > want * 2.5) {
    keep = Math.max(want, 2.5);
    filters.push(`afade=t=in:st=0:d=0.08`, `afade=t=out:st=${(keep - 0.25).toFixed(2)}:d=0.25`);
  }
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src,
    ...(keep < dur ? ['-t', String(keep)] : []),
    '-af', filters.join(','), '-ac', '1', '-ar', '24000', dst]);

  console.log(`${name}  <- ${take}  ${dur.toFixed(1)}s`
    + (keep < dur ? ` trimmed to ${keep.toFixed(1)}s` : '')
    + `  ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB (${long ? 'loudness' : 'peak'})`);
}
if (missing.length) {
  console.log(`\nStill to make (${missing.length}): ${missing.join(', ')}`);
  await writeFile(path.join(DIR, 'to-generate.txt'), missing.join('\n') + '\n');
}
