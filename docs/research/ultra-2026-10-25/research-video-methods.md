# Video Forge: methods, free models, formats, licences (research, 25 Oct 2026)

Scope: techniques that need NO paid video-generation model. Four parts: (1) techniques, (2) free local AI models and licences, (3) viral formats, (4) Image Forge variety ideas. Then a licence-trap list and an "unknown / not verified" list.

## 0. How this was done (read first)

- Tools: research-forge `web_search` and `read_page` for almost everything. No fallback was needed for search (research-forge answered every query).
- One deviation, said upfront: licence tags for about 150 GitHub repos came from the read-only public GitHub API through `gh api repos/OWNER/REPO` (field `license.spdx_id`), not from research-forge. It is metadata only, nothing downloaded or run. Where GitHub says `NOASSERTION` I read the licence text with `read_page`, or marked it "verify".
- Nothing downloaded, installed or run. No project file edited. The `.hermes`, `.openhuman`, `.claude`, `SECRETS` folders were not opened. The only project file read was `package.json` (Remotion `^4.0.500`, Electron `^43.7.9`, React `^18.3.1`).
- Tags: `(GH)` = licence from GitHub's detector, checked 25 Oct 2026. `(3rd)` = third-party claim, not from the maker. `UNKNOWN` = I did not find it. Nothing was guessed.
- Effort scale (my estimate, human work hours, not sourced): **S** = 2-8 h, **M** = 8-30 h, **L** = 30-80 h.
- Colour: GREEN = permissive and safe to ship. AMBER = usable with a condition. RED = non-commercial / copyleft / EU-excluded / unclear.

---

## 1. Summary

### 1.1 Top 15 techniques for this app (value vs effort)

| Rank | Technique | Why it pays | Effort | Licence status |
|---|---|---|---|---|
| 1 | **Effects "look pack"**: post-process any scene with Remotion's built-in effects (halftone, pixelate, duotone, scanlines, chromatic-aberration, tv-signal-off, thermal-vision, shatter, page-turn, light-leak...) | Multiplies the 20 art looks with almost no new drawing code. Biggest variety per hour. | S | AMBER: Remotion licence (see trap 1). Needs WebGL2 in the render browser (test). Docs show v4.0.538, app pins ^4.0.500: check the package exists for the installed version. |
| 2 | **Animated caption presets** (word-pop, karaoke, bounce, emoji) | Submagic sells exactly this ("35+ animation templates"). Cheap, shows on every video. | S | GREEN: `@remotion/captions` + whisper.cpp (MIT) |
| 3 | **Fake chat / text-message story** layout | Proven faceless format, pure layout code | S | GREEN |
| 4 | **Quiz / would-you-rather / countdown / tier-list templates** fed by the spreadsheet | Fits the existing batch-from-spreadsheet idea; comment-bait format | S-M | GREEN |
| 5 | **Whiteboard hand-draw reveal** (SVG stroke draw-on + hand cursor), raster to SVG with VTracer | Best fit for LMS lessons; VideoScribe/Doodly style | M | GREEN: VTracer MIT, `@remotion/paths` evolvePath |
| 6 | **Kinetic typography** scenes (words slam/slide in time with the voice) | Renderforest/Canva staple, great for hooks and quotes | S-M | GREEN (GSAP is free now but a custom licence: AMBER if used) |
| 7 | **Virtual camera**: Ken Burns, punch-in zoom on key words, shake | Vyond-style camera; makes still scenes feel directed | S | GREEN |
| 8 | **2.5D parallax from a depth map** (Depth Anything V2 **Small** only) | Turns Image Forge stills into "moving" shots, very high wow | M | AMBER: Small = Apache-2.0, Base/Large/Giant = non-commercial |
| 9 | **Animated data scenes**: chart race, counters, timeline, map route, globe | Explainers + LMS | M | GREEN (d3 ISC, Chart.js MIT, three-globe MIT); do not hit OSM tile servers in bulk |
| 10 | **Transition presets + auto whoosh/pop SFX** (film-burn, cross-zoom, page-turn, zoom-blur) | Cheap polish on every cut | S | GREEN/AMBER (Remotion licence; `@remotion/sfx` package MIT, each sound has its own licence) |
| 11 | **Celebration overlay layer**: confetti, sparkles, snow, light leaks | Instant "wow" on reveals and endings | S | GREEN: tsparticles MIT, canvas-confetti ISC |
| 12 | **Lesson cards** for dog training / soft skills: do/don't split with tick/cross, step timers, treat-timing ring | Direct fit to the stated LMS target; own design, no outside dependency | S-M | GREEN |
| 13 | **Split-screen retention layout** with a code-made "satisfying" loop (marble run, ball drops) instead of copyrighted game footage | Gets the Reddit/storytime layout without the copyright risk | M | GREEN: matter.js MIT |
| 14 | **Pose capture to stick/cartoon figure** (video or webcam to skeleton to the code-drawn rig) | Real motion for the stick characters; Character Animator idea | M | GREEN: MediaPipe Apache-2.0 |
| 15 | **Photo to talking head, local** (MuseTalk MIT / SadTalker Apache-2.0), marked EXPERIMENTAL | Big wow for "talking dog/mascot"; CapCut already sells a "Talking Dog" feature | L | AMBER: pick the permissive ones only; heat guard needed |

Runners-up: beat-synced cuts and speed ramps (M), auto-b-roll by keyword (M), audiogram/podcast clip (S-M), cinemagraph (M), image-to-layers parallax (L, experimental), local image-to-video clips (L, experimental, EU trap).

### 1.2 Licence traps (details in section 6)

1. **Remotion is not open source.** Free only for a for-profit with up to 3 employees, a non-profit, or evaluation. The public "installable by anyone" version bundles it: each user is a licensee. Ask Remotion in writing before the public release. MIT fallbacks exist (Revideo, Motion Canvas) but mean a rewrite.
2. **rembg's default model is Bria RMBG, which is non-commercial** (CC BY-NC 4.0 on the RMBG-2.0 card). rembg code is MIT. Pick BiRefNet (MIT) or U2Net/ISNet (Apache-2.0) explicitly.
3. **Depth Anything V2: only Small is Apache-2.0.** Base/Large/Giant are CC-BY-NC-4.0. Same split in Depth Anything 3 (Small/Base Apache, Large/Giant NC).
4. **LivePortrait**: code and weights MIT, but the InsightFace face models it ships with are non-commercial. Use the MediaPipe path or skip.
5. **Wav2Lip and CodeFormer: non-commercial.** MusicGen weights CC-BY-NC 4.0. TangoFlux non-commercial research only. FLUX.2 klein **9B** and FLUX.1 Kontext **dev** weights non-commercial (4B is Apache-2.0).
6. **FramePack (local image-to-video) sits on HunyuanVideo, whose licence says it does not apply in the EU, UK and South Korea.** If you operate from the EU, treat as RED.
7. **Copyleft code (do not embed, borrow ideas only):** Upscayl AGPL-3.0, aubio GPL-3.0, essentia AGPL-3.0, Fooocus GPL-3.0, ComfyUI GPL-3.0, ComfyUI-seamless-tiling GPL-3.0, RedditVideoMakerBot GPL-3.0, and the maintained Piper (`piper1-gpl`) GPL-3.0.
8. **Attribution/share-alike assets:** `@remotion/animated-emoji` is CC BY 4.0 (credit needed); OpenMoji is CC-BY-SA-4.0 (share-alike).
9. **Platform policy risk, not licence:** YouTube's monetisation policy wants original, non-repetitive content; mass-produced batches are the exact thing it targets.

