// Run: npm test   (Node 22.18+ strips the TypeScript types itself)
// A drawn character's own voice and main colour in a project (character creator phase 1, 6 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { voicedSpeaker, projectVoicePatch, characterVoicePatch, usesProjectVoice, voiceFromSpeaker, speakerFieldsOf } from "../../src/lib/narration/characterVoice.ts";
import { withCharacterColor, mainColorOf } from "../../src/store/characterColor.ts";
import { projectToDoc, docToProject } from "../../src/lib/project/projectFile.ts";

const jakeVoice = { engine: "gemini", voiceId: "Charon", model: "gemini-2.5-flash-live", pitch: -1, speed: 1.05 };
const speaker = (over = {}) => ({
  id: "s1", label: "Jake", x: 0.3, y: 0.6, size: 0.3, borderColor: "#ff9a3c",
  ttsEngine: "piper", voiceId: "C:/voices/old.onnx", pitch: 3, speed: 0.9,
  form: "drawn", character: { name: "Jake", look: "paper", signature: "#24365c", voice: jakeVoice },
  ...over,
});
const apply = (sp, patch) => ({ ...sp, ...patch });

test("a drawn character speaks with their own voice; the speaker's old voice fields are ignored", () => {
  const v = voicedSpeaker(speaker());
  assert.equal(v.ttsEngine, "gemini");
  assert.equal(v.geminiVoice, "Charon");
  assert.equal(v.geminiModel, "gemini-2.5-flash-live");
  assert.equal(v.voiceId, undefined, "the old Piper voice isn't used");
  assert.equal(v.pitch, -1);
  assert.equal(v.speed, 1.05);
  assert.equal(usesProjectVoice(speaker()), false);
});

test("no voice of their own (puppets, older projects): exactly as before", () => {
  const sp = speaker({ character: { name: "Jake", signature: "" } });
  assert.equal(voicedSpeaker(sp), sp);
  assert.equal(usesProjectVoice(sp), true);
  assert.deepEqual(projectVoicePatch(sp, { pitch: 2 }), { pitch: 2 }, "no override is needed");
  const puppet = { id: "p", label: "Maria", ttsEngine: "gemini", geminiVoice: "Kore" };
  assert.equal(voicedSpeaker(puppet), puppet);
});

test("changing the voice in a project: this project only, the character's voice untouched", () => {
  let sp = speaker();
  sp = apply(sp, projectVoicePatch(sp, { pitch: 4 }));
  assert.equal(sp.voiceOverride, true);
  const v = voicedSpeaker(sp);
  assert.equal(v.pitch, 4, "the change is heard");
  assert.equal(v.geminiVoice, "Charon", "everything else is still their voice");
  assert.equal(v.ttsEngine, "gemini");
  assert.deepEqual(sp.character.voice, jakeVoice, "the character's own voice is unchanged");
  // a second change doesn't copy the character's voice over the first
  sp = apply(sp, projectVoicePatch(sp, { geminiVoice: "Puck" }));
  assert.equal(voicedSpeaker(sp).pitch, 4);
  assert.equal(voicedSpeaker(sp).geminiVoice, "Puck");
  // and back
  sp = apply(sp, characterVoicePatch());
  assert.equal(voicedSpeaker(sp).pitch, -1);
  assert.equal(voicedSpeaker(sp).geminiVoice, "Charon");
  assert.deepEqual(sp.character.voice, jakeVoice);
});

test("the voice survives a project file save and open, override and all", () => {
  let sp = speaker();
  sp = apply(sp, projectVoicePatch(sp, { speed: 1.2 }));
  const back = docToProject(JSON.parse(JSON.stringify(projectToDoc({ speakers: [sp] }, "2026-11-06T00:00:00Z"))));
  assert.ok(back.ok);
  const s2 = back.project.speakers[0];
  assert.deepEqual(s2.character.voice, jakeVoice);
  assert.equal(s2.voiceOverride, true);
  assert.equal(voicedSpeaker(s2).speed, 1.2);
});

test("speaker voice <-> character voice, per engine", () => {
  assert.deepEqual(voiceFromSpeaker({ ttsEngine: "elevenlabs", elevenVoiceId: "abc", elevenModel: "eleven_v3", pitch: 1 }),
    { engine: "elevenlabs", voiceId: "abc", model: "eleven_v3", pitch: 1, speed: 1 });
  assert.equal(voiceFromSpeaker({ ttsEngine: "piper", voiceId: "x.onnx" }).voiceId, "x.onnx");
  const f = speakerFieldsOf({ engine: "piper", voiceId: "x.onnx", model: "", pitch: 0, speed: 1 });
  assert.equal(f.voiceId, "x.onnx");
  assert.equal(f.geminiVoice, undefined);
  const round = speakerFieldsOf(voiceFromSpeaker({ ttsEngine: "gemini", geminiVoice: "Kore", geminiModel: "m", pitch: 2, speed: 1.1 }));
  assert.equal(round.geminiVoice, "Kore");
  assert.equal(round.pitch, 2);
});

test("main colour: the speaker colour follows the character's main colour", () => {
  assert.equal(mainColorOf(speaker()), "#24365c");
  assert.equal(withCharacterColor(speaker()).borderColor, "#24365c");
  const none = speaker({ character: { name: "X", signature: "" } });
  assert.equal(withCharacterColor(none), none, "no main colour: their own colour stays");
  const puppet = { id: "p", borderColor: "#123456" };
  assert.equal(withCharacterColor(puppet), puppet);
  assert.equal(mainColorOf({ character: { signature: "navy" } }), null);
});
