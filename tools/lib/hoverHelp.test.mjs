// "No click is naked" (Ak, 13 Oct 2026) and "plain words + ELI5 on everything"
// (plan item 17): every button, field, label, status, badge and number in the
// app has hover help, and the help is short and in plain words.
// See hoverHelp.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { nakedControls, scanSource, sentenceCount, visibleStrings } from "./hoverHelp.mjs";

const CUSTOM = ["HudButton", "Slider", "Toggle", "Picker", "NumberField", "Knob", "Tabs"];

// The allow-list: files whose text is the VIDEO ITSELF (the preview picture and
// what is drawn into the render), not controls or labels around it. Nothing
// else is skipped. Add to this list only for a picture, never for a screen.
const PICTURE_FILES = [
  "BackgroundScene.tsx", "PuppetAvatar.tsx", "SpeakerAvatar.tsx", "CharacterAvatar.tsx",
  "SubtitleScene.tsx", "WaveformScene.tsx", "LiveFace.tsx", "GlassPanel.tsx",
];

test("the scanner sees a bare button and a helped one", () => {
  const found = scanSource(`<div><button onClick={go}>Go</button><button data-tip="Starts it." onClick={go}>Go</button><div data-tip="All of it."><input /></div></div>`);
  assert.deepEqual(found.map((c) => c.covered), [false, true, true]);
});

test("the text check sees a bare label, a helped one, and lets a full sentence explain itself", () => {
  const src = `<div><span>Volume</span><span data-tip="How loud it is.">Volume</span><p>This sentence has plenty of words so it explains itself.</p><span>{count}</span></div>`;
  const found = scanSource(src, { texts: true }).filter((c) => c.kind === "text");
  assert.deepEqual(found.map((c) => [c.text, c.covered]), [["Volume", false], ["Volume", true], ["{count}", false]]);
});

test("every control in Video Forge has hover help", () => {
  const naked = nakedControls("src", { custom: CUSTOM, skipDirs: ["ui"] });
  assert.deepEqual(naked.map((c) => `${c.file}:${c.line} <${c.tag}> ${c.text}`), []);
});

test("every label, status, badge and number in Video Forge has hover help", () => {
  const naked = nakedControls("src", { custom: CUSTOM, texts: true, skipFiles: PICTURE_FILES });
  assert.deepEqual(naked.map((c) => `${c.file}:${c.line} <${c.tag}> ${c.text}`), []);
});

test("every hover help is at most two short sentences", () => {
  const long = visibleStrings("src")
    .filter((s) => s.kind === "tip")
    .filter((s) => sentenceCount(s.text) > 2 || s.text.length > 230)
    .map((s) => `${s.file}: ${s.text}`);
  assert.deepEqual(long, []);
});

test("screen words use plain words, not forge slang", () => {
  const BAD = /\b(TTS|BYOK|pipeline|XTTS\S*|visemes?|keychain|latent|payload|endpoint|inference|IPC|duck(ed|ing|s)?|crossfade[sd]?|loopable|waveforms?|backend)\b/i;
  const slang = visibleStrings("src")
    .filter((s) => s.kind === "tip" || !/[,:]/.test(s.text))
    .filter((s) => BAD.test(s.text))
    .map((s) => `${s.file}: ${s.text.slice(0, 90)}`);
  assert.deepEqual(slang, []);
});

test("every AI provider the app can use has a key box in Settings", () => {
  const providers = fs.readFileSync("tools/lib/explainerLlm.mjs", "utf8");
  const wanted = [...providers.matchAll(/^\s{2}(\w+): \{ label:/gm)].map((m) => m[1]);
  assert.ok(wanted.length >= 7, "found the provider list");
  const panel = fs.readFileSync("src/components/settings/BackendPanel.tsx", "utf8");
  const missing = wanted.filter((id) => !new RegExp(`id: "${id}"`).test(panel));
  assert.deepEqual(missing, []);
});
