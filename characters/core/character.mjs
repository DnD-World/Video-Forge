// ---------------------------------------------------------------------------
// The CHARACTER FILE: one character, one JSON file (character creator, phase 1, 6 Nov 2026).
//
// A card (card.mjs) is one appearance: one face, one outfit. A character file is the whole
// person: their base card, their face options, their outfits, which ones were chosen, their
// main colour, their voice, and which parts of them are locked. The app turns a character
// file into a card with cardFor() when they go into a project, and the project keeps a copy.
//
// Where they live: <brand folder>/characters/<id>.json (Red Flag: brands/redflag/characters/).
//
// THE FORMAT (version 1). Order is the order a file is written in.
//   kind        "video-forge-character", so a stray JSON file is never mistaken for one
//   v           1
//   id          a-z, 0-9, _ and -; the file's name without .json
//   roster      their number in the series' roster (1, 2 …), or null
//   name        what they are called
//   group       which group of the cast they belong to (the brand's cast-settings.json lists them)
//   role        a sentence: who they are
//   look        the drawing look they appear in (looks.mjs)
//   framing     full | waist | head
//   signature   the MAIN COLOUR, "#rrggbb". One piece of every outfit carries it
//   signatureName  that colour in words ("navy")
//   voice       { engine, voiceId, model, pitch, speed } or null (card.mjs normalizeVoice)
//   locks       { body: true, head: true, … } one per part (card.mjs PARTS); true = locked.
//               A part that's missing is locked, so a file always opens fully locked unless
//               it says otherwise
//   base        the card fields every face starts from (only the ones that differ from the
//               defaults; card.mjs FIELDS)
//   accessories worn items that belong to the person, not the outfit (glasses, earrings …)
//   faces       [{ id, label, set }]: face options; `set` is card fields laid over `base`
//   chosen      { face, outfits: [ids], faceNote? }: what was picked; the first outfit is the usual one
//   outfits     [{ id, label, wear }]: clothes sets; `wear` as the card's wear
//   proposed, source, target   drafting notes from the roster, kept as they were
//
// Plain data in, plain data out, nothing thrown: normalizeCharacter() reports every problem in
// plain words, the same way normalizeCard() does.
// ---------------------------------------------------------------------------

import { normalizeCard, normalizeLocks, normalizeVoice, fieldByKey, checkField } from "./card.mjs";
import { normalizeWear } from "./wardrobe.mjs";
import { LOOK_IDS } from "./looks.mjs";

export const CHARACTER_KIND = "video-forge-character";
export const CHARACTER_VERSION = 1;
const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9_-]{1,40}$/;
const FRAMINGS = ["full", "waist", "head"];

const str = (x, max = 300) => (typeof x === "string" ? x.trim().slice(0, max) : "");

/** Does this list of worn items have a piece in the colour? (Accessories don't count.) */
export function wearsColor(wear, color) {
  const c = String(color ?? "").toLowerCase();
  return !!c && normalizeWear(wear).wear.some((i) => i.colors.includes(c));
}

/** A card's own fields, each checked; anything that isn't a card field is reported. */
function checkCardPart(obj, where, problems) {
  const out = {};
  if (obj === undefined || obj === null) return out;
  if (typeof obj !== "object" || Array.isArray(obj)) { problems.push(`${where}: not a set of card fields`); return out; }
  for (const [k, v] of Object.entries(obj)) {
    const f = fieldByKey(k);
    if (!f) { problems.push(`${where}: "${k}" isn't a card field, ignored`); continue; }
    const [value, p] = checkField(f, v);
    if (p) problems.push(`${where}: ${p}`);
    out[k] = value;
  }
  return out;
}

/**
 * Any object (a file just read, a hand edit, an AI answer) to a valid character.
 * Never throws. Returns { character, problems }.
 */
