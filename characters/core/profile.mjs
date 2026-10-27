// ---------------------------------------------------------------------------
// ONE CHARACTER, TWO FORMS (ultra plan #13, 27 Oct 2026).
//
// A character is the same person whether they are a picture puppet from
// Image Forge or drawn by this engine. The shared part — name, who they are,
// personality, subjects — sits on top; below it each form keeps its own
// fields, and switching form loses nothing (both are kept, `form` says which
// one is on screen).
//
//   SUBJECTS          the channels' subjects, for tagging and the libraries
//   normalizeShared   the shared fields, checked like any card field
//   formOf            which form a speaker shows (one rule, used everywhere)
//   cardDiff/applyDiff  "describe it" answers shown field by field to accept
//   describeCard      a drawn character in plain words (an Image Forge order)
//   puppetPickPrompt / readPuppetPick
//                     "describe it" for a puppet: pick one already on the
//                     shelf, or write an order — never invent a file
// ---------------------------------------------------------------------------

import { FIELDS, fieldByKey, checkField } from "./card.mjs";
import { itemById } from "./wardrobe.mjs";
import { extractJson } from "../../explainer/core/prompts.mjs";

/** Subjects the libraries are sorted by (the credit run's seven, plus everyday). */
export const SUBJECTS = [
  { id: "dnd", label: "D&D" },
  { id: "dogs", label: "Dogs and puppies" },
  { id: "manipulation", label: "Narcissism and manipulation defence" },
  { id: "softskills", label: "Life coaching and soft skills" },
  { id: "seasonal", label: "Seasonal" },
  { id: "ai", label: "ELI5 AI and automation" },
  { id: "tropes", label: "Pop-culture ethics and tropes" },
  { id: "everyday", label: "Everyday people" },
];
const SUBJECT_IDS = SUBJECTS.map((s) => s.id);

export const FORMS = ["puppet", "drawn"];

/** The shared fields, the form shows them on top for both forms. */
export const SHARED_FIELDS = [
  { key: "description", label: "Who they are", max: 300, help: "A sentence or two: who they are and what they look like. The AI reads this when it helps.", examples: ["A grumpy dwarf cook with a ladle", "A patient dog trainer in her forties", "A friendly little robot who explains computers"] },
  { key: "personality", label: "Personality", max: 200, help: "How they talk and act. It guides gestures and the AI's suggestions.", examples: ["Warm, a bit nosy, laughs easily", "Calm and precise", "Charming at first, then cold"] },
];

/**
 * The shared part of any object (a saved speaker, an AI answer, an old save)
 * → { shared: { form, description, personality, subjects }, problems }.
 */
export function normalizeShared(src = {}) {
  const problems = [];
  const text = (k, max) => (typeof src[k] === "string" ? src[k].trim().slice(0, max) : "");
  const subjects = Array.isArray(src.subjects) ? src.subjects.filter((s) => {
    if (SUBJECT_IDS.includes(s)) return true;
    problems.push(`"${s}" isn't a subject; use ${SUBJECT_IDS.join(", ")}`);
    return false;
  }) : [];
  const form = FORMS.includes(src.form) ? src.form : formOf(src);
  return { shared: { form, description: text("description", 300), personality: text("personality", 200), subjects: [...new Set(subjects)] }, problems };
}

/**
 * Which form a speaker shows. An explicit `form` wins when that form exists;
 * otherwise (old saves) a drawn card, then a puppet, then a viseme sheet.
 * Returns "drawn", "puppet" or "sheet" (or "none" with nothing at all).
 */
export function formOf(sp = {}) {
  if (sp.form === "drawn" && sp.character) return "drawn";
  if (sp.form === "puppet" && (sp.puppetPath || sp.sheetPath)) return sp.puppetPath ? "puppet" : "sheet";
  if (sp.character) return "drawn";
  if (sp.puppetPath) return "puppet";
  if (sp.sheetPath) return "sheet";
  return "none";
}

/** The drawn card to show, or null when the speaker shows a picture form. */
export const activeCard = (sp = {}) => (formOf(sp) === "drawn" ? sp.character : null);

// ---- describe it: field by field --------------------------------------------------------------

/**
 * What changes between two cards, in the form's own order and labels:
 * [{ key, label, from, to }]. The form shows this as a list of ticks, so a
 * person keeps the AI's good ideas and drops the rest.
 */
export function cardDiff(before, after) {
  const out = [];
  for (const f of FIELDS) {
    if (f.key === "name") continue;
    const a = before?.[f.key], b = after?.[f.key];
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ key: f.key, label: f.label, from: a, to: b });
  }
  return out;
}

/** A card with only the accepted changes applied (each value checked again). */
export function applyDiff(card, diff, acceptedKeys) {
  const next = { ...card };
  for (const d of diff) {
    if (!acceptedKeys.includes(d.key)) continue;
    const f = fieldByKey(d.key);
    if (!f) continue;
    const [v, problem] = checkField(f, d.to);
    if (!problem) next[d.key] = v;
  }
  return next;
}

// ---- a drawn character in words (to order its puppet) ------------------------------------------

