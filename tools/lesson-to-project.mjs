// Turn a lesson + preset + cast into a project file the app can open,
// so the look a batch job renders with can be inspected in the app itself.
//
//   node tools/lesson-to-project.mjs jobs/lms-101.1-test.json projects/lms-101.1.byokproj.json
//
// Open it in the app: Presets panel → Open project.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const [jobPath, outPath] = process.argv.slice(2);
const job = JSON.parse(await readFile(jobPath, 'utf8'));
const preset = JSON.parse(await readFile(job.presetPath, 'utf8'));

const dir = job.lessonDir;
const cuesFile = (await readdir(dir)).find((f) => f.endsWith('-cues.json'));
const sheet = JSON.parse(await readFile(path.join(dir, cuesFile), 'utf8'));
const words = JSON.parse(await readFile(path.join(dir, `${sheet.lesson}-words.json`), 'utf8').catch(() => '{}'));

const speakers = job.cast.map((c, i) => {
  const s = preset.slots[i];
  return {
    id: `s${i + 1}`, label: c.label, puppetPath: c.puppetPath, borderColor: c.borderColor,
    surface: s.surface, bgColor: '#000000', bgOpacity: 0, borderOpacity: 1,
    outlineShape: s.outlineShape, waveform: s.waveform, x: s.x, y: s.y, size: s.size,
    ttsEngine: c.engine,
  };
});
const idOf = Object.fromEntries(job.cast.flatMap((c, i) => [c.label, ...(c.aliases ?? [])].map((n) => [n.toLowerCase(), `s${i + 1}`])));

const TAG = /\[([^\]]+)\]/g;
const segments = sheet.cues.filter((c) => 'n' in c).map((c) => {
  const tags = [...c.text.matchAll(TAG)].map((m) => m[1].trim().toLowerCase());
  const w = words[String(c.n).padStart(3, '0')];
  return {
    speakerId: idOf[c.character], speakerLabel: job.cast[+idOf[c.character].slice(1) - 1].label,
    text: c.text.replace(TAG, ' ').replace(/\s+/g, ' ').trim(),
    startMs: c.at, endMs: c.at + c.ms,
    mood: tags.find((t) => !/pause|slow|fast|gabble|laughs|giggles|sighs|gasp/.test(t)),
    words: w?.map((x) => ({ text: x.w, startMs: Math.round(c.at + x.start * 1000), endMs: Math.round(c.at + x.end * 1000) })),
  };
});

const doc = {
  kind: 'byok-project', version: 1, savedAt: Date.now(),
  project: {
    render: { format: '9:16', width: 1080, height: 1920, durationSec: Math.ceil(sheet.totalMs / 1000), engine: 'remotion' },
    fps: 30,
    speakers,
    subtitles: preset.subtitles,
    backgroundDim: preset.backgroundDim, backgroundBlur: preset.backgroundBlur,
    language: job.language,
    visemeFadeMs: job.visemeFadeMs ?? 130,
    narration: { filePath: path.join(dir, `${sheet.lesson}-full.wav`), segments, analysis: null },
  },
};
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(doc, null, 2));
console.log(`${outPath}  ${segments.length} lines, ${speakers.length} speakers`);
