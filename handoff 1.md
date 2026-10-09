📄 MASTER HANDOFF — Video Forge (Phase 1a–1f complete)
WHO I AM: Non-coder. I build by pasting full files only into the GitHub web editor. RULE: never give me edits, snippets, "append", or "// add here". ALWAYS give the ENTIRE file, tagged CREATE or EDIT with its exact path. I take direction well but cannot write code myself.
WHAT THE APP IS: Desktop-only (Windows 11) Electron app. Turns a script → local TTS narration → auto-fetched stock B-roll + music/SFX → animated glowing waveforms + viseme lip-synced speaker disks + highlighted subtitles → rendered MP4 via Remotion. Deterministic (template/stock driven, NOT generative like Veo/Sora). Max 10 min, must handle 8 min+. End goal = installable .exe (via electron-builder, later phase).
PRIORITY ORDER: Stability > Functionality > Output quality > UI wow. (But wow IS the dream for both final videos and the UI.)
MY MACHINE (= recommended spec, not minimum): 8GB NVIDIA GPU, 32GB RAM, AMD CPU. ~1hr render per 10 min is fine.
HOW I'M BUILDING: Writing files directly in GitHub web editor (github.com/DnD-World/Video-Forge). I understand I MUST eventually run git clone → npm install → npm run dev on my PC to test — haven't done it yet. Nothing is installed locally yet.
LOCKED STACK:
Electron + electron-vite + React + TypeScript + Tailwind (dark-only) + Zustand + framer-motion.
Config file is electron.vite.config.ts (NOT vite.config.ts).
Render: Remotion (primary, GPU) + FFmpeg (audio mix/duck/mux).
TTS: MAIN = Coqui XTTS-v2 (local, Greek+English, voice clone). FALLBACK = Azure Speech. TEST = Piper. DROPPED: Edge, ElevenLabs, Voxtral, Chirp.
NO SSML phoneme accents / no phoneme subs (caused bad pauses). Accent/expression = audio post-processing (pedalboard: pitch/formant) LATER, once local model runs. I will NOT use the app until quality local model runs.
Scene chunking LLM: GLM-5.2 via NVIDIA provider (BYOK).
Media: Pixabay (video+music) + Pexels (video) + Jamendo (music) + Freesound (SFX). One MediaProvider interface.
FPS = user choice 10 / 24 / 30, default 24 (dashboard dropdown, keep all three — do NOT force 24).
Storage: local disk Day 1. Google Drive = UI present but disabled, "future feature" from Day 1.
VISEMES: 9 slots = neutral, ah, ee, oh, oo, mbp, fv, l, chsh. Each PNG 1024×1024 transparent, head centered ~12% padding, head LOCKED in same position across all frames. Named char_<viseme>.png. Shrinkable (smaller head = smoother). Text-driven timing (no user audio, no diarization). <95% sync fidelity OK. I have inspiration images of a beagle "male dog" set + a female set.
AVATAR DISK: round, face fills ~90%, independent bg-opacity + border-opacity sliders (0 = invisible disk). Draggable/resizable on canvas, snap-to-grid.
UI AESTHETIC (from inspiration images): Charcoal brushed/rough metal panels + thick clear-plastic tactile controls + amber/copper backlit glow. Pure CSS only (layered gradients + backdrop-blur + inset/outset shadows), NO WebGL. Bulky clear-plastic buttons wanted "proper, not plain." Left = accordion rail. Center = video preview canvas. Bottom = drag-edit timeline. Native selects/file inputs hidden behind styled proxies. Accent-color variants planned.
FEATURES PLANNED: subtitle engine (active-word glow+stroke, fonts/colors/sizes/word-count, SRT export), waveform (5 styles: bars/line/wave/blocks/mirror; positions circular/top/bottom/L/R; modes single-all / single-colorshift / two-speaker / two+music / three-track; only ACTIVE speakers animate — waveforms carry lots of the "value" since no generative video), AI background auto-fetch with relevancy↔frequency slider (min-clip-duration strobe guard), transitions, audio ducking, uploadable logo (4 corners/watermark), presets, "Dogs & Butterflies" sample project.
CREDITS (README, already LIVE on GitHub): You.com, Claude Opus 4.8, Hermes agent, Google Flow. Site: https://BYOK-Vid-Creator.stravelakis.com
FILES DONE (root unless noted):
package.json, tailwind.config.js, postcss.config.js, tsconfig.json
electron.vite.config.ts, index.html
electron/main.ts, electron/preload.ts (both created)
src/main.tsx, src/index.css (theme tokens)
src/store/types.ts, defaults.ts, useProjectStore.ts (incl. fps + speakers slice), settingsTypes.ts, useSettingsStore.ts (persisted API keys — need to confirm secure storage), SpeakerConfig type
src/components/PlasticButton.tsx
AppShell layout wired to store (fps/aspect)
SECURITY NOTE TO RESOLVE: Confirm API keys stored securely (electron safeStorage / OS keychain), never exposed to renderer or committed.
NEXT = PHASE 1g: Finish App shell panels — RenderSettings dashboard (fps 10/24/30 dropdown, aspect 9:16 & 16:9) + BackendSettings panel (API key inputs, defaults, saved templates) in charcoal-metal/clear-plastic style. Then canvas preview + waveform renderer.
IMMEDIATE TODO FOR USER (on PC, whenever ready): clone repo, npm install, npm run dev to see it launch for the first time.


