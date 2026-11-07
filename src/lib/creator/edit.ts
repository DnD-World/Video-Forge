// ---------------------------------------------------------------------------
// The character creator's rules for changing a character (phase 2, 7 Nov 2026).
//
// Pure functions on a character file (characters/core/character.mjs): each
// takes a character and returns a new one, never changing the old, so the
// screen can compare "now" with "as saved" and undo is a matter of keeping
// the old object. Everything a change writes is checked by the card's own
// rules (checkField / normalizeWear).
//
// WHERE A CHANGE GOES. A character has a `base` and face options (A, B, C …)
// laid over it. Body changes (height, build, posture, muscles, arm length) and marks go
// into the base, so every face has the same body. Everything else from the
// face parts goes into the face being edited; a value that comes back to the
// base's is dropped from the face, so files stay small.
//
// The main colour stays on one piece of every outfit: outfit changes report
// the outfits that lost it (outfitsWithoutMain), and saving is refused until
// none have (tools/lib/characterFiles.mjs checks again before writing).
//
// Node runs this file directly in tools/lib/creatorEdit.test.mjs.
// ---------------------------------------------------------------------------

import {
  FIELDS, PARTS, fieldByKey, checkField, normalizeWear, wearsColor, keepLocked, cardFor, normalizeLocks, WARDROBE, PATTERNS,
  type CharacterCard, type CharacterFile, type Locks, type PartId, type WornItem,
} from "../../../characters/core/index.mjs";

type Rng = () => number;
const HEX = /^#[0-9a-f]{6}$/i;

/** Body fields live in the base; the rest of the face parts live in the face being edited. */
export const BODY_KEYS = new Set([...(PARTS.find((p) => p.id === "body")!.fields as string[]), "marks"]);

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** The face/outfit being shown, falling back as cardFor does. */
export const faceIdOf = (c: CharacterFile, face?: string) => (c.faces.find((f) => f.id === face) ?? c.faces.find((f) => f.id === c.chosen?.face) ?? c.faces[0])?.id ?? "";
export const outfitIdOf = (c: CharacterFile, outfit?: string) => (c.outfits.find((o) => o.id === outfit) ?? c.outfits.find((o) => o.id === c.chosen?.outfits?.[0]) ?? c.outfits[0])?.id ?? "";

/** The card to draw for one face and outfit. */
export const cardOf = (c: CharacterFile, face?: string, outfit?: string, look?: string): CharacterCard => cardFor(c, { face: faceIdOf(c, face), outfit: outfitIdOf(c, outfit), look });

/** Set one card field for this face (body fields: for every face). Returns [character, problem | null]. */
export function setField(c: CharacterFile, face: string, key: string, value: unknown): [CharacterFile, string | null] {
  const f = fieldByKey(key);
  if (!f) return [c, `"${key}" isn't a card field`];
  if (key === "wear" || key === "signature" || key === "voice" || key === "name") return [c, `${f.label} isn't changed here`];
  const [v, problem] = checkField(f, value);
  const next = clone(c);
  if (BODY_KEYS.has(key)) {
    (next.base as Record<string, unknown>)[key] = v;
    for (const fc of next.faces) delete (fc.set as Record<string, unknown>)[key];
    return [next, problem];
  }
  const fc = next.faces.find((x) => x.id === faceIdOf(c, face));
  if (!fc) return [c, "this character has no faces"];
  const baseValue = key in next.base ? (next.base as Record<string, unknown>)[key] : f.default;
  if (JSON.stringify(baseValue) === JSON.stringify(v)) delete (fc.set as Record<string, unknown>)[key];
  else (fc.set as Record<string, unknown>)[key] = v;
  return [next, problem];
}

// ---- the randomiser ---------------------------------------------------------------------------------

/** Values the randomiser never picks: they read as a mistake, not a look. */
const NEVER: Record<string, unknown[]> = { eyes: ["none"] };
const pick = <T>(list: T[], rng: Rng): T => list[Math.floor(rng() * list.length) % list.length];

/** One random value for a field, kept to sensible ranges (numbers stay away from the extremes). */
export function randomValue(key: string, rng: Rng): unknown {
  const f = fieldByKey(key)!;
  switch (f.kind) {
    case "choice": return pick(f.options!.filter((o) => !(NEVER[key] ?? []).includes(o)), rng);
    case "number": {
      const t = 0.15 + 0.7 * rng();
      const n = f.min! + (f.max! - f.min!) * t;
      const step = f.step ?? 0.01;
      return Math.round(n / step) * step;
    }
    case "color": return pick((f.examples as string[]).filter((x) => x !== "" || !!f.optional), rng);
    case "bool": return rng() < 0.3;
    default: return f.default;
  }
}

