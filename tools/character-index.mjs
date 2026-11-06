// Write <brand>/characters/index.mjs: every character file in the folder, imported by name, so the
// sample pages (bundled by esbuild) and the tests can load the whole cast without reading a folder.
//   node tools/character-index.mjs brands/redflag
// Re-run it after adding, renaming or removing a character file. npm test (characters/data.test.mjs)
// fails while the index and the folder disagree.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The index file's text for a folder of character files. */
export function characterIndexText(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const name = (f) => "c_" + f.replace(/\.json$/, "").replace(/[^a-z0-9_]/gi, "_");
  return [
    "// Made by tools/character-index.mjs: every character file in this folder. Don't edit by hand;",
    "// re-run `node tools/character-index.mjs <brand folder>` after adding or removing a character.",
    ...files.map((f) => `import ${name(f)} from "./${f}" with { type: "json" };`),
    "",
    `export const CHARACTERS = [${files.map(name).join(", ")}];`,
    "",
  ].join("\n");
}

export function writeCharacterIndex(brandDir) {
  const dir = path.join(brandDir, "characters");
  fs.writeFileSync(path.join(dir, "index.mjs"), characterIndexText(dir));
  return path.join(dir, "index.mjs");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const brand = process.argv[2];
  if (!brand) { console.error("Usage: node tools/character-index.mjs <brand folder>, e.g. brands/redflag"); process.exit(1); }
  console.log("wrote", path.relative(root, writeCharacterIndex(path.resolve(root, brand))));
}
