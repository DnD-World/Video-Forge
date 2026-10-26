// Run: npm test
// Guards on what the app window is allowed to ask main for.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("the window cannot ask for a saved key in plain text", () => {
  for (const f of ["electron/main.ts", "electron/preload.ts", "src/global.d.ts"]) {
    const text = read(f).replace(/\/\/.*$/gm, "");
    assert.ok(!/keys:get/.test(text), `${f} still mentions keys:get`);
  }
  // and nothing in the screen code calls it
  assert.ok(!/byok\.keys\.get\b/.test(read("src/components/settings/BackendPanel.tsx")));
});

test("engines never get a way to update themselves or phone home", () => {
  const env = read("electron/net/childEnv.ts");
  assert.match(env, /HYPERFRAMES_NO_UPDATE_CHECK: "1"/);
  assert.match(env, /HYPERFRAMES_NO_AUTO_INSTALL: "1"/);
  // the render tool is started with childEnv, not a hand-built environment
  const hf = read("electron/render/hyperframes/renderHyperframes.ts");
  assert.match(hf, /env: childEnv\(/);
});

test("Piper voice servers are told to listen on this computer only", () => {
  assert.match(read("electron/tts/piperEngine.ts"), /"--host", "127\.0\.0\.1"/);
});

test("paid ElevenLabs lines are gated before the first is bought, and kept as they arrive", () => {
  const nar = read("electron/tts/buildNarration.ts");
  const gate = nar.indexOf("paidGate(opts.paid");
  const buy = nar.indexOf("elevenlabs.synthesize(");
  assert.ok(gate > 0 && buy > gate, "the gate must come before the first purchase");
  assert.match(nar, /savePaidLine\(/);
  // every caller of buildNarration says who is paying
  assert.match(read("electron/main.ts"), /buildNarration\(segments, speakerOrder, pauses, outputDir\(\), \{ paid: policy \}\)/);
  assert.match(read("electron/tts/twinNarration.ts"), /\{ paid \}/);
  assert.match(read("electron/batch/runJob.ts"), /mode: "unattended", allowUnattended: job\.allowPaidVoices === true/);
  assert.match(read("electron/batch/manyVideos.ts"), /allowUnattended: req\.paid\?\.allow === true/);
  // batches are off by default
  assert.match(read("src/store/useSettingsStore.ts"), /paidInBatch: false/);
});

test("the window is sandboxed, has a content policy, and cannot wander off the app's page", () => {
  const main = read("electron/main.ts");
  assert.match(main, /sandbox: true/);
  assert.match(main, /preload\.cjs/);
  assert.match(main, /will-navigate/);
  assert.match(main, /setPermissionRequestHandler/);
  assert.ok(!/shell\.openExternal\(url\)/.test(main), "openExternal must only get checked web addresses");
  const cfg = read("electron.vite.config.ts");
  assert.match(cfg, /Content-Security-Policy/);
  assert.match(cfg, /\[name\]\.cjs/);
  assert.match(cfg, /script-src 'self'/);
});

test("every IPC handler that takes a path or program from the window checks it first", () => {
  const main = read("electron/main.ts");
  // read/write handlers go through the path check
  assert.match(main, /readFile\(guard\(\)\.assertRead\(filePath\)\)/);
  assert.match(main, /writeFile\(guard\(\)\.assertWrite\(filePath\)/);
  assert.ok(!/fsp\.readFile\(filePath\)/.test(main), "a handler still reads a raw window path");
  assert.ok(!/fsp\.readFile\(source\.file/.test(main));
  // downloads are validated
  assert.match(main, /safeMediaId\(id\)/);
  assert.match(main, /safeMediaUrl\(url\)/);
  // dialogs are where permission is given
  assert.match(main, /guard\(\)\.grantRead\(/);
  assert.match(main, /guard\(\)\.grantWrite\(/);
  // the explainer and character handlers too
  assert.match(read("electron/explainer/explainerIpc.ts"), /guard\(\)\.assertWrite\(out\)/);
  assert.match(read("electron/explainer/explainerIpc.ts"), /guard\(\)\.assertRead\(htmlPath\)/);
  assert.match(read("electron/characters/characterIpc.ts"), /guard\(\)\.assertRead\(req\.file\)/);
});
