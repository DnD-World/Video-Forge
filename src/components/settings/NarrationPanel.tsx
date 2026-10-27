import { engineOf } from "../../lib/narration/geminiVoices";
import { narrationInputFor, parseAnyScript, scriptLineFor } from "../../lib/narration/resolveSegments";
import { ErrorLine } from "../ui/ErrorLine";
import { plainError } from "../../lib/plainError";
import { useEffect, useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useVoicesStore } from "../../store/useVoicesStore";
import { SCRIPT_STARTERS } from "../../lib/narration/scriptStarters";
import { Slider } from "../ui/Slider";
import { Picker } from "../ui/Picker";
import { usePlayer } from "../../lib/motion/usePreviewPlayer";

const LANGUAGES = [
  { code: "el", label: "Greek" },
  { code: "en", label: "English" },
];

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
  const narration = useProjectStore((s) => s.narration);
  const attachedAudio = useProjectStore((s) => s.attachedAudio);
  const player = usePlayer();
  const [remaking, setRemaking] = useState<number | null>(null);
  const [remakeNote, setRemakeNote] = useState<string | null>(null);
  const [remakeError, setRemakeError] = useState<string | null>(null);

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
      setDraftError(plainError(e, "Press Write a draft to try again."));
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

    // TWO SCRIPT STYLES, as in the batch runner (see parseAnyScript).
    const { segments, unmatchedLines: unmatched } = parseAnyScript(script, speakers);
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
      const resolvedSegments = segments.map((seg) => narrationInputFor(seg, speakerById.get(seg.speakerId)!, language, piperPythonPath));

      const res = await window.byok.tts.generateNarration(
        resolvedSegments,
        speakers.map((s) => s.id),
        { sameMs: pauseSameMs, turnMs: pauseTurnMs },
        // A paid voice asks "this will cost about …" before anything is bought.
        { pricePer1000: useSettingsStore.getState().elevenPricePer1000Usd }
      );
      // Publish it so the render bar can attach it and match its length
      // without the user hand-picking the file, and so the waveform can be
      // driven by the real audio instead of the placeholder animation.
      setNarration({
        filePath: res.filePath,
        segments: res.segments,
        analysis: res.analysis,
      });
    } catch (e: any) {
      setGenError(plainError(e, "Press Make the narration to try again."));
    } finally {
      setGenerating(false);
    }
  };

  /** Make one line again — same voice and settings — and splice it in. A paid
   *  voice shows its cost in a window and waits for a yes (main process). */
  const remake = async (i: number) => {
    if (!narration) return;
    const seg = narration.segments[i];
    const sp = speakers.find((x) => x.id === seg.speakerId);
    setRemakeNote(null);
    setRemakeError(null);
    if (!sp) {
      setRemakeError(`The speaker "${seg.speakerLabel}" is not in the Cast any more, so there is no voice to make this line with.`);
      return;
    }
    if (sp.ttsEngine === "dramabox") {
      setRemakeError(`${sp.label} speaks with DramaBox, which is made on the rented graphics machine and not inside this app. Make that line there and bring the sound back.`);
      return;
    }
    if (engineOf(sp) === "piper" && !sp.voiceId) {
      setRemakeError(`${sp.label} uses a free local voice but none is picked yet. Pick one in the Cast step.`);
      return;
    }
    // The script's own words for this line (with its [acting] marks) when the
    // script still matches the narration; otherwise the words the narration holds.
    const fromScript = scriptLineFor(script, speakers, narration.segments, i);
    const line = fromScript ?? { speakerId: seg.speakerId, speakerLabel: seg.speakerLabel, text: seg.text };
    setRemaking(i);
    try {
      const res = await window.byok.tts.remakeLine(
        {
          narrationPath: narration.filePath,
          segments: narration.segments,
          index: i,
          input: narrationInputFor(line, sp, language, piperPythonPath),
          speakerOrder: speakers.map((x) => x.id),
        },
        { pricePer1000: useSettingsStore.getState().elevenPricePer1000Usd }
      );
      const oldLen = seg.endMs - seg.startMs;
      const newLen = res.segments[i].endMs - res.segments[i].startMs;
      setNarration({ filePath: res.filePath, segments: res.segments as typeof narration.segments, analysis: res.analysis });
      const diff = (newLen - oldLen) / 1000;
      setRemakeNote(
        `Line ${i + 1} made again: ${(oldLen / 1000).toFixed(1)} s is now ${(newLen / 1000).toFixed(1)} s.` +
          (Math.abs(diff) >= 0.05 ? ` The lines after it moved ${diff > 0 ? "later" : "earlier"} by ${Math.abs(diff).toFixed(1)} s.` : " The lines after it stayed where they were.") +
          (fromScript ? "" : " The script had changed since, so the words the narration holds were used.")
      );
    } catch (e: any) {
      setRemakeError(plainError(e, "Your narration is unchanged. Press Remake to try again."));
    } finally {
      setRemaking(null);
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
            {draftError && <ErrorLine tip="The AI could not write a draft. Check the key in Settings and press Write a draft again." className="text-sm text-red-400 whitespace-pre-wrap" text={draftError} />}
          </div>
        </details>

        <div className="flex flex-col gap-2 flex-1 min-h-[300px]">
          <div className="flex items-center justify-between">
            <span className="label-etched" data-tip="One line per speech: the speaker's name, a colon, their words. [laughs], [whispers], [points] are acted, never read out.">
              The script
            </span>
            <span data-tip="How many lines your script has." className="text-xs text-neutral-500">{lines} line{lines === 1 ? "" : "s"}</span>
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
                  <li data-tip="A line that starts with a name no speaker has. Change the name to match a speaker in the Cast, or remove the line." key={i}>{l}</li>
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
        {genError && <ErrorLine tip="The narration could not be made. Read the message, fix the cause, and press Make the narration again." className="text-sm text-red-400 whitespace-pre-wrap" text={genError} />}

        {narration && narration.segments.length > 0 && (
          <div className="forge-sec space-y-2">
            <div data-tip="Every line of the narration. Press ▶ to hear just that line, or click a line to move the preview there." className="label-etched">
              The lines
            </div>
            {attachedAudio && (
              <p className="text-xs text-amber-300" data-tip="The preview plays your own recording, so single lines cannot be played from here.">
                Your own recording is attached, so the preview plays that and not these lines.
              </p>
            )}
            <div className="forge-lines">
              {narration.segments.map((seg, i) => {
                const sp = speakers.find((x) => x.id === seg.speakerId);
                const here = !!player && player.timeMs >= seg.startMs && player.timeMs < seg.endMs;
                const mine = !!player?.playing && player.span?.startMs === seg.startMs && player.span?.endMs === seg.endMs;
                const paid = !!sp && engineOf(sp) === "elevenlabs";
                return (
                  <div key={`${i}-${seg.startMs}`} className={`line ${here ? "on" : ""}`} style={{ ["--c" as string]: sp?.borderColor ?? "#888" }}>
                    <button
                      className="go"
                      disabled={!player?.hasSound || !!attachedAudio}
                      onClick={() => (mine ? player?.stop() : player?.playSpan(seg.startMs, seg.endMs))}
                      aria-label={mine ? `Stop line ${i + 1}` : `Play line ${i + 1}`}
                      data-tip={mine ? "Stops this line." : "Plays just this line, with sound, and the preview follows it."}
                    >
                      {mine ? "❚❚" : "▶"}
                    </button>
                    <button
                      className="words"
                      disabled={!player?.hasSound || !!attachedAudio}
                      onClick={() => player?.seek(seg.startMs)}
                      data-tip="Moves the preview to the start of this line without playing it."
                    >
                      <i />
                      <span className="who">{seg.speakerLabel}</span>
                      <span className="t">{seg.text}</span>
                      <span className="at">{(seg.startMs / 1000).toFixed(1)}s</span>
                    </button>
                    <button
                      className="redo"
                      disabled={remaking !== null || generating}
                      onClick={() => remake(i)}
                      data-tip={
                        paid
                          ? "Makes only this line again with the same voice and settings. It uses your paid voice, so you are shown the cost and asked first."
                          : "Makes only this line again with the same voice and settings, and puts it back. The other lines keep their sound; the ones after it move if the length changes."
                      }
                    >
                      {remaking === i ? "Making…" : "Remake"}
                    </button>
                  </div>
                );
              })}
            </div>
            {remakeNote && <p className="text-xs text-emerald-400" data-tip="What the last remake changed.">{remakeNote}</p>}
            {remakeError && <ErrorLine tip="The line could not be remade, and your narration is unchanged. Read the message, then try again." className="text-sm text-red-400 whitespace-pre-wrap" text={remakeError} />}
          </div>
        )}
      </div>
    </div>
  );
}
