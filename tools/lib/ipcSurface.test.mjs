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