/** Pieces of clothing that can take the outfit colours: a palette that sits well together. */
const OUTFIT_PALETTE = ["#f2efe6", "#2f3b52", "#3a3a40", "#c8b48a", "#3b2a1e", "#7a8b6a", "#9a4a3a", "#d8c9a8", "#4a5a7a", "#1c1c22", "#b9b2a6", "#6b4a6a"];

/**
 * Change every UNLOCKED part at random; locked parts, the main colour, the voice and the
 * personality fields stay. Unlocked outfits: the pieces that aren't in the main colour get new
 * colours (the clothes themselves stay, so nothing becomes less covered).
 */
export function randomise(c: CharacterFile, face: string, outfit: string, locks: Locks, rng: Rng = Math.random): CharacterFile {
  const { locks: l } = normalizeLocks(locks);
  const before = cardOf(c, face, outfit);
  const proposal: Record<string, unknown> = { ...before };
  for (const p of PARTS) {
    if (l[p.id] !== false || p.id === "outfits") continue;
    // marks are placed by hand (or by the AI box), never at random
    for (const k of p.fields) if (k !== "marks") proposal[k] = randomValue(k as string, rng);
  }
  const kept = keepLocked(before, proposal, l) as unknown as Record<string, unknown>;
  let next = c;
  for (const p of PARTS) {
    if (l[p.id] !== false || p.id === "outfits") continue;
    for (const k of p.fields) if (JSON.stringify(kept[k as string]) !== JSON.stringify((before as unknown as Record<string, unknown>)[k as string])) [next] = setField(next, face, k as string, kept[k as string]);
  }
  if (l.outfits === false) next = recolourOutfit(next, outfitIdOf(next, outfit), rng);
  return next;
}

/** New colours for an outfit's pieces, except the one(s) in the main colour. */
export function recolourOutfit(c: CharacterFile, outfit: string, rng: Rng = Math.random): CharacterFile {
  const next = clone(c);
  const o = next.outfits.find((x) => x.id === outfit);
  if (!o) return c;
  const sig = c.signature.toLowerCase();
  o.wear = o.wear.map((w) => {
    if (w.colors.some((x) => x.toLowerCase() === sig)) return w;
    return { ...w, colors: w.colors.map(() => pick(OUTFIT_PALETTE, rng)) };
  });
  return next;
}

// ---- faces ------------------------------------------------------------------------------------------

/** Make this face the usual one (the one the videos use). */
export function setUsualFace(c: CharacterFile, face: string): CharacterFile {
  if (!c.faces.some((f) => f.id === face)) return c;
  const next = clone(c);
  next.chosen = { ...next.chosen, face };
  delete next.chosen.faceNote;
  return next;
}

// ---- outfits ----------------------------------------------------------------------------------------

const nextOutfitId = (c: CharacterFile) => {
  let n = c.outfits.length + 1;
  while (c.outfits.some((o) => o.id === `o${n}`)) n++;
  return `o${n}`;
};

/** A copy of an outfit, right after it, named "… (copy)". Returns [character, new id]. */
export function copyOutfit(c: CharacterFile, outfit: string, label?: string): [CharacterFile, string] {
  const src = c.outfits.find((o) => o.id === outfit) ?? c.outfits[0];
  const next = clone(c);
  const id = nextOutfitId(c);
  const at = next.outfits.findIndex((o) => o.id === src.id);
  next.outfits.splice(at + 1, 0, { id, label: (label ?? `${src.label} (copy)`).slice(0, 80), wear: clone(src.wear) });
  return [next, id];
}

/** A new outfit: the plainest set, with the top in the main colour. Returns [character, new id]. */
export function newOutfit(c: CharacterFile): [CharacterFile, string] {
  const next = clone(c);
  const id = nextOutfitId(c);
  next.outfits.push({ id, label: "New outfit", wear: [{ id: "tshirt", colors: [c.signature] }, { id: "trousers", colors: ["#2f3b52"] }, { id: "shoes", colors: ["#3b2a1e"] }] });
  return [next, id];
}

/** Delete an outfit (never the last one). It also leaves the chosen list. */
export function deleteOutfit(c: CharacterFile, outfit: string): CharacterFile {
  if (c.outfits.length <= 1 || !c.outfits.some((o) => o.id === outfit)) return c;
  const next = clone(c);
  next.outfits = next.outfits.filter((o) => o.id !== outfit);
  next.chosen = { ...next.chosen, outfits: next.chosen.outfits.filter((x) => x !== outfit) };
  return next;
}

