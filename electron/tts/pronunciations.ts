// ---------------------------------------------------------------------------
// "Say it like this" (13 Oct 2026): words the voice gets wrong — a brand, a
// name, an English word in a Greek script — and how to say them. One list per
// computer, in the app's own folder, applied to every voice before it speaks.
// Subtitles keep the script's own spelling.
// ---------------------------------------------------------------------------
import fsp from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

export interface SayItLike {
  word: string;
  say: string;
}

const file = () => path.join(app.getPath("userData"), "pronunciations.json");

export async function loadPronunciations(): Promise<SayItLike[]> {
  try {
    const list = JSON.parse(await fsp.readFile(file(), "utf8"));
    return Array.isArray(list) ? list.filter((x) => x && typeof x.word === "string" && typeof x.say === "string") : [];
  } catch {
    return [];
  }
}

export async function savePronunciations(list: SayItLike[]): Promise<void> {
  const clean = list
    .filter((x) => x && typeof x.word === "string" && typeof x.say === "string" && x.word.trim())
    .map((x) => ({ word: x.word.trim().slice(0, 80), say: x.say.trim().slice(0, 160) }))
    .slice(0, 500);
  await fsp.writeFile(file(), JSON.stringify(clean, null, 1), "utf8");
}
