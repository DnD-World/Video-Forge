# Explainers

Animated explainer videos drawn by code: their own kind of video in Video Forge,
next to the puppet videos. Plan: [docs/EXPLAINER-PLAN.md](../docs/EXPLAINER-PLAN.md).

## In the app

Top right: **Puppet video | Explainer**.

| Area | What it does |
|---|---|
| Left: Style | **Mint Meander** (built-in, Stravelakis brand) or styles imported from the AI Style Atlas (**+ Import a style**, with a step-by-step how-to). |
| Centre | Shape (16:9, 9:16, 1:1, 4:5), room for 0–3 puppets (circle / rounded / square spots), live preview (same drawing code as the render, spots shown dashed), storyboard and check results. |
| Script | Paste the narration or **Use this project's narration** (word timings → pictures land on the words, audio goes in). Pick a model (any saved key) → **Write the scenes**. The advanced scene list can be edited by hand. Imported styles: **Write it with my key** (top model), or **Hand to Claude** (prompt file → paste into Claude) then **Load Claude's page**. |
| Look | Colours: night / day / logo / my colours (background + accent; everything else derived and kept readable). Tint: sepia, maroon, ink, mint (+ strength), works on imported styles too. Font: 11 bundled (offline) or any Google Font (downloaded once, cached). |
| Make | Check every frame → extras (3 thumbnails, YouTube chapters, captions .srt/.vtt, GIF, short clip, still PNG) → **Render the video**. |

Puppets on top: render the explainer with N puppets, then in the puppet video
**Look → Background → Use an explainer**. The faces move into the spots it left
empty (read from the `.spots.json` written next to the video).

## Where things are

| Part | File |
|---|---|
| Scene list format + validation | `core/spec.mjs` |
| Shapes, readable sizes, puppet spots, content box | `core/frame.mjs` |
| Pattern-tile engine (Truchet, key, diagonal, half-circle wave, Greek key) | `core/tiles.mjs` |
| Fitted text + draw log for the checks | `core/text.mjs` |
| Fonts (bundled list, fallback for missing alphabets) | `core/fonts.mjs`, `tools/lib/explainerFonts.mjs` |
| Tint | `core/tint.mjs` |
| Captions / chapters | `core/exports.mjs` |
| Sound effects: where they fall, which sound, how loud (mixed from `sfx/library` at render; `--sfx 0..1` / `--no-sfx`; `VIDEOFORGE_SFX_DIR` overrides the library) | `core/sfx.mjs`, `sfx.test.mjs` |
| Prompts, atlas importer, reply parsing | `core/prompts.mjs` |
| Brand style "Mint Meander" (+ custom colours) | `kits/stravelakis.mjs` |
| Stage (draws a frame) / page entry | `stage/stage.mjs`, `stage/page.mjs` |
| Build page · check · render · exports (Electron) | `tools/lib/explainerPage.mjs`, `tools/lib/explainerRun.mjs` |
| Models (BYOK) | `tools/lib/explainerLlm.mjs` |
| App side | `electron/explainer/explainerIpc.ts`, `src/components/explainer/ExplainerStudio.tsx` |
| Tests | `explainer.test.mjs` (`npm run test:explainer`) |

## Command line

```bash
npm run explainer:check -- explainer/samples/how-it-works.json --puppets 0,2 --scheme day
```
Writes `explainer/checks/<name>/report.html`: every shape side by side, spots outlined, sample faces on a switch, every problem listed.

```bash
npm run explainer:render -- explainer/samples/how-it-works.json --format 9:16 --puppets 2 --faces --thumbs --chapters --gif 3-9
```
Also `--clip 5-12`, `--still 4`, `--captions` (needs `words`), `--tint sepia`, `--audio narration.wav`, `--imported page.html`.

```bash
npm run explainer:bakeoff
```
Same narration to several models (keys from the Key Vault), every scene list checked → `explainer/checks/bakeoff/bakeoff.html`.

## What the checks enforce

- Text: headline ≥ 44, label ≥ 28, number ≥ 64 rule px (1 rule px = 1 px of a 720-high frame, scaled by the short side); fits its space; inside the frame; no overlapping text once a scene settles.
- Contrast: labels ≥ 4.5:1, headlines/numbers ≥ 3:1.
- Puppet spots: pixel-identical to the background (all layers share one rasteriser, so the difference is exactly 0).
- Font loaded; frames draw in under 150 ms.

## Things worth knowing

- **Greek:** Sora has no Greek letters, so Greek text is drawn in Inter (the fallback). Fonts with Greek use their own.
- **Imported pages run locked down:** separate session, no network except Google Fonts, no permissions or downloads (tested 21 Oct 2026).
- **GIFs hold the background still**, otherwise every pixel changes each frame (a 5 s GIF went from 18 MB to 1.8 MB).
- **Runs in Electron, not HyperFrames' Chrome:** that Chrome would not start from the build session's sandboxed shell; Electron is the app's own runtime anyway, and reading the canvas directly needs no extra download.
- **Licence:** everything here is our own code. Atlas styles are never shipped; users import their own copies.
