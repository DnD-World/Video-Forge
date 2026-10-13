// ---------------------------------------------------------------------------
// Settings → "Say it like this" (13 Oct 2026): the words a voice gets wrong,
// and how to say them. Plus the interface language, coming later.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";

type Row = { word: string; say: string };

export function SayItCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    void window.byok.voice.pronunciations().then((l) => setRows(l.length ? l : [{ word: "", say: "" }]));
  }, []);
  const save = async (next: Row[]) => {
    setRows(next);
    await window.byok.voice.savePronunciations(next.filter((r) => r.word.trim() && r.say.trim()));
    setSaved("Saved — used from the next narration on.");
    window.setTimeout(() => setSaved(""), 2500);
  };
  return (
    <div className="forge-sec space-y-3" data-tip="Words the voice says wrong, and how it should say them. Used by every voice; the subtitles keep your spelling.">
      <div className="label-lit">Say it like this</div>
      <p className="text-sm text-neutral-400">
        A brand, a name, an English word in a Greek script — write it the way it should sound. Greek words typed without their
        stress mark (τόνος) get it automatically before the voice reads them.
      </p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            type="text"
            value={r.word}
            placeholder="In the script, e.g. Skroutz"
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, word: e.target.value } : x)))}
            onBlur={() => void save(rows)}
            data-tip="The word as it is written in your script."
          />
          <input
            type="text"
            value={r.say}
            placeholder="Say it as, e.g. Σκρουτζ"
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, say: e.target.value } : x)))}
            onBlur={() => void save(rows)}
            data-tip="How the voice should say it. Write it the way it sounds, in the voice's language."
          />
          <button className="btn" onClick={() => void save(rows.filter((_, j) => j !== i))} data-tip="Take this word off the list.">
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button className="btn" onClick={() => setRows([...rows, { word: "", say: "" }])} data-tip="Add another word to the list.">
          Add a word
        </button>
        {saved && <span className="text-sm text-neutral-400">{saved}</span>}
      </div>
    </div>
  );
}

/** The app's own language: English now, the rest later, simple words only (Ak, 13 Oct 2026). */
export function LanguageCard() {
  const langs: [string, string, boolean][] = [
    ["English", "English", true],
    ["Ελληνικά", "Greek", false],
    ["Français", "French", false],
    ["Deutsch", "German", false],
    ["Español", "Spanish", false],
    ["Português", "Portuguese", false],
  ];
  return (
    <div className="forge-sec space-y-3">
      <div className="label-lit">Language</div>
      <p className="text-sm text-neutral-400">
        The language the app's own words are in. More are coming once the app has settled. Your videos can already be in Greek, English and more.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {langs.map(([own, en, ready]) => (
          <div
            key={en}
            data-tip={ready ? "The language the app is in now." : `${en}: coming soon.`}
            className={`rounded-xl border px-3 py-2 ${ready ? "border-[var(--accent)] text-[var(--ink)]" : "border-[var(--line)] text-neutral-500"}`}
          >
            <div className="text-sm">{own}</div>
            <div className="text-xs">{ready ? "in use" : "coming soon"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
