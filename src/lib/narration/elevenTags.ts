// ---------------------------------------------------------------------------
// The same script, spoken by a different engine.
//
// DramaBox takes its acting from the words OUTSIDE the quotes:
//
//     A bright woman sighs heavily, "Ουφ, δεν την καταλαβαίνω."
//
// ElevenLabs v3 takes its acting from a bracketed tag INSIDE the text:
//
//     [sighs] Ουφ, δεν την καταλαβαίνω.
//
// Both carry the same instruction; only where it sits differs. So the script
// does not change and nobody writes a lesson twice — the direction the parser
// already pulled off each span is turned into a tag here, at the last moment
// before synthesis, for characters on v3 and for nobody else.
//
// WHY NOT A SECOND SCRIPT FORMAT. Because a lesson proofread in one format and
// spoken in another was not proofread, which is the reason the DramaBox path
// stopped converting anything in the first place. A tag built here is visible
// in the log and never reaches the subtitle: `segment.text` stays the clean
// Greek it always was.
// ---------------------------------------------------------------------------

/** The directions docs/SCRIPT-GEM.md lists as known to fire, mapped to the tag
 *  that means the same thing to v3.
 *
 *  Curated rather than generated because the two engines do not share a
 *  vocabulary: `sucks in a startled inhale` is a DramaBox phrase and v3 has a
 *  one-word tag for it. Anything not here still becomes a tag — see below —
 *  so a new direction degrades to something reasonable instead of nothing. */
const TAGS: Record<string, string> = {
  "speaks warmly": "warmly",
  "speaks evenly": "calm",
  "speaks heavily": "solemn",
  "speaks tenderly": "tenderly",
  "speaks shakily": "nervously",
  "speaks with frustration": "frustrated",
  "speaks with cold menace": "menacing",
  "speaks with quiet awe": "in awe",
  "speaks with smug pride": "smug",
  "speaks quietly": "quietly",
  pauses: "pauses",
  continues: "continues",
  chuckles: "chuckles",
  "chuckles darkly": "chuckles darkly",
  "chuckles confidently": "chuckles",
  giggles: "giggles",
  "sighs heavily": "sighs",
  "sighs with despair": "sighs sadly",
  "gasps with shock": "gasps",
  "hums quietly": "hums",
  "clears her throat": "clears throat",
  "clears his throat": "clears throat",
  "coughs once": "coughs",
  "yawns deeply": "yawns",
  "wheezes with laughter": "wheezing laugh",
  "takes a shaky breath": "shaky breath",
  "blows out a long exhale": "exhales",
  "sucks in a startled inhale": "sharp inhale",
  "breathes deeply": "breathes deeply",
  "breathes out slowly": "exhales",
  "snaps furiously": "angry",
  "stammers nervously": "stammers",
  "sharpens suddenly": "sharply",
  "slows right down": "slowly",
  "drops to a whisper": "whispers",
  "calls across the field": "shouting",
  "cheers loudly": "excited",
  "bursts into uncontrollable laughter": "laughs",
  "begins to cry": "crying",
  "weeps softly": "sobbing",
  "lets out a wet sniffle": "sniffles",
  "makes a tsk-tsk sound": "disapproving",
  "leans in, suddenly serious": "serious",
  "gabbles it out in one breath": "rushed",
  "tilts her head": "curious",
  "voice rises with fury": "shouting angrily",
};

/** Everything at the front of a direction that names WHO, not HOW.
 *
 *  A first span opens with the whole character phrase — "A bright woman sighs
 *  heavily" — and every later one with a pronoun. Neither is an instruction,
 *  and «A bright woman» left inside a tag is a description v3 would try to
 *  perform. */
const SUBJECT =
  /^(?:a|an|the)?\s*[\p{L}]*\s*(?:woman|man|person|girl|boy|voice)\s+|^(?:she|he|they|it)\s+/iu;

/** One direction in, one tag out — or nothing, when there is no instruction.
 *
 *  Exported for the Cast panel's preview and for tests; the pipeline uses
 *  `withAudioTags` below. */
export function tagForDirection(direction: string | undefined): string | undefined {
  if (!direction) return undefined;

  // Lower-cased, subject removed, trailing comma gone. What is left is the
  // instruction and only the instruction.
  let phrase = direction.trim().replace(/[,.;:]+$/, "");
  phrase = phrase.replace(SUBJECT, "").trim();
  // A direction can carry two beats — "leans in, suddenly serious". The map
  // holds the whole phrase where that matters and the first clause otherwise.
  const key = phrase.toLowerCase();
  if (!key) return undefined;

  const mapped = TAGS[key];
  if (mapped) return `[${mapped}]`;

  // A first clause is worth trying before giving up: "speaks warmly, still
  // smiling" is a direction the map does not hold and "speaks warmly" is.
  // ONLY when the map actually holds it — splitting on the comma regardless
  // turned "speaks with a low, serious tone" into `[with a low]`, which is
  // not English, let alone an instruction.
  const firstClause = key.split(",")[0].trim();
  if (firstClause && TAGS[firstClause]) return `[${TAGS[firstClause]}]`;

  // A DIRECTION THE VOICE CANNOT PERFORM IS NOT A TAG. "claps her hands" and
  // "nods slowly" are things a body does; v3 is given a voice and nothing
  // else, and an instruction it cannot follow is either ignored or, worse,
  // performed as a sound. No tag means natural delivery, which is exactly
  // what a nod sounds like.
  //
  // Unless the direction reaches the voice anyway — "raises her voice",
  // "shifts his tone" — where the physical verb is only how it was phrased.
  if (PHYSICAL_ONLY.test(key) && !/\b(voice|tone|breath)\b/.test(key)) {
    return undefined;
  }

  // Everything else becomes a tag as written. v3's tags are natural language
  // rather than a closed list, so an unmapped direction is still a usable
  // instruction — better a tag that reads a little long than a line delivered
  // flat because a writer used a wording nobody had listed yet.
  //
  // Trimmed of the leading verb where it adds nothing: v3 wants a manner, and
  // "speaks" is every line by definition.
  return `[${key.replace(/^speaks\s+/, "")}]`;
}

/** Verbs whose direction describes a body, not a voice. */
const PHYSICAL_ONLY =
  /^(nods|claps|winces|leans|shrugs|gestures|points|waves|steps|turns|tilts|shakes|raises)\b/;

/** The text as it should be SENT to v3: the tag, then the Greek.
 *
 *  The tag is billed like any other character, which is why this is also what
 *  the credit count is taken from. */
export function withAudioTags(text: string, direction?: string): string {
  const tag = tagForDirection(direction);
  return tag ? `${tag} ${text}` : text;
}
