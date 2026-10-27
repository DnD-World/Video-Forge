// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import { projectToDoc, docToProject, PROJECT_VERSION } from "../../src/lib/project/projectFile.ts";

// A project with every kind of thing in it — including the ones the old file dropped.
const state = () => ({
  render: { format: "9:16", width: 1080, height: 1920, durationSec: 30 },
  fps: 30,
  speakers: [{ id: "a", label: "Maria", x: 0.5, y: 0.3, size: 0.4 }],
  script: "Maria: Γεια σου",
  language: "el",
  musicWaveform: { style: "wave" },
  musicColor: "#76ffc2",
  subtitles: { enabled: true, maxChars: 40 },
  pauseSameMs: 200,
  pauseTurnMs: 450,
  visemeFadeMs: 130,
  idleMotion: 0.5,
  cards: { intro: { filePath: "C:/clips/intro.mp4" }, outro: null },
  logo: { filePath: "C:/art/logo.png", scale: 0.2 },
  backgrounds: [{ id: "b1", startMs: 0, endMs: 5000, filePath: "C:/media/pexels-1.mp4" }],
  backgroundDim: 0.4,
  backgroundBlur: 6,
  backgroundColorLook: "warm",
  backgroundCrossfadeMs: 500,
  music: { filePath: "C:/music/loop.wav", analysis: { hz: 30, amp: new Array(100000).fill(1) } },
  musicVolume: 0.3,
  musicDuck: 0.6,
  sfx: [{ id: "s1", filePath: "C:/sfx/bark.wav", startMs: 1200, volume: 0.8 }],
  attachedAudio: { filePath: "C:/audio/extra.wav", analysis: { hz: 30, amp: [1] } },
  narration: { filePath: "C:/out/narration.wav", segments: [{ speakerId: "a", text: "Γεια", startMs: 0, endMs: 900 }], analysis: { hz: 30, amp: [1, 2] } },
});

test("saving then opening gives back music, SFX, backgrounds, logo, cards and attached audio", () => {
  const s = state();
  const doc = projectToDoc(s, 1234);
  const opened = docToProject(JSON.parse(JSON.stringify(doc)));
  assert.equal(opened.ok, true);
  const p = opened.project;
  assert.deepEqual(p.music, { filePath: "C:/music/loop.wav", analysis: null });
  assert.deepEqual(p.attachedAudio, { filePath: "C:/audio/extra.wav", analysis: null });
  assert.deepEqual(p.sfx, s.sfx);
  assert.deepEqual(p.backgrounds, s.backgrounds);
  assert.deepEqual(p.logo, s.logo);
  assert.deepEqual(p.cards, s.cards);
  assert.equal(p.musicVolume, 0.3);
  assert.equal(p.musicDuck, 0.6);
  assert.equal(p.backgroundDim, 0.4);
  assert.equal(p.backgroundBlur, 6);
  assert.equal(p.backgroundColorLook, "warm");
  assert.equal(p.backgroundCrossfadeMs, 500);
  assert.equal(p.idleMotion, 0.5);
  // and what the old file already had
  assert.deepEqual(p.speakers, s.speakers);
  assert.equal(p.script, s.script);
  assert.deepEqual(p.subtitles, s.subtitles);
  assert.equal(p.narration.filePath, "C:/out/narration.wav");
  assert.deepEqual(p.narration.segments, s.narration.segments);
});

test("the heavy audio analysis never goes into the file", () => {
  const text = JSON.stringify(projectToDoc(state()));
  assert.ok(text.length < 5000, `file is ${text.length} bytes`);
  const doc = projectToDoc(state());
  assert.equal(doc.project.narration.analysis, null);
  assert.equal(doc.project.music.analysis, null);
  assert.equal(doc.project.attachedAudio.analysis, null);
  assert.equal(doc.version, PROJECT_VERSION);
});

test("an old version-1 project file still opens; what it never knew stays at the defaults", () => {
  const v1 = {
    kind: "byok-project",
    version: 1,
    savedAt: 1,
    project: {
      render: state().render, fps: 30, speakers: state().speakers,
      musicWaveform: { style: "wave" }, musicColor: "#fff",
      subtitles: { enabled: true }, script: "x", language: "el",
      pauseSameMs: 100, pauseTurnMs: 300, visemeFadeMs: 130,
      narration: { filePath: "C:/out/n.wav", segments: [], analysis: null },
    },
  };
  const opened = docToProject(v1);
  assert.equal(opened.ok, true);
  assert.equal(opened.version, 1);
  assert.equal(opened.project.script, "x");
  assert.equal("sfx" in opened.project, false, "not invented: the app's default applies");
  assert.equal(opened.project.music, null);
  assert.equal(opened.project.attachedAudio, null);
});

test("a file with no version number is read as version 1", () => {
  const opened = docToProject({ kind: "byok-project", project: { script: "hi" } });
  assert.equal(opened.ok, true);
  assert.equal(opened.version, 1);
});

test("a project from a newer Video Forge is refused with a plain message", () => {
  const opened = docToProject({ kind: "byok-project", version: PROJECT_VERSION + 1, project: { script: "hi" } });
  assert.equal(opened.ok, false);
  assert.match(opened.message, /newer Video Forge/);
});

test("something that is not a project is refused", () => {
  for (const bad of [null, 5, "x", {}, { kind: "preset" }, { kind: "byok-project" }, { kind: "byok-project", project: 3 }]) {
    assert.equal(docToProject(bad).ok, false, JSON.stringify(bad));
  }
});

test("unknown fields in a file are ignored, not loaded into the app", () => {
  const opened = docToProject({ kind: "byok-project", version: 2, project: { script: "ok", __proto__x: 1, evil: { a: 1 }, isAdmin: true } });
  assert.equal(opened.ok, true);
  assert.deepEqual(Object.keys(opened.project).sort(), ["attachedAudio", "music", "narration", "script"]);
});
