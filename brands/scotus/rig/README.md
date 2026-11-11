# SCOTUS oral-argument animation — Sotomayor rig (handoff)

Owner: Ak (non-coder). Style rules: short "caveman" answers; for decisions give 2–4 options, mark one RECOMMENDED and any AVOID; never implement before Ak picks; flag anything that can break existing work up front.

## Goal
Coded (deterministic, NOT AI-generative) animated portrait rig of US Supreme Court justices, lip-synced to real oral-argument audio. Test justice: Sotomayor (source/sotomayor_ref.png, 896x1200). Next: Roberts (source/roberts_ref.jpg).

## Hard requirements (from Ak)
- Very close adherence to the original art. Rest pose must equal the original, especially eyes + mouth.
- Mouth morphs smoothly (continuous params, blended visemes), not 8 choppy shapes.
- Tongue: minimal — thin sliver only, max ~2px, only on wide openings.
- Any redrawn element must be shown to Ak and approved before finalizing.
- Label output as illustration of a real public figure.

## Status (approved by Ak 2026-11-11)
build/sotomayor_rig.html — single self-contained page. Review images in review/.
- Rest diff vs original: whole 4.6/255, mouth area ~1.9, eye area ~3.0.
- Layers: bg / hair / robe+collar / head (vtracer vector) ; brows (vector) ; eyes + mouth = original pixels (raster) for exactness.
- Eyes: sclera, iris (gaze translate), lower lid, upper lid slides down for blink (clip follows lid edge).
- Mouth: lips matted from original against smooth skin fill, warped in 2px vertical strips (exact per-column affine warp). Params J (jaw), U (upper lift), W (width), P (pucker), Sm (smile), T (teeth), Tg (tongue). Chin crescent follows lower lip; jaw patch below compresses as jaw opens. Dark interior + teeth + tongue drawn under lips.
- Idle: blink schedule, gaze drift, head sway about neck pivot (440,745), hair spring lag, breathing, brow lift.
- Modes: Idle / Demo / Load audio (audio mode = crude loudness + spectral centroid; NOT production lip-sync).
- URL test mode: rig.html?still=1&freeze=1&v=AA&k=0.5  (v = viseme, k = blink 0..1)

## Known leftovers
- 1px pale speck at closed right eye outer corner.
- Faint tone step where hair meets robe at jaw level (y≈594).
- Hair sways as one block (no clump-level motion).
- Vector face/hair/robe slightly flatter than original; no paper grain overlay.

## Next steps (Ak to pick)
1. Real lip-sync: transcript + phoneme/viseme timing (e.g. forced alignment) per speaker -> drive params. (RECOMMENDED next)
2. Speaker diarization so only the speaking justice animates.
3. Roberts rig using same pipeline (masks/boxes in prep*.py are Sotomayor-specific coordinates and must be re-measured).
4. Video export (render frames headless -> ffmpeg).

## Rebuild
pip install -r requirements.txt ; ./run.sh   (needs google-chrome only for screenshots: vis.sh / shotsvg.sh)
Pipeline scripts use hard-coded coordinates for Sotomayor (eye boxes, brow boxes, lip polygon in lippoly.npy, seam in seam.json).