=======================
=======================
# Video Forge — Build Handoff (Phase 1a–1d complete)

## What this app is
A **desktop-only** (Electron + Vite + React + TS + Tailwind, dark-only) deterministic
(non-generative) video production tool. It assembles TTS speech + stock video
(Pixabay/Pexels) + music (Jamendo) + SFX (Freesound) + animated waveforms + viseme
avatars + subtitles, then renders with **Remotion** (primary) or **FFmpeg-WASM**.
Target: 8–10 min videos. Dev machine RECOMMENDED spec: 8GB NVIDIA GPU, 32GB RAM.
Render time up to ~1hr per 10 min is acceptable.

## Locked decisions
- Deterministic = template/stock-driven, NOT Veo/Sora-style generation.
- TTS: PRIMARY = Coqui XTTS-v2 (local). FALLBACK = Azure Speech. TEST = Piper.
  Edge/ElevenLabs/Voxtral DROPPED. No SSML phoneme accent hacks (caused bad
  pauses); accent/expression via post-processing LATER, once local model runs.
- Scene chunking LLM: GLM 5.2 via NVIDIA provider.
- FPS: user choice 10 / 24 / 30 (default 24).
- Language focus: Greek (primary) + English. Chirp Greek noted but not in core stack.
- Storage: local disk (Google Drive = UI stub, "future feature", from day 1).
- Visemes: 9-cell sprite sheet (Neutral, Ah, Ee, Oh, Oo, MBP, FV, L, Ch/Sh),
  1024x1024 source PNG per head, shrinkable. Text-driven phoneme mapping
  (no speaker audio provided). <95% sync fidelity acceptable.
- UI aesthetic: charcoal rough metal + thick clear-plastic tactile controls.
  Priority order: STABILITY > FUNCTION > OUTPUT QUALITY > UI WOW.
- Credits: You.com, Opus 4.8, Hermes agent, Google Flow. Live at
  https://BYOK-Vid-Creator.stravelakis.com + GitHub. README is LIVE.

## Files done so far
- root: package.json, tailwind.config.js, vite.config.ts, tsconfig.json (root!)
- src/store/types.ts, defaults.ts, useProjectStore.ts
- src/store/settingsTypes.ts, useSettingsStore.ts (persisted API keys/defaults)

## NEXT (phase 1e)
Build visual panels: RenderSettings dashboard + BackendSettings (API keys),
in charcoal-metal/clear-plastic style. Then canvas + waveform renderer.

## Workflow rule
Non-coder user. ALWAYS give FULL-FILE replacements, tagged EDIT or CREATE.
NEVER say "append". No inline "// add this here" snippets.



2

📄 HANDOFF DOC (paste this into a fresh chat to continue without the image load)
PROJECT: Video Forge — desktop-only video machine. Site: BYOK-Vid-Creator.stravelakis.com. README already live on GitHub. Built with You.com + Opus 4.8 (+ Hermes agent, Google Flow, credited in README).
GOAL: Deterministic (non-generative) video creation. Script → local TTS → auto-fetched stock B-roll + music/SFX → animated waveforms + viseme-synced speaker disks + subtitles → rendered MP4. Max 10min, must handle 8min+. Priorities in order: stability > functionality > output quality > UI wow.
STACK (locked):
Electron + React(Vite) + TypeScript + Tailwind (dark-only) + Zustand + framer-motion + Remotion (render engine).
TTS: Coqui XTTS v2 (main, local), Azure Speech (quality fallback), Piper (test fallback). Greek + some English. No SSML/phoneme accents — expressiveness via audio post-processing only, deferred until quality local model runs.
Scene chunking / script AI: GLM 5.2 via NVIDIA provider.
Media: Pixabay (video+music), Jamendo (music), Freesound (SFX). One MediaProvider interface.
Storage: local disk day 1; Google Drive = UI-present but disabled ("future feature").
BYOK backend dashboard: enter API keys, defaults, saved templates/presets.
RENDER: aspect 9:16 & 16:9. FPS choice 10/24/30, default 30. Machine: rec. spec 8GB NVIDIA / 32GB RAM. ~1hr/10min render is acceptable.
VISEMES: 9-set = neutral, ah, ee, oh, oo, mbp, fv, l, chsh. Each = 1024×1024 transparent PNG, head centered w/ ~12% padding, scales to 90% of speaker disk. Sync driven from text→phoneme timing (no user audio provided; no diarization needed). <95% sync fidelity acceptable.
UI AESTHETIC: Charcoal brushed metal + thick clear plastic controls + amber/copper backlit glow (achieved in pure CSS — layered gradients + backdrop-blur + inset/outset shadows; NO WebGL). Tactile knobs/sliders/plastic buttons. Left rail = accordions/icon-rail. Bottom = drag-edit timeline. Native <select>/file inputs must be hidden behind styled proxies.
FEATURES: speaker disks (bg + border opacity sliders, incl. invisible), subtitle engine (active-word glow+stroke, fonts/colors/sizes/word-count, SRT export), waveform (5 shapes: bars/line/wave/blocks/mirror; positions circular/top/bottom/L/R; modes single-all/single-colorshift/two-speaker/two+music/three-track; only active speakers animate), AI background auto-fetch (relevancy↔frequency slider w/ min-clip strobe guard), transitions, audio ducking, uploadable logo (4 corners or watermark), draggable/resizable canvas w/ snap-to-grid, presets, "Dogs & Butterflies" sample project.
DONE (Phase 1b): package.json, vite/tailwind/postcss config, index.css theme, store (types/defaults/useProjectStore), PlasticButton, electron main. Root files confirmed in project root. NEXT (Phase 1c): AppShell panel layout + wire FPS/aspect controls to store.


