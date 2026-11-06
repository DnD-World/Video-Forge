// Data checks (5 Nov 2026): the Red Flag cast and the recorded motion are thousands of
// lines of numbers a code review can't usefully read, so every value is checked here
// instead, with the same rules the app uses when it loads them (card.mjs, acted.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCard, allLocked } from "./core/card.mjs";
import { normalizeCharacter, cardFor, wearsColor, characterToFile } from "./core/character.mjs";
import { characterIndexText } from "../tools/character-index.mjs";
import CAST from "../brands/redflag/cast.mjs";
import { normalizeTake, clipTracked, clipOnShelf, clipMoveId } from "./core/acted.mjs";
import { SHELF_DATA } from "./moves/shelf.mjs";
import { ACTED_DATA } from "./moves/acted/shelf.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const HEX = /^#[0-9a-f]{6}$/i;
const unique = (list, what) => { const seen = new Set(); for (const id of list) { assert.ok(!seen.has(id), `${what} "${id}" twice`); seen.add(id); } };

// ---- the Red Flag cast: one file per character (character creator phase 1, 6 Nov 2026) ----------
const CHAR_DIR = "brands/redflag/characters";
const characterFiles = () => fs.readdirSync(path.join(root, CHAR_DIR)).filter((f) => f.endsWith(".json")).sort();

test("Red Flag cast: the 40 character files exist, each loads without a problem", () => {
  const files = characterFiles();
  assert.equal(files.length, 40, "Season 1 has 40 characters");
  const settings = json("brands/redflag/cast-settings.json");
  const groups = new Set(settings.groups.map((g) => g.id));
  unique(settings.groups.map((g) => g.id), "group");
  const problems = [];
  for (const f of files) {
    const raw = json(`${CHAR_DIR}/${f}`);
    const { character, problems: p } = normalizeCharacter(raw);
    for (const x of p) problems.push(`${f}: ${x}`);
    if (raw.id + ".json" !== f) problems.push(`${f}: the file is named after its id ("${raw.id}")`);
    if (!groups.has(character.group)) problems.push(`${f}: group "${character.group}" isn't in cast-settings.json`);
    if (!character.chosen.face) problems.push(`${f}: no face chosen`);
    // the drawn card of every face and every outfit loads cleanly
    for (const face of character.faces) for (const x of normalizeCard(cardFor(character, { face: face.id })).problems) problems.push(`${f} face ${face.id}: ${x}`);
  }
  assert.deepEqual(problems, []);
});

test("Red Flag cast: ids and roster numbers are unique", () => {
  const all = characterFiles().map((f) => json(`${CHAR_DIR}/${f}`));
  unique(all.map((c) => c.id), "character id");
  unique(all.map((c) => c.roster), "roster number");
  assert.deepEqual(all.map((c) => c.roster).sort((a, b) => a - b), Array.from({ length: 40 }, (_, i) => i + 1));
});

test("Red Flag cast: the main colour is on one piece of every outfit", () => {
  const missing = [];
  let outfits = 0;
  for (const f of characterFiles()) {
    const c = json(`${CHAR_DIR}/${f}`);
    assert.match(c.signature, HEX, `${f}: main colour`);
    for (const o of c.outfits) { outfits++; if (!wearsColor(o.wear, c.signature)) missing.push(`${c.id} ${o.id} (${o.label})`); }
  }
  assert.deepEqual(missing, []);
  assert.ok(outfits >= 300, `all the outfits were checked (${outfits})`);
});

test("Red Flag cast: every part has a lock, saved in the file (moved in fully locked)", () => {
  for (const f of characterFiles()) {
    const c = json(`${CHAR_DIR}/${f}`);
    assert.deepEqual(Object.keys(c.locks).sort(), Object.keys(allLocked()).sort(), `${f}: one lock per part`);
    assert.ok(Object.values(c.locks).every((v) => typeof v === "boolean"), `${f}: locks are true or false`);
  }
});

test("Red Flag cast: the index lists exactly the files in the folder", () => {
  assert.equal(fs.readFileSync(path.join(root, CHAR_DIR, "index.mjs"), "utf8"), characterIndexText(path.join(root, CHAR_DIR)),
    "run: node tools/character-index.mjs brands/redflag");
  assert.equal(CAST.people.length, 40);
  assert.deepEqual(CAST.people.map((p) => p.roster), Array.from({ length: 40 }, (_, i) => i + 1), "people come in roster order");
});

test("Red Flag cast: a file written back is the file that was read", () => {
  for (const f of characterFiles()) {
    const text = fs.readFileSync(path.join(root, CHAR_DIR, f), "utf8");
    assert.equal(characterToFile(JSON.parse(text)), text, `${f} changes when saved again`);
  }
});

test("Red Flag characters.json: cards load, looks are known", () => {
  const ch = json("brands/redflag/characters.json");
  const problems = [];
  for (const c of [...ch.characters, ...ch.hosts]) {
    if (!HEX.test(c.signature ?? "")) problems.push(`${c.id}: signature colour "${c.signature}"`);
    if (c.card) for (const x of normalizeCard(c.card).problems) problems.push(`${c.id}: ${x}`);
  }
  unique([...ch.characters, ...ch.hosts].map((c) => c.id), "character");
  assert.deepEqual(problems, []);
  for (const v of Object.values(ch.looks)) assert.match(v, /^[a-z0-9]+$/);
});

test("recorded motion: every take is whole, in order and finite", () => {
  const dir = path.join(root, "characters/moves/acted/takes");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 0);
  const problems = [];
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const { take, problems: p } = normalizeTake(raw);
    for (const x of p) problems.push(`${f}: ${x}`);
    if (!take) continue;
    let last = -Infinity;
    for (const fr of take.frames) {
      if (fr.ms <= last) { problems.push(`${f}: time goes backwards at ${fr.ms} ms`); break; }
      last = fr.ms;
      if (!fr.lm.every((pt) => pt.every(Number.isFinite))) { problems.push(`${f}: a point isn't a number at ${fr.ms} ms`); break; }
    }
  }
  assert.deepEqual(problems, []);
});

test("recorded motion: clips, quality, preview and the shelf agree", () => {
  const clips = json("characters/moves/acted/clips.json");
  const quality = json("characters/moves/acted/quality.json");
  const preview = json("characters/moves/acted/preview.json");
  const takes = new Set(fs.readdirSync(path.join(root, "characters/moves/acted/takes")).map((f) => f.replace(/\.json$/, "")));
  unique(clips.map((c) => c.id), "clip");
  const problems = [];
  // the same rule as tools/acted-shelf.mjs: a dropped clip is left out, a clip whose arms were
  // seen too little keeps its quality entry but gets no move and no preview
  const shelf = new Set(ACTED_DATA.map((m) => m.id));
  for (const c of clips) {
    if (!clipTracked(c)) continue;
    const id = clipMoveId(c);
    if (!takes.has(c.id)) problems.push(`clip ${c.id}: no take file`);
    if (!quality[c.id]) { problems.push(`clip ${c.id}: no quality entry (run tools/acted-shelf.mjs)`); continue; }
    if (!clipOnShelf(c, quality[c.id])) continue;
    if (!preview[id]) problems.push(`clip ${c.id}: no preview for move "${id}"`);
    if (!shelf.has(id)) problems.push(`move ${id}: not on the shelf (run tools/acted-shelf.mjs)`);
  }
  // a recorded move with a starter move's id would be silently dropped from the shelf
  for (const id of shelf) if (SHELF_DATA.some((m) => m.id === id)) problems.push(`move ${id}: a starter move already has this id; give the clip another "move" name`);
  assert.deepEqual(problems, []);
});
