# Video Forge v2 — plan

Built from [V2-NEEDS.md](V2-NEEDS.md) (Ak's interview, 9–10 Oct 2026),
[research/how-the-70-videos-were-made.md](research/how-the-70-videos-were-made.md) and
[research/creator-needs-2026-10.md](research/creator-needs-2026-10.md).

Private first (DnD-World/Video-Forge). Public copy only when v2 is done.
Free first; every paid option shows its cost and asks. No Google Cloud.

| Phase | What Ak gets | Human work hours |
|---|---|---|
| 0. Foundations | Rename done. Gemini calls switched from Google Cloud to a plain AI Studio key. Old GPU-box scripts archived. Free-voice check (OpenRouter, Gemini, Mistral, Groq, NVIDIA, local) → side-by-side listening page | 6–10 |
| 1. The 70-video workflow, in the app | Spreadsheet batch panel · script import (Docs/Word/text/web page/PDF/whole site → one video per page) · AI script writer · voices per character · automatic word timing · music panel (free library by mood, own files, Envato suggestions) · sound-effects library · intro/outro manager with a loud length check · background review (stock, moving AI pictures, AI clips, branded sets) · 4 subtitle styles + .srt · gesture tags in scripts · cost shown before paid steps · overnight batches on the mini PC · publish per job (YouTube, social, n8n/Hermes folder, file) | 50–70 |
| 2. Puppet maker, linked to Image Forge | Description / photo / restyle → 4 options → Ak picks the face → mouths, blinks, brows, arms made and tested automatically → talking preview. Styles first: Pixar-like 3D, paper cut-out, claymation, anime. Upper body (desk anchor or standing). Old and new Skilitsa puppets both kept | 30–45 |
| 3. Top-moments shorts | Finds and scores every candidate moment in a long video; Ak asks for the top X% | 10–15 |
| 4. New look | A/B page of 2–3 looks in stravelakis navy/mint + Sora → build the chosen one: live preview with sound, glass/fluid/particles, moving template gallery (lesson, news desk, podcast, promo) | 30–50 |
| 5. Public copy | Script makes a clean copy (no brands, no course, no personal paths), banned-word check, Windows installer, repo standards docs, Stravelakis org | 10–15 |
| **Total** | | **~135–205** |

## Open risks

- **Remotion licence:** free for individuals and teams up to 3 people. Ask hi@remotion.dev in writing how that applies to an open-source app before the public release.
- **Licence file:** package.json says MIT; the CLAUDE SPACE rule says Apache-2.0 + NOTICE. Fix in phase 5.
- **Free voices in Greek** may still sound flat; the listening page decides.

---

## Status — 11 Oct 2026

### Done
- Rename to Video Forge (app, docs, repo DnD-World/Video-Forge); installed with desktop shortcut and logo icon.
- No Google Cloud: planner on a plain Gemini key; GPU-box scripts archived; storage bucket gone.
- Free voices: Gemini Live (2.5 Native Audio, 3.1 Flash Live) as default, word-for-word check, TTS as premium.
- The Forge look: black + orange-red sparks, navy/mint, Sora, twin-logo switch, pill Render.
- Research: creator needs, how the 70 videos were made, free voices, Remotion alternatives.

### Not done yet (rewritten 11 Oct 2026)

Ak, 11 Oct: the 70 videos are done. The goal now is **polishing the maker** — usable, easy, accessible — not producing.

**Done since the first list:** Fish Audio voice; HyperFrames trial (recommend switching, 32–52 h); both test renders pass; four-step mock-up (docs/design/flow-try.html); MIT licence with an optional credit request; Gemini voices work inside the app.

| # | Item | Notes |
|---|---|---|
| A1 | **Four-step layout** in the app: Script → Cast → Look → Make, Settings behind a gear | after Ak OKs the mock-up |
| A2 | **Template gallery** that moves on hover (lesson, news desk, podcast, promo); a template sets everything | part of Look |
| A3 | **Preview with sound and every layer** | best done with HyperFrames' player — needs the switch decision |
| A4 | **Switch to HyperFrames** (licence-free for everyone) | 32–52 h, docs/research/hyperframes-trial.md |
| B1 | First run that works with **no keys at all** (offline voice, plain set), then explains each free key in one line with a link | |
| B2 | **Projects**: name, save, open recent, autosave, undo/redo | |
| B3 | **Script editor**: speaker colours, name autocomplete, a picker for [laughs] / [points] tags, live check as you type | |
| B4 | **Listen before rendering**: ▶ on every line and every character; re-make one line without redoing the rest | |
| B5 | **Every error says what to do next**, in plain words, with a button that does it | |
| B6 | **Cancel anything; progress per line**, with time left | |
| B7 | **Save my own template** from any project | |
| B8 | **Batch from a spreadsheet**: download a template sheet, check every row before starting, resume after a stop | |
| B9 | **Accessibility**: full keyboard use, visible focus, readable contrast, screen-reader labels, text size setting, motion off respected everywhere | |
| B10 | **Built-in help**: short guide per step, a neutral sample project, hover hints instead of long paragraphs | |
| C1 | **Puppet maker** linked to Image Forge (approved) | Phase 2 |
| C2 | **Top-moments shorts** (approved) | Phase 3 |
| C3 | **Image Forge pair**: shared keys, Forge look, icons, twin switch back (approved) | |
| D1 | Public release | Ak works out what it should be for his advancement |
