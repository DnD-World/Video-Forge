# HyperFrames trial — 11 Oct 2026

**Verdict: RECOMMENDED — switch Video Forge's video engine from Remotion to HyperFrames**, after the simpler layout lands. It removes the Remotion licence question for good (Apache-2.0, free for everyone, companies included) and our existing frame-driven React screens plug in without a rewrite.

## What was tested
A 10-second, 1080×1920 proof built the way Video Forge builds videos (files in [hyperframes-trial/](hyperframes-trial/)):

| Layer | How | Result |
|---|---|---|
| Background footage | `<video>` clip with `data-start`/`data-duration` | Frame-exact, as in the stills |
| Narration + music bed | two `<audio>` clips, music at `data-volume="0.25"` | Mixed into the MP4 (AAC, mean −18.7 dB) |
| Talking faces + word-highlight subtitles | **A React component driven only by frame number** — exactly how our Remotion compositions are written — registered as a seekable timeline on `window.__timelines` | Words highlight in step with the frame ([proof-frames.png](hyperframes-trial/proof-frames.png)) |

Render: **10 s of video in 21.6 s** (4 workers, `npx hyperframes render`, HyperFrames 0.8.147). Not a like-for-like speed comparison with our Remotion renders (different scenes); a fair benchmark comes with the port.

Mouth movement in the proof is flat because the trial fed the wrong narration clip into the mouth data — a test-setup mistake, not a HyperFrames limit.

## Why it fits
- **Licence:** Apache-2.0 ([LICENSE](https://github.com/heygen-com/hyperframes/blob/main/LICENSE)). Remotion is source-available, paid for companies of 4+ that build video tools ([Remotion FAQ](https://www.remotion.dev/docs/license/faq)).
- **Our React code survives:** the runtime seeks any object registered on `window.__timelines` ([runtime contract](https://github.com/heygen-com/hyperframes/blob/main/packages/core/src/runtime/README.md)); a 15-line adapter turns our `frame` prop into that.
- **Active and big:** ~60k stars, pushed daily (GitHub API, 10 Oct 2026).
- **Bonus:** its "Studio" visual editor and `hyperframes compare` (side-by-side variants) fit how Ak likes to choose.

## Problems hit
| Problem | Fix |
|---|---|
| **Sends anonymous usage data by default** | Run with `DO_NOT_TRACK=1` / `HYPERFRAMES_TELEMETRY=0`; the app must set this for every render (childEnv.ts) |
| The Node API (`@hyperframes/producer`) failed to start its browser on Windows; the CLI worked | Call the CLI from the app, or find the launch flag the CLI passes |
| Needs a ~150 MB headless Chrome download | Ship it with the installer or download on first render, with a progress bar |
| Its linter wants the timeline registered inline in the page | One inline `<script>` line |

## Effort to switch (human work hours)
| Part | Hours |
|---|---|
| Bundle our composition (puppets, waveforms, subtitles, backgrounds) as a page with the timeline adapter | 10–16 |
| Audio: narration, music ducking, SFX, intro/outro joins → HyperFrames audio clips | 6–10 |
| Render from the app (CLI call, progress, cancel, no telemetry, Chrome on first run) | 6–10 |
| Live preview with sound using HyperFrames' player (replaces the silent preview — plan item 8) | 6–10 |
| Side-by-side check: same lesson in both engines, frame comparison | 4–6 |
| **Total** | **32–52** |

## Risks
- HyperFrames is young (repo created 10 Mar 2026) and its frame-adapter API is marked experimental ("may change before v1").
- Built by HeyGen, a commercial AI-video company; the code is Apache-2.0, so a fork stays possible if direction changes.
