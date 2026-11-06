// ONE-OFF (6 Nov 2026, character creator phase 1): move the 40 Red Flag drafts out of
// brands/redflag/cast.json into one file per character, brands/redflag/characters/<id>.json,
// and leave the brand-wide settings in brands/redflag/cast-settings.json.
//   node tools/migrate-redflag-characters.mjs
// It has run; cast.json is gone, so running it again only says so. Kept for the record of
// exactly what moved where:
//   · every person keeps every field they had (base, faces, outfits, chosen, signature,
//     signatureName, role, group, look, framing, accessories and the drafting notes)
//   · roster = their place in cast.json's list (1–40: the order is the roster's)
//   · voice = null: no voice was ever chosen for them, and none is made up here
//   · locks = every part locked, as a character file opens
//   · the brand's 3D settings (form 1, formDetail, formLimbs 0.5), which every page laid over
//     every card, are written into each base, so a character drawn from its file alone (or
//     copied into another project) looks the same as on the cast pages
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allLocked } from "../characters/core/card.mjs";
import { CHARACTER_KIND, CHARACTER_VERSION, normalizeCharacter, characterToFile } from "../characters/core/character.mjs";
import { writeCharacterIndex } from "./character-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brand = path.join(root, "brands/redflag");
const castPath = path.join(brand, "cast.json");
if (!fs.existsSync(castPath)) { console.log("Already moved: brands/redflag/cast.json is gone, the characters are in brands/redflag/characters/."); process.exit(0); }

const cast = JSON.parse(fs.readFileSync(castPath, "utf8"));
const look3d = { form: cast.form, formDetail: cast.formDetail, formLimbs: cast.formLimbs };
const outDir = path.join(brand, "characters");
fs.mkdirSync(outDir, { recursive: true });

let bad = 0;
cast.people.forEach((p, i) => {
  const raw = {
    kind: CHARACTER_KIND, v: CHARACTER_VERSION, id: p.id, roster: i + 1, name: p.name,
    group: p.group, role: p.role, look: p.look, framing: p.framing,
    signature: p.signature, signatureName: p.signatureName, voice: null, locks: allLocked(),
    base: { ...p.base, ...look3d }, accessories: p.accessories, faces: p.faces, chosen: p.chosen, outfits: p.outfits,
    proposed: p.proposed, source: p.source, target: p.target,
  };
  const { problems } = normalizeCharacter(raw);
  if (problems.length) { bad++; console.error(`${p.id}:\n  ${problems.join("\n  ")}`); }
  fs.writeFileSync(path.join(outDir, `${p.id}.json`), characterToFile(raw));
});
if (bad) { console.error(`${bad} characters have problems; cast.json left in place.`); process.exit(1); }

const settings = {
  _about: cast._about + " Moved 6 Nov 2026: each person is now their own file in characters/ (tools/migrate-redflag-characters.mjs); this file keeps what belongs to the whole cast.",
  groups: cast.groups,
  geoEyes: cast.geoEyes,
  defaults: look3d,
  defaultsNote: "Card fields a NEW Red Flag character starts with. Every existing character has them in its own base. " + cast.formNote,
};
fs.writeFileSync(path.join(brand, "cast-settings.json"), JSON.stringify(settings, null, 2) + "\n");
writeCharacterIndex(brand);
fs.unlinkSync(castPath);
console.log(`Moved ${cast.people.length} characters into brands/redflag/characters/, wrote cast-settings.json and the index, removed cast.json.`);
