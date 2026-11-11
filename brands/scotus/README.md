# SCOTUS Unofficial — cast for Video Forge

Channel recreating Supreme Court oral arguments with animated illustrated
portraits of the justices. Portraits made by Ak in Google Flow (11 Nov 2026).
Every video carries the label: illustration of a real public figure.

## Folders

| Folder | What |
|---|---|
| `portraits/` | One 896x1200 master per justice (`<name>.png`) — what the rigs are built from |
| `portraits/original/` | Ak's files as sent. Jackson, Kagan, Thomas wore glasses there |
| `brand/` | `banner.jpg`, `logo.jpg` |
| `rig/` | The animated rig: Ak's Sotomayor handoff plus the general build |
| `review/` | `index.html` — the page Ak reviews (made by `rig/tools/review_page.py`) |

Glasses: removed from Jackson, Kagan and Thomas at Ak's request (11 Nov),
with Nano Banana 2 (`gemini-3.1-flash-image`, tier-1-emf), awaiting Ak's approval
on the review page. The other six masters are Ak's files, resized to 896x1200
where they came at 1493x2000.

## The rig build (`rig/`)

- `pipeline/` — Ak's original Sotomayor scripts, unchanged (hand-measured numbers).
- `pipeline2/` — the same scripts reading every number from a face file.
- `faces/<name>.json` — one face file per justice. `sotomayor.json` holds her
  hand values and rebuilds her approved rig (rest pose identical, blink within
  0.05/255). The others come from `tools/face_auto.py` (MediaPipe face points +
  colour sampling); `"checked": true` stops it overwriting a hand-edited file.
- New in pipeline2, switched on by the face file:
  `raster` (layers and brows kept as the original pixels, not traced into vector:
  rest pose ~0.6/255 off the portrait instead of 4.6), `fills: local` (no
  black/near-black fill behind hair and robe edges), eye and brow rules that work
  for light and grey irises, grey and feathered brows, and darker skin.
- `tools/check.sh <names…>` — measure, build, screenshot four poses, write
  `work/<name>_sheet.jpg`. `tools/eyezoom.py <name>` — eye close-up.
- Python lives in `rig/.venv` (opencv, numpy, scipy, vtracer, mediapipe);
  the face-point model in `rig/models/` (downloaded, not committed).
- Screenshots use the headless Chrome Remotion ships (`tools/shot.mjs`).

## Known

- Closed eyes show the smooth skin fill where the lid was, as in the approved
  Sotomayor rig; on textured faces (Roberts, Gorsuch) it reads as a soft smudge.
- The head layer takes the neck with it; on low necklines (Kagan) the neck
  rotates over the collar by up to ~1 px.

## Next (plan of 11 Nov 2026)

1. Ak reviews `review/index.html` (glasses, Sotomayor A/B, the bench).
2. "Portrait rig" look in the Forge, mouth driven by the Forge's word timing.
3. Real court audio: only the speaking justice talks.
4. Former justices: a Flow portrait each, then `tools/check.sh <name>`.
