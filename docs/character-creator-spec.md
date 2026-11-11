# Character creator — spec (agreed with Ak, 6 Nov 2026)

A game-style character creator inside the Video Forge app, like the start of a video game.
First use: the 40 Season 1 Red Flag Theory characters (`brands/redflag/cast.json`, start from these drafts).

## What it does
- **Characters live in files**, one per character, in the project's brand folder
  (Red Flag: `brands/redflag/characters/<id>.json`). The 40 drafts from `cast.json` move in.
  The card format stays `characters/core/card.mjs` (+ new fields below); faces and outfits keep their ids.
- **Every part has a lock.** A character opens with everything locked. Ak unlocks a part, changes it,
  locks it again, saves. Locks are saved in the file.
- **Each part** (body, head, eyes, brows, nose, mouth, ears, hair, skin, facial hair, outfits, marks):
  - a **picture list** of every option, each drawn by the engine (not words in a dropdown);
  - **sliders** for its numbers (size, spacing, colour);
  - an **Advanced** fold for fine details, so the main view stays simple.
- **Randomiser**: one button, click until close; it only changes unlocked parts.
- **Alternative clothes**: the outfit sets per character (5–12 each in the drafts); add, copy, delete, rename.
  The main colour stays on one piece of every outfit.
- **Preview strip** (not a 3D turntable): moving clips side by side — idle, talk (mouth shapes), hair motion,
  sit, stand, walk in profile, wave, dance, a few acted moves; plus the face options.
- **Main colour** (one per character, chosen when made) drives:
  - voice waveform and bottom bar;
  - subtitle colour (the karaoke word);
  - one piece of clothing;
  - any glow, lower third or graphic about that character.
- **Voice**: stored on the character (engine + voice + pitch/speed) and travels with it.
  A project can override it ("in this project only"); the character's own voice is unchanged.
- **Import from other projects**: in any project, browse each project's characters and copy one in
  (a copy, not a link).
- **Tattoos, scars, marks**: simple shapes that ride on a body part and move with it
  (cheek scar, arm tattoo, freckles, birthmark). Nothing that the animation can't carry.
- **Eye quirks** (Advanced): lazy eye, hazy eye, maximum openness, odd colours.

## The AI box (per part and for the whole character)
Ak types plain words ("left eye a bit lazy", "eyes at most 50% open").
Uses Ak's own API keys (the app's existing key setup); Ak picks the model from his available coding models.
- **(a) Values**: the AI only fills the fixed structure (part lists, sliders, quirk fields), checked by
  `normalizeCard`. Instant, can't break drawing. Must have.
- **(b) New drawing**: for what the lists can't express, the AI writes a small drawing piece against a fixed,
  narrow drawing interface, run sealed off from the rest of the app. Shown as a preview; kept only when Ak
  approves; saved with the character. If (b) can't do it, Ak comes to Claude for a special appearance.
- No credit cap (free keys). Generation is limited in *scope*: predetermined structure, never free edits to the app.

## Out of scope
Characters 41–54 · 3D · Image Forge changes (it keeps its own gallery; project folders are Video Forge's) ·
Blacksmith's forge paths · finishing the 40 (that is Ak's review, with this tool).

## Phases (each ends tested and shown to Ak)
| Phase | Delivers | Human work hours |
|---|---|---|
| 1 | Character files + the 40 moved in, locks in the file, voice on the character with project override, main colour wired into waveform/bottom bar/subtitles/lower third/glow | 18–26 |
| 2 | The creator screen: picture lists, sliders, Advanced, randomiser, outfit sets, preview strip | 26–36 |
| 3 | Tattoos/scars/marks, eye quirks, AI box (a) with model picker | 14–20 |
| 4 | AI box (b) sealed drawing with approval; import from other projects | 16–24 |

## Facts from the 6 Nov audit
- No in-app card editor today (`characters/README.md`: "the form in the app: not built yet"); `CastPanel.tsx` has only the drawn/puppet toggle, presets, costumes, style.
- Cards live inline in the project file (`speakers[].character`, `src/store/types.ts:312`); "Save to library" shelf exists (`CastPanel.tsx:477`).
- Voice is on the speaker, not the card (`src/store/types.ts:369–374`).
- Signature colour is in `cast.json` but unused by the app; all 323 outfits contain it.
- Faces/outfits switch only in the sample pages (`characters/samples/cast-page.mjs`).