---

## 2. Part 1: Techniques (no video-gen model)

### 2.1 What popular tools offer, and the method behind it

| Tool | Offers (non-video-gen) | General method | Source |
|---|---|---|---|
| Lumen5 | Article/script to storyboard; matches each scene to stock photo, video, music | Text split into scenes with NLP, then keyword/vision match against a stock library | https://help.lumen5.com/en/article/how-does-lumen5-work-112fo9k/ |
| VideoScribe (and Doodly style) | Illustrations appear "hand-drawn" on white while a voice explains; drawing animation added to raster or SVG images | SVG path draw-on plus a hand image following the pen tip | https://www.videoscribe.co/en/whiteboard-animation/ , https://help.videoscribe.co/knowledge/create-your-own-images |
| Adobe Character Animator | Webcam + mic give automatic lip sync and face/body tracking; triggers swap hands, eyelids, mouth sets; puppets from Illustrator/Photoshop layers | Layered puppet + tracked face landmarks + audio-to-viseme + keyboard triggers | https://www.adobe.com/products/character-animator.html , https://pages.adobe.com/character/en/tutorials |
| Vyond | Template characters, camera box you resize for zoom/pan, AI avatars | A virtual camera rectangle over a 2D stage | https://instructionaldesigncompany.com/making-animated-videos-with-vyond-2/ |
| Powtoon / Steve.ai / Animaker | Automatic lip sync for characters; text/script to animated video; Steve.ai built on Animaker's engine | Scene templates + viseme lip sync + stock characters | https://www.powtoon.com/features/lip-sync , https://fliki.ai/blog/best-explainer-video-software |
| Plotagon | Write dialogue, pick a voice, assign a listener, add emotion animations | Dialogue script drives actors, listener-aware camera | https://www.plotagon.com/ |
| Submagic / Captions-style | 35+ caption animations that highlight/bounce/fade word by word; silence removal; B-roll insert; key-moment finder | Word timestamps from speech-to-text + styled text per word | https://www.submagic.co/ai-caption , https://www.submagic.co/ |
| Opus Clip | Picks highlight moments, adds dynamic captions and transitions, virality score, auto reframe | Transcript + audio energy scoring, face-tracked crop | https://www.opus.pro/ , https://www.submagic.co/blog/opus-clips-pricing |
| Canva | Beat Sync (cuts to music), Magic Animate (one-click animation set) | Beat detection on audio, preset animation library | https://www.canva.com/features/beat-sync/ , https://www.canva.com/help/using-magic-animate/ |
| CapCut | Speed ramp/curve edits, transition templates, "Talking Dog" (animate a pet photo's mouth to custom speech) | Keyframed speed curves; templates; photo-to-talking-head | https://www.capcut.com/tools/speed-ramp , https://www.capcut.com/explore/talking-dog |
| Descript | Edit video by editing the transcript; remove silences and filler words | Word-timestamped transcript maps to cut points | https://www.descript.com/video-editing |
| Kapwing / Renderforest | Auto-subtitles; kinetic typography templates | Same word-timing + template engines | https://www.kapwing.com/subtitles , https://www.renderforest.com/animation-videos/kinetic-typography-maker |

### 2.2 Technique catalogue (50)

Libraries are named with licence. "Remotion-L" = Remotion licence (see trap 1). Remotion docs/pages: effects list is read from https://github.com/remotion-dev/remotion/tree/main/packages/docs/docs/effects , packages from https://github.com/remotion-dev/remotion/tree/main/packages .

#### A. Camera and image motion

| # | Technique | ELI5 | How, locally | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 1 | Ken Burns pan/zoom | Slow drift across a still so it feels alive | Remotion: animate scale/translate with easing; FFmpeg alt: `zoompan` filter | S | FFmpeg LGPL-2.1+ (GPL if GPL parts enabled) | https://ffmpeg.org/legal.html |
| 2 | 2.5D parallax from depth map | Cut a photo by distance and slide near things more than far things | Depth Anything V2-Small makes a grey depth image; three.js/Canvas displaces a mesh or slices into 3-5 layers; move camera in an arc | M | Depth-Anything-V2 **Small** Apache-2.0 (24.8M params); transformers.js Apache-2.0 (runs it in browser/Node); three.js MIT | https://github.com/DepthAnything/Depth-Anything-V2 , https://github.com/huggingface/transformers.js |
| 3 | Image to RGBA layers, then parallax or puppet parts | Model splits a picture into see-through layers | Qwen-Image-Layered returns 3-8 layers; recursive split possible; move layers in Remotion. Also could seed puppet parts | L, EXPERIMENTAL | Apache-2.0. VRAM: UNKNOWN from maker; a third party says 8 GB works with the GGUF Q4 build (3rd, slow likely) | https://huggingface.co/Qwen/Qwen-Image-Layered , https://zimage.run/blog/qwen-image-layered-gguf-comfyui-guide |
| 4 | Virtual camera (Vyond style) + punch-in zoom + shake | A pretend camera pans, zooms and jolts on beats | One camera transform wrapper around the whole scene; keyframes from script cues; noise for shake | S | `@remotion/noise`, `@remotion/motion-blur` (Remotion-L) | https://github.com/remotion-dev/remotion/tree/main/packages |
| 5 | Comic-panel camera | Camera hops from panel to panel on a comic page | Store panel rectangles; tween camera to each | S-M | none needed | (method) |
| 6 | Infinite zoom / outpaint tunnel | Keep zooming into a picture that keeps inventing more picture | Image Forge outpaints each step; crossfade-zoom between steps | M | FLUX.2 klein 4B Apache-2.0 (edit-capable) | https://huggingface.co/black-forest-labs/FLUX.2-klein-4B |
| 7 | Cinemagraph (living photo) | Photo is frozen except one thing moves (hair, flame, water) | SAM 2 mask of the region + loop that region only (crossfade loop) | M | SAM 2 Apache-2.0 (checkpoints + code) | https://github.com/facebookresearch/sam2 |
| 8 | Animate "on twos/threes" and boiling lines | Lower frame rate and wobbling outlines give a hand-made feel | Hold each frame 2-3 ticks; re-seed rough.js strokes every few frames, or use Remotion `roughen-edges` effect | S | rough.js MIT (GH) | https://github.com/rough-stuff/rough |

#### B. Text

| # | Technique | ELI5 | How | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 9 | Kinetic typography | Words pop, slide, spin on the beat of the voice | Word timings drive per-word transforms; `fitText` sizes lines | S-M | `@remotion/layout-utils` (Remotion-L); GSAP via `@remotion/gsap` (free since Apr 2025 but custom licence, AMBER) | https://www.remotion.dev/docs/layout-utils/fit-text , https://www.remotion.dev/docs/gsap , https://webflow.com/blog/gsap-becomes-free |
| 10 | Karaoke / word-pop captions | Current word lights up or bounces | `createTikTokStyleCaptions` pages words; whisper.cpp gives timestamps | S | `@remotion/captions` (Remotion-L), whisper.cpp MIT (GH) | https://www.remotion.dev/docs/captions/create-tiktok-style-captions , https://github.com/ggerganov/whisper.cpp |
| 11 | Typewriter + RPG dialogue box | Text types out with a little blip per letter | React state by frame + blip sounds | S | none | (method) |
| 12 | 3D extruded titles | Chunky 3D words with lighting | three.js TextGeometry, or Remotion three package | M | three.js MIT; fonts OFL (Google Fonts) | https://github.com/mrdoob/three.js |
| 13 | Hand-drawn annotations (circle, underline, highlight) | Marker scribbles around the key word | rough-notation | S | rough-notation MIT (GH); Remotion has a `rough-notation` package | https://github.com/rough-stuff/rough-notation |
| 14 | Lower-thirds, chapter cards, progress bars, step counters | The labels and bars you see on lessons | Plain React | S | none | (method) |

#### C. Drawing and whiteboard

| # | Technique | ELI5 | How | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 15 | Whiteboard hand-draw reveal | A hand draws the picture line by line | `evolvePath(progress, svgPath)` reveals strokes; hand image follows path head; turn Image Forge pictures into SVG with VTracer | M | `@remotion/paths` (Remotion-L); VTracer MIT (GH) | https://www.remotion.dev/docs/paths/evolve-path , https://github.com/visioncortex/vtracer |
| 16 | Handwriting write-on | Text writes itself in cursive | Vara.js or opentype.js glyph paths + evolvePath; single-line font for clean strokes | S-M | Vara MIT, opentype.js MIT, Relief SingleLine OFL-1.1 (all GH) | https://github.com/akzhy/Vara , https://github.com/isdat-type/Relief-SingleLine |
| 17 | Sketch-to-colour reveal | Line art first, then colour floods in | Two layers; mask wipe | S | none | (method) |
| 18 | Pressure-style freehand strokes for stick figures | Lines with natural thick/thin | perfect-freehand turns points into outline polygons | S | MIT (GH) | https://github.com/steveruizok/perfect-freehand |

#### D. Data and graphics

| # | Technique | ELI5 | How | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 19 | Animated charts, counters, bar race | Bars grow and swap places over time | Compute values per frame from data; draw SVG/Canvas | M | d3 ISC, Chart.js MIT, Observable Plot ISC (all GH) | https://github.com/d3/d3 |
| 20 | Map route animation | A line draws across a map from A to B | MapLibre + local tiles (Protomaps PMTiles) or Natural Earth vectors; route with evolvePath. Do NOT point at OSM's public tile servers: bulk/prefetch is banned | M | MapLibre BSD-3 (licence text read), PMTiles (verify), Natural Earth public domain, OSM data free but tile servers restricted | https://github.com/maplibre/maplibre-gl-js , https://www.naturalearthdata.com/about/terms-of-use/ , https://operations.osmfoundation.org/policies/tiles/ |
| 21 | Spinning globe with pins/arcs | Earth turns, arcs link places | three-globe / cobe / globe.gl | M | all MIT (GH) | https://github.com/vasturiano/three-globe |
| 22 | Timeline / history reel | Dates slide past on a rail | Horizontal tween + markers | S | none | (method) |
| 23 | Before/after slider, split reveal | A line wipes between two images | `clip-path` animation | S | none | (method) |
| 24 | Ranking / tier list / Top-N countdown | Items revealed from #5 to #1 | List data from spreadsheet + pop-in | S | none | (method) |
| 25 | Quiz / would-you-rather / guess-the-X with countdown | Question, timer ring, reveal, tally | Template per row of the spreadsheet; loopable ending | S-M | none | https://ghostshorts.com/blog/how-to-make-quiz-videos-for-tiktok-and-youtube-shorts-2026 (format evidence) |
| 26 | Code walkthrough / typing | Code types and gets highlighted | Remotion has a Code Hike template | M | `template-code-hike` (Remotion-L) | https://github.com/remotion-dev/remotion/tree/main/packages |

#### E. Layouts

| # | Technique | ELI5 | How | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 27 | Split-screen "retention" layout | Story on top, hypnotic loop below | Two regions; bottom = code-made loop (see #41) | S | none | (method) |
| 28 | Reaction / duet box | A character sits in a corner reacting to content | Picture-in-picture with the puppet | S | none | (method) |
| 29 | Fake chat / text-message story | Phone chat where bubbles pop up with typing dots | Bubble components timed by script | S | none | https://www.reelry.app/tools/fake-text-message-video-generator (format evidence) |
| 30 | Forum/Reddit-style story card | Post card on screen, text highlights as it is read | Card + word highlight. Use ORIGINAL or LLM-written stories, not copied posts | S | none | (method) |
| 31 | Audiogram / podcast clip | Moving waveform over a still + captions | `visualizeAudio`, Remotion audiogram + music-visualisation templates | S-M | Remotion-L; wavesurfer.js BSD-3; NYPR audiogram MIT (GH) | https://github.com/remotion-dev/remotion/tree/main/packages |
| 32 | Device / product mockups | Screenshot inside a tilted phone/laptop | Remotion `corner-pin` effect, or CSS 3D | S-M | Remotion-L | https://github.com/remotion-dev/remotion/tree/main/packages/docs/docs/effects |
| 33 | Slideshow with shader transitions | Pictures change with film-burn, page-turn, zoom | `TransitionSeries` presets: blur-slide, book-flip, clock-wipe, cross-zoom, crosswarp, cube, dissolve, dreamy-zoom, film-burn, flip, iris, linear-blur, push-cut, ripple, swap, zoom-blur, zoom-in-out | S | Remotion-L | https://github.com/remotion-dev/remotion/tree/main/packages/docs/docs/transitions/presentations |

#### F. Effects, overlays, sound

| # | Technique | ELI5 | How | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 34 | Light leaks / film burn | Warm flashes between shots | `lightLeak()` effect (WebGL2) on a canvas component, usable as a transition overlay | S | Remotion-L | https://www.remotion.dev/docs/light-leaks/ |
| 35 | Glitch / VHS / CRT / TV-off / thermal | Broken-TV looks | effects: chromatic-aberration, scanlines, tear, tv-signal-off, thermal-vision, white-noise, shatter | S | Remotion-L | effects dir above |
| 36 | Particles, confetti, fireworks, snow | Sparkly celebration layer | tsparticles / canvas-confetti | S | tsparticles MIT, canvas-confetti ISC (GH) | https://github.com/tsparticles/tsparticles |
| 37 | "Look" filters as art-style multipliers | Same scene, different print style | effects: halftone, pixelate, duotone, dot-grid, contour-lines, emboss, lut, vignette, paper, burlap, flannel | S | Remotion-L | effects dir above |
| 38 | Animated emoji / sticker pop-ins | Little animated emoji bounce in | `@remotion/animated-emoji` wraps Noto animated emoji; Lottie via lottie-web | S | Emoji CC BY 4.0 (credit required); lottie-web MIT (GH); LottieFiles files under Lottie Simple License | https://www.remotion.dev/docs/animated-emoji/ , https://lottiefiles.com/page/license |
| 39 | Auto whoosh/pop/ding on cuts and text | Sound under every move | `@remotion/sfx`: normalised to -3 dB, usable without attribution, attribution page per sound | S | package MIT; each sound its own licence (read page) | https://www.remotion.dev/docs/sfx |
| 40 | Beat-synced cuts and speed ramps | Cuts land on the drum | Beat times from librosa (python) or an MIT JS detector, then place cuts; speed curve with keyframes | M | librosa ISC (GH). AVOID aubio (GPL-3.0) and essentia (AGPL-3.0) | https://github.com/librosa/librosa |
| 41 | Code-made "satisfying" loops | Marbles drop, bars fill, sand pours | matter.js physics, frame-deterministic seed, loop 10-20 s | M | matter.js MIT (GH). Rapier.js is archived on GitHub | https://github.com/liabru/matter-js |

#### G. Character and motion

| # | Technique | ELI5 | How | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 42 | Photo to talking head | A still face speaks the voice | Run model offline per clip (see Part 2.2), drop result as video layer | L, EXPERIMENTAL | MuseTalk MIT; SadTalker Apache-2.0; LatentSync 1.5 Apache-2.0 (8 GB). NOT Wav2Lip (non-commercial) | Part 2 |
| 43 | Pose capture to stick/cartoon figure | Film yourself, the figure copies | MediaPipe Pose landmarks per frame to joint angles on the code-drawn rig | M | MediaPipe Apache-2.0; rtmlib Apache-2.0 | https://github.com/google-ai-edge/mediapipe , https://github.com/Tau-J/rtmlib |
| 44 | Webcam face-tracked puppet (Character Animator style) | Move your face, the puppet moves | MediaPipe face landmarks to eye/brow/head params, record take | M | Apache-2.0 | https://www.adobe.com/products/character-animator.html (idea) |
| 45 | Viseme lip sync for 2D | Mouth shapes follow the sound | Rhubarb outputs 6-9 shapes (A-F + G,H,X); only if the app's own sync is not enough | S | Rhubarb MIT, dependencies permissive | https://github.com/DanielSWolf/rhubarb-lip-sync/blob/master/LICENSE.md |
| 46 | Keyword triggers for expressions/gestures | Say "wow", eyes go wide | Script word list to expression swap events | S | none | https://pages.adobe.com/character/en/tutorials (idea) |
| 47 | Subject-in-front-of-text ("depth sandwich") | Title sits behind the person | Cut-out mask (BiRefNet), place text between base and cut-out. Remotion also ships `separateVideoLayers()` (default MODNet; experimental BEN2) needing WebGPU | M | BiRefNet MIT; MODNet Apache-2.0 (GH); BEN2 MIT (GH) | https://www.remotion.dev/docs/video-matting , https://github.com/ZhengPeng7/BiRefNet |
| 48 | Smooth 12 to 24/60 fps, slow-mo | Invent in-between frames | RIFE / FILM / FFmpeg `minterpolate` | S-M | RIFE MIT, FILM Apache-2.0 (archived Oct 2025) | https://github.com/hzwer/Practical-RIFE |
| 49 | Upscale low-res art | Sharper pictures | Real-ESRGAN (portable Vulkan exe exists) | S | BSD (licence text read) | https://github.com/xinntao/Real-ESRGAN |
| 50 | Local image-to-video "motion shots" (optional) | A model animates a still for 3-5 s | See Part 2.4. Very slow on a laptop; ask before running | L, EXPERIMENTAL | Wan2.1 1.3B Apache-2.0 | Part 2.4 |

#### H. Editing automation (Descript / Opus / Lumen5 ideas)

| # | Technique | ELI5 | How | Effort | Free parts + licence | Source |
|---|---|---|---|---|---|---|
| 51 | Text-based editing, silence/filler removal | Delete words in text, audio cuts itself | faster-whisper word times, then FFmpeg cuts; auto-editor does silence cuts | M | faster-whisper MIT, auto-editor Unlicense (GH) | https://github.com/SYSTRAN/faster-whisper , https://github.com/WyattBlue/auto-editor |
| 52 | Auto b-roll from script | Keyword in script, matching stock clip appears | LLM keywords to Pexels/Pixabay search, optional CLIP ranking | M | Pexels and Pixabay licences below; open_clip `NOASSERTION` (verify) | https://www.pexels.com/license/ , https://pixabay.com/service/license-summary/ |
| 53 | Smart 16:9 to 9:16 reframe | Crop follows the speaker's face | MediaPipe face detection, smoothed crop path | S-M | Apache-2.0 | https://www.opus.pro/ (idea) |
| 54 | Script to scenes splitter | Long text becomes a scene list | LLM or rule-based split; the app already batches | S | none | https://help.lumen5.com/en/article/how-does-lumen5-work-112fo9k/ |

---

## 3. Part 2: Free local AI models (8 GB VRAM or CPU)

Machine: laptop RTX 3070 8 GB (shared, heat-limited per project rules). Always ask before any long GPU run.

### 3.1 Depth

| Model | Licence | Size / fit | Source |
|---|---|---|---|
| Depth Anything V2 **Small** | **Apache-2.0** | 24.8M params; CPU-feasible (my inference from size, not benchmarked) | https://github.com/DepthAnything/Depth-Anything-V2 |
| Depth Anything V2 Base / Large / Giant | **CC-BY-NC-4.0 (non-commercial)** | 97.5M / 335.3M / 1.3B | same page, last lines |
| Depth Anything 3: Small, Base, Mono-Large, Metric-Large | Apache-2.0 | DA3 Small 0.08B, Base 0.12B | https://github.com/ByteDance-Seed/Depth-Anything-3 (Model Cards table) |
| Depth Anything 3: Large, Giant, Nested | **CC BY-NC 4.0** | 0.35B / 1.15B / 1.40B | same |
| MiDaS, ZoeDepth | MIT (GH), both archived | older | https://github.com/isl-org/MiDaS |
| Marigold | Apache-2.0 repo (GH); weights licence UNKNOWN; diffusion = heavier | | https://github.com/prs-eth/Marigold |
| Apple Depth Pro | `NOASSERTION` (GH): read its LICENSE before use | | https://github.com/apple/ml-depth-pro |
| 3D Ken Burns (research code) | `NOASSERTION`; its dataset is CC BY-NC-SA 4.0. Treat as RED; use DA V2 Small + three.js instead | | https://github.com/sniklaus/3d-ken-burns |

### 3.2 Cut-out / matting / segmentation

| Model | Licence | Fit | Source |
|---|---|---|---|
| BiRefNet | **MIT** | Inference 3.5 GB FP16 / 4.8 GB FP32 (README table, 4090 numbers) | https://github.com/ZhengPeng7/BiRefNet |
| RMBG-2.0 (Bria) | **CC BY-NC 4.0**; commercial needs a Bria agreement | | https://huggingface.co/briaai/RMBG-2.0 |
| rembg (the tool) | MIT code, but README says `bria-rmbg` is the **default model**: pass `-m birefnet-general` or `isnet-general-use` explicitly | CPU ok | https://github.com/danielgatis/rembg |
| U2Net / ISNet (DIS) | Apache-2.0 (GH) | small, CPU ok | https://github.com/xuebinqin/U-2-Net |
| MODNet | Apache-2.0 (GH); weights licence not checked | people-only | https://github.com/ZHKKKe/MODNet |
| SAM 2 | **Apache-2.0** (checkpoints, demo, training code) | tiny to large checkpoints; VRAM per size UNKNOWN here | https://github.com/facebookresearch/sam2 |
| SAM 1, MobileSAM | Apache-2.0 (GH) | MobileSAM is the light one | https://github.com/ChaoningZhang/MobileSAM |

### 3.3 Talking head from a photo (the commercial-use minefield)

| Model | Licence (code / weights) | VRAM | Verdict | Source |
|---|---|---|---|---|
| MuseTalk 1.5 | Code MIT; model "available for any purpose, even commercially"; other models it uses (whisper, dwpose, S3FD, ft-mse-vae) keep their own licences | Tested on RTX 3050 Ti Laptop **4 GB**, fp16: 8 s clip took ~5 min | GREEN/AMBER. Best fit. Lip-sync of an existing face video or image. | https://github.com/TMElyralab/MuseTalk |
| SadTalker | README: "licence updated to Apache 2.0, non-commercial restriction removed" (GH shows NOASSERTION) | 8 GB works per third parties (3rd) | AMBER. Dated look, still wow for a mascot. Depends on GFPGAN etc. | https://github.com/OpenTalker/SadTalker , https://sadtalker.ai/ |
| LatentSync | Apache-2.0 | **8 GB with v1.5; 18 GB with v1.6** | AMBER. Use v1.5 only. | https://github.com/bytedance/LatentSync |
| LivePortrait | MIT code and weights per the ailia write-up; **InsightFace face models it relies on are non-commercial** ("models of InsightFace are not [MIT]"); GH shows NOASSERTION. A third-party fork offers MediaPipe instead (Apache-2.0). Third-party says ~300 MB fp16 (3rd). | small | AMBER/RED until the MediaPipe path is confirmed. Issue #548 asks the maker to confirm weights; I saw no maker reply in the page text. | https://github.com/KlingAIResearch/LivePortrait/issues/193 , https://github.com/KlingAIResearch/LivePortrait/issues/548 , https://www.insightface.ai/ , https://github.com/kijai/ComfyUI-LivePortraitKJ , https://tech.ailia.ai/en/live-portrait-bring-portraits-to-life-1aa682082d80/ |
| Wav2Lip | README headline: "Non Commercial Open-source Version" | | **RED** | https://github.com/Rudrabha/Wav2Lip |
| Hallo (MIT code), EchoMimic (Apache-2.0), Ditto (Apache-2.0), VideoReTalking (Apache-2.0) | repo licences from GH only; weights and VRAM NOT checked | UNKNOWN | Candidates, unvetted | gh api |

Note on fit: talking-head models are trained on real faces. Whether they work on this app's stylised cartoon/puppet faces is UNKNOWN (LatentSync's page shows an anime demo clip from another system, nothing more). Needs a 10-minute test before any plan depends on it.

