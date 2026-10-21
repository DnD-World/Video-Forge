import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { FORMATS, EXPLAINER_SPOTS, contentBox, explainerSpots, holesFor, rectHitsHole, unitFor } from "./core/frame.mjs";
import { resolveSpec, validateSpec } from "./core/spec.mjs";
import { contrast, seeded, win } from "./core/math.mjs";
import { SCHEMES } from "./kits/stravelakis.mjs";

const sample = JSON.parse(fs.readFileSync(new URL("./samples/how-it-works.json", import.meta.url)));

test("the sample scene list is valid", () => {
  assert.deepEqual(validateSpec(sample), []);
});

test("validation explains what is wrong", () => {
  const bad = { format: "3:2", scenes: [{ kind: "title" }, { kind: "points", at: 0.5, items: [] }, { kind: "nope", at: 9 }] };
  const errs = validateSpec(bad);
  assert.ok(errs.some((e) => e.includes("format")));
  assert.ok(errs.some((e) => e.includes('missing "text"')));
  assert.ok(errs.some((e) => e.includes("at least 1.6 s")));
  assert.ok(errs.some((e) => e.includes("needs 1–4 items")));
  assert.ok(errs.some((e) => e.includes("kind must be")));
});

test("word anchors become seconds", () => {
  const spec = { format: "1:1", words: [{ text: "a", start: 0, end: 0.3 }, { text: "b", start: 2.5, end: 2.9 }], scenes: [{ kind: "title", at: 0, text: "Hi" }, { kind: "takeaway", at: { word: 1 }, text: "Bye" }] };
  assert.deepEqual(validateSpec(spec), []);
  const R = resolveSpec(spec);
  assert.equal(R.scenes[1].start, 2.5);
  assert.ok(R.duration >= 2.9);
  assert.ok(validateSpec({ ...spec, scenes: [spec.scenes[0], { ...spec.scenes[1], at: { word: 7 } }] }).some((e) => e.includes("word 7")));
});

test("items without times are spread inside their scene", () => {
  const R = resolveSpec(sample);
  const pts = R.scenes.find((s) => s.kind === "points");
  for (const it of pts.items) assert.ok(it.at > pts.start && it.at < pts.end);
  assert.ok(pts.items[0].at < pts.items[1].at && pts.items[1].at < pts.items[2].at);
});

test("puppet spots use Video Forge's own geometry (size is a share of the width)", () => {
  const [h] = holesFor([{ x: 0.5, y: 0.5, size: 0.2 }], 1920, 1080, "circle", 0);
  assert.equal(h.w, 384);
  assert.equal(h.cx, 960);
  assert.equal(h.cy, 540);
});

test("in every shape and cast size the spots stay inside the frame and leave a usable content box", () => {
  for (const [fmt, { width: W, height: H }] of Object.entries(FORMATS)) {
    for (const n of [1, 2, 3]) {
      const holes = holesFor(explainerSpots(fmt, n), W, H);
      for (const h of holes) {
        assert.ok(h.box.x >= 0 && h.box.y >= 0 && h.box.x + h.box.w <= W + 1 && h.box.y + h.box.h <= H + 1, `${fmt}/${n} spot leaves the frame`);
      }
      const box = contentBox(W, H, holes);
      for (const h of holes) assert.equal(rectHitsHole(box, h), false, `${fmt}/${n} content box touches a spot`);
      // at least 45% of the frame stays for the story
      assert.ok((box.w * box.h) / (W * H) > 0.45, `${fmt}/${n} content box is only ${Math.round((100 * box.w * box.h) / (W * H))}%`);
      // and no spots overlap each other
      for (let i = 0; i < holes.length; i++) for (let j = i + 1; j < holes.length; j++) {
        const a = holes[i], b = holes[j];
        assert.ok(Math.hypot(a.cx - b.cx, a.cy - b.cy) >= (a.w + b.w) / 2 - 1, `${fmt}/${n} spots ${i} and ${j} overlap`);
      }
    }
  }
  assert.deepEqual(Object.keys(EXPLAINER_SPOTS).sort(), Object.keys(FORMATS).sort());
});

test("the rule unit follows the short side", () => {
  assert.equal(unitFor(1920, 1080), 1.5);
  assert.equal(unitFor(1080, 1920), 1.5);
});

test("seeded randomness repeats exactly", () => {
  const a = seeded("x"), b = seeded("x");
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.equal(win(5, 4, 6), 0.5);
});

test("every brand scheme keeps text readable (contrast ≥ 4.5 for body text)", () => {
  for (const [name, S] of Object.entries(SCHEMES)) {
    assert.ok(contrast(S.text, S.bg0) >= 4.5, `${name}: text on background`);
    assert.ok(contrast(S.text, S.card) >= 4.5, `${name}: text on cards`);
    assert.ok(contrast(S.accentInk, S.accent) >= 4.5, `${name}: ink on accent`);
    assert.ok(contrast(S.text, S.muted) >= 4.5, `${name}: text on muted pills`);
    assert.ok(contrast(S.line, S.bg0) >= 4.5, `${name}: accent text on background`);
    assert.ok(contrast(S.line, S.card) >= 3, `${name}: big numbers on cards`);
  }
});

