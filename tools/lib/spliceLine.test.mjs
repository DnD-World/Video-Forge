// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
// Re-making one line: the splice and the new timings, on synthetic WAVs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spliceWav, retimeSegments } from "../../electron/audio/spliceLine.ts";

/** A mono 16-bit WAV of `ms` of a constant value `v`. */
function wav(ms, v, rate = 8000, ch = 1) {
  const frames = Math.round((ms / 1000) * rate);
  const data = Buffer.alloc(frames * ch * 2);
  for (let i = 0; i < frames * ch; i++) data.writeInt16LE(v, i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(ch, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * ch * 2, 28);
  h.writeUInt16LE(ch * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
const pcm = (b) => b.subarray(44);
const ms = (b) => ((b.length - 44) / 2 / 8000) * 1000;
const valueAt = (b, atMs) => b.readInt16LE(44 + Math.round((atMs / 1000) * 8000) * 2);

// line 0: 0-1000 (value 100) | gap 250 (0) | line 1: 1250-3250 (200) | gap 250 | line 2: 3500-4000 (300)
const file = Buffer.concat([wav(1000, 100), wav(250, 0), wav(2000, 200), wav(250, 0), wav(500, 300)].map((w, i) => (i === 0 ? w : pcm(w))));
const fixHeader = (b) => { b.writeUInt32LE(b.length - 8, 4); b.writeUInt32LE(b.length - 44, 40); return b; };
fixHeader(file);
const segs = [
  { startMs: 0, endMs: 1000, text: "a", words: [{ text: "a", startMs: 0, endMs: 1000 }] },
  { startMs: 1250, endMs: 3250, text: "b", words: [{ text: "b", startMs: 1250, endMs: 3250 }] },
  { startMs: 3500, endMs: 4000, text: "c", words: [{ text: "c", startMs: 3500, endMs: 4000 }] },
];

test("a longer middle line pushes the later line later, and nothing else moves", () => {
  const r = spliceWav(file, 1250, 3250, wav(3000, 77));
  assert.equal(ms(r.buffer), 5000);
  assert.equal(Math.round(r.newDurationMs), 3000);
  assert.equal(Math.round(r.deltaMs), 1000);
  const t = retimeSegments(segs, 1, r.newDurationMs, {}, r.deltaMs);
  assert.deepEqual(t.map((s) => [s.startMs, s.endMs]), [[0, 1000], [1250, 4250], [4500, 5000]]);
  // the audio under the new timings is the right audio
  assert.equal(valueAt(r.buffer, 500), 100);
  assert.equal(valueAt(r.buffer, 1500), 77);
  assert.equal(valueAt(r.buffer, 4000), 77);
  assert.equal(valueAt(r.buffer, 4400), 0);
  assert.equal(valueAt(r.buffer, 4750), 300);
});

test("a shorter line pulls the later lines earlier", () => {
  const r = spliceWav(file, 1250, 3250, wav(500, 55));
  assert.equal(ms(r.buffer), 2500);
  const t = retimeSegments(segs, 1, r.newDurationMs, {}, r.deltaMs);
  assert.deepEqual(t.map((s) => [Math.round(s.startMs), Math.round(s.endMs)]), [[0, 1000], [1250, 1750], [2000, 2500]]);
  assert.equal(valueAt(r.buffer, 2250), 300);
});

test("the first and the last line can be remade", () => {
  const first = spliceWav(file, 0, 1000, wav(400, 9));
  assert.equal(ms(first.buffer), 3400);
  assert.equal(valueAt(first.buffer, 100), 9);
  assert.equal(valueAt(first.buffer, 500), 0); // the gap after it is untouched
  assert.deepEqual(
    retimeSegments(segs, 0, first.newDurationMs, {}, first.deltaMs).map((s) => [Math.round(s.startMs), Math.round(s.endMs)]),
    [[0, 400], [650, 2650], [2900, 3400]]
  );
  const last = spliceWav(file, 3500, 4000, wav(800, 8));
  assert.equal(ms(last.buffer), 4300);
  assert.deepEqual(retimeSegments(segs, 2, last.newDurationMs, {}, last.deltaMs).map((s) => [Math.round(s.startMs), Math.round(s.endMs)]), [[0, 1000], [1250, 3250], [3500, 4300]]);
});

test("words of the remade line are dropped, later words move with their line", () => {
  const t = retimeSegments(segs, 1, 3000, { text: "new" });
  assert.equal(t[1].words, undefined);
  assert.equal(t[1].text, "new");
  assert.deepEqual(t[2].words, [{ text: "c", startMs: 4500, endMs: 5000 }]);
  assert.deepEqual(t[0].words, segs[0].words); // earlier lines are the very same objects
});

test("a line in another voice format is brought to the file's format", () => {
  // 16 kHz stereo line into an 8 kHz mono narration: same length in time
  const r = spliceWav(file, 1250, 3250, wav(2000, 40, 16000, 2));
  assert.equal(Math.round(ms(r.buffer)), 4000);
  assert.equal(valueAt(r.buffer, 2000), 40);
});

test("the original is not changed, and nonsense is refused", () => {
  const before = Buffer.from(file);
  spliceWav(file, 1250, 3250, wav(100, 1));
  assert.ok(file.equals(before));
  assert.throws(() => spliceWav(file, 0, 10, Buffer.from("nope")), /not a WAV/);
  assert.throws(() => spliceWav(file, 0, 10, wav(0, 0)), /empty/);
  assert.throws(() => retimeSegments(segs, 5, 100), /no such line/);
});