### 3.4 Motion helpers

| Task | Model | Licence | Notes | Source |
|---|---|---|---|---|
| Frame interpolation | RIFE (Practical-RIFE) | MIT (weights links "under the same MIT licence") | `rife-ncnn-vulkan` MIT (GH) = no Python needed | https://github.com/hzwer/Practical-RIFE |
| | FILM | Apache-2.0; repo **archived** 14 Oct 2025; TensorFlow 2 | | https://github.com/google-research/frame-interpolation |
| Upscale | Real-ESRGAN | BSD (text read) | portable Windows exe for Intel/AMD/NVIDIA GPU | https://github.com/xinntao/Real-ESRGAN |
| | SwinIR | Apache-2.0 (GH) | | https://github.com/JingyunLiang/SwinIR |
| | Upscayl (app) | **AGPL-3.0** (GH) | do not embed | https://github.com/upscayl/upscayl |
| Face restore | GFPGAN `NOASSERTION` (verify); CodeFormer **non-commercial** ("Redistribution and use for non-commercial purpose") | | | https://raw.githubusercontent.com/sczhou/CodeFormer/master/LICENSE |
| Pose | MediaPipe | Apache-2.0 | model-file terms: check each model card | https://github.com/google-ai-edge/mediapipe |
| | DWPose / rtmlib / MMPose | Apache-2.0 (GH) | | https://github.com/IDEA-Research/DWPose |