export function renameOutfit(c: CharacterFile, outfit: string, label: string): CharacterFile {
  const text = label.trim().slice(0, 80);
  if (!text) return c;
  const next = clone(c);
  const o = next.outfits.find((x) => x.id === outfit);
  if (o) o.label = text;
  return next;
}

/** In or out of the outfits the videos use (the first in the list is the usual one). */
export function toggleChosenOutfit(c: CharacterFile, outfit: string): CharacterFile {
  const next = clone(c);
  const list = next.chosen.outfits;
  next.chosen = { ...next.chosen, outfits: list.includes(outfit) ? list.filter((x) => x !== outfit) : [...list, outfit] };
  return next;
}

/** One colour of one worn piece. */
export function setWearColor(c: CharacterFile, outfit: string, index: number, colorIndex: number, hex: string): CharacterFile {
  if (!HEX.test(hex)) return c;
  const next = clone(c);
  const w = next.outfits.find((o) => o.id === outfit)?.wear[index];
  if (!w) return c;
  const full = normalizeWear([w]).wear[0];
  const colors = full ? [...full.colors] : [...w.colors];
  colors[colorIndex] = hex.toLowerCase();
  w.colors = colors;
  return next;
}

export function setWearPattern(c: CharacterFile, outfit: string, index: number, pattern: string): CharacterFile {
  if (!PATTERNS.includes(pattern)) return c;
  const next = clone(c);
  const w = next.outfits.find((o) => o.id === outfit)?.wear[index];
  if (!w) return c;
  if (pattern === "none") delete w.pattern; else w.pattern = pattern as WornItem["pattern"];
  return next;
}

/** Put the main colour on this piece (its first colour). */
export function setMainPiece(c: CharacterFile, outfit: string, index: number): CharacterFile {
  return setWearColor(c, outfit, index, 0, c.signature);
}

/** Add a piece; it replaces whatever sat in the same place (normalizeWear's rule). Returns [character, problems]. */
export function addWear(c: CharacterFile, outfit: string, itemId: string, colors?: string[]): [CharacterFile, string[]] {
  const item = WARDROBE.find((w) => w.id === itemId);
  if (!item) return [c, [`"${itemId}" isn't in the wardrobe`]];
  const next = clone(c);
  const o = next.outfits.find((x) => x.id === outfit);
  if (!o) return [c, []];
  const { wear, problems } = normalizeWear([...o.wear, { id: itemId, ...(colors ? { colors } : {}) }]);
  o.wear = wear.map(({ id, colors: cs, pattern }) => ({ id, colors: cs, ...(pattern && pattern !== "none" ? { pattern } : {}) }));
  return [next, problems];
}

export function removeWear(c: CharacterFile, outfit: string, index: number): CharacterFile {
  const next = clone(c);
  const o = next.outfits.find((x) => x.id === outfit);
  if (!o || o.wear.length <= 1) return c;
  o.wear.splice(index, 1);
  return next;
}

/** The outfits that have no piece in the main colour (saving waits until there are none). */
export function outfitsWithoutMain(c: CharacterFile): string[] {
  return c.outfits.filter((o) => !wearsColor(o.wear, c.signature)).map((o) => o.id);
}

/** A new main colour: every piece in the old one takes the new one, so each outfit keeps it. */
export function setMainColor(c: CharacterFile, hex: string, name?: string): CharacterFile {
  if (!HEX.test(hex)) return c;
  const old = c.signature.toLowerCase(), now = hex.toLowerCase();
  const next = clone(c);
  next.signature = now;
  if (name !== undefined) next.signatureName = name.trim().slice(0, 120);
  for (const o of next.outfits) for (const w of o.wear) w.colors = w.colors.map((x) => (x.toLowerCase() === old ? now : x));
  return next;
}

// ---- locks ------------------------------------------------------------------------------------------

export function setLock(c: CharacterFile, part: PartId, locked: boolean): CharacterFile {
  return { ...c, locks: { ...c.locks, [part]: locked } };
}

/** Which fields this part shows. */
export const fieldsOfPart = (part: PartId) => (PARTS.find((p) => p.id === part)?.fields ?? []) as string[];

/** Is anything different from the saved file? */
export const changed = (a: CharacterFile | null, b: CharacterFile | null) => JSON.stringify(a) !== JSON.stringify(b);

/** The fields with a picture list, and every card field the creator can show, for the tests. */
export const PICTURE_KINDS = new Set(["choice", "bool"]);
export const FIELD_KEYS = FIELDS.map((f) => f.key as string);
