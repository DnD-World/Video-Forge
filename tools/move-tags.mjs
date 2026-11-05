// Write docs/MOVE-TAGS.md: every script tag a drawn character answers to, straight from the
// motion library, so the list never drifts from what the app really does (5 Nov 2026).
//   node tools/move-tags.mjs           write the file
//   node tools/move-tags.mjs --check   exit 1 if the file is out of date (moves.test.mjs runs this)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SHELF, STYLE_IDS } from "../characters/core/index.mjs";
import { ACTED_DATA } from "../characters/moves/acted/shelf.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs/MOVE-TAGS.md");
const acted = new Set(ACTED_DATA.map((m) => m.id));
const KINDS = [
  ["gesture", "Gestures", "Arms and hands; the body stays where it is."],
  ["pose", "Poses", "A position the character takes and holds while the line lasts."],
  ["stance", "Stances", "How the character stands or sits for the line."],
  ["idle", "Idle", "Small movement while waiting or listening."],
  ["travel", "Moving around", "Walking, running, coming in and going out."],
  ["pair", "With someone else", "Two characters together; name the other one: [gives the box to Maria]."],
];
const cell = (s) => String(s ?? "").replace(/\|/g, "\|").replace(/\n/g, " ");

export function moveTagsMarkdown() {
  const moves = Object.values(SHELF).filter((m) => m.phrases.length);
  const lines = [
    "# Move tags",
    "",
    "Every tag a **drawn character** acts out, written in square brackets in the script:",
    "`Maria: [walks in] Good morning!`. The longest matching words win, so `[walks in from the right]`",
    "beats `[walks in]`. Generated from the motion library by `node tools/move-tags.mjs`; do not edit by hand.",
    "",
    "- **Style word** after a move changes how it looks: " + STYLE_IDS.filter((s) => s !== "neutral").map((s) => `\`${s}\``).join(", ") + " (e.g. `[walks in tired]`, `[waves shyly]`).",
    "- **Props**: name one and the character holds it: `[drinks his coffee]`, `[gives the flowers to Maria]`.",
    "- **Sounds are not moves.** `[laughs]`, `[cries]`, `[gasps]` go to the voice, which performs them (docs/WRITING-SCRIPTS.md).",
    "- 🎥 = copied from a real person's recorded movement (free motion-capture libraries), not hand-animated.",
    "",
    `${moves.length} moves, ${moves.reduce((n, m) => n + m.phrases.length, 0)} tags.`,
    "",
  ];
  for (const [kind, title, sub] of KINDS) {
    const list = moves.filter((m) => m.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length) continue;
    lines.push(`## ${title}`, "", sub, "", "| Move | Tags | What it does |", "|---|---|---|");
    for (const m of list) lines.push(`| ${cell(m.name)}${acted.has(m.id) ? " 🎥" : ""} | ${m.phrases.map((p) => `\`[${cell(p)}]\``).join(" ")} | ${cell(m.help)} |`);
    lines.push("");
  }
  const other = moves.filter((m) => !KINDS.some(([k]) => k === m.kind));
  if (other.length) {
    lines.push("## Other", "", "| Move | Tags | What it does |", "|---|---|---|");
    for (const m of other) lines.push(`| ${cell(m.name)} | ${m.phrases.map((p) => `\`[${cell(p)}]\``).join(" ")} | ${cell(m.help)} |`);
    lines.push("");
  }
  return lines.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const md = moveTagsMarkdown();
  const now = fs.existsSync(out) ? fs.readFileSync(out, "utf8").replace(/\r\n/g, "\n") : "";
  if (process.argv.includes("--check")) {
    if (now !== md) { console.error("docs/MOVE-TAGS.md is out of date: run node tools/move-tags.mjs"); process.exit(1); }
    console.log("docs/MOVE-TAGS.md is current");
  } else { fs.writeFileSync(out, md); console.log(`wrote docs/MOVE-TAGS.md`); }
}
