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
import { MARK_KINDS, MARK_SPOTS, MAX_MARKS, MARK_SIZE, MARK_ANGLE } from "./marks.mjs";
import { extractJson } from "../../explainer/core/prompts.mjs";

/** Who the character IS, not how they look: the AI helper never sees or sets these. */
export const AI_SKIPS = new Set(["signature", "voice"]);

/** The card format, written for a model: every field, its allowed values, its meaning. */
export function cardSchemaText() {
  const lines = FIELDS.filter((f) => f.kind !== "wear" && f.kind !== "marks" && !AI_SKIPS.has(f.key)).map((f) => {
    const allowed = f.kind === "choice" ? `one of: ${f.options.join(" | ")}`
      : f.kind === "number" ? `a number ${f.min}–${f.max}`
      : f.kind === "color" ? `a colour "#rrggbb"${f.optional ? ' or ""' : ""}`
      : f.kind === "bool" ? "true | false" : `text (max ${f.max ?? 80})`;
    return `- "${f.key}": ${allowed}. ${f.help}`;
  });
  const items = WARDROBE.map((w) => `${w.id} (${w.label}; place: ${w.slot}; ${w.colors} colour${w.colors > 1 ? "s" : ""}${w.patterns ? "; pattern ok" : ""})`).join(", ");
  lines.push(`- "wear": a list of { "id", "colors": ["#rrggbb", …], "pattern" } — one item per place (one top, one hat …; "full" replaces top and bottom). Items: ${items}. Patterns: ${PATTERNS.join(" | ")}.`);
  lines.push(`- "marks": a list (at most ${MAX_MARKS}) of { "kind": ${Object.keys(MARK_KINDS).map((k) => `"${k}"`).join(" | ")}, "on": ${Object.keys(MARK_SPOTS).map((k) => `"${k}"`).join(" | ")}, "shape" (tattoos only): ${MARK_KINDS.tattoo.shapes.map((k) => `"${k}"`).join(" | ")} ("band" on a forearm only), "size": ${MARK_SIZE[0]}–${MARK_SIZE[1]} (1 is clearly visible, 0.8 is small, below 0.7 hard to see), "color": "#rrggbb", "angle": ${MARK_ANGLE[0]}–${MARK_ANGLE[1]} }. L/R = left/right as you look at them.`);
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

// ---- the AI box (character creator phase 3, 7 Nov 2026) ------------------------------------------
// Ak types plain words for one part or the whole character ("left eye a bit lazy", "eyes at most
// 50% open"). The model is shown ONLY the fields it may change (the unlocked parts' fields, never
// clothes, main colour or voice), with their allowed values and the current values, and answers
// with changes to those fields. Everything it says is checked like typed input; anything else is
// refused and listed. The screen shows the result as a preview to keep or throw away.

/** The schema lines for some fields only (the ones open to change). */
function schemaFor(keys) {
  const all = cardSchemaText().split("\n");
  return keys.map((k) => all.find((l) => l.startsWith(`- "${k}":`))).filter(Boolean).join("\n");
}

/** Prompt for changing some fields of a card from plain words. Returns { system, user }. */
export function partsPrompt(card, keys, request, { scope = "the character" } = {}) {
  const now = Object.fromEntries(keys.map((k) => [k, card[k]]));
  const system = `You adjust a cartoon character for an animation app. The character is a CHARACTER CARD (JSON).
You may change ONLY these fields (${scope}), with only these values:
${schemaFor(keys)}

Their values now: ${JSON.stringify(now)}

Rules:
- Change only what the request asks for; leave everything else out of your answer.
- Left and right mean as you look at the character from the front.
- "A bit" or "slightly" means a small step from the value now; "very" or "a lot" a big one.
- If the request needs a field that isn't in the list, don't invent it: say so in "note".
- Colours: soft, natural shades that suit a cartoon (a blue eye is like #3a78c2, a green one like #4e8a3e), never pure screen colours like #0000ff; the field's examples are good choices.
Answer with ONE JSON object: { "changes": { "<field>": <new value>, … }, "note": "<one short plain sentence: what you changed, or why you couldn't>" }.`;
  return { system, user: String(request ?? "").trim().slice(0, 1500) };
}

/**
 * A model's answer to partsPrompt → the checked result. Only `keys` may change; each value goes
 * through the card's own check. Returns { card, changes: [{ key, label, from, to }], problems, note }.
 */
export function readPartsAnswer(text, card, keys) {
  const got = extractJson(text);
  const asked = got && typeof got.changes === "object" && got.changes && !Array.isArray(got.changes) ? got.changes : {};
  const allowed = new Set(keys);
  const problems = [], next = { ...card }, changes = [];
  for (const [k, v] of Object.entries(asked)) {
    const f = fieldByKey(k);
    if (!f) { problems.push(`"${k}" isn't a card field, ignored`); continue; }
    if (!allowed.has(k)) { problems.push(`${f.label} isn't open to change here (locked, or another part), left as it was`); continue; }
    const [value, problem] = checkField(f, v);
    if (problem) problems.push(problem);
    if (JSON.stringify(value) === JSON.stringify(card[k])) continue;
    next[k] = value;
    changes.push({ key: k, label: f.label, from: card[k], to: value });
  }
  return { card: normalizeCard(next).card, changes, problems, note: typeof got?.note === "string" ? got.note.slice(0, 300) : "" };
}
