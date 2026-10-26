// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { paidGate, estimateUsd, describePaid, elevenLineKey, readPaidLine, savePaidLine } from "../../electron/tts/paidVoice.ts";

test("cost: characters times the price per thousand", () => {
  assert.equal(estimateUsd(4640, 0.3), 1.39);
  assert.equal(estimateUsd(0, 0.3), 0);
  assert.equal(estimateUsd(334080, 0.3), 100.22);
});

test("nothing to buy needs no permission", () => {
  assert.deepEqual(paidGate(undefined, 0), { ok: true });
  assert.deepEqual(paidGate({ mode: "unattended" }, 0), { ok: true });
});

test("no policy at all means no spending", () => {
  const g = paidGate(undefined, 100);
  assert.equal(g.ok, false);
  assert.match(g.message, /nobody has said yes/);
});

test("at the window, the yes covers exactly the characters shown", () => {
  assert.equal(paidGate({ mode: "attended", approvedChars: 1000 }, 1000).ok, true);
  assert.equal(paidGate({ mode: "attended", approvedChars: 1000 }, 800).ok, true);
  const grew = paidGate({ mode: "attended", approvedChars: 1000 }, 1001);
  assert.equal(grew.ok, false);
  assert.match(grew.message, /said yes to 1,000 .* needs 1,001/);
  assert.equal(paidGate({ mode: "attended" }, 5).ok, false, "no answer is not a yes");
});

test("a batch nobody watches buys nothing unless paid voices are switched on", () => {
  const off = paidGate({ mode: "unattended", allowUnattended: false }, 10);
  assert.equal(off.ok, false);
  assert.match(off.message, /switched off for batches/);
  assert.equal(paidGate({ mode: "unattended" }, 10).ok, false, "off is the default");
  assert.equal(paidGate({ mode: "unattended", allowUnattended: true }, 10).ok, true);
});

test("the cap counts the whole batch, not each video", () => {
  const spent = { chars: 0 };
  const p = { mode: "unattended", allowUnattended: true, maxChars: 1000, spent };
  assert.equal(paidGate(p, 600).ok, true);
  spent.chars += 600; // video 1 bought 600
  const second = paidGate(p, 600);
  assert.equal(second.ok, false);
  assert.match(second.message, /cap is 1,000 characters and 600 are already used/);
  assert.equal(paidGate(p, 400).ok, true);
  assert.equal(paidGate({ ...p, maxChars: 0 }, 99999).ok, true, "0 means no cap");
});

test("the question tells the characters, the money and what is free", () => {
  const t = describePaid({ lines: 3, chars: 4640, reusedLines: 2 }, 0.3);
  assert.match(t, /3 lines to buy/);
  assert.match(t, /4,640 characters/);
  assert.match(t, /about 1\.39 USD/);
  assert.match(t, /2 lines bought earlier will be reused for free/);
  assert.match(describePaid({ lines: 1, chars: 5000, reusedLines: 0 }, 0.3, 1000), /over your cap of 1,000/);
});

test("a bought line has one key per words + voice + model + settings", () => {
  const base = { text: "Γεια σου", voiceId: "v1", model: "eleven_v3", stability: 0.5 };
  assert.equal(elevenLineKey(base), elevenLineKey({ ...base }));
  assert.notEqual(elevenLineKey(base), elevenLineKey({ ...base, text: "Γεια σας" }));
  assert.notEqual(elevenLineKey(base), elevenLineKey({ ...base, voiceId: "v2" }));
  assert.notEqual(elevenLineKey(base), elevenLineKey({ ...base, model: "eleven_multilingual_v2" }));
  assert.notEqual(elevenLineKey(base), elevenLineKey({ ...base, stability: 1 }));
});

test("bought lines are kept as they arrive: a retry after a failure buys only the rest", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vf-paid-"));
  const lines = Array.from({ length: 50 }, (_, i) => ({ text: `line ${i + 1}`, voiceId: "v", model: "eleven_v3" }));
  const audio = (i) => Buffer.alloc(100 + i, i + 1);

  // First try: lines 1–39 arrive and are saved, line 40 fails.
  let bought = 0;
  const tryRun = (failAt) => {
    for (const [i, l] of lines.entries()) {
      const key = elevenLineKey(l);
      if (readPaidLine(dir, key)) continue; // free
      if (i === failAt) throw new Error("rate limit");
      bought++;
      savePaidLine(dir, key, audio(i));
    }
  };
  assert.throws(() => tryRun(39), /rate limit/);
  assert.equal(bought, 39);

  // Retry: only the 11 missing lines are bought.
  tryRun(-1);
  assert.equal(bought, 50);
  // and the first line's bytes are the ones that were saved
  assert.deepEqual(readPaidLine(dir, elevenLineKey(lines[0])), audio(0));
});

test("a half-written file is never read back as a bought line", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vf-paid-"));
  const key = elevenLineKey({ text: "x", voiceId: "v", model: "m" });
  fs.writeFileSync(path.join(dir, `${key}.wav`), Buffer.alloc(10)); // too small to be a WAV
  assert.equal(readPaidLine(dir, key), null);
  savePaidLine(dir, key, Buffer.alloc(200, 7));
  assert.equal(readPaidLine(dir, key).length, 200);
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp")), [], "no temp file is left behind");
});