### 3.5 Music and sound effects

| Model | Licence | Fit | Verdict | Source |
|---|---|---|---|---|
| ACE-Step (music with vocals) | **Apache-2.0** | README 10 May 2025: max VRAM reduced to **8 GB** with `--cpu_offload true`; speed on a 3070 laptop UNKNOWN | GREEN. Best music option. | https://github.com/ace-step/ACE-Step |
| MusicGen / AudioGen (AudioCraft) | Code MIT; **weights CC-BY-NC 4.0** | docs: 16 GB GPU for the medium (1.5B) model; `musicgen-small` is 300M | RED for commercial lessons | https://github.com/facebookresearch/audiocraft , https://github.com/facebookresearch/audiocraft/blob/main/docs/MUSICGEN.md |
| Stable Audio Open 1.0 | Stability AI Community Licence: free for research/non-commercial; commercial allowed free if annual revenue under US $1,000,000, with registration; trained on CC0/CC-BY/CC-Sampling+ audio | up to 47 s stereo 44.1 kHz; VRAM UNKNOWN | AMBER (revenue cap, registration) | https://huggingface.co/stabilityai/stable-audio-open-1.0 , https://stability.ai/community-license-agreement |
| MMAudio (SFX from text/video) | Code MIT (GH); authors: "do not guarantee the pre-trained models are suitable for commercial use" | ~6 GB, 16-bit | AMBER, test-only | https://github.com/hkchengrex/MMAudio |
| TangoFlux | "non-commercial research use only" (inherits Stable Audio Open + WavCaps terms) | | RED | https://huggingface.co/declare-lab/tangoflux |
| AudioLDM 2 | licence UNKNOWN (not shown in card text I read) | | skip | https://huggingface.co/cvssp/audioldm2 |
| Ready-made SFX | `@remotion/sfx`: package MIT, each file has its own licence and attribution page | no GPU | GREEN | https://www.remotion.dev/docs/sfx |

