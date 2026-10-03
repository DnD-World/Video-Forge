// ---------------------------------------------------------------------------
// Proofreading a "Name: text" script before any voice is generated.
//
// parseScript is forgiving on purpose — a typo in one line shouldn't block the
// rest — which means it is also SILENT: a misspelt name just drops the line,
// and the first anyone hears of it is a gap in the finished video. This reads
// the same script the same way and says, line by line and in plain words, what
// will go wrong and how to fix it.
//
// The DramaBox checker in electron/tts/checkScript.ts is a different job (its
// rules are about prompt wording) and is untouched.
// ---------------------------------------------------------------------------

export interface LineProblem {
  /** 1-based, as an editor counts. 0 when the problem isn't one line's. */
  line: number;
  text: string;
  problem: string;
  fix: string;
  /** "error" lines will be skipped or fail; "warn" lines will work, badly. */
  severity: "error" | "warn";
}

interface SpeakerLike {
  id: string;
  label: string;
  voiceId?: string;
}

/** Lower-case and strip accents, so "Καιτη" and "καίτη" compare equal. */
function norm(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

/** The speaker a mistyped name most likely meant, if any is close enough. */
function closest(label: string, speakers: SpeakerLike[]): SpeakerLike | null {
  const n = norm(label);
  let best: SpeakerLike | null = null;
  let bestD = Infinity;
  for (const sp of speakers) {
    const d = distance(n, norm(sp.label));
    if (d < bestD) {
      bestD = d;
      best = sp;
    }
  }
  // Allow roughly one slip per three letters — enough for a missing accent or
  // a swapped letter, not enough to "correct" a genuinely different name.
  return best && bestD <= Math.max(1, Math.floor(norm(best.label).length / 3)) ? best : null;
}

/** Lines past this length make long subtitles and a breathless read. */
const LONG_LINE = 350;

export function checkScriptLines<S extends SpeakerLike>(
  script: string,
  speakers: S[],
  opts: { needsVoice: (sp: S) => boolean }
): LineProblem[] {
  const problems: LineProblem[] = [];

  if (speakers.length === 0) {
    problems.push({
      line: 0,
      text: "",
      problem: "There are no speakers yet.",
      fix: "Add at least one speaker in the Cast step — every line needs someone to say it.",
      severity: "error",
    });
    return problems;
  }

  const byNorm = new Map(speakers.map((sp) => [norm(sp.label), sp]));
  const used = new Map<string, number>(); // speaker id → first line

  script.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;
    if (!line) return;

    if (/^\[\s*(?:ΗΧΟΣ|HXOΣ|SFX)\s*:/iu.test(line)) {
      problems.push({
        line: n,
        text: line,
        problem: "Sound-effect cues only work in batch mode for now.",
        fix: "This line will be skipped here. Add the sound in Cast › Sound effects instead.",
        severity: "warn",
      });
      return;
    }

    const idx = line.indexOf(":");
    if (idx === -1) {
      problems.push({
        line: n,
        text: line,
        problem: "This line doesn't say who is speaking.",
        fix: `Start it with a name and a colon, like "${speakers[0].label}: ${line.slice(0, 30)}…"`,
        severity: "error",
      });
      return;
    }

    const rawLabel = line.slice(0, idx).trim();
    const bracket = rawLabel.match(/^(.*?)\s*\[([^\]]*)\]\s*$/);
    const label = (bracket ? bracket[1] : rawLabel).trim();
    const text = line.slice(idx + 1).trim();

    // Exact match is what parseScript does (case-insensitive). An accent-only
    // difference still FAILS there, so it is reported, with the fix.
    const exact = speakers.find((sp) => sp.label.trim().toLowerCase() === label.toLowerCase());
    if (!exact) {
      const guess = byNorm.get(norm(label)) ?? closest(label, speakers);
      problems.push({
        line: n,
        text: line,
        problem: `No speaker is called "${label}".`,
        fix: guess
          ? `Did you mean "${guess.label}"? Names must match exactly, accents included.`
          : `Fix the name, or add a speaker called "${label}" in the Cast step.`,
        severity: "error",
      });
      return;
    }

    if (!text) {
      problems.push({
        line: n,
        text: line,
        problem: "Nothing to say after the colon.",
        fix: "Add the words, or delete the line.",
        severity: "error",
      });
      return;
    }

    if (text.length > LONG_LINE) {
      problems.push({
        line: n,
        text: line.slice(0, 80) + "…",
        problem: `Very long line (${text.length} characters).`,
        fix: "Split it into two or three lines — subtitles and pacing both get better.",
        severity: "warn",
      });
    }

    if (!used.has(exact.id)) used.set(exact.id, n);
  });

  for (const sp of speakers) {
    const first = used.get(sp.id);
    if (first !== undefined && opts.needsVoice(sp)) {
      problems.push({
        line: first,
        text: "",
        problem: `${sp.label} has no voice yet.`,
        fix: "Pick one in the Cast step.",
        severity: "error",
      });
    }
  }

  if (used.size === 0 && problems.every((p) => p.severity !== "error")) {
    problems.push({
      line: 0,
      text: "",
      problem: "The script is empty.",
      fix: "Write a few lines, paste a script, or use Write it for me.",
      severity: "error",
    });
  }

  return problems.sort((a, b) => a.line - b.line);
}
