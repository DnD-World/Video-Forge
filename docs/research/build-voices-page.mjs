// Builds voices-listen.html: voices.html with the audio and waveform shapes
// packed inside, so it plays from any folder or attachment.
// Run from this folder: node build-voices-page.mjs   (needs ffmpeg on PATH)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
let html = fs.readFileSync("voices.html", "utf8");
const peaks = {};
// Keyed by sample id, not file name: the file names get replaced by the audio itself below.
for (const [, id, file] of html.matchAll(/id: "(\w+)", file: "(tts-samples\/[^"]+)"/g)) {
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const n = pcm.length / 2, N = 56, out = [];
  for (let i = 0; i < N; i++) { let m = 0; for (let j = Math.floor(i * n / N); j < Math.floor((i + 1) * n / N); j++) m = Math.max(m, Math.abs(pcm.readInt16LE(j * 2))); out.push(+(m / 32768).toFixed(2)); }
  const top = Math.max(...out) || 1; peaks[id] = out.map(v => +(v / top).toFixed(2));
}
html = html.replace("/*PEAKS*/{}", JSON.stringify(peaks));
html = html.replace(/"(tts-samples\/[^"]+\.(wav|mp3))"/g, (m, f, ext) =>
  JSON.stringify(`data:audio/${ext === "mp3" ? "mpeg" : "wav"};base64,` + fs.readFileSync(f).toString("base64")));
fs.writeFileSync("voices-listen.html", html);
console.log("voices-listen.html", (html.length / 1e6).toFixed(2), "MB");
