// ---------------------------------------------------------------------------
// Re-make ONE line of a finished narration (plan item #16).
//
// The line is made again by the very same code that made it the first time
// (buildNarration, one segment, same voice and settings), then spliced into a
// COPY of the narration file. The old file is never touched, so if anything
// fails the narration the person had is still exactly there.
//
// Paid voices: the caller (main.ts) asks first, with the cost, using
// askBeforeBuying — this file only receives the policy that came out of it.
// ---------------------------------------------------------------------------

import fsp from "node:fs/promises";
import path from "node:path";
import { buildNarration, type BuiltNarration, type NarrationInput } from "./buildNarration";
import { analyzeNarration } from "../audio/analyzeNarration";
import { retimeSegments, spliceWav } from "../audio/spliceLine";
import type { PaidPolicy } from "./paidVoice";

export async function remakeLine(
  req: {
    narrationPath: string;
    segments: BuiltNarration["segments"];
    index: number;
    input: NarrationInput;
    speakerOrder: string[];
  },
  outputDir: string,
  paid: PaidPolicy
): Promise<BuiltNarration> {
  const seg = req.segments[req.index];
  if (!seg) throw new Error("There is no such line in the narration.");
  const current = await fsp.readFile(req.narrationPath);

  // One line, on its own, in a folder of its own. fresh: a NEW take, not the
  // one the cache would hand straight back.
  const one = await buildNarration([req.input], [req.input.speakerId], { sameMs: 0, turnMs: 0 }, path.join(outputDir, "lines"), {
    paid,
    fresh: true,
  });
  const spliced = spliceWav(current, seg.startMs, seg.endMs, await fsp.readFile(one.filePath));
  const made = one.segments[0];
  const segments = retimeSegments(
    req.segments,
    req.index,
    spliced.newDurationMs,
    { text: made.text, mood: made.mood, tags: made.tags, openingSound: undefined },
    spliced.deltaMs
  );

  // A NEW file next to the old one. Only now, with the new file whole on disk,
  // does the caller switch over to it.
  await fsp.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `narration-${Date.now()}.wav`);
  await fsp.writeFile(filePath, spliced.buffer);
  return { filePath, segments, analysis: analyzeNarration(spliced.buffer, segments, req.speakerOrder) };
}
