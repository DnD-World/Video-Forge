# Remotion alternatives (fallback plan)

Checked 2026-10-10. Stars, dates and licences come from the GitHub API (`gh api repos/<owner>/<repo>`) on that day. Hour figures are my estimates, not measurements.

**Short answer:** keep Remotion while we wait for their reply. If the answer is bad, the cheapest exit to test is **Rendiv** (a young, Apache-2.0 lookalike of Remotion). The safest long-term exit is **building our own renderer**, because our Remotion use is small (9 files, about 1,900 lines including the render wrapper).

## 1. The licence situation in 5 bullets

- Remotion is "source-available", not open source. Their own FAQ says so. [FAQ](https://www.remotion.dev/docs/license/faq), checked 2026-10-10.
- Free for individuals, teams of up to 3 people, and non-profits. Same source.
- Organizations of 4+ need a paid Company License. "Organizations building video editors, prompt-to-video tools, automated video pipelines" fall under "Remotion for Automators": $0.01 per render, $100/month minimum. Same source.
- The licence file forbids copying or modifying Remotion code to sell or relicense "your own derivate of Remotion". [LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md), 2026-10-10. It also says the licence will change in Remotion 5.0 ([PR 3750](https://github.com/remotion-dev/remotion/pull/3750)). I did not read that PR.
- Open question for Remotion: when our Apache-2.0 app is installed by other people, is each user their own licensee, or is Video Forge "the organization building a prompt-to-video tool"? The FAQ does not answer this. That is the question to ask them.

## 2. Options compared

"Code changes" = how much of our Remotion code must be rewritten.

| Name | Licence | Last active | Stars | React-compatible? | Code changes | Risk |
|---|---|---|---|---|---|---|
| **Remotion** (baseline) | Proprietary, source-available | 2026-10-09 | 62,904 | Yes | None | Licence uncertainty for an open-source app |
| **Rendiv** [thecodacus/rendiv](https://github.com/thecodacus/rendiv) | Apache-2.0 | 2026-09-28 | 153 | Yes. Near-same names (Sequence, Series, interpolate, Audio, OffthreadVideo, TransitionSeries). Renamed: `useFrame`, `Fill`, package `@rendiv/core` | Small: rename imports, check a few unconfirmed pieces (section 4) | High: created 2026-02-20, 1 contributor, could stall |
| **Revideo** [midrender/revideo](https://github.com/midrender/revideo) (moved from redotvideo) | MIT | 2026-07-15 (release 0.11.0 on 2026-07-10) | 4,093 | No. Generator functions on a canvas, not React components | Total rewrite of every composition | Medium: real project, different programming model |
| **Motion Canvas** [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | MIT | 2026-07-02 (last release v3.17.2, 2024-12-14) | 19,267 | No (same model as Revideo) | Total rewrite | Medium: built for hand-made animation, not batch jobs |
| **editly** [mifi/editly](https://github.com/mifi/editly) | MIT | 2025-05-12 | 5,522 | No (JSON config) | Total rewrite; no custom waveform or subtitle layout | High: no update in about 17 months |
| **FFCreator** [tnfe/FFCreator](https://github.com/tnfe/FFCreator) | MIT | 2024-12-19 | 3,163 | No | Total rewrite | High: no update in about 22 months |
| **MoviePy** [Zulko/moviepy](https://github.com/Zulko/moviepy) | MIT | 2026-08-26 | 14,963 | No (Python) | Total rewrite in another language | High: wrong language for an Electron app |
| **Mediabunny** [Vanilagy/mediabunny](https://github.com/Vanilagy/mediabunny) | MPL-2.0 | 2026-10-05 (v1.61.3) | 7,272 | Not a renderer: a toolkit that reads and writes video files | Would be one piece of "build our own" | Low: very active. MPL-2.0 is fine in an Apache app if we do not edit its files |
| **Etro** [etro-js/etro](https://github.com/etro-js/etro) | GPL-3.0 | 2026-10-05 | 1,151 | No | Rewrite | AVOID: GPL would force our whole app to GPL |
| **Diffusion Studio core** [diffusionstudio/core](https://github.com/diffusionstudio/core) | MPL-2.0 | 2025-11-18 | 1,248 | No | Rewrite | Medium-high: about 11 months quiet |
| **Twick** [ncounterspecialist/twick](https://github.com/ncounterspecialist/twick) | Sustainable Use License (custom). GitHub shows "NOASSERTION" | 2026-06-04 (last commit 2026-05-07) | 537 | Yes, React SDK | Rewrite | AVOID: one article calls it MIT, but its LICENSE.md says Sustainable Use License, the same kind of trap we are leaving |
| **VideoFlow** [ybouane/VideoFlow](https://github.com/ybouane/VideoFlow) | Apache-2.0 | 2026-09-16 | 165 | No (code toolkit) | Rewrite | High: created 2026-03-30, tiny |
| **Rendervid** [QualityUnit/rendervid](https://github.com/QualityUnit/rendervid) | Not stated by GitHub | 2026-08-11 | 65 | Unknown | Unknown | AVOID: licence unclear, tiny. Not inspected further |
| **Build our own** (hidden Electron window, grab each frame, pipe to ffmpeg) | Ours (Apache-2.0) | n/a | n/a | Yes, keeps React | We write the timing helpers ourselves (section 3) | Medium: we own all bugs, but the code is small |

Sources: GitHub API per repo, 2026-10-10; Rendiv details from its [README](https://github.com/thecodacus/rendiv#readme); Twick licence from its [LICENSE.md](https://github.com/ncounterspecialist/twick/blob/main/LICENSE.md). Candidate names were found through [Wireflow blog](https://www.wireflow.ai/blog/best-remotion-alternatives-in-2026) and [PkgPulse](https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026) (searched 2026-10-10). Every number in the table is from GitHub, not those articles.

Not checked: full Rendiv feature gaps, Remotion 5.0 terms, Motion Canvas audio/video-in-video support (I believe it is weak but did not verify).

## 3. Our Remotion usage

Found by searching the repo (excluding `node_modules`, `out`, `release`, `dist`) on 2026-10-10. All Remotion imports sit in **9 files**: 8 in `remotion/` (1,282 lines total) and `electron/render/renderVideo.ts` (663 lines).

| Package | Files | Used for |
|---|---|---|
| `remotion` | 8 | The video itself |
| `@remotion/renderer` | 1 (`renderVideo.ts`) | `renderMedia`, `selectComposition`, `ensureBrowser` |
| `@remotion/bundler` | 1 (`renderVideo.ts`) | `bundle` |
| `@remotion/transitions` | 1 (`BackgroundLayer.tsx`) | `TransitionSeries`, `linearTiming` |

Remotion parts we call (mentions in `remotion/` and `electron/render/`, comments included, so counts run a little high):

| API | Mentions | What it does for us |
|---|---|---|
| `staticFile` | 18 | Point to local files |
| `Sequence` | 15 | Show something only during a time window |
| `AbsoluteFill` | 13 | Full-frame layer |
| `delayRender` / `continueRender` | 9 / 9 | "Wait until fonts, images, waveform are loaded" (`SubtitleFont`, `useWaitForImages`, `useSpectrumFile`) |
| `Loop` | 8 | Repeat background clips |
| `Audio` | 8 | Narration and music, with a per-frame volume function (fades) |
| `TransitionSeries` | 7 | Crossfades between background clips |
| `OffthreadVideo` | 6 | Video backgrounds, frame-accurate |
| `useVideoConfig` | 4 | Frame rate and size |
| `Img` | 4 | Images |
| `Composition` / `registerRoot` | 3 / 2 | Register the video template |
| `useCurrentFrame` | 2 | Which frame is being drawn |

Not used: `interpolate`, `spring`, `Easing`, `Series`, `getInputProps`. Our animation is mostly plain maths on the frame number.

Hard to copy (this is where the hours go):
1. **Audio mixing.** Remotion mixes all `Audio` tags, with fades, into the final file. A custom renderer must do that with ffmpeg.
2. **Frame-exact video backgrounds** (`OffthreadVideo`): cut frames out with ffmpeg ahead of time.
3. **Crossfade transitions** (`TransitionSeries`): small to rewrite.
4. **The render wrapper** (`renderVideo.ts`): bundling, progress, cancel, browser download. Our progress and cancel logic stays.

## 4. Recommendation

| Tag | Option | One-line reason |
|---|---|---|
| **RECOMMENDED (now)** | Keep Remotion, wait for their written answer | Costs nothing; free tier covers teams of 3 or fewer. Ask the "installed by other people" question from section 1 |
| **RECOMMENDED (fallback)** | Build our own renderer, keep React | Keeps our look and code; no outside licence; ffmpeg and Mediabunny are permissive and active |
| **Test first (cheap)** | Rendiv | Nearly the same API under Apache-2.0, so a trial port is hours. Do not bet on it: one author, 7 months old |
| AVOID | Twick | Custom licence with use limits, same trap as Remotion |
| AVOID | Etro | GPL-3.0 would force our whole app to GPL |
| AVOID | editly, FFCreator | Stale (17 and 22 months); cannot draw our waveform or subtitle layouts |
| AVOID | MoviePy | Python, no React, throws away everything |
| AVOID (as first move) | Revideo / Motion Canvas | Healthy and MIT, but every composition must be rewritten in a different style, to get what "build our own" gives with React kept |

### Effort (human work hours, my estimates, nothing was run)

**A. Rendiv trial port: about 6 to 14 hours.**
- Rename imports in 9 files plus the renamed pieces (`useFrame`, `Fill`): 1 to 2 h.
- Confirm the pieces I could not see in its README: `Loop`, `staticFile`, `delayRender`/`continueRender`, `Audio` volume function, renderer API vs `renderMedia`: 3 to 6 h.
- Re-test full renders (audio sync, fades, transitions, waveform): 2 to 6 h.
- Licence is solved only if we trust a one-person project. Add time if features are missing.

**B. Build our own: about 50 to 90 hours.**
- Hidden Electron window that loads a composition and draws frame N on request: 8 to 12 h.
- Our own small versions of `Sequence`, `Loop`, `AbsoluteFill`, `Img`, `useCurrentFrame`, `useVideoConfig`, and "wait until ready": 6 to 10 h.
- Frame capture piped to ffmpeg, with progress and cancel (replaces `renderMedia`): 10 to 16 h.
- Audio mixing with fades via ffmpeg: 8 to 14 h.
- Frame-exact video backgrounds: 8 to 14 h.
- Crossfade transitions: 3 to 5 h.
- Speed tuning and testing on 3 to 8 minute videos, one render at a time: 10 to 20 h.
- Main risk: speed. Grabbing frames from a window may be slower than Remotion's browser capture. Measure before committing.
