# Ease-of-Use Plan — make the app usable by amateurs

> Written 3 Oct 2026 from a read of the code on `main` (App.tsx, every panel,
> the render bar, the batch runner) against `PLAN.md`. Nothing here is built
> yet. Each phase is safe to ship on its own and none of them changes what a
> render looks like — this is about getting a person *to* a render.

## The goal in one line

**Someone who has never opened the app finishes a first video in under 15
minutes without reading a doc — and someone who wants the advanced features
(DramaBox, batch, viseme sheets, backgrounds) is walked through each one step by
step instead of being sent to a markdown file.**

## What an amateur hits today

Found by tracing the path a newcomer would take through the UI.

| # | Problem | Where | Why it hurts |
|---|---|---|---|
| 1 | No starting point. The app opens on an empty canvas with three header buttons (Canvas / Narration / Settings) and two side rails full of controls | `App.tsx` | Nothing says "do this first" |
| 2 | The real order of work is **Settings → Cast → Narration → Scene → Render**, but the layout presents them as equals, side by side | header + rails | The user has to guess the sequence |
| 3 | Narration is a hidden full-screen view, not a step | `App.tsx` `view` state | The single most important step is behind a header tab labelled like a setting |
| 4 | Voice is set in **two places** (Cast and Narration) | `CastPanel`, `NarrationPanel` | Two places to set one thing — they drift, the user doesn't know which wins |
| 5 | The script format (`Label: text`) is only explained *after* it fails | `NarrationPanel` error text | Error-first teaching |
| 6 | "Draft Script with GLM-5.2" is a model name, sitting below the voice list | `NarrationPanel` | Already flagged in `PLAN.md`: nobody finds it, and the name means nothing to a newcomer |
| 7 | The script checker exists but is not in the UI | `electron/tts/checkScript.ts` | The app *can* catch mistakes before spending time; the user never sees it |
| 8 | DramaBox — the chosen voice — has no UI at all. It runs from `tools/` on a rented machine | `tools/dramabox-*` | The best feature is command-line only |
| 9 | Batch production is headless only (`runHeadless`, JSON job files) | `electron/main.ts`, `jobs/` | 72 videos is the actual goal; it is unreachable without a terminal |
| 10 | Chatterbox is still offered in the UI and was uninstalled on 14 Aug | `CastPanel`, `NarrationPanel`, `BackendPanel` | A choice that can only fail |
| 11 | Render gives no estimate and no warning about the card | `RenderBar` | An 8-minute video takes ~21 min and holds the GPU; `CLAUDE.md` requires asking first |
| 12 | Errors are raw (`e.message`) | `RenderBar`, `NarrationPanel` | "ECONNRESET" means nothing to an amateur |
| 13 | Jargon in labels: "Mouth Crossfade", "Beat (speaker changes)", "Duck under speech", "Viseme", "Frame Rate" | `ScenePanel`, `NarrationPanel`, `CastPanel` | Correct words, wrong audience |
| 14 | README promises features that don't exist (Azure, Chirp, Edge TTS, transitions) | `README.md` | Already flagged in `PLAN.md` §5 |

## Principles

1. **One obvious next step.** At every moment exactly one button glows.
2. **Teach before failing, not after.** Show the format, then check it, then
   run it.
3. **Plain words on the surface, real words one click away.** "Mouth
   smoothness", with "viseme crossfade" in the ⓘ tooltip.
4. **Simple by default, everything still there.** An *Advanced* toggle hides
   expert controls — it never removes them.
