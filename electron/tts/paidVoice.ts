// ---------------------------------------------------------------------------
// Paid voices (ElevenLabs): who may spend, how much, and not paying twice.
//
// THE RULES
//   * A person at the window sees the number first and says yes. The yes covers
//     exactly the characters that were shown — if the job grows, it asks again.
//   * A batch nobody is watching spends nothing unless the user switched paid
//     voices on for batches, and never more than the cap they set.
//   * Every paid line is written to disk the moment it arrives. A failure on
//     line 40 of 50 keeps the 39 bought lines; the retry buys only the rest.
//
// No electron import on purpose: tools/lib/paidVoice.test.mjs runs this file.
// ---------------------------------------------------------------------------

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface PaidPolicy {
  /** "attended": somebody at the window answered. "unattended": a batch or a
   *  headless job — nobody is there to ask. */
  mode: "attended" | "unattended";
  /** attended: the characters the person said yes to. */
  approvedChars?: number;
  /** unattended: the user's switch for paid voices in batches. Off by default. */
  allowUnattended?: boolean;
  /** Most characters this policy may buy. Unset or 0 means no cap. */
  maxChars?: number;
  /** Running total of characters bought under this policy (shared by a whole
   *  batch, so the cap is for the batch, not for each video). */
  spent?: { chars: number };
}

export type Gate = { ok: true } | { ok: false; message: string };

/** May `chars` more paid characters be bought under this policy? */
export function paidGate(policy: PaidPolicy | undefined, chars: number): Gate {
  if (chars <= 0) return { ok: true };
  const n = chars.toLocaleString("en-US");
  if (!policy) {
    return { ok: false, message: `This would buy ${n} characters of paid ElevenLabs voice, and nobody has said yes to that. Nothing was bought.` };
  }
  const already = policy.spent?.chars ?? 0;
  if (policy.maxChars && policy.maxChars > 0 && already + chars > policy.maxChars) {
    return {
      ok: false,
      message:
        `The paid-voice cap is ${policy.maxChars.toLocaleString("en-US")} characters` +
        (already ? ` and ${already.toLocaleString("en-US")} are already used` : "") +
        `; this needs ${n} more. Raise the cap in Settings if you want that. Nothing more was bought.`,
    };
  }
  if (policy.mode === "unattended") {
    if (!policy.allowUnattended) {
      return {
        ok: false,
        message:
          `This batch would buy ${n} characters of paid ElevenLabs voice, and paid voices are switched off for batches. ` +
          `Turn them on in Settings (and set a cap), or pick a free voice. Nothing was bought.`,
      };
    }
    return { ok: true };
  }
  if ((policy.approvedChars ?? 0) < chars) {
    return { ok: false, message: `You said yes to ${(policy.approvedChars ?? 0).toLocaleString("en-US")} characters but this needs ${n}. Nothing was bought; try again to see the new number.` };
  }
  return { ok: true };
}

/** Estimated money for `chars` characters at a price per 1,000 characters. */
export function estimateUsd(chars: number, pricePer1000: number): number {
  return Math.round((chars / 1000) * pricePer1000 * 100) / 100;
}

/** What the person is asked before a paid narration starts. Plain words. */
export function describePaid(e: { lines: number; chars: number; reusedLines: number }, pricePer1000: number, maxChars?: number): string {
  const parts = [
    `${e.lines} line${e.lines === 1 ? "" : "s"} to buy · ${e.chars.toLocaleString("en-US")} characters (that many ElevenLabs credits).`,
    `At ${pricePer1000.toFixed(2)} USD per 1,000 characters (the price in your Settings) that is about ${estimateUsd(e.chars, pricePer1000).toFixed(2)} USD.`,
  ];
  if (e.reusedLines) parts.push(`${e.reusedLines} line${e.reusedLines === 1 ? "" : "s"} bought earlier will be reused for free.`);
  if (maxChars && maxChars > 0 && e.chars > maxChars) parts.push(`This is over your cap of ${maxChars.toLocaleString("en-US")} characters.`);
  return parts.join("\n");
}

// ---- paid lines kept on disk ------------------------------------------------

/** What makes a bought line the same line: the words as sent, the voice, the
 *  model and every voice setting. Nothing else (not colours, not layout). */
export function elevenLineKey(p: {
  text: string;
  voiceId: string;
  model: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
}): string {
  const material = JSON.stringify(["eleven-line-v1", p.text, p.voiceId, p.model, p.stability ?? null, p.similarityBoost ?? null, p.style ?? null, p.speed ?? null]);
  return crypto.createHash("sha256").update(material).digest("hex").slice(0, 32);
}

const linePath = (dir: string, key: string) => path.join(dir, `${key}.wav`);

/** A bought line, or null. A file that is too small to hold a WAV header is
 *  treated as not there (a crash mid-write cannot leave a trusted half-file,
 *  because writes go through a temp name — this is the second belt). */
export function readPaidLine(dir: string, key: string): Buffer | null {
  try {
    const b = fs.readFileSync(linePath(dir, key));
    return b.length > 44 ? b : null;
  } catch {
    return null;
  }
}

/** Keep a bought line. Temp file then rename, so it is whole or absent. */
export function savePaidLine(dir: string, key: string, audio: Buffer): void {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${linePath(dir, key)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, audio);
  fs.renameSync(tmp, linePath(dir, key));
}