export function normalizeCharacter(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const problems = [];
  if (src.kind !== CHARACTER_KIND) problems.push(`not a character file (kind is "${src.kind}")`);
  if (Number.isInteger(src.v) && src.v > CHARACTER_VERSION) problems.push(`saved by a newer Video Forge (character version ${src.v}; this one reads up to ${CHARACTER_VERSION})`);

  const id = ID.test(src.id ?? "") ? src.id : "";
  if (!id) problems.push(`id "${src.id}" must be 1–40 of a-z, 0-9, _ and -`);
  const who = id || "character";
  const roster = Number.isInteger(src.roster) && src.roster > 0 ? src.roster : null;
  if (src.roster !== undefined && src.roster !== null && roster === null) problems.push(`${who}: roster "${src.roster}" isn't a whole number from 1`);

  const name = str(src.name, 40);
  if (!name) problems.push(`${who}: has no name`);
  const look = LOOK_IDS.includes(src.look) ? src.look : "stick";
  if (!LOOK_IDS.includes(src.look)) problems.push(`${who}: look "${src.look}" isn't one of ${LOOK_IDS.join(", ")}`);
  const framing = FRAMINGS.includes(src.framing) ? src.framing : "full";
  if (src.framing !== undefined && !FRAMINGS.includes(src.framing)) problems.push(`${who}: framing "${src.framing}" isn't one of ${FRAMINGS.join(", ")}`);

  const signature = HEX.test(src.signature ?? "") ? src.signature.toLowerCase() : "";
  if (!signature) problems.push(`${who}: main colour "${src.signature}" isn't a colour like #24365c`);

  const [voice, vp] = normalizeVoice(src.voice);
  for (const p of vp) problems.push(`${who}: ${p}`);
  const { locks, problems: lp } = normalizeLocks(src.locks);
  for (const p of lp) problems.push(`${who}: ${p}`);

  const base = checkCardPart(src.base, `${who} base`, problems);
  for (const k of ["signature", "voice"]) if (k in base) problems.push(`${who} base: "${k}" belongs on the character, not in base`);
  delete base.signature; delete base.voice;

  const { wear: accessories, problems: ap } = normalizeWear(src.accessories ?? []);
  for (const p of ap) problems.push(`${who} accessories: ${p}`);

  const seen = (what) => { const s = new Set(); return (x) => { if (s.has(x)) problems.push(`${who}: ${what} "${x}" twice`); s.add(x); }; };
  const faceSeen = seen("face"), outfitSeen = seen("outfit");

  const faces = [];
  for (const f of Array.isArray(src.faces) ? src.faces : []) {
    const fid = str(f?.id, 20);
    if (!fid) { problems.push(`${who}: a face has no id`); continue; }
    faceSeen(fid);
    const set = checkCardPart(f.set, `${who} face ${fid}`, problems);
    // the whole face, as it will be drawn, must load cleanly too
    for (const p of normalizeCard({ ...base, ...set }).problems) problems.push(`${who} face ${fid}: ${p}`);
    faces.push({ id: fid, label: str(f.label, 80), set });
  }
  if (!faces.length) problems.push(`${who}: has no faces`);

  const outfits = [];
  for (const o of Array.isArray(src.outfits) ? src.outfits : []) {
    const oid = str(o?.id, 20);
    if (!oid) { problems.push(`${who}: an outfit has no id`); continue; }
    outfitSeen(oid);
    const { wear, problems: wp } = normalizeWear(o.wear);
    for (const p of wp) problems.push(`${who} outfit ${oid}: ${p}`);
    if (signature && !wearsColor(o.wear, signature)) problems.push(`${who} outfit ${oid}: no piece is in the main colour ${signature}`);
    // the file keeps the outfit as written (no default colours filled in), once it's known good
    outfits.push({ id: oid, label: str(o.label, 80), wear: wp.length ? wear.map(({ id: i, colors, pattern }) => ({ id: i, colors, ...(pattern !== "none" ? { pattern } : {}) })) : o.wear });
  }
  if (!outfits.length) problems.push(`${who}: has no outfits`);

  const ch = src.chosen && typeof src.chosen === "object" ? src.chosen : {};
  const chosen = {
    face: faces.some((f) => f.id === ch.face) ? ch.face : "",
    outfits: (Array.isArray(ch.outfits) ? ch.outfits : []).filter((x) => outfits.some((o) => o.id === x)),
    ...(typeof ch.faceNote === "string" && ch.faceNote.trim() ? { faceNote: str(ch.faceNote, 400) } : {}),
  };
  if (ch.face && !chosen.face) problems.push(`${who}: chosen face "${ch.face}" doesn't exist`);
  for (const x of Array.isArray(ch.outfits) ? ch.outfits : []) if (!chosen.outfits.includes(x)) problems.push(`${who}: chosen outfit "${x}" doesn't exist`);

  const character = {
    kind: CHARACTER_KIND, v: CHARACTER_VERSION, id, roster, name,
    group: str(src.group, 40), role: str(src.role, 400), look, framing,
    signature, signatureName: str(src.signatureName, 120), voice, locks,
    base, accessories: accessories.map(({ id: i, colors }) => ({ id: i, colors })), faces, chosen, outfits,
    ...(typeof src.proposed === "boolean" ? { proposed: src.proposed } : {}),
    ...(src.source !== undefined ? { source: str(src.source, 400) } : {}),
    ...(src.target !== undefined ? { target: str(src.target, 40) } : {}),
  };
  const known = new Set([...Object.keys(character), "proposed", "source", "target"]);
  for (const k of Object.keys(src)) if (!known.has(k)) problems.push(`${who}: "${k}" isn't part of a character file, ignored`);
  return { character, problems };
}