test("captions break on length and sentence ends; SRT and VTT stamps are right", async () => {
  const { captionCues, toSrt, toVtt } = await import("./core/exports.mjs");
  const words = "Short sessions work. Five minutes is enough for a puppy to stay focused on you".split(" ").map((w, i) => ({ text: w, start: i * 0.4, end: i * 0.4 + 0.35 }));
  const cues = captionCues(words);
  assert.equal(cues[0].text, "Short sessions work.");
  for (const c of cues) assert.ok(c.text.length <= 42 && c.end - c.start <= 3.5 + 0.4);
  assert.match(toSrt(cues), /^1\n00:00:00,000 --> 00:00:01,150\nShort sessions work\.\n/);
  assert.match(toVtt(cues), /^WEBVTT\n\n00:00:00\.000 --> 00:00:01\.150\n/);
});

test("chapters follow YouTube's rules", async () => {
  const { chapters } = await import("./core/exports.mjs");
  const R = resolveSpec(sample);
  const ch = chapters(sample, R).split("\n");
  assert.ok(ch[0].startsWith("00:00 "));
  assert.ok(ch.length >= 3);
  const secs = ch.map((l) => +l.slice(0, 2) * 60 + +l.slice(3, 5));
  for (let i = 1; i < secs.length; i++) assert.ok(secs[i] - secs[i - 1] >= 10);
});

test("custom colours always come out readable", async () => {
  const { customScheme } = await import("./kits/stravelakis.mjs");
  const r = seeded("colours");
  const hex = () => "#" + [0, 0, 0].map(() => Math.floor(r() * 256).toString(16).padStart(2, "0")).join("");
  for (let i = 0; i < 200; i++) {
    const S = customScheme({ background: hex(), accent: hex() });
    assert.ok(contrast(S.text, S.bg0) >= 4.5, `text on ${S.bg0}`);
    assert.ok(contrast(S.text, S.card) >= 4.5, `text on card ${S.card}`);
    assert.ok(contrast(S.text, S.muted) >= 4.5, `text on muted ${S.muted}`);
    assert.ok(contrast(S.line, S.bg0) >= 4.5, `accent text ${S.line} on ${S.bg0}`);
    assert.ok(contrast(S.accentInk, S.accent) >= 3, `ink on accent ${S.accent}`);
  }
});

test("font, colours and tint are validated", () => {
  const ok = { ...sample, font: "Inter", colors: { background: "#112233", accent: "#ffcc00" }, tint: "sepia" };
  assert.deepEqual(validateSpec(ok), []);
  assert.ok(validateSpec({ ...sample, colors: { background: "blue" } }).some((e) => e.includes("colors")));
  assert.ok(validateSpec({ ...sample, tint: "purple" }).some((e) => e.includes("tint")));
});

test("the scene-list prompt keeps the script's language", async () => {
  const { sceneListPrompt, scriptLanguage } = await import("./core/prompts.mjs");
  assert.equal(scriptLanguage("Γιατί η σκυλίτσα μου πετάγεται;"), "Greek");
  assert.equal(scriptLanguage("Why does my dog wake up?"), null);
  const p = sceneListPrompt({ script: "Γιατί η σκυλίτσα μου πετάγεται;", format: "9:16" });
  assert.match(p.system, /SAME LANGUAGE as the script \(Greek\)/);
  assert.match(p.user, /On-screen language: Greek/);
});

test("an atlas prompt is read, and the user's content replaces the example", async () => {
  const { parseAtlasPrompt, rebuildPrompt, extractHtml, extractJson } = await import("./core/prompts.mjs");
  const fake = 'I want an animated explainer made in the "Test Look" visual style.\nMY CONTENT:\nwhat is a table?\n\nWHAT TO BUILD\n- stuff\n<link href="https://fonts.googleapis.com/css2?family=Caveat&display=block">\nLoad these Google Fonts before the first draw: Caveat\nSTYLE CARD\nName: Test Look\nFamily: Hand-Drawn\nLook: pencil\nMotion: draws\nHow it explains: sketches\nREFERENCE STYLE SOURCE\n```js\n//\n```';
  const st = parseAtlasPrompt(fake);
  assert.equal(st.name, "Test Look");
  assert.equal(st.family, "Hand-Drawn");
  assert.deepEqual(st.fontFamilies, ["Caveat"]);
  const p = rebuildPrompt(st, { content: "Why short sessions work", format: "4:5", holes: [{ shape: "circle", cx: 540, cy: 1100, w: 300 }] });
  assert.match(p, /MY CONTENT:\nWhy short sessions work\n/);
  assert.doesNotMatch(p, /what is a table/);
  assert.match(p, /Canvas: 1080x1350/);
  assert.match(p, /COMPLETELY EMPTY/);
  assert.throws(() => parseAtlasPrompt("hello"), /doesn't look like/);
  assert.equal(extractHtml("text\n```html\n<!doctype html><html><canvas></canvas></html>\n```"), "<!doctype html><html><canvas></canvas></html>");
  assert.deepEqual(extractJson('Sure!\n```json\n{"a":1}\n```'), { a: 1 });
});
