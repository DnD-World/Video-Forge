// THE PILOT (ultra plan §3, 26 Oct 2026): one character per subject, two
// looks each, base pictures only — 14 pictures, so Ak picks a look per subject
// before any money goes on full puppets.
//   node tools/puppets/pilot.mjs        -> tools/puppets/pilot.json (the jobs)
// Then: python -I tools/puppets/vrun.py tools/puppets/pilot.json puppet-run/pilot pilot
// Every design is our own; no show, film or game character is copied.
import fs from "node:fs";
import * as R from "./recipe.mjs";

const CAST = [
  { subject: "D&D", slug: "dnd-dwarf", styles: ["pixar", "paper"], description: "a sturdy dwarf fighter with a short braided red beard, a round iron helmet, plain grey chainmail over a brown tunic, and a round wooden shield on his back" },
  { subject: "Dogs and puppies", slug: "dog-lab-puppy", styles: ["pixar", "flat"], description: "a happy yellow Labrador puppy with floppy ears, standing upright like a person, wearing a small plain red bandana" },
  { subject: "Narcissism and manipulation defence", slug: "nm-wise-friend", styles: ["flat", "paper"], description: "the wise friend, a calm middle-aged woman with short grey hair, kind brown eyes, a plain teal jacket over a white top and dark trousers" },
  { subject: "Life coaching and soft skills", slug: "lc-coach", styles: ["pixar", "flat"], description: "a friendly life coach, a young man with short black hair, warm brown skin, a plain mustard-yellow sweater and dark blue trousers" },
  { subject: "Seasonal", slug: "season-santa", styles: ["clay", "pixar"], description: "a jolly Santa Claus with a white beard, rosy cheeks, a red suit with white trim, a black belt and black boots" },
  { subject: "ELI5 AI and automation", slug: "ai-helper-robot", styles: ["flat", "clay"], description: "a friendly helper robot with a round white head, a simple dark face screen with two round glowing eyes, a light blue body, two arms and two legs" },
  { subject: "Pop-culture ethics and tropes", slug: "trope-mentor", styles: ["anime", "paper"], description: "the Mentor, an old wise woman with long white hair in a bun, a plain dark green robe, and a wooden walking staff" },
];

const jobs = [];
for (const c of CAST) {
  const look = { key: R.keyColourFor(c.description), lips: false, animal: R.isAnimal(c.description), teeth: R.teethFor(c.description) };
  for (const style of c.styles) {
    look.lips = R.lipsFor(c.description, style);
    jobs.push({
      key: `${c.slug}_${style}_full_base`,
      subject: c.subject,
      slug: c.slug,
      style,
      framing: "full",
      description: c.description,
      look: { ...look },
      refs: [],
      prompt: R.basePrompt({ description: c.description, style, framing: "full", inspirations: 0, look }),
      negative: R.baseNegative(style),
    });
  }
}
const out = new URL("./pilot.json", import.meta.url);
fs.writeFileSync(out, JSON.stringify(jobs, null, 1));
console.log(jobs.length, "jobs:", jobs.map((j) => `${j.key}(${j.look.key.name})`).join(" "));