/**
 * The card to draw: base + a face + an outfit + the accessories, with the main colour and the
 * voice. Unnamed face/outfit = the chosen ones (the first chosen outfit), else the first.
 * `look` draws them in another look (the lab pages do this).
 */
export function cardFor(character, { face, outfit, look } = {}) {
  const c = character;
  const f = c.faces.find((x) => x.id === face) ?? c.faces.find((x) => x.id === c.chosen?.face) ?? c.faces[0];
  const o = c.outfits.find((x) => x.id === outfit) ?? c.outfits.find((x) => x.id === c.chosen?.outfits?.[0]) ?? c.outfits[0];
  return normalizeCard({
    name: c.name, framing: c.framing, ...c.base, ...(f?.set ?? {}),
    look: look ?? c.look,
    wear: [...(o?.wear ?? []), ...(c.accessories ?? [])],
    signature: c.signature, voice: c.voice,
  }).card;
}

/** A character as it is written to disk: the format's order, short things on one line, a newline at the end. */
export function characterToFile(character) {
  return readableJson(normalizeCharacter(character).character) + "\n";
}

/** JSON with anything short on one line (a worn item, a face's changes), the rest indented. */
function readableJson(value, indent = "") {
  const flat = JSON.stringify(value);
  if (value === null || typeof value !== "object" || (indent && flat.length <= 96)) return indent ? spaced(flat) : flat;
  const next = indent + "  ";
  const parts = Array.isArray(value)
    ? value.map((v) => next + readableJson(v, next))
    : Object.entries(value).map(([k, v]) => `${next}${JSON.stringify(k)}: ${readableJson(v, next)}`);
  if (!parts.length) return Array.isArray(value) ? "[]" : "{}";
  return Array.isArray(value) ? `[\n${parts.join(",\n")}\n${indent}]` : `{\n${parts.join(",\n")}\n${indent}}`;
}
// a space after each comma and colon of a one-line object or list, leaving text inside quotes alone
const spaced = (flat) => flat.replace(/("(?:[^"\\]|\\.)*")|([,:])/g, (m, q, p) => q ?? `${p} `);

/**
 * A brand's cast as one object, the shape brands/<id>/cast.json had before the characters moved
 * into their own files: the brand's settings plus `people`, in roster order.
 */
export function castFrom(settings, characters) {
  const people = [...characters].sort((a, b) => (a.roster ?? 1e9) - (b.roster ?? 1e9) || a.id.localeCompare(b.id));
  return { ...settings, people };
}
