import { engineOf, geminiModeOf, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_VOICE } from "../../lib/narration/geminiVoices";
import { useEffect, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useVoicesStore } from "../../store/useVoicesStore";
import { parseScript } from "../../lib/narration/parseScript";
import { parseDramaboxScript } from "../../lib/narration/parseDramaboxScript";
import { SCRIPT_STARTERS } from "../../lib/narration/scriptStarters";
import { Slider } from "../ui/Slider";
import { Picker } from "../ui/Picker";

const LANGUAGES = [
  { code: "el", label: "Greek" },
  { code: "en", label: "English" },
];

interface NarrationResult {
  filePath: string;
  segments: { speakerId: string; speakerLabel: string; text: string; startMs: number; endMs: number }[];
}

/**
 * The actual Phase 2 goal: turn a script into ONE combined narration audio
 * file using each speaker's assigned Piper voice.
 *
 * THIS IS THE PIPER PATH. DramaBox does not synthesise here — it runs on a
 * rented GPU, so the app's side of it is "Write DramaBox files…" below, which
 * saves what that box reads.
 */
export default function NarrationPanel() {
  const speakers = useProjectStore((s) => s.speakers);
  const updateSpeaker = useProjectStore((s) => s.updateSpeaker);
  const script = useProjectStore((s) => s.script);
  const setScript = useProjectStore((s) => s.setScript);
  const language = useProjectStore((s) => s.language);
  const setLanguage = useProjectStore((s) => s.setLanguage);
  const setNarration = useProjectStore((s) => s.setNarration);
  const pauseSameMs = useProjectStore((s) => s.pauseSameMs);
  const pauseTurnMs = useProjectStore((s) => s.pauseTurnMs);
  const setPauses = useProjectStore((s) => s.setPauses);
  const piperPythonPath = useSettingsStore((s) => s.defaults.piperPythonPath);
  const piperVoices = useVoicesStore((s) => s.voices);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  /** What the last "write DramaBox files" run did, said in full. */
  const [blocksNote, setBlocksNote] = useState<string | null>(null);
  const [unmatchedLines, setUnmatchedLines] = useState<string[]>([]);
  const [result, setResult] = useState<NarrationResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // GLM-5.2 took 274s on a real key here — well inside the 5 minute timeout,
  // but a button that just says "Drafting…" for four and a half minutes is
  // indistinguishable from a hang. A ticking counter is the whole fix.
  const [draftSec, setDraftSec] = useState(0);
  useEffect(() => {
    if (!drafting) return;
    setDraftSec(0);
    const id = window.setInterval(() => setDraftSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [drafting]);

  const runDraft = async () => {
    // Every one of these used to be a silent `return`, which is exactly why
    // the button appeared to do nothing at all. Always say why.
    setDraftError(null);
    if (speakers.length === 0) {
      setDraftError("Add at least one speaker on the Canvas tab first — the draft is written as dialogue between your speakers.");
      return;
    }
    if (!topic.trim()) {
      setDraftError("Enter a topic first.");
      return;
    }
    if (script.trim() && !window.confirm("This will replace your current script. Continue?")) return;

    setDrafting(true);
    try {
      const languageName = LANGUAGES.find((l) => l.code === language)?.label ?? language;
      const draft = await window.byok.llm.draftScript({
        topic,
        speakerLabels: speakers.map((s) => s.label),
        characters: speakers.map((s) => `${s.label}: ${s.openingPhrase ?? "a speaker"}`),
        languageName,
        tone: tone.trim() || undefined,
      });
      setScript(draft);
    } catch (e: any) {
      setDraftError(e?.message ?? String(e));
    } finally {
      setDrafting(false);
    }
  };

  /** Write the GPU box's two files for the current script and cast.
   *
   *  Everything a speaker carries goes with them — opening phrase, reference
   *  clip, engine settings, whether the app may add expression. What it changed
   *  is printed rather than left to be discovered in the audio. */
  const writeBlocks = async () => {
    setBlocksNote(null);
    const dir = await window.byok.dialog.saveFile("blocks.json", [
      { name: "JSON", extensions: ["json"] },
    ]);
    if (!dir) return;
    const outDir = dir.replace(/[/\\][^/\\]*$/, "");

    const res = await window.byok.dramabox.writeBlocks(
      script,
      speakers.map((s) => ({
        id: s.id,
        label: s.label,
        openingPhrase: s.openingPhrase ?? s.label,
        voiceRef: s.voiceRef,
        dramabox: s.dramabox,
        expression: s.expression,
      })),
      outDir
    );

    setBlocksNote(
      res.ok
        ? [`${res.count} blocks written to ${outDir}`, ...res.summary].join("\n")
        : res.errors.join("\n")
    );
  };

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    setResult(null);
    setAudioUrl(null);

    // TWO SCRIPT STYLES, as in the batch runner: "Name: line", or the prose
    // style the course was written in (A bright woman speaks warmly, "…"),
    // where each character is found by the phrase they open with.
    let { segments, unmatchedLines: unmatched } = parseScript(script, speakers);
    if (segments.length === 0) {
      const prose = parseDramaboxScript(
        script,
        speakers.map((sp, i) => ({ id: sp.id, label: sp.label, openingPhrase: sp.openingPhrase ?? `Speaker ${i + 1}` }))
      );
      if (prose.segments.length > 0) ({ segments, unmatchedLines: unmatched } = prose);
    }
    setUnmatchedLines(unmatched);

    if (segments.length === 0) {
      setGenError(
        "No line matched a character. Write each line as \"Name: words\" using the names from the Cast step, " +
          "or start each line with the character's opening phrase (set in Cast → Character)."
      );
      setGenerating(false);
      return;
    }

    const speakerById = new Map(speakers.map((s) => [s.id, s]));
    // Only Piper needs a voice file picked; Gemini falls back to the default
    // voice, ElevenLabs is checked by its own engine.
    const missingVoice = segments.find((seg) => {
      const sp = speakerById.get(seg.speakerId);
      if (!sp) return true;
      return engineOf(sp) === "piper" && !sp.voiceId;
    });
    if (missingVoice) {
      setGenError(`Speaker "${missingVoice.speakerLabel}" uses Piper but has no Piper voice picked below.`);
      setGenerating(false);
      return;
    }

    try {
      const resolvedSegments = segments.map((seg) => {
        const sp = speakerById.get(seg.speakerId)!;
        const engine = engineOf(sp);
        return {
          speakerId: seg.speakerId,
          speakerLabel: seg.speakerLabel,
          text: seg.text,
          language,
          engine,
          pitch: sp.pitch ?? 0,
          speed: sp.speed ?? 1,
          breathMs: sp.breathMs,
          direction: seg.direction,
          piperPythonPath,
          piperOnnxPath: sp.voiceId,
          elevenVoiceId: sp.elevenVoiceId,
          elevenModel: sp.elevenModel,
          eleven: sp.eleven,
          gemini:
            engine === "gemini"
              ? {
                  mode: geminiModeOf(sp.geminiModel ?? DEFAULT_GEMINI_MODEL),
                  model: sp.geminiModel ?? DEFAULT_GEMINI_MODEL,
                  voice: sp.geminiVoice ?? DEFAULT_GEMINI_VOICE,
                  persona: sp.openingPhrase,
                }
              : undefined,
        };
      });

      const res = await window.byok.tts.generateNarration(
        resolvedSegments,
        speakers.map((s) => s.id),
        { sameMs: pauseSameMs, turnMs: pauseTurnMs },
        // A paid voice asks "this will cost about …" before anything is bought.
        { pricePer1000: useSettingsStore.getState().elevenPricePer1000Usd }
      );
      setResult(res);
      // Publish it so the render bar can attach it and match its length
      // without the user hand-picking the file, and so the waveform can be
      // driven by the real audio instead of the placeholder animation.
      setNarration({
        filePath: res.filePath,
        segments: res.segments,
        analysis: res.analysis,
      });
      const buf = await window.byok.storage.readFile(res.filePath);
      const blob = new Blob([buf], { type: "audio/wav" });
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      setGenError(e?.message ?? String(e));
    } finally {
      setGenerating(false);
    }
  };

  const names = speakers.map((s) => s.label);
  const lines = script.split("\n").filter((l) => l.trim()).length;
  return (
    <div className="forge-script h-full">
      {/* LEFT: where the words come from, and the words */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
        <div>
          <div className="label-etched mb-2" data-tip="A skeleton for the kind of video you're making, with your speakers' names filled in. «…» marks where your own words go.">
            Start from
          </div>
          <div className="flex flex-wrap gap-2">
            {SCRIPT_STARTERS.map((st) => (
              <button
                key={st.id}
                className="btn"
                data-tip={st.tip}
                onClick={() => {
                  if (script.trim() && !window.confirm("Replace the current script with this starter?")) return;
                  setScript(st.build(names, language));
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <details className="forge-sec">
          <summary data-tip="Describe the video and get a first draft in the right format, using your speakers. You can edit everything after.">
            Write it with AI
          </summary>
          <div className="space-y-2 pt-3">
            <input type="text" placeholder="What is it about? e.g. 'why dogs chase butterflies'" data-tip="Say what the video is about in a few words. The AI uses it to write a first script." value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full" />
            <input type="text" placeholder="Tone (optional), e.g. playful, calm, serious" data-tip="Optional. The feeling you want, like playful or calm, so the AI writes in that style." value={tone} onChange={(e) => setTone(e.target.value)} className="w-full" />
            <button onClick={runDraft} disabled={drafting} className="btn" data-tip="Asks the AI to write a first version of your script. You can change anything afterwards.">
              {drafting ? `Writing… ${draftSec}s` : "Write a draft"}
            </button>
            {draftError && <p className="text-sm text-red-400 whitespace-pre-wrap">{draftError}</p>}
          </div>
        </details>

        <div className="flex flex-col gap-2 flex-1 min-h-[300px]">
          <div className="flex items-center justify-between">
            <span className="label-etched" data-tip="One line per speech: the speaker's name, a colon, their words. [laughs], [whispers], [points] are acted, never read out.">
              The script
            </span>
            <span className="text-xs text-neutral-500">{lines} line{lines === 1 ? "" : "s"}</span>
          </div>
          <textarea
            value={script}
            data-tip="Type or paste your script here, one line for each thing a speaker says."
            onChange={(e) => setScript(e.target.value)}
            placeholder={`${names[0] ?? "Speaker 1"}: Hello there!\n${names[1] ?? "Speaker 2"}: [laughs] Hi, good to see you.`}
            className="forge-script-text flex-1 resize-none"
            spellCheck={false}
          />
          {unmatchedLines.length > 0 && (
            <div className="text-sm text-amber-300 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2">
              {unmatchedLines.length} line(s) didn't match a speaker and were skipped:
              <ul className="list-disc pl-5 mt-1">
                {unmatchedLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: settings for the whole narration, and making it */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="forge-sec space-y-3">
          <div data-tip="The language the voices speak and the subtitles are written in.">
            <span className="label-etched">Language</span>
            <Picker
              aria-label="Language"
              className="w-full mt-1"
              value={language}
              options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
              onChange={setLanguage}
            />
          </div>
          <div data-tip="The short pause when the same person says two lines in a row. A speaker can have their own in Cast → Voice.">
            <Slider label="Breath" value={pauseSameMs} min={0} max={800} step={10} onChange={(v) => setPauses({ sameMs: Math.round(v) })} format={(v) => `${(v / 1000).toFixed(2)} s`} />
          </div>
          <div data-tip="The pause when the next person starts talking. Too short sounds stitched together.">
            <Slider label="Turn pause" value={pauseTurnMs} min={0} max={1500} step={10} onChange={(v) => setPauses({ turnMs: Math.round(v) })} format={(v) => `${(v / 1000).toFixed(2)} s`} />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={generating || !script.trim()}
          className="btn btn-primary"
          data-tip="Makes every line with each speaker's voice, checks it, and joins them. Free voices take about 10–20 seconds a line."
        >
          {generating ? "Making the narration…" : "Make the narration"}
        </button>
        {genError && <p className="text-sm text-red-400 whitespace-pre-wrap">{genError}</p>}

        {audioUrl && result && (
          <div className="forge-sec space-y-3">
            <div className="label-etched">The narration</div>
            <audio src={audioUrl} controls className="w-full" />
            <details>
              <summary className="text-sm text-neutral-400 cursor-pointer">{result.segments.length} lines — show timings</summary>
              <div className="space-y-1 mt-2">
                {result.segments.map((seg, i) => (
                  <div key={i} className="text-xs flex gap-2">
                    <span className="text-accent shrink-0 tabular-nums">{(seg.startMs / 1000).toFixed(1)}s</span>
                    <span className="shrink-0 text-neutral-400">{seg.speakerLabel}</span>
                    <span>{seg.text}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
