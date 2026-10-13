// "No click is naked" (Ak, 13 Oct 2026): every button, field, link and
// clickable thing in the app has hover help. See hoverHelp.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nakedControls, scanSource } from "./hoverHelp.mjs";

test("the scanner sees a bare button and a helped one", () => {
  const found = scanSource(`<div><button onClick={go}>Go</button><button data-tip="Starts it." onClick={go}>Go</button><div data-tip="All of it."><input /></div></div>`);
  assert.deepEqual(found.map((c) => c.covered), [false, true, true]);
});

test("every control in Video Forge has hover help", () => {
  const naked = nakedControls("src", { custom: ["HudButton", "Slider", "Toggle", "Picker", "NumberField", "Knob", "Tabs"], skipDirs: ["ui"] });
  assert.deepEqual(naked.map((c) => `${c.file}:${c.line} <${c.tag}> ${c.text}`), []);
});
