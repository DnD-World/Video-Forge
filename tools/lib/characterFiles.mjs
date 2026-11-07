// ---------------------------------------------------------------------------
// Character files on disk, for the character creator (phase 2, 7 Nov 2026).
//
// Where they live: <app>/brands/<brand>/characters/<id>.json (the 40 Red Flag
// people are there). When the app can't write into its own folder (an
// installed copy under Program Files), a save goes to the app's data folder
// instead, <userData>/characters/<brand>/<id>.json, and that copy wins when
// the list is read. Either way the file is written whole and checked first.
//
// Safety: a save is refused unless the character passes normalizeCharacter
// with no problems; the brand and id are plain names (no paths); the old file
// is copied into characters/.backup/ before it is replaced; the new text is
// written to a temporary file and renamed into place, so a crash never leaves
// half a file.
//
// Pure Node (no Electron), so tools/lib/characterFiles.test.mjs runs it.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { normalizeCharacter, characterToFile } from "../../characters/core/character.mjs";
import { characterIndexText } from "../character-index.mjs";

const NAME = /^[a-z0-9_-]{1,40}$/;
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } };
const jsonFiles = (dir) => { try { return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort(); } catch { return []; } };

/**
 * Every brand that has characters, with its cast settings and each character's file as read.
 * roots: { app: "<app>/brands", user: "<userData>/characters" }.
 * Returns [{ brand, title, settings, characters: [{ id, raw, where: "app" | "user" }] }].
 */
export function listCharacterFiles(roots) {
  const brands = new Set();
  for (const d of safeDirs(roots.app)) if (fs.existsSync(path.join(roots.app, d, "characters"))) brands.add(d);
  for (const d of safeDirs(roots.user)) brands.add(d);
  const out = [];
  for (const brand of [...brands].sort()) {
    const settings = readJson(path.join(roots.app, brand, "cast-settings.json")) ?? {};
    const byId = new Map();
    for (const f of jsonFiles(path.join(roots.app, brand, "characters"))) {
      const raw = readJson(path.join(roots.app, brand, "characters", f));
      if (raw) byId.set(f.replace(/\.json$/, ""), { id: f.replace(/\.json$/, ""), raw, where: "app" });
    }
    for (const f of jsonFiles(path.join(roots.user, brand))) {
      const raw = readJson(path.join(roots.user, brand, f));
      if (raw) byId.set(f.replace(/\.json$/, ""), { id: f.replace(/\.json$/, ""), raw, where: "user" });
    }
    if (!byId.size) continue;
    out.push({ brand, title: settings.title ?? titleOf(brand), settings, characters: [...byId.values()] });
  }
  return out;
}

const safeDirs = (dir) => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && NAME.test(e.name)).map((e) => e.name); } catch { return []; } };
const titleOf = (brand) => ({ redflag: "The Red Flag Theory", skilitsa: "Skilitsa" })[brand] ?? brand;

/** Can this folder take a new file? (An installed app's own folder usually can't.) */
function writable(dir) {
  if (/\.asar([\\/]|$)/i.test(dir)) return false;
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-test-${process.pid}`);
    fs.writeFileSync(probe, "");
    fs.unlinkSync(probe);
    return true;
  } catch { return false; }
}

/**
 * Save one character. Returns { ok: true, file, where } or { ok: false, problems }.
 * Nothing is written when anything is wrong.
 */
export function saveCharacterFile(roots, brand, raw, { now = new Date() } = {}) {
  if (!NAME.test(String(brand))) return { ok: false, problems: [`"${brand}" isn't a brand name`] };
  const appBrand = path.join(roots.app, brand);
  if (!fs.existsSync(appBrand) && !fs.existsSync(path.join(roots.user, brand))) return { ok: false, problems: [`there is no brand "${brand}"`] };
  const { character, problems } = normalizeCharacter(raw);
  if (problems.length) return { ok: false, problems };
  const text = characterToFile(character);

  const appDir = path.join(appBrand, "characters");
  const useApp = fs.existsSync(appBrand) && writable(appDir);
  const dir = useApp ? appDir : path.join(roots.user, brand);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${character.id}.json`);
  const isNew = !fs.existsSync(file);

  // keep the old version, once per save
  if (!isNew) {
    const old = fs.readFileSync(file, "utf8");
    if (old.replace(/\r\n/g, "\n") === text) return { ok: true, file, where: useApp ? "app" : "user", unchanged: true };
    const bdir = path.join(dir, ".backup");
    fs.mkdirSync(bdir, { recursive: true });
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(path.join(bdir, `${character.id}.${stamp}.json`), old);
  }
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
  // a new person in the app's folder: the pages' index has to know them (characters/data.test.mjs checks)
  if (useApp && isNew && fs.existsSync(path.join(appDir, "index.mjs"))) fs.writeFileSync(path.join(appDir, "index.mjs"), characterIndexText(appDir));
  return { ok: true, file, where: useApp ? "app" : "user" };
}