5. **Every long or GPU-heavy job asks first** and says how long it will take
   (matches `CLAUDE.md`'s graphics-card rule).
6. **Every error says what to do next**, in one sentence, with a button where
   one is possible.

## Phase 0 — Clear the ground (small, do first)

Removing things that mislead. Low risk, no new features.

| Task | Files | Risk |
|---|---|---|
| Remove Chatterbox from every engine picker; keep code behind a hidden flag until deleted | `CastPanel`, `NarrationPanel`, `BackendPanel` | Low — engine is uninstalled |
| One home for voices: **Cast** owns engine + voice; Narration shows them read-only with "change in Cast" | `CastPanel`, `NarrationPanel` | Medium — touches the store; needs a check that saved projects still load |
| Rename "Draft Script with GLM-5.2" → **"Write it for me (AI)"**, model name in the tooltip | `NarrationPanel` | None |
| Fix the README to match what exists | `README.md` | None |

## Phase 1 — A guided path for the first video

The core of the plan.

### 1a. Step bar replaces the header buttons

A numbered strip across the top:

```
① Setup  ›  ② Cast  ›  ③ Script  ›  ④ Look  ›  ⑤ Render
```

- Each step shows **done / needs attention / not yet** (✓ / ! / ○).
- Clicking a step focuses the matching panel; the other rails fold to their
  existing labelled spine (that collapse already exists in `App.tsx`).
- The next unfinished step glows. Nothing is locked — an expert can click
  anywhere.
- "Done" is computed from state the stores already hold: keys present, ≥1
  speaker with a voice, a script that passes the checker, narration built.

### 1b. Welcome screen on first launch (and on "New project")

Three big choices, no controls:

| Choice | What it does |
|---|---|
| **Try the sample** | Loads a bundled short sample project (README already promises "Dogs & Butterflies"), ready to render. First win in two clicks |
| **Start from a look** | Shows the nine built-in presets as thumbnails (3 styles × 1/2/3 speakers, per the presets spec) and opens step ② |
| **Open a project** | Existing open-project flow |

Plus a "Don't show again" tick, stored in settings.

### 1c. Script step that teaches first

- Empty script box shows a **greyed example** in the right format, using the
  user's own speaker names.
- Buttons above the box: **Write it for me (AI)** · **Paste a script** ·
  **Open a .txt**.
- **Check script** runs `checkScript.ts` *before* narration and lists problems
  in plain words, each clickable to jump to the line: "Line 12: no speaker
  called *Kati* — did you mean *Καίτη*?"
- Narration's own buttons only light up once the check passes (or the user
  clicks "narrate anyway").

### 1d. Render step that sets expectations

- Before starting: **"About 21 minutes for this 8-minute video. Uses the
  graphics card the whole time — close Ollama/Hermes work first. Start?"**
  The estimate comes from the measured 2.4× realtime in `PLAN.md`.
