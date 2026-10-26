// ---------------------------------------------------------------------------
// What we ask a model about characters, and how we read the answer.
//
//   cardPrompt         "fill the whole card" from a description and/or a picture
//   suggestPrompt      "look at this card: what would you change, field by field?"
//   readCardAnswer     the model's JSON → a valid card + the problems found
//   readSuggestions    the model's JSON → suggestions that are actually valid
//
// The model only ever proposes VALUES for the fields in card.mjs. Every answer
// goes through normalizeCard, exactly like something typed by hand, so a model
// that invents a field or a hair style can't break a character. No network
// here: tools/lib/characterLlm.mjs makes the calls with the user's own key.
// ---------------------------------------------------------------------------

import { FIELDS, WARDROBE, checkField, fieldByKey, normalizeCard } from "./card.mjs";
import { LOOKS } from "./looks.mjs";
import { PATTERNS } from "./wardrobe.mjs";
import { extractJson } from "../../explainer/core/prompts.mjs";

/** The card format, written for a model: every field, its allowed values, its meaning. */
export function cardSchemaText() {
  const lines = FIELDS.filter((f) => f.kind !== "wear").map((f) => {
    const allowed = f.kind === "choice" ? `one of: ${f.options.join(" | ")}`
      : f.kind === "number" ? `a number ${f.min}–${f.max}`
      : f.kind === "color" ? `a colour "#rrggbb"${f.optional ? ' or ""' : ""}`
      : f.kind === "bool" ? "true | false" : `text (max ${f.max ?? 80})`;
    return `- "${f.key}": ${allowed}. ${f.help}`;
  });
  const items = WARDROBE.map((w) => `${w.id} (${w.label}; place: ${w.slot}; ${w.colors} colour${w.colors > 1 ? "s" : ""}${w.patterns ? "; pattern ok" : ""})`).join(", ");
  lines.push(`- "wear": a list of { "id", "colors": ["#rrggbb", …], "pattern" } — one item per place (one top, one hat …; "full" replaces top and bottom). Items: ${items}. Patterns: ${PATTERNS.join(" | ")}.`);
  const looks = LOOKS.map((l) => `${l.id} = ${l.name}`).join("; ");
  return `${lines.join("\n")}\nLooks: ${looks}.`;
}

/**
 * Prompt to fill a whole card. description: text (optional); picture: true when
 * an image is attached. Returns { system, user }.
 */
export function cardPrompt({ description = "", picture = false, look } = {}) {
  const system = `You design cartoon characters for an animation app. The app draws them from a CHARACTER CARD (JSON).
Answer with ONE JSON object: the card, using only these fields and allowed values:
${cardSchemaText()}

Rules:
- Match the description${picture ? " and the attached picture" : ""} as closely as the fields allow: hair, skin, clothes, colours, accessories, build.
- Colours: pick the real colours you see or are told, as "#rrggbb".
- Leave out anything you can't tell; the app fills in defaults.
- Never copy a famous cartoon character: describe an original one.${look ? `\n- Use "look": "${look}".` : ""}`;
  const user = `${picture ? "Make a card for the character in this picture." : "Make a card for this character."}${description.trim() ? `\n\nDESCRIPTION:\n${description.trim()}` : ""}`;
  return { system, user };
}

/** Prompt for field-by-field advice on an existing card. */
export function suggestPrompt(card, { purpose = "" } = {}) {
  const system = `You review cartoon character designs for short narrated videos watched on phones.
The character is a CHARACTER CARD (JSON) with these fields and allowed values:
${cardSchemaText()}

Suggest at most 6 changes that make the character read better: easier to recognise at small size, clearer contrast (face features vs skin, clothes vs each other), a more distinctive silhouette, colours that suit each other. Only suggest values that are allowed. Don't suggest changes for their own sake.
Answer with ONE JSON object: { "suggestions": [ { "field": "<key>", "value": <new value>, "why": "<one short plain sentence>" } ] }. An empty list is a fine answer.`;
  const user = `${purpose ? `What the character is for: ${purpose}\n\n` : ""}CARD:\n${JSON.stringify(stripSeed(card), null, 1)}`;
  return { system, user };
}

const stripSeed = ({ seed, ...rest }) => rest;

/** A model's reply → { card, problems }. Throws only when there is no JSON at all. */
export function readCardAnswer(text, base = {}) {
  const got = extractJson(text);
  const { card, problems } = normalizeCard({ ...base, ...got });
  return { card, problems };
}

/** A model's suggestions → only the valid, different ones: [{ field, value, why, label }]. */
export function readSuggestions(text, card) {
  const got = extractJson(text);
  const out = [];
  for (const s of Array.isArray(got?.suggestions) ? got.suggestions : []) {
    const f = fieldByKey(s?.field);
    if (!f) continue;
    const [value, problem] = checkField(f, s.value);
    if (problem) continue;
    if (JSON.stringify(value) === JSON.stringify(card[f.key])) continue;
    out.push({ field: f.key, label: f.label, value, why: String(s.why ?? "").slice(0, 200) });
  }
  return out.slice(0, 6);
}
