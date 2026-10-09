// Build a page for choosing between sound-effect takes by ear.
//
//   node tools/sfx-pick-page.mjs ../lms/sfx
//
// Writes <dir>/pick.html — open it in a browser, play the takes, click the one
// to keep, then press "Copy my picks" and paste the line back into the chat.
// Applying the picks is `node tools/sfx-apply-picks.mjs <dir> "<pasted line>"`.
//
// WHY A PAGE AND NOT A PANEL IN THE APP. Choosing 35 sounds is a listening
// session, not a production step: it happens once, it wants a big list and a
// space bar, and it should not require the app to be running. The page is a
// single file next to the audio it plays.
//
// THE AUDIO IS CARRIED INSIDE THE PAGE, not linked beside it. The first version
// linked `takes/x.wav` relatively, which is correct and still played nothing:
// opened through a viewer that snapshots the file, or moved anywhere at all,
// every player showed 0:00. A page for listening that does not play is worth
// nothing, so each take is converted to a small mp3 and embedded. The page is a
// few MB and works from a desktop, a phone or a chat window.
import { readdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
const run = promisify(execFile);

const DIR = process.argv[2] ?? '../lms/sfx';
// `--only a,b` builds a page for a second round: the sounds still unchosen,
// without the thirty already settled scrolling past first.
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg === -1 ? null : process.argv[onlyArg + 1].split(',');
const takesDir = path.join(DIR, 'takes');
const files = (await readdir(takesDir)).filter(f => f.endsWith('.wav'))
  .filter(f => !ONLY || ONLY.includes(f.replace(/\.[^.]*\.wav$/, ''))).sort();

const tmp = await mkdtemp(path.join(tmpdir(), 'sfxpick-'));
const groups = new Map();
let bytes = 0;
for (const f of files) {
  const [name, take] = f.replace(/\.wav$/, '').split(/\.(?=[^.]*$)/);
  if (!groups.has(name)) groups.set(name, []);
  const note = await readFile(path.join(takesDir, `${name}.${take}.txt`), 'utf8').catch(() => '');
  // 64 kbps mono mp3: a fifth of the size of the wav and indistinguishable for
  // judging whether a clicker sounds like a clicker.
  const mp3 = path.join(tmp, `${name}.${take}.mp3`);
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-i', path.join(takesDir, f), '-ac', '1', '-b:a', '64k', mp3]);
  const data = await readFile(mp3);
  bytes += data.length;
  groups.get(name).push({
    take,
    file: `data:audio/mpeg;base64,${data.toString('base64')}`,
    note: note.split('\n').slice(0, 3).join(' · '),
  });
}

// How often each sound is used, so the ones worth the most attention are first.
const csv = await readFile(path.join(DIR, 'wanted.csv'), 'utf8');
const uses = new Map();
const prompts = new Map();
for (const line of csv.split(/\r?\n/).slice(1)) {
  const m = line.match(/^([a-z0-9-]+),("(?:[^"]*)"|[^,]*),([^,]*),(\d+)/i);
  if (m) { uses.set(m[1], Number(m[4])); prompts.set(m[1], m[2].replace(/^"|"$/g, '')); }
}
const names = [...groups.keys()].sort((a, b) => (uses.get(b) ?? 0) - (uses.get(a) ?? 0));

const rows = names.map(name => `
  <section>
    <h2>${name} <small>${uses.get(name) ?? '?'} uses</small></h2>
    <p class="want">${prompts.get(name) ?? ''}</p>
    ${groups.get(name).map((t, i) => `
    <label class="take">
      <input type="radio" name="${name}" value="${t.take}"${i === 0 ? ' checked' : ''}>
      <audio controls preload="metadata" src="${t.file}"></audio>
      <span class="src">${t.take} — ${t.note}</span>
    </label>`).join('')}
    <label class="take none"><input type="radio" name="${name}" value="none"> none of these are right</label>
  </section>`).join('');

const html = `<!doctype html><meta charset="utf-8"><title>Pick the sounds</title>
<style>
 body{font:15px/1.5 system-ui,sans-serif;margin:0 auto;padding:24px;max-width:900px;background:#14161a;color:#e8e8ea}
 h1{font-size:22px} h2{font-size:17px;margin:0 0 2px} small{font-weight:400;opacity:.6}
 section{border:1px solid #2a2e36;border-radius:10px;padding:14px 16px;margin:14px 0;background:#1a1d23}
 .want{margin:0 0 10px;opacity:.65;font-size:13px}
 .take{display:flex;align-items:center;gap:10px;padding:4px 0;flex-wrap:wrap}
 .src{font-size:12px;opacity:.6} .none{opacity:.7;font-size:13px}
 audio{height:32px}
 button{position:sticky;bottom:16px;font:600 15px system-ui;padding:12px 18px;border-radius:8px;border:0;background:#ff9a3c;color:#111;cursor:pointer}
 #out{width:100%;height:80px;margin-top:10px;background:#0e1013;color:#8fe38f;border:1px solid #2a2e36;border-radius:8px;padding:8px;font:12px ui-monospace,monospace}
</style>
<h1>Pick the sounds</h1>
<p>Play each one, click the take to keep, or "none of these". Then press the button and paste the line back into the chat.</p>
${rows}
<button onclick="copy()">Copy my picks</button>
<textarea id="out" readonly></textarea>
<script>
function copy(){
  const picks={};
  for(const el of document.querySelectorAll('input[type=radio]:checked')) picks[el.name]=el.value;
  const s=JSON.stringify(picks);
  document.getElementById('out').value=s;
  navigator.clipboard?.writeText(s);
}
</script>`;

const out = process.argv[3] ?? path.join(DIR, 'pick.html');
await writeFile(out, html);
await rm(tmp, { recursive: true, force: true });
console.log(`${out} — ${names.length} sounds, ${files.length} takes, `
  + `${(bytes / 1e6).toFixed(1)} MB of audio inside the page`);
