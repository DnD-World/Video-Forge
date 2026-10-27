// ---------------------------------------------------------------------------
// What we say to models, and how we read what they say back.
//
//   sceneListPrompt   built-in styles: a model writes only the scene list
//                     (small JSON, checked by validateSpec). Cheap models do this well.
//   fixPrompt         the same conversation, with the checker's problems listed
//   parseAtlasPrompt  read a Copy-prompt text from the AI Style Atlas (imported styles)
//   rebuildPrompt     that prompt with the user's content and Video Forge's needs
//                     (frame size, empty puppet spots, timing to the narration)
//   extractJson / extractHtml   pull the answer out of a model's reply
// No browser or Node APIs: used by the app, the tools and the tests alike.
// ---------------------------------------------------------------------------

import { FORMATS, unitFor } from "./frame.mjs";
import { KINDS, MIN_SCENE_SEC } from "./spec.mjs";

const WORDS_PER_SEC = 2.6; // a calm narration pace, for scripts without word times

/** The script's language, from its letters (enough to tell the model not to translate). */
export function scriptLanguage(script) {
  const t = String(script);
  const count = (re) => (t.match(re) ?? []).length;
  const greek = count(/[Ͱ-Ͽἀ-῿]/g), cyr = count(/[Ѐ-ӿ]/g), latin = count(/[a-z]/gi);
  if (greek > latin && greek >= cyr) return "Greek";
  if (cyr > latin) return "the script's own language (Cyrillic letters)";
  return null;
}

/** Rough length of a script read aloud, in seconds. */
export const estimateSeconds = (script) => Math.max(6, Math.round(String(script).trim().split(/\s+/).length / WORDS_PER_SEC));

const SCHEMA = `{
  "format": "16:9 | 9:16 | 1:1 | 4:5",
  "scenes": [
    { "kind": "title",    "at": 0, "kicker": "short label (optional)", "text": "headline, max 70 chars" },
    { "kind": "points",   "at": <time>, "title": "optional, max 48", "items": ["1–4 items, each max 46 chars", { "text": "...", "at": <time> }] },
    { "kind": "steps",    "at": <time>, "title": "optional", "items": ["2–5 steps, each max 46 chars"] },
    { "kind": "number",   "at": <time>, "value": 5, "prefix": "", "suffix": " min (prefix+suffix max 10 chars)", "label": "what the number means, max 40" },
    { "kind": "bars",     "at": <time>, "title": "optional", "unit": "optional", "items": [{ "label": "max 46", "value": 3 }] },
    { "kind": "compare",  "at": <time>, "title": "optional", "left": { "title": "max 24", "items": ["1–3"] }, "right": { "title": "max 24", "items": ["1–3"] } },
    { "kind": "takeaway", "at": <time>, "kicker": "optional", "text": "the one thing to remember, max 70" }
  ]
}`;

/**
 * The prompt for a built-in style. words (optional) = [{ text, start, end }]
 * from the narration; with them, scenes are anchored to words, not seconds.
 */
export function sceneListPrompt({ script, words, format = "16:9", duration }) {
  const hasWords = Array.isArray(words) && words.length > 0;
  const length = duration ?? (hasWords ? words[words.length - 1].end + 0.8 : estimateSeconds(script));
  const lang = scriptLanguage(script);
  const system = `You turn a narration script into a scene list for an animated explainer video.
Answer with ONE JSON object and nothing else, in exactly this shape:
${SCHEMA}

Rules:
- Write every on-screen word in the SAME LANGUAGE as the script${lang ? ` (${lang})` : ""}. Never translate.
- Use only what the script says. Never add facts, numbers or claims that are not in it. A "number" or "bars" scene only when the script gives those numbers.
- "at" is when a scene starts${hasWords ? ': use { "word": n } with the number of the word it should land on (the list below), so pictures change exactly when the narrator says it' : " in seconds"}. The first scene is at 0. Each scene lasts at least ${MIN_SCENE_SEC} seconds; aim for one scene every 3–8 seconds.
- Items inside a scene may have their own "at" so each one appears when it is said.
- Short words on screen: the narrator says the sentence, the screen shows the key words. Respect every maximum length.
- Start with a "title" scene and end with a "takeaway" scene.
- Allowed kinds only: ${Object.keys(KINDS).join(", ")}.`;
  const user = `Format: ${format}. Length: about ${Math.round(length)} seconds.${lang ? ` On-screen language: ${lang}.` : ""}

SCRIPT:
${String(script).trim()}
${hasWords ? `\nWORDS (number:word@seconds):\n${words.map((w, i) => `${i}:${w.text}@${w.start.toFixed(2)}`).join(" ")}` : ""}`;
  return { system, user };
}

/** Follow-up when the checker found problems: the model fixes its own list. */
export const fixPrompt = (errors) =>
  `The scene list has these problems:\n- ${errors.join("\n- ")}\nAnswer with the corrected JSON object only.`;

