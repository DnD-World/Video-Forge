// ---------------------------------------------------------------------------
// Brand packs — one creator's characters, sample and clips, kept apart.
//
// WHY. The app was built for one course, and that course's cast, intro clips,
// outro clips and banners used to sit at the top of the repository as if they
// were part of the app. Anyone else installing it got somebody else's
// characters. Now everything that belongs to one creator lives in
// `brands/<id>/`, and the app shows none of it unless this computer asks.
//
// HOW A COMPUTER ASKS. A file beside package.json, `brand.local.json`:
//
//     { "brand": "skilitsa" }
//
// It is git-ignored, so a fresh clone or a fresh install starts neutral, and a
// machine that wants a brand says so once (`npm run brand -- skilitsa`).
// tools/lib/brand.mjs reads the same file for the command-line tools.
//
// WHAT A PACK HOLDS — `brands/<id>/brand.json`. Every path inside it is
// relative to the pack's own folder, so the pack can be copied as a unit.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import type { BrandInfo } from "../src/store/builtinCast";

/** The parts of brand.json the main process itself uses. */
interface BrandFile extends Omit<BrandInfo, "id" | "puppetDir"> {
  /** Folder of the cast's puppet files. Default "puppet". */
  puppetDir?: string;
  /** For `--add-outros`: where the outro clips are, and where the finished
   *  lessons' sources are. Both optional; the command refuses without them. */
  addOutros?: { outrosDir?: string; lessonsSrc?: string };
}

/** A brand id is a folder name and nothing more — no slashes, no "..". */
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

/** Which brand this computer asked for, or null for none. */
export async function activeBrandId(appRoot: string): Promise<string | null> {
  try {
    const raw = await fsp.readFile(path.join(appRoot, "brand.local.json"), "utf8");
    const id = JSON.parse(raw)?.brand;
    return typeof id === "string" && SAFE_ID.test(id) ? id : null;
  } catch {
    // No file is the normal case: a neutral install.
    return null;
  }
}

export interface LoadedBrand extends BrandInfo {
  /** Absolute folder of the pack. */
  dir: string;
  addOutros?: { outrosDir?: string; lessonsSrc?: string };
}

/**
 * The active pack, read fresh, or null.
 *
 * A pack that is named but broken is reported on the console and treated as
 * absent: an app that opens neutral is better than one that will not open.
 */
export async function loadActiveBrand(appRoot: string): Promise<LoadedBrand | null> {
  const id = await activeBrandId(appRoot);
  if (!id) return null;
  const dir = path.join(appRoot, "brands", id);
  try {
    const file = JSON.parse(await fsp.readFile(path.join(dir, "brand.json"), "utf8")) as BrandFile;
    const inPack = (p: string | undefined) => (p ? path.resolve(dir, p) : undefined);
    return {
      id,
      name: file.name || id,
      dir,
      puppetDir: inPack(file.puppetDir ?? "puppet")!,
      cast: Array.isArray(file.cast) ? file.cast : [],
      sample: file.sample,
      addOutros: file.addOutros && {
        outrosDir: inPack(file.addOutros.outrosDir),
        // lessonsSrc is usually outside the app (a course folder), so an
        // absolute path stays absolute; path.resolve leaves those alone.
        lessonsSrc: inPack(file.addOutros.lessonsSrc),
      },
    };
  } catch (err) {
    console.error(
      `brand "${id}" is named in brand.local.json but brands/${id}/brand.json could not be read: ` +
        (err instanceof Error ? err.message : String(err))
    );
    return null;
  }
}
