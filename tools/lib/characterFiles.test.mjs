// Run: npm test
// Character files on disk for the creator (phase 2): listing and safe saving.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCharacterFiles, saveCharacterFile } from "./characterFiles.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const jake = () => JSON.parse(fs.readFileSync(path.join(REPO, "brands/redflag/characters/jake.json"), "utf8"));

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vf-chars-"));
  const app = path.join(root, "brands"), user = path.join(root, "userdata", "characters");
  fs.mkdirSync(path.join(app, "redflag", "characters"), { recursive: true });
  fs.writeFileSync(path.join(app, "redflag", "cast-settings.json"), JSON.stringify({ groups: [{ id: "main", title: "The family" }] }));
  fs.writeFileSync(path.join(app, "redflag", "characters", "jake.json"), JSON.stringify(jake()));
  fs.writeFileSync(path.join(app, "redflag", "characters", "index.mjs"), "// index\n");
  fs.mkdirSync(path.join(app, "skilitsa"), { recursive: true }); // a brand without characters
  return { root, roots: { app, user } };
}

test("lists brands that have characters, with their settings", () => {
  const { roots } = sandbox();
  const list = listCharacterFiles(roots);
  assert.equal(list.length, 1);
  assert.equal(list[0].brand, "redflag");
  assert.equal(list[0].title, "The Red Flag Theory");
  assert.equal(list[0].settings.groups[0].id, "main");
  assert.deepEqual(list[0].characters.map((c) => [c.id, c.where]), [["jake", "app"]]);
});

test("the real Red Flag folder lists all 40", () => {
  const list = listCharacterFiles({ app: path.join(REPO, "brands"), user: path.join(os.tmpdir(), "vf-none") });
  assert.equal(list.find((b) => b.brand === "redflag").characters.length, 40);
});

test("a save writes the checked file, keeps the old one in .backup, and an unchanged save does nothing", () => {
  const { roots } = sandbox();
  const c = jake();
  c.base.hair = "short";
  const r = saveCharacterFile(roots, "redflag", c, { now: new Date("2026-11-07T10:00:00Z") });
  assert.equal(r.ok, true);
  assert.equal(r.where, "app");
  const saved = JSON.parse(fs.readFileSync(path.join(roots.app, "redflag/characters/jake.json"), "utf8"));
  assert.equal(saved.base.hair, "short");
  const backups = fs.readdirSync(path.join(roots.app, "redflag/characters/.backup"));
  assert.deepEqual(backups, ["jake.2026-11-07T10-00-00-000Z.json"]);
  assert.equal(saveCharacterFile(roots, "redflag", c).unchanged, true);
  assert.equal(fs.readdirSync(path.join(roots.app, "redflag/characters/.backup")).length, 1);
  assert.ok(!fs.readdirSync(path.join(roots.app, "redflag/characters")).some((f) => f.endsWith(".tmp")));
});

test("a character with problems is refused and nothing is written", () => {
  const { roots } = sandbox();
  const c = jake();
  c.outfits[0].wear = [{ id: "tshirt", colors: ["#ff0000"] }]; // the main colour is gone from this outfit
  const before = fs.readFileSync(path.join(roots.app, "redflag/characters/jake.json"), "utf8");
  const r = saveCharacterFile(roots, "redflag", c);
  assert.equal(r.ok, false);
  assert.match(r.problems.join(), /main colour/);
  assert.equal(fs.readFileSync(path.join(roots.app, "redflag/characters/jake.json"), "utf8"), before);
});

test("brand and id are plain names: no way to write outside the characters folder", () => {
  const { roots } = sandbox();
  assert.equal(saveCharacterFile(roots, "../evil", jake()).ok, false);
  assert.equal(saveCharacterFile(roots, "nobrand", jake()).ok, false);
  const c = jake();
  c.id = "../../escape";
  assert.equal(saveCharacterFile(roots, "redflag", c).ok, false);
});

test("a new character in the app folder updates the pages' index", () => {
  const { roots } = sandbox();
  const c = jake();
  c.id = "jake_copy";
  c.name = "Jake 2";
  assert.equal(saveCharacterFile(roots, "redflag", c).ok, true);
  assert.match(fs.readFileSync(path.join(roots.app, "redflag/characters/index.mjs"), "utf8"), /jake_copy\.json/);
});

test("when the app folder can't be written, the save goes to the data folder and wins the list", () => {
  const { roots } = sandbox();
  const asar = { app: path.join(roots.app, "..", "app.asar", "brands"), user: roots.user };
  // an app folder inside app.asar is never written to
  fs.mkdirSync(path.join(asar.app, "redflag", "characters"), { recursive: true });
  fs.writeFileSync(path.join(asar.app, "redflag", "characters", "jake.json"), JSON.stringify(jake()));
  const c = jake();
  c.base.hair = "buzz";
  const r = saveCharacterFile(asar, "redflag", c);
  assert.equal(r.ok, true);
  assert.equal(r.where, "user");
  const listed = listCharacterFiles(asar)[0].characters.find((x) => x.id === "jake");
  assert.equal(listed.where, "user");
  assert.equal(listed.raw.base.hair, "buzz");
});