1
📄 HANDOFF DOC (paste this into your new clean chat)
PROJECT: Video Forge — Handoff v1 URL: https://BYOK-Vid-Creator.stravelakis.com · GitHub live · README live. What it is: Desktop app (Electron) that turns a script into a polished 8–10 min video with TTS narration, lip-synced avatar disks, glowing waveforms, highlighted subtitles, and auto-fetched stock backgrounds. Deterministic (Remotion render), NOT generative video.
Target machine (RECOMMENDED spec): 8GB NVIDIA GPU, 32GB RAM, AMD CPU. ~1hr render for 10min acceptable. Render at 10fps.
LOCKED STACK:
Electron + React + Vite + TypeScript + Tailwind (dark only)
Zustand sliced store (src/store/slices/*) = source of truth
framer-motion for canvas drag/resize
Remotion (native, GPU) = video renderer (deterministic)
FFmpeg (native bundled binary) = audio mix + ducking + final mux
TTS: Coqui XTTS v2 (MAIN, Python sidecar, GPU, Greek+English, voice cloning) · Azure Neural (quality fallback, SSML prosody only) · Piper (test fallback). Edge/ElevenLabs/Voxtral = DROPPED.
Chunking/scene AI: GLM-5.2 via NVIDIA provider (BYOK)
Media: Pixabay + Pexels (video, music, SFX)
Alignment: whisperX (word timestamps) + G2P → 9-viseme map
Audio FX: pedalboard (Python) for character voices + warmth
KEY DECISIONS:
Accents come from XTTS reference clips + audio post-FX (pitch/formant), NOT SSML. Azure uses SSML prosody/break only, never per-phoneme surgery.
Visemes: 9 slots (neutral, ah, ee, oh, oo, mbp, fv, l, chsh). PNG 1024×1024, transparent, head LOCKED position across all frames. Named char_<viseme>.png.
Avatar = round disk, face fills 90%, independent bg-opacity + border-opacity sliders (0 = invisible disk).
UI theme: charcoal-metal panels + clear-plastic amber-glow controls, pure CSS (tokens in tailwind.config). Stability > wow, but wow is the goal.
PRIORITY ORDER: Stability > Functionality > Output quality > UI wow.
UI FUTURE-STUB (must appear in UI Day 1, disabled): Google Drive export. Local disk export = active.
PHASE PLAN:
✅ Phase 1: scaffold (package.json, tailwind theme, store index + speaker slice, electron main) — DONE / committing.
⬜ Phase 1b: remaining 6 store slices + App shell (left accordion rail, center canvas, bottom timeline) + tactile components (PlasticButton, MetalSlider, Panel).
⬜ Phase 2: script→SSML maker + TTS sidecar + XTTS integration + audio FX chain.
⬜ Phase 3: alignment → viseme + subtitle word-highlight timing.
⬜ Phase 4: waveform engine (5 styles, positional configs, behavioral modes).
⬜ Phase 5: Pixabay/Pexels background automation + relevancy/frequency slider (min-duration constraint).
⬜ Phase 6: Remotion composition + FFmpeg mux + ducking + export (local + GDrive stub).
⬜ Phase 7: presets, sample "Dogs & Butterflies" project, polish.
CREDITS (in README): You.com, Claude Opus 4.8, Hermes agent, Google Flow.