const HEX_NAMES = [
  ["#000000", "black"], ["#262a33", "dark"], ["#5a3825", "brown"], ["#8d5a3b", "brown"], ["#c9a46e", "blond"], ["#e8d5a8", "pale blond"],
  ["#b0b0b0", "grey"], ["#ffffff", "white"], ["#a8322b", "red"], ["#d4405c", "pink"], ["#e85d8a", "pink"], ["#f2c84b", "yellow"],
  ["#3f8f4a", "green"], ["#2f6fb5", "blue"], ["#3a6fb0", "blue"], ["#7fd3ff", "light blue"], ["#6b3fa0", "purple"], ["#e07b39", "orange"], ["#2d3446", "navy"],
];
function colourName(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex ?? "")) return "";
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let best = "", bd = Infinity;
  for (const [h, name] of HEX_NAMES) {
    const w = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const d = (v[0] - w[0]) ** 2 * 0.3 + (v[1] - w[1]) ** 2 * 0.59 + (v[2] - w[2]) ** 2 * 0.11;
    if (d < bd) { bd = d; best = name; }
  }
  return best;
}

/**
 * A drawn character as an Image Forge order description: plain words, every
 * part of the card that a picture needs, nothing it can't know. Same card,
 * same words — so re-ordering is repeatable.
 */
export function describeCard(card, shared = {}) {
  const bits = [];
  const who = shared.description?.trim();
  if (who) bits.push(who.replace(/\.?$/, "."));
  const build = { thin: "slim", average: "", round: "round" }[card.build] ?? "";
  const height = card.height <= 0.85 ? "short" : card.height >= 1.08 ? "tall" : "";
  bits.push(`${[height, build].filter(Boolean).join(", ") || "Average"} build${card.muscle >= 0.5 ? ", strong" : ""}${card.posture !== "upright" ? `, ${card.posture === "hunch" ? "hunched" : "slouching"}` : ""}.`.replace(/^./, (c) => c.toUpperCase()));
  const hair = card.hair === "bald" ? "bald" : `${colourName(card.hairColor)} ${card.hair} hair`.trim();
  const hc = colourName(card.hairColor);
  const face = [card.beard !== "none" ? `a ${card.beard} ${hc} beard` : "", card.moustache !== "none" ? `a ${card.moustache} ${hc} moustache` : "", card.freckles ? "freckles" : "", card.cheeks ? "rosy cheeks" : ""].filter(Boolean);
  bits.push(`${hair.replace(/^./, (c) => c.toUpperCase())}${face.length ? `, ${face.join(", ")}` : ""}.`);
  const wear = (card.wear ?? []).map((w) => {
    const it = itemById(w.id);
    if (!it) return "";
    const c = colourName(w.colors?.[0]);
    return `${c ? c + " " : ""}${it.label.toLowerCase()}${w.pattern && w.pattern !== "none" ? ` with ${w.pattern}` : ""}`;
  }).filter(Boolean);
  if (wear.length) bits.push(`Wearing ${wear.join(", ")}.`);
  const mood = { neutral: "", smile: "Friendly smile.", serious: "Serious face.", grumpy: "Grumpy face." }[card.expression] ?? "";
  if (mood) bits.push(mood);
  if (shared.personality?.trim()) bits.push(`Personality: ${shared.personality.trim().replace(/\.?$/, ".")}`);
  return bits.join(" ");
}

// ---- describe it, for a puppet: the shelf or an order -------------------------------------------

/**
 * Prompt to pick a puppet for a description from the ones already made (by
 * slug), or to say none fits and write the order instead.
 * shelf: [{ slug, name, framing }]
 */
export function puppetPickPrompt(description, shelf) {
  const list = shelf.map((p) => `- ${p.slug}: ${p.name} (${p.framing})`).join("\n") || "(none yet)";
  const system = `You cast picture puppets for short narrated videos. These puppets already exist:
${list}

Answer with ONE JSON object, one of:
{ "pick": "<slug from the list>", "why": "<one short sentence>" }
{ "order": "<a description for drawing a NEW puppet: look, clothes, colours, age, mood>", "why": "<one short sentence>" }
Only pick a slug from the list. If nothing fits well, write the order. Never copy a famous character.`;
  return { system, user: `The character: ${String(description).trim()}` };
}

/** The model's pick → { pick: slug, why } | { order: text, why } | { problem }. Never a slug that isn't on the shelf. */
export function readPuppetPick(text, shelf) {
  let got;
  try { got = extractJson(text); } catch { return { problem: "The answer had no JSON in it." }; }
  const why = String(got?.why ?? "").slice(0, 200);
  if (typeof got?.pick === "string") {
    const hit = shelf.find((p) => p.slug === got.pick);
    if (hit) return { pick: hit.slug, why };
    if (typeof got.order !== "string") return { problem: `"${got.pick}" isn't on the shelf.` };
  }
  if (typeof got?.order === "string" && got.order.trim()) return { order: got.order.trim().slice(0, 600), why };
  return { problem: "The answer neither picked a puppet nor wrote an order." };
}
