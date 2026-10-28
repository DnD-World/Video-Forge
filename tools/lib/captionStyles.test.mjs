// Run: npm test. One-click caption styles (28 Oct 2026, batch 3 item 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPTION_STYLES } from "../../src/lib/subtitles/captionStyles.ts";

const fontsSrc = readFileSync(new URL("../../electron/net/fonts.ts", import.meta.url), "utf8");

test("no more than three signature styles (Ak), every id unique, every style has hover help", () => {
  assert.ok(CAPTION_STYLES.filter((s) => s.signature).length <= 3);
  assert.equal(new Set(CAPTION_STYLES.map((s) => s.id)).size, CAPTION_STYLES.length);
  for (const s of CAPTION_STYLES) assert.ok(s.tip.length > 20, s.id);
});

test("every style's font is on the curated list, with Greek and that weight", () => {
  for (const s of CAPTION_STYLES) {
    if (!s.font) continue;
    const line = fontsSrc.split("\n").find((l) => l.includes(`family: "${s.font.family}"`));
    assert.ok(line, `${s.id}: ${s.font.family} not on the list`);
    assert.match(line, /greek: true/, s.id);
    assert.ok(line.includes(String(s.font.weight)), `${s.id}: weight ${s.font.weight}`);
  }
});