/** The first JSON object in a reply (tolerates code fences and chatter around it). */
export function extractJson(text) {
  const s = String(text ?? "");
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
  const body = fenced ? fenced[1] : s;
  const a = body.indexOf("{"), b = body.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("the reply has no JSON object");
  return JSON.parse(body.slice(a, b + 1));
}

/** The HTML document in a reply (```html fence, or <!doctype…</html>). */
export function extractHtml(text) {
  const s = String(text ?? "");
  const fenced = /```html\s*([\s\S]*?)```/i.exec(s);
  if (fenced && /<html|<!doctype/i.test(fenced[1])) return fenced[1].trim();
  const a = s.search(/<!doctype html|<html[\s>]/i), b = s.toLowerCase().lastIndexOf("</html>");
  if (a < 0 || b < a) throw new Error("the reply has no HTML page");
  return s.slice(a, b + 7);
}

// ---- AI Style Atlas prompts -------------------------------------------------------------

const field = (block, name) => {
  const m = new RegExp(`^${name}:\\s*(.+)$`, "mi").exec(block);
  return m ? m[1].trim() : "";
};

/**
 * Read a Copy-prompt text from the atlas. Returns the style card and the
 * whole text (kept as is: it is the user's own copy, stored in their install).
 * Throws with a plain reason when the text is not an atlas prompt.
 */
export function parseAtlasPrompt(text) {
  const raw = String(text ?? "").replace(/\r\n/g, "\n");
  if (!/MY CONTENT:/i.test(raw) || !/STYLE CARD/i.test(raw)) throw new Error("This doesn't look like an AI Style Atlas prompt (no MY CONTENT or STYLE CARD section). Copy it with the page's Copy prompt button.");
  if (!/REFERENCE STYLE SOURCE/i.test(raw)) throw new Error("The prompt is missing its reference code (REFERENCE STYLE SOURCE). Copy the whole prompt.");
  const cardAt = raw.search(/STYLE CARD/i);
  const card = raw.slice(cardAt, cardAt + 4000);
  const name = field(card, "Name") || (/visual style\s*\(?["“]([^"”]+)["”]/i.exec(raw)?.[1] ?? "");
  if (!name) throw new Error("Couldn't find the style's name in the STYLE CARD.");
  const fonts = [...new Set([...raw.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s>]+/g)].map((m) => m[0]))];
  const families = /Load these Google Fonts[^:]*:\s*([^\n]+)/i.exec(raw)?.[1]?.split(",").map((f) => f.trim()).filter(Boolean) ?? [];
  return {
    name,
    family: field(card, "Family"),
    look: field(card, "Look"),
    motion: field(card, "Motion"),
    explains: field(card, "How it explains"),
    fontLinks: fonts,
    fontFamilies: families,
    size: raw.length,
    raw,
  };
}

/** Folder-safe id for an imported style. */
export const styleSlug = (name) => "atlas-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/**
 * The atlas prompt with the user's content in it, plus what Video Forge needs.
 * holes = puppet spots to keep empty (from resolveSpec), words = narration timing.
 */
export function rebuildPrompt(style, { content, format = "16:9", words, holes = [], duration }) {
  const { width: W, height: H } = FORMATS[format];
  const u = unitFor(W, H);
  const withContent = style.raw.replace(/(MY CONTENT:\s*\n)([\s\S]*?)(\n\s*WHAT TO BUILD)/i, (_m, a, _old, c) => `${a}${String(content).trim()}\n${c}`);
  const timing = Array.isArray(words) && words.length
    ? `\n- Time every beat to this narration. Each entry is word@seconds; a picture lands on the word it shows. Set DURATION to ${(words[words.length - 1].end + 0.8).toFixed(1)}.\n  ${words.map((w) => `${w.text}@${w.start.toFixed(2)}`).join(" ")}\n- A voiceover will play: in scoreSound use the SOUND kit's voiceover mode rules (keep effects light).`
    : duration ? `\n- Make it ${Math.round(duration)} seconds long (DURATION).` : "";
  const spots = holes.length
    ? `\n- Puppets will be laid on top of this video. Keep these areas COMPLETELY EMPTY on every frame (background texture only, no text, no drawings, no transitions over them):\n${holes.map((h, i) => `  spot ${i + 1}: ${h.shape} centred at (${Math.round(h.cx)}, ${Math.round(h.cy)}), ${Math.round(h.w)} px across`).join("\n")}`
    : "";
  return `${withContent}

VIDEO FORGE ADDITIONS (these override the size and length above)
- Canvas: ${W}x${H} (${format}), not 1280x720. Lay every scene out for this shape; don't letterbox or squash. Scale the readability rules with the short side: headlines >= ${Math.round(44 * u)}px, labels >= ${Math.round(28 * u)}px, key numbers >= ${Math.round(64 * u)}px.${timing}${spots}
- Use only the facts in MY CONTENT. Never add numbers or claims that are not there.
- No network access except the Google Fonts stylesheet named above. No other scripts, images or files.
- Answer with the complete HTML file in one \`\`\`html code block and nothing after it.`;
}
