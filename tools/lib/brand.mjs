// ---------------------------------------------------------------------------
// Brand packs, for the command-line tools.
//
// The same rules as electron/brand.ts, which the app uses: a computer switches
// a pack on with `brand.local.json` beside package.json ({ "brand": "<id>" }),
// and the pack itself is `brands/<id>/brand.json`, every path inside it
// relative to the pack's folder. No file means no brand — a neutral install.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");

/** A brand id is a folder name and nothing more — no slashes, no "..". */
export const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

/** The brand this computer has switched on, or null. */
export function activeBrandId(root = ROOT) {
  try {
    const id = JSON.parse(fs.readFileSync(path.join(root, "brand.local.json"), "utf8"))?.brand;
    return typeof id === "string" && SAFE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Every pack in brands/, by folder name. */
export function listBrands(root = ROOT) {
  const dir = path.join(root, "brands");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, "brand.json")))
    .map((d) => d.name)
    .sort();
}

/**
 * A pack, read and with its paths made absolute. `id` defaults to the active
 * one; returns null when there is none. Throws when a named pack is broken,
 * because a tool is run on purpose and should say why it cannot go on.
 */
export function loadBrand(id, root = ROOT) {
  if (id === undefined) id = activeBrandId(root);
  if (!id) return null;
  if (!SAFE_ID.test(id)) throw new Error(`"${id}" is not a brand name`);
  const dir = path.join(root, "brands", id);
  const file = path.join(dir, "brand.json");
  if (!fs.existsSync(file)) throw new Error(`no brand pack at brands/${id}/brand.json`);
  const b = JSON.parse(fs.readFileSync(file, "utf8"));
  const inPack = (p) => (p ? path.resolve(dir, p) : undefined);
  return {
    ...b,
    id,
    name: b.name || id,
    dir,
    puppetDir: inPack(b.puppetDir ?? "puppet"),
    cast: Array.isArray(b.cast) ? b.cast : [],
    forgeCharacters: b.forgeCharacters ?? {},
    addOutros: b.addOutros && {
      outrosDir: inPack(b.addOutros.outrosDir),
      lessonsSrc: inPack(b.addOutros.lessonsSrc),
    },
  };
}

/** Switch a pack on (or off, with null) for this computer. */
export function setActiveBrand(id, root = ROOT) {
  const file = path.join(root, "brand.local.json");
  if (id === null) {
    fs.rmSync(file, { force: true });
    return;
  }
  loadBrand(id, root); // refuses a name with no pack behind it
  fs.writeFileSync(file, JSON.stringify({ brand: id }, null, 2) + "\n");
}
