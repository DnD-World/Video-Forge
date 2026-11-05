// Data checks (5 Nov 2026): the Red Flag cast and the recorded motion are thousands of
// lines of numbers a code review can't usefully read, so every value is checked here
// instead, with the same rules the app uses when it loads them (card.mjs, acted.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCard } from "./core/card.mjs";
import { normalizeWear } from "./core/wardrobe.mjs";
import { normalizeTake, clipTracked, clipOnShelf, clipMoveId } from "./core/acted.mjs";
import { SHELF_DATA } from "./moves/shelf.mjs";
import { ACTED_DATA } from "./moves/acted/shelf.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const HEX = /^#[0-9a-f]{6}$/i;
const unique = (list, what) => { const seen = new Set(); for (const id of list) { assert.ok(!seen.has(id), `${what} "${id}" twice`); seen.add(id); } };

test("Red Flag cast: every card, face and outfit loads without a problem", () => {
  const cast = json("brands/redflag/cast.json");
  assert.ok(cast.form >= 0 && cast.form <= 1, "form 0–1");
  assert.ok(cast.formLimbs >= 0 && cast.formLimbs <= 1, "formLimbs 0–1");
  assert.equal(typeof cast.formDetail, "boolean");
  unique(cast.groups.map((g) => g.id), "group");
  unique(cast.people.map((p) => p.id), "person");
  const groups = new Set(cast.groups.map((g) => g.id));
  const problems = [];
  for (const p of cast.people) {
    if (!groups.has(p.group)) problems.push(`${p.id}: group "${p.group}" doesn't exist`);
    if (!HEX.test(p.signature ?? "")) problems.push(`${p.id}: signature colour "${p.signature}"`);
    unique((p.faces ?? []).map((f) => f.id), `${p.id} face`);
    unique((p.outfits ?? []).map((o) => o.id), `${p.id} outfit`);
    for (const f of p.faces ?? []) {
      const r = normalizeCard({ ...p.base, ...f.set });
      for (const x of r.problems) problems.push(`${p.id} face ${f.id}: ${x}`);
    }
    for (const o of p.outfits ?? []) {
      for (const x of normalizeWear(o.wear).problems) problems.push(`${p.id} outfit ${o.id}: ${x}`);
    }
  }
  assert.deepEqual(problems, []);
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
