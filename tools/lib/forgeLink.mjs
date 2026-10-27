// ---------------------------------------------------------------------------
// Asking Image Forge for pictures, when both apps are on this computer.
//
// Decided 20 Sep 2026: two apps, not a merge. Image Forge keeps a folder where
// other apps can drop requests. This file is our half: find the forge, drop a
// request, wait for the pictures to come back. See the matching note in
// Image Forge's HANDOFF.md §14.2 and its electron/link.mjs.
//
//   <forge data>/link/presence.json   "the forge is running" — version, port
//   <forge data>/link/inbox/<id>.json our request
//   <forge data>/link/outbox/<id>/     the pictures, then done.json
//
// No API keys cross over. We ask for pictures; the forge uses its own keys and
// its own rules, including asking its user before spending money.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

/** Where Image Forge keeps its data — the same place Electron puts it. */
export function forgeDataDir(env = process.env, platform = process.platform) {
  if (env.FORGE_LINK_DIR) return path.dirname(env.FORGE_LINK_DIR);
  if (platform === "win32") return path.join(env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "image-forge");
  if (platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "image-forge");
  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "image-forge");
}

export function linkDir(env = process.env, platform = process.platform) {
  return env.FORGE_LINK_DIR || path.join(forgeDataDir(env, platform), "link");
}

/**
 * Is Image Forge here?
 *   running    — open right now; a request starts within seconds
 *   installed  — has run on this computer before; a request waits until it opens
 *   absent     — never seen
 */
export function findForge(dir = linkDir()) {
  const presence = path.join(dir, "presence.json");
  if (fs.existsSync(presence)) {
    try {
      const note = JSON.parse(fs.readFileSync(presence, "utf8"));
      if (note.app === "image-forge") return { state: "running", version: note.version, port: note.port, dir };
    } catch {
      /* half-written: treat as installed */
    }
  }
  if (fs.existsSync(dir) || fs.existsSync(path.dirname(dir))) return { state: "installed", dir };
  return { state: "absent", dir };
}

const ID_OK = /^[a-z0-9][a-z0-9-]{5,63}$/;

export function newRequestId(prefix = "video-forge") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

/** Drop a request in the forge's inbox. Written atomically. */
export function sendRequest({ id = newRequestId(), from = "Video Forge", note = "", rows }, dir = linkDir()) {
  if (!ID_OK.test(id)) throw new Error(`bad request id "${id}"`);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("a request needs at least one picture");
  const inbox = path.join(dir, "inbox");
  fs.mkdirSync(inbox, { recursive: true });
  const file = path.join(inbox, `${id}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ id, from, note, createdAt: new Date().toISOString(), rows }, null, 2));
  fs.renameSync(tmp, file);
  return { id, file };
}

/** What happened to a request, right now. */
export function checkRequest(id, dir = linkDir()) {
  const done = path.join(dir, "outbox", id, "done.json");
  if (fs.existsSync(done)) {
    const d = JSON.parse(fs.readFileSync(done, "utf8"));
    return { state: "done", done: d.done || [], failed: d.failed || [], folder: path.join(dir, "outbox", id) };
  }
  const why = path.join(dir, "inbox", "rejected", `${id}.why.txt`);
  if (fs.existsSync(why)) return { state: "rejected", reason: fs.readFileSync(why, "utf8") };
  if (fs.existsSync(path.join(dir, "processing", `${id}.json`))) return { state: "working" };
  if (fs.existsSync(path.join(dir, "inbox", `${id}.json`))) return { state: "waiting" };
  return { state: "unknown" };
}

/** Wait until the forge finishes or refuses. */
export async function waitForRequest(id, { dir = linkDir(), timeoutMs = 60 * 60 * 1000, everyMs = 3000, onTick } = {}) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const s = checkRequest(id, dir);
    onTick?.(s);
    if (s.state === "done" || s.state === "rejected") return s;
    if (Date.now() > until) return { ...s, state: "timeout" };
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

/** Copy finished pictures out of the forge's folder into ours. */
export function collectPictures(result, intoDir) {
  fs.mkdirSync(intoDir, { recursive: true });
  const copied = [];
  for (const name of result.done) {
    const from = path.join(result.folder, path.basename(name));
    if (!fs.existsSync(from)) continue;
    fs.copyFileSync(from, path.join(intoDir, path.basename(name)));
    copied.push(path.join(intoDir, path.basename(name)));
  }
  return copied;
}

/* ---------------- what we ask for ---------------- */

/** The cast, described so a picture model can draw them without references.
 *  These belong to a brand pack (`forgeCharacters` in its brand.json); the
 *  caller passes them in. */
export const MOODS = {
  neutral: "a calm neutral expression, eyebrows level and relaxed, eyes open normally",
  happy: "a happy expression, eyebrows raised and arched, eyes bright and cheerful",
  serious: "a serious expression, eyebrows lowered and drawn together, eyes narrowed and firm",
};

// Same order as build-viseme-sheet.mjs: the index places the cell.
const GRID =
  "A 3x3 grid of exactly nine square panels showing the SAME character nine times, identical in every panel except the " +
  "shape of the mouth. Reading left to right, top to bottom, the nine mouth shapes are: 1 mouth closed and relaxed, " +
  "2 mouth wide open saying AH, 3 mouth spread wide saying EE, 4 mouth rounded saying OH, 5 mouth small and tightly " +
  "rounded saying OO, 6 lips pressed firmly together saying M, 7 top teeth resting on the lower lip saying F, 8 mouth " +
  "part open with the tongue raised saying L, 9 lips pushed forward and rounded saying SH. In every panel the head is " +
  "exactly the same size, in exactly the same position, at exactly the same angle, with the same lighting and the same " +
  "expression. Head, neck and shoulders only. Nine equal panels in a clean 3 by 3 arrangement, no gaps, no borders, " +
  "no labels, no numbers. Plain flat dark charcoal background in every panel.";

const GRID_NEGATIVE =
  "legs, feet, hands, arms, full body, waist, text, letters, numbers, labels, captions, watermark, signature, panel " +
  "borders, gutters, uneven panels, different characters, head moving between panels, different sizes, busy background";

/** "stop-motion-clay" → "clay"; forge-to-sheets needs a style with no underscore. */
export const styleSlug = (style) =>
  ({ "stop-motion-clay": "clay", "animated-feature-3d": "3d" })[style] ?? (String(style || "plain").replace(/[^a-z0-9]/gi, "").toLowerCase() || "plain");

/**
 * The rows for viseme grids: one per mood. Named so tools/forge-to-sheets.mjs
 * turns them straight into the 3x3 sheets SpeakerAvatar reads.
 */
export function visemeRows(character, { style = "stop-motion-clay", moods = Object.keys(MOODS), describe, characters = {} } = {}) {
  const who = describe || characters[character];
  if (!who) throw new Error(`no description for "${character}" — pass --describe "..."`);
  const slug = styleSlug(style);
  return moods.map((mood) => {
    if (!MOODS[mood]) throw new Error(`unknown mood "${mood}" — use ${Object.keys(MOODS).join(", ")}`);
    return {
      filename: `sheet_${character}_${slug}_${mood}.png`,
      prompt: `${who}, with ${MOODS[mood]}. ${GRID}`,
      negative_prompt: GRID_NEGATIVE,
      style,
      aspect_ratio: "1:1",
      category: "sheet",
    };
  });
}
