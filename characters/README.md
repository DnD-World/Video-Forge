# Drawn characters

Characters drawn by code: the third kind of speaker in Video Forge, next to the
viseme sheet and the picture puppet. A character is a small **card** (JSON);
a **look** decides how it is drawn; the same card works in all 20 looks, front,
3/4 and side profile. Plan and decisions: [docs/CHARACTER-BUILDER-PLAN.md](../docs/CHARACTER-BUILDER-PLAN.md).

Status (25 Oct 2026): **foundations built** (engine, wardrobe system, render
integration, checks, AI helper core). Not built yet: the form in the app, the
finished looks, the full wardrobe, stock backgrounds, pop-ups (the medium
phase — see the plan).

## How it fits together

| Part | File | What it does |
|---|---|---|
| Card | `core/card.mjs` | Every field: allowed values, default, help text, examples. `normalizeCard` makes anything valid and says what it fixed. Drives the form, the checks and the AI. |
| Looks | `core/looks.mjs` | 20 ways of drawing: proportions, line, fill mode, colour treatment, whole-figure effect. |
| Skeleton | `core/rig.mjs` | Where every joint is: 9 arm poses, walking, sitting, posture, any turn from front (0) to profile (2). |
| Face | `core/face.mjs` | Mouth shapes for all 13 Video Forge mouth ids (blendable), lids, brows. |
| Wardrobe | `core/wardrobe.mjs` | 34 items on slots (top, outer, full, bottom, feet, neck, head, hair, eyes, ears), drawn on body points so they work in every look and view. |
| Drawing | `core/draw.mjs` | `drawCharacter`, `drawFigure` (with the look's layer effect), `frameFor` (fit head / waist / full body in a box, measured from the real figure). Hair styles live here. |
| Colour & fill | `core/paint.mjs` | Colour treatments (black & white, two-strip, noir, spot inks …) and fills (hatching, glass, off-register, see-through). |
| Effects | `core/fx.mjs` | Sticker edge, chalk dust, paper shadow, print offset, neon glow, lamp halo; scene film grain / vignette. |
| Performance | `core/perform.mjs` | Video Forge's per-frame signals (mouth, blink, brows, head, pose spans, facing) → the drawing state. Also a standalone talk loop for previews. |
| AI helper | `core/ai.mjs`, `tools/lib/characterLlm.mjs` | Fill a card from a description or a picture; field-by-field suggestions. Answers go through `normalizeCard` like typed input. |
| Checks | `core/check.mjs`, `core/record.mjs` | A recording canvas: nothing leaves the frame (any look, view, pose), face contrast, identical when drawn twice, smallest readable size on a phone. |
| In the app | `src/components/canvas/CharacterAvatar.tsx` | The speaker component. Used by the live preview (`src/App.tsx`) and the render (`remotion/VideoComposition.tsx`). |
| AI in the app | `electron/characters/characterIpc.ts` | `window.byok.characters`: providers, pickPicture, fromDescription, fromPicture, suggest, cancel. Keys from the app's key store. |

A speaker uses a drawn character when `speaker.character` (a card) is set; it
wins over a puppet and a sheet, in the preview, the render, and batch jobs.

## Commands

```bash
npm run test:characters
```
13 tests, including every look × 4 test characters × 3 views × 9 poses (2,160 drawings) through the checks.

```bash
npm run characters:check
```
Real canvas in Electron: each look drawn twice must give identical pixels, fast enough; writes `characters/checks/report.html` and `sheet.png` (every look × the test characters, front / 3/4 / side).

```bash
npm run characters:sheet
```
Builds `characters/samples/engine.html`: every look live, with view, pose, framing and line-boil controls. `characters/samples/looks.html` is the earlier hand-made sample page (with its painted sets), kept as the approved reference.

## Things worth knowing

- **Readable size.** A full-body figure is small: at 30% of a 1080-wide video its mouth is ~6 px on a phone. `readableSize(card, look, framing)` gives the smallest size where the mouth reads; the form should warn below it. Waist and head framings read much smaller.
- **Profile looks** (Greek vase, shadow puppet, Karagiozis) turn to full profile when two characters talk (`facingView(..., { dialogue: 2 })`).
- **Pure functions of time.** No clock, no `Math.random`: line boil and grain use a hash of the frame step, so the preview and every render worker agree.
- **Copyright.** Looks are named by era and genre, never by show; no show's characters are copied. Karagiozis figures are our own drawings of the folk tradition.
- **Not verified yet:** a full Remotion render with a drawn character. The headless browser Remotion uses can't start from the build session's sandboxed shell (same "ICU data" error as the explainers); the preview path, which uses the same component, was seen working in the app.