- During: stage name in words ("Building the voice", "Finding background
  clips", "Drawing frames 4,210 of 12,720"), not just a percentage.
- After: **Open video · Show in folder · Render again**.

### 1e. Plain-language labels + ⓘ tooltips

One pass over every label. Examples:

| Today | Becomes | ⓘ says |
|---|---|---|
| Mouth Crossfade | Mouth smoothness | How softly the mouth blends between shapes (viseme crossfade, ms) |
| Breath (same speaker) | Pause between lines | Silence when the same person keeps talking |
| Beat (speaker changes) | Pause between speakers | Silence when the other person replies |
| Duck under speech | Lower music when someone talks | Auto-ducking |
| Frame Rate | Smoothness (fps) | 30 is standard; 60 doubles render time |
| Idle Motion | Small natural movements | Blinks, head sway, brows while not talking |

One reusable `<Hint>` component (ⓘ icon + popover) so every panel uses the
same pattern.

### 1f. Errors that say what to do

A single error translator (`src/lib/errors/friendly.ts`) mapping known raw
errors to a sentence + action:

| Raw | Shown |
|---|---|
| `ECONNRESET` on narration | "The voice engine dropped the connection. **Try again** — it usually works the second time." |
| `unable to verify the first certificate` | "Your antivirus is checking this connection. See **Fix antivirus blocking**." (links the in-app guide, §2) |
| No speaker label matched | Jump to Script step with the checker open |

Unknown errors still show the raw text under a "Details" fold.

### 1g. Save the work by default

`PLAN.md` §5 flags that work can be lost on close. Autosave the current project
to the app's own data folder every change (debounced), and reopen it on launch.
The existing Save/Open project buttons stay for named copies.

## Phase 2 — Hand-holding for the advanced features

Where complexity can't be removed, wrap it in a **guide panel**: a side drawer
with numbered steps, each with a **Check** button that verifies the step
actually worked and goes green. The user never leaves the app to read a doc.
The content comes from the existing `docs/*.md` files, rewritten as steps.

| Advanced feature | Guide | Steps, roughly |
|---|---|---|
| **API keys** | "Connect your services" | One card per service: why you'd want it, sign-up link, paste box, **Test**. Mark which are optional. (Test buttons already exist in `BackendPanel`) |
| **Piper voices** | "Get free local voices" | Pick language → download voice → **Scan** → **Play sample** |
| **DramaBox (rented GPU)** | "Studio-quality voices" | 1. Explain cost (~$1 / series) and why it's rented (needs 24 GB card). 2. Paste cloud credentials. 3. **Start machine** (cost meter visible). 4. Upload script. 5. **Narrate**. 6. **Stop machine** — big, and a reminder if left running. Needs a small backend to call the existing `tools/dramabox-*` scripts |
| **Backgrounds** | "Pick background clips" | Explain the Relevancy ↔ Frequency dial with a live preview of how many cuts it produces ("one new clip every ~12 s") |
| **Custom characters / viseme sheets** | "Make your own character" | Drop in the face images → app runs `tools/build-viseme-sheet.mjs` → preview each mouth shape → save to library |
| **Sound effects** | "Add sound effects" | Search Freesound (CC0) first; generate only for abstract sounds, with a GPU warning |
| **Batch (72 videos)** | "Make a whole series" | See Phase 3 |
| **Antivirus blocking** | "Fix antivirus blocking" | Detect the cert error, explain in two lines, one button to build the CA bundle (`tools/make-ca-bundle.ps1`) — inside the project folder only |

Each guide remembers progress, so a user can stop half-way and come back.

## Phase 3 — Batch in the app, not in a terminal

The course is 72 videos; today that needs JSON files and a command line.

- **Series screen**: a table, one row per video — title, script file (or
  topic for AI drafting), look preset, orientation(s).
- **Import from spreadsheet** (CSV), with a downloadable template.
- **Check all** runs the script checker on every row first, before any GPU
  time is spent.
- Total estimate up front ("72 videos ≈ 8.6 hours — run overnight?") and the
  GPU warning.
- Live queue: done / running / failed, **retry failed only**, open output
  folder.
- Calls the existing `runBatchJob` — no new render path.

## Phase 4 — Polish and safety nets

- **Undo / redo** for canvas and panel edits.
- **"Simple / Advanced" switch** in the header; Simple hides frame rate,
  crossfade, waveform physics, etc. Default Simple for new users.
- **Audio in the preview** (`PLAN.md` §4: preview is silent) — so users hear
  music and ducking before rendering.
- **Short in-app tour** (5 bubbles, skippable) on first launch after the
  welcome screen.
- **Keyboard shortcuts** with a `?` cheat sheet.

## Order and size

| Phase | Size | Can break existing work? |
|---|---|---|
| 0 — Clear the ground | Small (1–2 days) | Voice-merge touches saved projects — needs a load test with old project files |
| 1 — Guided first video | Medium (1–2 weeks) | Layout change in `App.tsx`; preview sizing must be re-measured (it collapsed once before, see `.dn-grid` trap) |
| 2 — Guides | Medium, per guide | DramaBox guide starts paid cloud machines — must have a hard auto-stop |
| 3 — Batch UI | Medium | Low; reuses `runBatchJob` |
| 4 — Polish | Ongoing | Undo touches every store — biggest risk in the plan |

## How we'll know it worked

- A person who has never seen the app renders the sample in **≤ 2 minutes**
  and their own first video in **≤ 15 minutes**, unaided.
- Zero trips to a `.md` file or terminal for: keys, voices, DramaBox, batch.
- Every error seen during that test has a plain-English message.

## Not in this plan

- Visual restyle — Deco Noir stays; changes follow its existing components.
- New features (intro cards, transitions) — they stay where `PLAN.md` puts
  them. When they're built, they get a guide in the Phase 2 style.