### 3.6 Optional local image-to-video (marked EXPERIMENTAL, owner allows free local models)

| Model | Licence | Fit on 8 GB | Catch | Source |
|---|---|---|---|---|
| Wan2.1 T2V-1.3B | Apache-2.0 (GH) | README: **8.19 GB VRAM**, 5 s 480p in ~4 min on a **4090** | Barely fits; laptop will be slower and hot. LightX2V claims 8 GB RTX 4060 support. | https://github.com/Wan-Video/Wan2.1 |
| FramePack | Apache-2.0 repo (GH) | README: **6 GB minimum** for a 1-minute 30 fps video; 4090 = 2.5 s/frame (1.5 with teacache); 3070 Ti laptop "4x to 8x slower" | Derived from my reading: a 5 s clip (150 frames) is roughly 15-50 min per clip. **Built on HunyuanVideo; Tencent's licence says it does not apply in the EU, UK and South Korea** (derivation by FramePack is my inference: HunyuanVideo's own README lists FramePack as a related project). | https://github.com/lllyasviel/FramePack , https://huggingface.co/tencent/HunyuanVideo/blob/main/LICENSE |
| LTX-Video 2B | Apache-2.0 repo (GH); 2B v0.9.5 weights OpenRAIL-M per README | UNKNOWN for 8 GB | | https://github.com/Lightricks/LTX-Video |
| AnimateDiff, CogVideo | Apache-2.0 repos (GH); weights and VRAM NOT checked | UNKNOWN | | gh api |

