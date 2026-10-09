"""Timestamp the audio files, so puppets and subtitles stay in sync.

For every spoken line, find when each word starts and ends in the audio. The
mouths, the word-by-word subtitle highlight and whose waveform lights up all
read these times.

Nothing is transcribed and no audio is changed. We already KNOW the Greek — it
is the script — so the job is only to find where each known word landed. That is
a far easier and far more reliable problem than working out what was said, and
it cannot invent a word that was never spoken. (The technical name is "forced
alignment". This file used to be called dramabox-align.py, after the voice
engine it was first written for; the name misled, so it was renamed.)

WHY THIS EXISTS. Without it every word time is ESTIMATED by counting letters.
An estimate drifts: one slow word early on pushes everything after it, and by
the end of a long line the subtitle runs a phrase ahead of the voice.

WHY MMS_FA. torchaudio's aligner covers 1100+ languages and reaches non-Latin
scripts through uroman, a universal romaniser. Greek is not called out by name
in the tutorial, which is exactly why this script prints what it found for the
first line and checks every line after — so the claim is checked, not assumed.

TWO WAYS TO CALL IT.

  A finished lms lesson folder — what the course uses:

      python tools/timestamp-audio-for-puppets-and-subtitles.py ../lms/tts/out/101.1

  reads <lesson>-cues.json and the per-line files 001_kaiti.wav, 002_serifis.wav
  …, and writes <lesson>-words.json beside them:

      {"001": [{"w": "Γιατί", "start": 0.31, "end": 0.68}, ...], ...}

  Stage directions in square brackets — [serious], [short pause] — are not
  spoken, so they are left out of the words.

  The older layout — align.json plus out/000.wav … — still works:

      python tools/timestamp-audio-for-puppets-and-subtitles.py /opt/dramabox/work

Times are seconds from the start of that line's own WAV.
"""
import glob
import json
import os
import re
import sys

# Model weights (~1.2 GB) go inside the project, not the user profile. The
# project owns its own folder and nothing else.
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("TORCH_HOME", os.path.join(_ROOT, "models", "torch"))

import torch
import torchaudio

WORK = sys.argv[1] if len(sys.argv) > 1 else "/opt/dramabox/work"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

STAGE_DIRECTION = re.compile(r"\[[^\]]*\]")


def load_lines(work: str):
    """[(id, wav_path, spoken_text)] and where to write the result."""
    cues_files = glob.glob(os.path.join(work, "*-cues.json"))
    if cues_files:
        sheet = json.load(open(cues_files[0], encoding="utf-8"))
        lines = []
        for c in sheet["cues"]:
            if "n" not in c:          # an SFX cue — nothing is said
                continue
            line_id = f"{c['n']:03d}"
            wav = os.path.join(work, f"{line_id}_{c['character']}.wav")
            text = " ".join(STAGE_DIRECTION.sub(" ", c["text"]).split())
            lines.append((line_id, wav, text))
        return lines, os.path.join(work, f"{sheet['lesson']}-words.json")

    blocks = json.load(open(os.path.join(work, "align.json"), encoding="utf-8"))
    lines = [(b["id"], os.path.join(work, "out", f"{b['id']}.wav"), b["text"]) for b in blocks]
    return lines, os.path.join(work, "words.json")


lines, out_path = load_lines(WORK)

bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model().to(DEVICE)
tokenizer = bundle.get_tokenizer()
aligner = bundle.get_aligner()

try:
    from uroman import Uroman           # pip install uroman
    _uroman = Uroman()
    def romanize(text: str) -> str:
        return _uroman.romanize_string(text)
except Exception:                        # older releases ship a CLI only
    import subprocess
    def romanize(text: str) -> str:
        return subprocess.run(
            ["uroman.pl"], input=text, capture_output=True, text=True
        ).stdout


def normalize(word: str) -> str:
    """Romanized, lower case, letters only — what the tokenizer expects."""
    return "".join(c for c in romanize(word).lower() if c.isalpha() or c == "'")


out = {}
skipped = []
# Lines whose times look wrong. Printed at the end, so a bad line is found
# here rather than by watching a mouth drift in a finished video.
suspect = []
# Words with no letters to align (a bare number, a lone dash). They get no time
# of their own; listed so nobody wonders why one subtitle word never lights.
untimed = []

for line_id, wav_path, text in lines:
    waveform, sr = torchaudio.load(wav_path)
    # The aligner has one sample rate and one channel.
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    if sr != bundle.sample_rate:
        waveform = torchaudio.functional.resample(waveform, sr, bundle.sample_rate)
    audio_s = waveform.shape[1] / bundle.sample_rate

    words = text.split()
    normed = [normalize(w) for w in words]
    keep = [i for i, w in enumerate(normed) if w]
    untimed += [f"{line_id}: {words[i]}" for i, w in enumerate(normed) if not w]
    if not keep:
        skipped.append(line_id)
        continue

    with torch.inference_mode():
        emission, _ = model(waveform.to(DEVICE))
        tokens = tokenizer([normed[i] for i in keep])
        spans = aligner(emission[0], tokens)

    # One frame of the emission covers this much audio.
    ratio = waveform.shape[1] / bundle.sample_rate / emission.shape[1]
    timed = []
    for n, i in enumerate(keep):
        span = spans[n]
        timed.append({
            "w": words[i],
            "start": round(span[0].start * ratio, 3),
            "end": round(span[-1].end * ratio, 3),
        })
    out[line_id] = timed

    # THE CHECKS. A line that did not really align comes out bunched: every
    # word crammed into a sliver at the start, or ending long before the voice
    # does. Real speech has neither.
    first, last = timed[0]["start"], timed[-1]["end"]
    squashed = sum(1 for t in timed if t["end"] - t["start"] < 0.04)
    if last < audio_s * 0.5:
        suspect.append(f"{line_id}: last word ends at {last:.2f}s of {audio_s:.2f}s")
    elif first > 1.5:
        suspect.append(f"{line_id}: first word starts late, at {first:.2f}s")
    elif len(timed) >= 4 and squashed > len(timed) / 3:
        suspect.append(f"{line_id}: {squashed} of {len(timed)} words are under 40 ms")

    if line_id == lines[0][0]:
        print("[check] first line, first six words:", flush=True)
        for t in timed[:6]:
            print(f"    {t['start']:6.2f}s  {t['end']:6.2f}s  {t['w']}", flush=True)
        print(f"[check] audio is {audio_s:.2f}s, last word ends at {last:.2f}s", flush=True)

json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
print(f"\ntimestamped {len(out)} lines, skipped {len(skipped)} -> {out_path}", flush=True)
if skipped:
    print("skipped (nothing romanizable):", ", ".join(skipped), flush=True)
if untimed:
    print(f"words with no letters, left untimed ({len(untimed)}):", "; ".join(untimed), flush=True)
if suspect:
    print(f"SUSPECT lines ({len(suspect)}) — look at these:", flush=True)
    for s in suspect:
        print("   ", s, flush=True)