---

## 4. Part 3: Viral, funny, weird short-form formats that suit simple animation (2025-2026)

Evidence quality: the strongest numbers come from Revid's analysis of 176,367 TikToks with 1,000+ likes, Oct 2025 to Oct 2026. It is a vendor study and only covers videos that already passed 1,000 likes, so read it as patterns, not proof (their own caveat). https://www.revid.ai/blog/short-form-video-trends

Key numbers from that study: challenges median 182K views, comedy 155K, reactions 105K, storytelling 66K, tutorials 62K. Faceless 114K median vs 67K with one person on camera; faceless comedy 327K vs 136K on camera; POV 107K vs selfie 48K; under 40 characters of speech 123K median; length buckets all landed 58K-76K.

| Format (name used by creators) | What it is | Why simple animation works | Example channels / sources | App fit |
|---|---|---|---|---|
| Reddit/AITA story narration | Narrated forum story over a looping visual | Zero camera, text + voice | "Am I the Jerk?" (1.2M+ subs); typical visual is gameplay loops (fliki) | Fake-post card + code-made loop. Write original stories: copying posts and using game footage are the weak points |
| Fake text-message / chat story | Bubbles appear with typing dots | Pure UI | Dozens of generators (Reelry, Brainrot Shorts) | #29 in the catalogue |
| Horror / scary story narration | Calm voice, dark visuals | Mood beats animation | Thriller Teller (400K+) | Dark looks + particles + slow Ken Burns |
| Animated science / education | Flat-design explainer | Evergreen; RPM $8-$20 (fliki's number) | Kurzgesagt (24M+) | Explainer mode already exists |
| "Italian brainrot" / AI animal characters | Absurd hybrid animals with sing-song narration | Characters are still images; voice does the work | Wikipedia, Know Your Meme; origin of one character: Indonesian TikTok user, 2025 | Do not copy named characters; the mechanism (absurd hybrid + chant + shake) is free to use with your own |
| Talking pet / "what my dog thinks" | Pet photo or cartoon with a funny voice | Mouth + voice only | CapCut "Talking Dog"; compilations on TikTok | Strong fit for the dog-training brand; puppet or photo talking head |
| Would-you-rather / quiz / guess-the-X | Two options, timer, reveal, comment bait | Template + spreadsheet rows | Daily Quiz, Ghostshorts how-to | #25 |
| POV skit | Caption starts "POV:", scenes change every ~3 s | Text + simple scenes | Revid | Stick/cartoon characters + text |
| Before/after reveal | Same thing, transformed | Wipe slider | Revid | #23 |
| Silent infographic / chart explainer | One stat per clip, captions only | Works muted | Miraflow | #19 |
| Calm study/focus loops | Ambient loop with timer | Loop + music | Miraflow | Procedural backgrounds + ACE-Step music |
| Series packaging | Numbered episodes, same opener | Templates | YouTube began rolling out Shorts series in Sep 2026 (Revid) | Series presets in batch |

Risk to design around: YouTube's monetisation page says content must be original, not duplicative or repetitive, and Revid reports "inauthentic content" enforcement against mass-produced and reposted clips. A spreadsheet batch that only swaps a name is the pattern at risk. Make each batch row change real content (script, scene, look). https://support.google.com/youtube/answer/1311392

Sources: https://fliki.ai/blog/best-faceless-youtube-niches , https://miraflow.ai/blog/faceless-youtube-shorts-ai-niches-2026 , https://en.wikipedia.org/wiki/Italian_brainrot , https://knowyourmeme.com/memes/italian-brainrot-ai-italian-animals , https://www.capcut.com/explore/talking-dog , https://www.reelry.app/tools/fake-text-message-video-generator , https://ghostshorts.com/blog/how-to-make-quiz-videos-for-tiktok-and-youtube-shorts-2026

---

## 5. Part 4: Image Forge variety ideas (free)

| # | Idea | Method | Free parts + licence | Effort | Source |
|---|---|---|---|---|---|
| 1 | **Style packs** | A pack = prompt prefix/suffix + negative text + preferred model + optional LoRA, one click. The "style list" idea is Fooocus's; borrow the idea, not the code (GPL-3.0) | Z-Image (Apache-2.0, README: "wide range of artistic styles") | S | https://huggingface.co/Tongyi-MAI/Z-Image-Turbo , https://github.com/lllyasviel/Fooocus |
| 2 | **Sticker sheets** | Generate N subjects on plain background, cut out (BiRefNet), dilate alpha to make a white outline (sharp), pack on a sheet, optional cut-path from VTracer | BiRefNet MIT, sharp Apache-2.0 (GH), VTracer MIT | M | https://github.com/lovell/sharp |
| 3 | **Comic pages** | Page layout templates; one image per panel using a character reference; speech bubbles and captions drawn in code (crisp text); halftone effect | FLUX.2 klein 4B multi-reference (Apache-2.0); Remotion `halftone`. Reference pipelines: ai-comic-factory Apache-2.0 (archived), ComicMaster has NO licence (method only) | M-L | https://huggingface.co/black-forest-labs/FLUX.2-klein-4B , https://github.com/jbilcke-hf/ai-comic-factory , https://github.com/McMuff86/ComicMaster |
| 4 | **Thumbnails with real text** | Model makes the background and subject; text is added by code (fonts under OFL, contrast check, outline/glow). Models misdraw text: the klein card warns "text rendered may be inaccurate". Z-Image-Turbo claims bilingual text rendering | HTML/Canvas in Electron; Satori is MPL-2.0 if wanted | S-M | FLUX.2 klein card above; https://github.com/vercel/satori |
| 5 | **Mockups** | Place art on poster/phone/mug frames with a perspective transform | OpenCV Apache-2.0; Remotion `corner-pin` | S-M | https://github.com/opencv/opencv |
| 6 | **Seamless patterns / tiles** | Circular padding in the model's convolutions so edges wrap, or generate-then-offset-and-blend seam fix; add a 3x3 tile preview | ComfyUI-seamless-tiling exists but is GPL-3.0: reimplement the idea | M | https://github.com/spinagon/ComfyUI-seamless-tiling |
| 7 | **Sprite sheets** | Two routes: (a) prompt a grid and slice; (b) no model: render the app's own code-drawn / puppet characters at poses into a sheet. (b) is consistent by construction and bridges to Video Forge | rembg/BiRefNet for cutouts | S-M | (method) |
| 8 | **Consistent-character sheets** | Edit-with-reference: feed one approved face, ask for turnaround, expressions, mouth shapes (the A-F,G,H,X set Rhubarb uses). Direct feed into puppet builder | FLUX.2 klein 4B (Apache-2.0); Qwen-Image-Edit (Apache-2.0 per its card text? the card page I read did not show the licence line: verify); multi-angle LoRA licences UNKNOWN | M | https://huggingface.co/black-forest-labs/FLUX.2-klein-4B , https://stable-diffusion-art.com/qwen-image-edit-multiple-angle-lora/ |
| 9 | **Image to layers** | Qwen-Image-Layered gives RGBA layers; reuse for puppet parts and parallax | Apache-2.0; heavy | L, EXPERIMENTAL | https://huggingface.co/Qwen/Qwen-Image-Layered |
| 10 | **Transparent assets straight from the model** | LayerDiffuse (SDXL-based) | code Apache-2.0 (GH) | M | https://github.com/lllyasviel/LayerDiffuse |
| 11 | **Vectorise** (PNG to SVG) for logos, stickers, whiteboard | VTracer | MIT | S | https://github.com/visioncortex/vtracer |
| 12 | **Aspect-ratio variants** | Outpaint/extend to 9:16, 16:9, 1:1 from one hero | edit-capable models above | S-M | FLUX.2 klein card |
| 13 | **A/B/C comparison page** | Same prompt through several styles/models in one grid (the owner's favourite) | none | S | (method) |
| 14 | **Infographic / chart images** | Data to chart in d3/Plot, exported PNG with brand fonts | d3 ISC, Observable Plot ISC | S | https://github.com/d3/d3 |
| 15 | **Face-identity locks** | IP-Adapter Apache-2.0; InstantID and PuLID repos are Apache-2.0 but InstantID needs InsightFace `antelopev2` face encoder, and InsightFace pre-trained models are for non-commercial academic research only | prefer reference-edit (#8) | M | https://github.com/tencent-ailab/IP-Adapter , https://github.com/instantX-research/InstantID , https://www.insightface.ai/ |

Model licence cheat-sheet for Image Forge: Z-Image (Apache-2.0 GH), FLUX.2 klein **4B** Apache-2.0 / **9B non-commercial** (https://huggingface.co/black-forest-labs/FLUX.2-klein-9B), FLUX.1 Kontext **dev** weights under the FLUX.1 dev Non-Commercial licence (its card says generated outputs may be used commercially, but weights stay non-commercial; read before bundling) (https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev), Qwen-Image repo Apache-2.0 (GH).

Stock-media rules (relevant to planned Pexels/Pixabay backgrounds):
- Pexels: free, no attribution; may not sell unaltered copies, no implying endorsement, no use in trade-marks, identifiable people not in a bad light. https://www.pexels.com/license/
- Pixabay: free, no attribution; cannot sell/distribute content on a standalone basis, no recognisable brands/logos commercially, no misleading use. https://pixabay.com/service/license-summary/

---

## 6. Licence trap list (full)

| # | Item | What the source says | Action | Source |
|---|---|---|---|---|
| 1 | **Remotion** | Free Licence for: for-profit up to 3 employees, non-profits, evaluators. Larger for-profits need a Company Licence ($25/month per person writing Remotion code; or $0.01/render, $100/month minimum for automations). "Not allowed to copy or modify Remotion code to sell, rent, license, relicense or sublicense your own derivative." Rendering service where users upload their own Remotion code is banned. Users generating videos from YOUR template is explicitly fine. LICENSE.md notes the licence changes slightly in Remotion 5.0. | Ask Remotion (hi@remotion.dev) in writing whether a free desktop app that bundles Remotion and renders locally is allowed, and what a >3-employee user must do. UNKNOWN until answered. Keep MIT fallbacks in mind: Revideo "Create videos with code" MIT, Motion Canvas MIT (GH). | https://github.com/remotion-dev/remotion/blob/main/LICENSE.md , https://www.remotion.dev/docs/license/faq , https://www.remotion.dev/docs/terms |
| 2 | **Codec patents** | A Remotion licence "does not include a licence to third-party patents ... H.264/AVC, HEVC or AAC"; your responsibility | Note in docs; prefer VP9/AV1/Opus if worried | https://www.remotion.dev/docs/license/faq |
| 3 | **FFmpeg** | LGPL-2.1+, GPL if GPL parts enabled; shipping it needs the checklist (source offer, about-box credit, EULA wording) | Follow the checklist for the public installer | https://ffmpeg.org/legal.html |
| 4 | **rembg default model** | Default is `bria-rmbg`; Bria RMBG-2.0 = CC BY-NC 4.0 | Always pass `-m birefnet-general` / `isnet-general-use` | https://github.com/danielgatis/rembg , https://huggingface.co/briaai/RMBG-2.0 |
| 5 | **Depth Anything V2/3** | Small (V2) and Small/Base/Mono-L/Metric-L (V3) Apache; the rest CC BY-NC | Ship Small only | links in 3.1 |
| 6 | **LivePortrait / InsightFace** | InsightFace pre-trained models: non-commercial academic research only | Avoid InsightFace; verify MediaPipe path | https://www.insightface.ai/ |
| 7 | **Wav2Lip, CodeFormer, TangoFlux, MusicGen weights, FLUX.2 klein 9B, Kontext dev** | Non-commercial in each source above | Do not bundle; mark "personal use only" if offered | 3.3-3.5 |
| 8 | **Stable Audio Open** | Free commercial only under US $1,000,000 annual revenue, registration required | AMBER; prefer ACE-Step | https://stability.ai/community-license-agreement |
| 9 | **HunyuanVideo licence (FramePack base)** | "Does not apply in the European Union, United Kingdom and South Korea" | RED if you or users are there | https://huggingface.co/tencent/HunyuanVideo/blob/main/LICENSE |
| 10 | **GPL/AGPL code** | Upscayl AGPL-3.0, aubio GPL-3.0, essentia AGPL-3.0, Fooocus GPL-3.0, ComfyUI GPL-3.0, ComfyUI-seamless-tiling GPL-3.0, RedditVideoMakerBot GPL-3.0, piper1-gpl GPL-3.0 (embeds espeak-ng) (all GH) | Do not embed code. Running ComfyUI as a separate server is a different question: decide with a lawyer-grade check before shipping it inside the installer | gh api |
| 11 | **Piper** | The old `rhasspy/piper` is MIT but archived; the maintained fork is GPL-3.0 and embeds espeak-ng (GH + page) | Check which Piper build the app ships (voice servers on port 5501+). Voice models carry their own licences. UNKNOWN which build is used | https://github.com/OHF-Voice/piper1-gpl |
| 12 | **CC BY / CC BY-SA assets** | Animated Noto emoji CC BY 4.0 (Remotion page); OpenMoji CC-BY-SA-4.0 (GH) | Credit screen / share-alike impact; prefer plain Noto emoji (OFL-1.1 GH) for static | https://www.remotion.dev/docs/animated-emoji/ |
| 13 | **GSAP** | Free since Apr 2025 including former paid plugins, but a custom licence, not OSI | AMBER; avoid if the licence text has a competing-product clause for your public build (not read) | https://webflow.com/blog/gsap-becomes-free |
| 14 | **OSM tiles** | Data free; public tile servers forbid bulk download/prefetch | Use own PMTiles / Natural Earth (public domain) | https://operations.osmfoundation.org/policies/tiles/ |
| 15 | **Platform policy** | YouTube: original, not duplicative or repetitive | Vary content per batch row | https://support.google.com/youtube/answer/1311392 |

---

## 7. Unknown / not verified (do not treat as fact)

- Whether Remotion allows a free public desktop app that bundles it (trap 1).
- Whether `@remotion/effects` and `@remotion/video-matting` exist at the app's installed 4.0.5xx version (docs examples show 4.0.538); whether effects work under the headless render path the app uses (effects need WebGL2 per docs).
- VRAM and speed on the 3070 laptop for: SAM 2 sizes, Stable Audio Open, ACE-Step real speed, Qwen-Image-Layered, LTX-Video, AnimateDiff, CogVideo, Marigold, Hallo, EchoMimic, Ditto, VideoReTalking.
- Whether talking-head models work on stylised cartoon faces.
- Weights licences for: MODNet, Marigold, MediaPipe model files, GFPGAN, Hallo/EchoMimic/Ditto, Qwen-Image-Edit (licence line not shown in the page text I read; GitHub shows the Qwen-Image repo as Apache-2.0), multi-angle LoRAs, AudioLDM 2.
- PMTiles licence (GH NOASSERTION), open_clip (NOASSERTION), rembg's exact `bria-rmbg` version.
- Whether Minecraft/Subway Surfers-style gameplay backgrounds are copyright-risky: not researched, so avoided in the recommendations.
- Reddit post reuse rights: not researched; recommendation is original/LLM-written stories only.
- Third-party claims I could not confirm with the maker: LivePortrait ~300 MB fp16 (nexgpu.net), SadTalker 8 GB (sadtalker.ai), Qwen-Image-Layered 8 GB via GGUF (zimage.run).

---

## 8. Competitor-method sources not listed inline

https://www.descript.com/features , https://lumen5.com/features/ai-video-generator , https://www.videoscribe.co/en/how-to-create-a-whiteboard-video/ , https://www.canva.com/features/animation-maker/ , https://www.capcut.com/explore/free-video-editing-transition-effects , https://www.powtoon.com/ai/animation-generator , https://www.kapwing.com/ , https://www.revid.ai/blog/short-form-video-trends
