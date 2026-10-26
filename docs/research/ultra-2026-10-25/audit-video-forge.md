# Video Forge audit — 25 Oct 2026 (read-only)

Repo: `C:\Users\strav\Documents\CLAUDE SPACE\BYOK-Vid-Creator`, branch `dramabox-knobs-and-chatterbox-removal-rlrwzu`, 34 uncommitted paths.
Scope read: `electron/*` (main, preload, keyStore, every IPC handler, render/, batch/, net/, process/, tts/, llm/, characters/, explainer/), `src/` (App, stores, RenderBar, ManyVideos, BackendPanel, PresetsPanel, ExplainerStudio, CastPanel parts), `tools/lib/*`, `tools/run-queue.mjs`, `characters/core/card.mjs`, docs (HANDOFF top 260 lines, NOT-BUILT, README, CLAUDE.md).
NOT read line by line: `remotion/` compositions, `explainer/kits/*`, `characters/core/draw/paint/rig`, most of `src/components/canvas/*` and `src/lib/*`. Nothing was run except `npm test`, `npx tsc`, `npm audit`, and read-only `ls`/`du`/`grep`/`git status`.
No secret value was printed. Hard-coded-secret scan of all git-tracked files (Google/OpenAI/Groq/NVIDIA/GitHub/Slack key shapes, private-key headers): **0 hits**.

## E. Test health

| Check | Result |
|---|---|
| `npm test` | **91 passed, 0 failed**, 0 skipped (13 test files, 2.3 s) |
| `npx tsc --noEmit -p .` | **exit 0, 0 errors**. `tsconfig.json` only includes `src`, `electron`, `remotion`, `electron.vite.config.ts` — `tools/`, `explainer/`, `characters/` (.mjs) are not type-checked |
| Gaps | No test touches `electron/` (IPC handlers, keyStore, http, render, runJob, piper) or `src/`. Tests cover `tools/lib/*`, explainer and characters only. `docs/HANDOFF.md:97` says `npm run typecheck`; `package.json` has no such script |
| `npm audit --omit=dev` | 8 findings: 6 high, 2 moderate, 0 critical. Packages: `@remotion/bundler`/`@remotion/studio`/`zod` (memory exhaustion), `fast-uri`, `nanoid`, `source-map-js`, `postcss`, `postcss-selector-parser`. All are build-tool / parser-DoS type issues, not remote-reachable in a local desktop app. npm's "fix" for the Remotion chain is a **downgrade** to `@remotion/bundler@4.0.277` — do not take it blindly. Raw JSON: `…\scratchpad\audit.json` |

## Counts

CRITICAL 0 · HIGH 8 · MEDIUM 17 · LOW 12

No CRITICAL: I found no remotely reachable hole and no code path that spends money without any user action at all. Every HIGH below needs either a local/LAN attacker, a compromised app window, or the owner's own use of a paid engine.

---

# HIGH

### H1. Voice servers (Piper) listen on every network card, not just this computer
- Where: `electron/tts/piperEngine.ts:85-86` starts `python -m piper.http_server -m … --port N` with no `--host`. Piper's own default is `0.0.0.0` (`piper-venv/Lib/site-packages/piper/http_server.py:24`). Ports start at 5501 (`piperEngine.ts:32`). Project rule in `CLAUDE.md` ("Loopback only") is broken.
- Plain words: anyone on your Wi-Fi/LAN/Tailscale can read the last line your script spoke (`GET /info`, http_server.py:118-147) and make your PC download voice files from the internet (`POST /download`, :190-213) while a voice is loaded.
- Fix: add `"--host", "127.0.0.1"` to the args. Verify with `netstat -ano | findstr :55` that the address is 127.0.0.1.
- Estimate: 0.2 h

### H2. The render tool (HyperFrames) is allowed to update itself with a global `npm install -g`
- Where: `electron/render/hyperframes/renderHyperframes.ts:288-296` runs the HyperFrames CLI on every render and sets only `DO_NOT_TRACK` and `HYPERFRAMES_TELEMETRY` (the second one is not a name the tool reads). The tool's update switches are `HYPERFRAMES_NO_UPDATE_CHECK` and `HYPERFRAMES_NO_AUTO_INSTALL` (`node_modules/hyperframes/dist/chunk-3YUFN37G.js:261-265`, `autoUpdate-*.js`); its installer runs `npm install -g hyperframes@<version>` (`chunk-3YUFN37G.js:114-118`).
- Evidence it is live: `C:\Users\strav\.hyperframes\auto-update.log` has five entries (13, 13, 13, 20, 25 Oct) all `[skip] Unknown install layout …\node_modules\hyperframes\bin\hyperframes.mjs`; `config.json` shows `lastUpdateCheck` 25 Oct and `latestVersion 0.8.198`. So each render phones home for the latest version, and the only thing that has stopped a global install so far is that the tool did not recognise our folder layout.
- Plain words: a render could silently download and install new code on your machine, which `CLAUDE.md` forbids (no global installs, no machine-wide changes).
- Fix: add `HYPERFRAMES_NO_UPDATE_CHECK: "1"` and `HYPERFRAMES_NO_AUTO_INSTALL: "1"` to that env block (and `CI` is not needed). Delete the bogus `HYPERFRAMES_TELEMETRY`.
- Estimate: 0.3 h

### H3. The app window can ask for every saved API key in plain text — and nothing uses that
- Where: `electron/main.ts:160-162` (`keys:get`) and `electron/preload.ts:12-13`. No file under `src/` calls `keys.get` (grep: only `list/set/remove/test/encryptionAvailable` are used, `BackendPanel.tsx:241-268`). `electron/keyStore.ts:5-8` and `src/store/settingsTypes.ts:1-4` both claim keys never reach the window.
- Plain words: if anything ever runs inside the app window that should not (a bad script, a hostile page), it can read every key you have; the comment saying this cannot happen is wrong.
- Fix: delete the `keys:get` handler, the preload line and the type in `src/global.d.ts`.
- Estimate: 0.3 h

### H4. Several app-window requests accept any file path or program, so one bad request can read, overwrite or run anything you can
- Where (all take a path/program from the window and trust it):
  - `main.ts:420-428` `storage:readFile` / `storage:writeFile` — read or write any file
  - `main.ts:183-194` `audio:analyzeFile` — read any file
  - `main.ts:380-392` `media:download(id, url)` — `id` goes straight into `path.join(mediaDir, id + ext)` (a `..\` id escapes the folder) and `url` is any address
  - `main.ts:463-488` `dramabox:writeBlocks(…, outDir)` — write two files into any folder
  - `main.ts:551-553` `tts:synthesizePiper(pythonPath, …)` → `piperEngine.ts:86` spawns whatever program path is given
  - `main.ts:275-278` `batch:readSheet({file})` — read any file
  - `explainer/explainerIpc.ts:185-190` `explainer:render` — `req.out` is any path (also `.srt/.vtt/.gif/.png` siblings); `:235-237` `importedLoad` reads any HTML path
  - `characters/characterIpc.ts:77-85` `character:fromPicture` — `req.file` is any image path read and uploaded to a cloud model (the comment at :60 says the path never comes from the page; here it does); `main.ts:249-266` `forge:orderPuppet` copies any file the window names into the shared Forge folder
  - Chain: write a `.bat` into the renders folder with `storage:writeFile`, then `storage:openPath` (`main.ts:325-329`) runs it.
- Plain words: the app trusts its own window completely; combined with H3 and M1 (no sandbox, no content policy) any future injection bug turns into "take over this PC's user account".
- No injection source found today: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `<webview>` or `iframe` anywhere in `src/` (grep). Model-written explainer pages run in a separate locked-down window (see Good news).
- Fix: have main pick the paths (dialog results are remembered in main and only those can be read/written; `media:download` id restricted to `[A-Za-z0-9._-]+` and URL to https on the known provider hosts; Piper python path read from main-side settings, not per call).
- Estimate: 5 h

### H5. Paid ElevenLabs voices: the app never shows what a video will cost, says it does, and can spend unattended
- Where:
  - `src/components/settings/BackendPanel.tsx:45-47` tells the user "Paid — the app shows the cost before using it". Nothing in `src/` shows credits (grep `credits|cost|estimate`: no result in any voice/render panel). The only report is a console line after the fact (`electron/tts/buildNarration.ts:332-337`). The engine picker does say "charged per character" (`CastPanel.tsx:484`) but gives no amount.
  - `src/components/render/ManyVideos.tsx:264` "Make all N … You can leave it running overnight" with no budget or estimate (`electron/batch/manyVideos.ts:80-116` loops over every row).
  - "Also in English/Greek" (`RenderBar.tsx:263-266` → `electron/tts/twinNarration.ts`) makes a second full set of ElevenLabs lines at full price, no prompt.
  - Paid lines are only cached after the WHOLE narration succeeds (`buildNarration.ts:279-325` build, `:369-375` cache write). A rate-limit or network error on line 40 of 50 throws away 39 paid lines; the retry pays for them again.
  - Contrast: the sound-effect tool does it right — shows the bill first and refuses over a budget (`electron/audio/makeSfxEleven.ts`, the "whole bill, before anything is spent" block, default budget 1500).
- Plain words: a 72-lesson sheet on ElevenLabs is about 334,000 credits (BackendPanel's own numbers) and the app will start spending without telling you the number.
- Fix: before any ElevenLabs narration, count characters and show "about N credits of M left" with Continue/Cancel (account balance call already exists in `makeSfxEleven.ts` `remainingCredits`); add a per-batch credit cap in Many videos; write each paid line to disk as it arrives; correct the BackendPanel sentence until built.
- Estimate: 4 h (0.1 h just to fix the wording)

### H6. Closing the window ends a running render or an overnight batch with no warning, leaves the renderer running, and a single render cannot be stopped
- Where: `main.ts:745-747` (`window-all-closed` → `app.quit()`); no `close`/`before-quit` guard anywhere (grep). Render children are plain `spawn`, not the tracked kind: `renderHyperframes.ts:57`, `joinCards.ts:52,63,76`, `renderVideo.ts:670`, `fishEngine.ts:23`, `getSfxFreesound.ts:115`, `pitchShift.ts:23`. `childTree.ts:38,147` only kills what `spawnTracked` registered — which is only Piper (`piperEngine.ts:86`). So the HyperFrames node process and its headless Chrome keep running (CPU/GPU heat) after Video Forge is gone.
- No Stop button for a normal render: `RenderBar.tsx` has no cancel (grep Stop/cancel: none); no `render:cancel` in `preload.ts`; `renderVideo.ts:596-603` calls `renderHyperframes` without the `signal` it already supports (`renderHyperframes.ts:50,66`). Only Many videos has Stop (`ManyVideos.tsx:268`, and it waits for the current video to finish).
- Plain words: one stray click on the window's X kills the night's work and leaves the PC working on a video nobody will collect; and the only way to stop a one-hour render is to do exactly that.
- Fix: ask "A video is still being made — quit anyway?" while busy; route all spawns through `spawnTracked`; add a Stop button wired to an AbortController; add `powerSaveBlocker` while a batch runs (see M16).
- Estimate: 4 h

### H7. The key vault can wipe itself and is not crash-safe
- Where: `electron/keyStore.ts:24-41` `readVault` returns `{}` on ANY error (locked file, bad decrypt, half-written file); `:103-109` `setKey` then writes back only what it read plus the one new key; `:43-54` `writeVault` writes straight over the file (no temp file + rename — compare the safe pattern in `tools/lib/forgeKeys.mjs:129-131`).
- Plain words: if the vault file is momentarily unreadable when you save one new key, every other key is erased; a power cut mid-save leaves a broken file. Keys only held here (Pixabay, Pexels, Freesound — not in `SHARED_NAMES`, `forgeKeys.mjs:28-32`) would have no second copy.
- Fix: write to `byok.secrets.enc.tmp` then rename; if the file exists but cannot be decoded, refuse to save and say so (keep a `.bak`); distinguish "no file" from "unreadable".
- Estimate: 1 h

### H8. A half-downloaded background clip is kept and reused forever
- Where: `electron/net/http.ts:114-160` `downloadToFile` writes straight to the final name (`createWriteStream(destPath)` :149); on timeout (:127-132) or error (:152-154) it neither closes the stream nor deletes the partial file; `electron/main.ts:380-392` and `electron/batch/runJob.ts:796-800` treat "file exists" as "already have it". Also `res.on("data", c => out.write(c))` ignores back-pressure (:150).
- Plain words: one dropped connection during a download leaves a broken video file that every later render picks up, so lessons come out with black or missing backgrounds and nothing says why (a 72-video batch can repeat the damage).
- Fix: download to `name.part`, rename on success, delete on failure; also verify size equals `Content-Length`.
- Estimate: 1 h

---

# MEDIUM

### M1. Window hardening is off: no sandbox, no content-security rule, no navigation guard
- `main.ts:83-88`: `contextIsolation: true`, `nodeIntegration: false` (good) but `sandbox: false`. `index.html` has no Content-Security-Policy (grep CSP/webRequest: none in `electron/`, `src/`, `index.html`). No `will-navigate` handler. `main.ts:93-96`: `setWindowOpenHandler` passes ANY url to `shell.openExternal` (file:, smb:, custom protocols). No drag-and-drop handler in `src/` (grep) — dropping a file on an Electron window normally navigates the whole window to it (not tested here).
- Note on fixing: the preload is built as ESM (`preload.mjs`, `main.ts:84`); Electron only allows sandboxing with a CommonJS preload, so the build output format has to change first.
- Fix: `will-navigate` → preventDefault; `openExternal` only for `https:`; add CSP meta (`default-src 'self'; img-src 'self' blob: data: https:; media-src blob: 'self'; connect-src 'none'`); build the preload as CJS then set `sandbox: true`.
- Estimate: 3 h

### M2. "Open this video" folder check is loose and not limited to videos
- `main.ts:325-329`: `full.toLowerCase().startsWith(renders…)` has no separator, so `…\renders-old\x.exe` passes; any file type is handed to the shell (`.exe`, `.bat`, `.lnk`).
- Fix: `path.relative` check and an allow-list of `.mp4 .srt .vtt .gif .png .mp3 .wav`.
- Estimate: 0.4 h

### M3. One unexpected error anywhere quits the whole app; one failed start leaves the Many-videos screen stuck on "running"
- `electron/process/childTree.ts:250-254`: on any `uncaughtException` it kills the engines, prints to a console nobody sees, and `process.exit(1)` — mid-render, no message. A malformed frame from Google's voice socket (`geminiEngine.ts:122-124` `JSON.parse` inside `onmessage`) is one way to reach it. No `unhandledRejection` handler anywhere.
- `main.ts:284-291`: `void runMany(...).finally(...)` — if `runMany` fails before its first row (`manyVideos.ts:73-77`: folder or preset file cannot be written, e.g. disk full) nothing is sent to the window, so `ManyVideos.tsx` stays in "running" with only a Stop button, and the rejection is unhandled. (What Electron does with an unhandled rejection in the main process: not verified.)
- Fix: `process.on("uncaughtException")` shows a dialog and tries to keep going for non-fatal errors; wrap `runMany` in try/catch that emits `{type:"finished"}` with the error; try/catch around `onmessage` bodies.
- Estimate: 1.5 h

### M4. No safety net in the screen code: any display error blanks the whole window
- `src/main.tsx:18-22` renders `<App/>` with no React error boundary (grep `ErrorBoundary|componentDidCatch`: none). The comments in `RenderBar.tsx:96-98` and `BackendPanel.tsx:244-246` record that this exact blank-window failure has happened before.
- Fix: one `ErrorBoundary` around `<App/>` with "Something broke — your project is saved. Reload" + button.
- Estimate: 0.5 h

### M5. Four AI providers can be chosen but have no place to type their key
- `BackendPanel.tsx:40-95` lists only ElevenLabs, Gemini, OpenRouter, NVIDIA, Pixabay, Pexels, Freesound. Yet `ExplainerStudio.tsx:381` says "Add one under Settings — Groq or Gemini work well", `explainerIpc.ts:63` / `characterIpc.ts:33` say "Add it in Settings → keys", and the model lists include Groq, Cerebras, OpenAI, Mistral (`tools/lib/explainerLlm.mjs:16-24`). Groq/OpenAI work today only because Image Forge may have put them in the shared file (`forgeKeys.mjs:31`).
- Plain words: a user who follows the on-screen advice finds no box to paste into.
- Fix: add the four provider cards (Groq first — free tier) or change the three messages.
- Estimate: 1 h

### M6. "Many videos" quietly ignores parts of the cast and can lose videos
- `ManyVideos.tsx:132-147` sends each speaker without `piperPythonPath` / `piperOnnxPath` (so a Piper speaker fails every row with "has no Piper voice selected", `buildNarration.ts:313-318`), and without `elevenModel` / `eleven` settings (Cast-panel ElevenLabs sliders have no effect on the batch).
- `manyVideos.ts:102-104` `fsp.rm(named)` then rename: two rows with the same name overwrite each other silently.
- A script line `[SFX: name]` is parsed (`parseScript.ts:71`) but the sound folder is computed from the script's folder (`runJob.ts:659-663` → `<run folder>\sfx`, which does not exist); the row fails with a file error instead of the friendly message (`runJob.ts:702-716`).
- Fix: forward the missing fields; add " (2)" to duplicate names; resolve `sfx/` from the app root.
- Estimate: 2 h

### M7. "Save project" file forgets half the project
- `PresetsPanel.tsx:174-187` saves render, fps, speakers, waveform, subtitles, script, language, pauses, narration. It leaves out cards (intro/outro), logo, backgrounds and their dim/blur/crossfade, music + volume + duck, SFX, attached audio, idle motion — all of which the autosave does keep (`useProjectStore.ts:352-386`). Opening (`PresetsPanel.tsx:200`) checks `kind` but never `version`. The autosave's `persist` has `version: 1` and no `migrate` (`useProjectStore.ts:344-346`; the settings store has one, `useSettingsStore.ts:94`).
- Plain words: save, move to another PC, open — music, sound effects and backgrounds are gone.
- Fix: save the same fields as the autosave; add `migrate`; refuse files with a newer `version`.
- Estimate: 1.5 h

### M8. The words on screen and in the docs no longer match the app
- DramaBox retired 10 Oct (`CastPanel.tsx:34-37`, `tools/archive/google-cloud/README.md`) but: `BackendPanel.tsx:404-413` still says DramaBox "generates on a rented GPU … the app writes its files from the Narration tab" — that button no longer exists (`writeBlocks` in `NarrationPanel.tsx:105-130` is never used in the screen); `README.md:32-34` leads with DramaBox and omits Gemini Live, ElevenLabs and Fish (the voices actually in the Cast menu, `CastPanel.tsx:484`); `ManyVideos.tsx:138` quietly maps "dramabox" to Gemini.
- `docs/NOT-BUILT.md` is dated 19 Aug and wrong in four places: says ElevenLabs "don't build" (built 20 Aug, `BackendPanel.tsx:109`), the batch spreadsheet is "biggest gap" (built 13 Oct, `ManyVideos.tsx`), preview has no sound (`App.tsx:764` "play with sound"), narration cache eviction etc.
- `README.md:94` "License TBD" vs `package.json:6` MIT and `LICENSE`. Header says "AI video generator · BYOK" (`App.tsx:512`) while README says "not a generative-video toy" and the product is "Video Forge". One screen has three names: "Backend Settings" (`elevenlabsEngine.ts:126`, `soundSearch.ts:54`), "Settings → keys" (`explainerIpc.ts:63`), "API Keys & Backend" (`BackendPanel.tsx:293`), and a gear labelled "Settings" (`App.tsx:520-521`). `docs/HANDOFF.md:97` names a `typecheck` script that does not exist.
- Fix: one name ("Settings"), delete the DramaBox paragraph and dead `writeBlocks`, refresh README feature list, mark NOT-BUILT.md "historical" or rewrite.
- Estimate: 2.5 h

### M9. Disk fills up with no limit except the clip cache
- Measured in `%APPDATA%\byok-vid-creator\renders` (read-only): 32 GB total — `lessons/` 27 GB, 122 loose `.mp4` 4.1 GB, 29 `narration-*.wav` 675 MB, `plan-cache/` 81 files, `narration-cache/` 43 MB. Only `media/` has a size limit (`electron/media/mediaCache.ts`, default 2 GB). `buildNarration.ts:344-346` writes a new `narration-<time>.wav` on every generation AND a second copy into the cache; `NOT-BUILT.md` lists cache eviction as unbuilt. No free-space check before a render (grep `statfs|diskusage|ENOSPC`: none).
- Plain words: a long batch can fill the drive and fail at the last step; nothing warns beforehand.
- Fix: warn when free space < 3× expected output; keep last N narration WAVs; add "Clean up old renders" next to the clip clean-up.
- Estimate: 2 h

### M10. Internet calls without a time limit, and two different network stacks
- No timeout: `elevenlabsEngine.ts:165` (speech) and `:239` (voice list), `testProvider.ts:55` (key test: the button stays "Testing…"), `makeSfxEleven.ts:69,93`. Others have 90–120 s limits (`geminiText.ts:42`, `fishEngine.ts:42`, `geminiEngine.ts:216`).
- `electron/net/http.ts:4-31` explains why everything must use Chromium's network stack (antivirus HTTPS scanning breaks Node's), yet `fetch` (Node's) is used in `elevenlabsEngine.ts`, `fishEngine.ts`, `geminiEngine.ts`, `geminiText.ts`, `makeSfxEleven.ts`, `testProvider.ts:55`, `tools/lib/explainerLlm.mjs:30,56`. On a machine with that antivirus these calls would fail with a certificate error (not reproduced here).
- Fix: route them through `request()` with `timeoutMs`; set a response size cap in `http.ts:90-95` (unbounded today).
- Estimate: 2 h

### M11. Voice-server port is picked blindly
- `piperEngine.ts:32,85` `nextPort++` from 5501 with no check that the port is free; `pingServer` (:34-46) treats ANY HTTP answer as "our server is ready". If another program holds that port, Piper fails to start but the app sends your script text to the stranger. `CLAUDE.md` says "If a port is taken, move ours".
- Fix: ask the OS for a free port (listen on 0 then close) and confirm the answering process is the one we started.
- Estimate: 0.7 h

### M12. "Write the whole animation" picks the most expensive models and lets the model write up to 48,000 words of output
- `explainerIpc.ts:55-59` `REBUILD_HINTS`: OpenAI `gpt-5.5`, OpenRouter `anthropic/claude-opus` first; `explainerLlm.mjs:104` `maxTokens: 48000`, 15 min timeout. The button tip only says "Needs a top model" (`ExplainerStudio.tsx:390`). No price, no confirm. (Retries are bounded: 3 tries × 3 for scenes; 1 call here.)
- Fix: show "this uses your paid OpenRouter/OpenAI key — typically $X" and require a click; prefer free-tier Gemini/Groq when present.
- Estimate: 1 h

### M13. Private photos sit untracked and un-ignored in the repo; 34 changed paths are uncommitted
- `nelly/` (7.5 MB of phone-gallery photos and screenshots, e.g. `Screenshot_152.jpg`, `nel.jpg`) is not in `.gitignore` (grep) — `git add -A` would stage it, and a public repo is planned (`HANDOFF.md` "Public copy"). Also untracked: `characters/`, `electron/characters/`, `docs/CHARACTER-BUILDER-PLAN.md`, tools; 25 modified files; branch unmerged since 13 Oct; `git stash list` empty. `handoff 1.md`, `handoff 2.md`, `image-1787215428641.png` also loose at repo root.
- Fix: add `nelly/` (and the loose files) to `.gitignore` now; commit the character work to the branch as WIP.
- Estimate: 0.3 h

### M14. Two copies of the app can run at once on the same data
- No `requestSingleInstanceLock` (grep). `main.ts:59-60` already notes "two copies sharing one folder lock each other out". `childTree.ts:60-67,115` rewrites the shared process ledger (`child-processes.json`), so the second copy forgets the first copy's voice servers (they won't be cleaned after a crash). `--job` runs and `run-queue.mjs` do the same on purpose.
- Fix: single-instance lock for the normal window only; second launch focuses the first.
- Estimate: 0.3 h

### M15. The preview loads every background clip completely into memory
- `src/lib/assets/useFileUrls.ts:55` reads each file whole over IPC into a blob; `App.tsx` calls it for every background scene (`backgroundUrls`). Clips are tens of MB each; a 5-minute lesson has ~15–20 scenes.
- Fix: serve local files through a custom `video-forge-file:` protocol with a path allow-list (also solves H4's file-read hole) instead of copying bytes.
- Estimate: 2 h

### M16. Overnight batch can be put to sleep by Windows
- No `powerSaveBlocker` (grep none). `tools/run-queue.mjs:17-19` itself lists "a laptop will sleep" as a known failure.
- Fix: `powerSaveBlocker.start("prevent-app-suspension")` while Many videos / a render runs.
- Estimate: 0.3 h

### M17. Voice engine is missing from the installed app
- `useSettingsStore.ts:46` default `./piper-venv/Scripts/python.exe` is relative (resolved against whatever folder the app was started from); `package.json:96-98` excludes `piper-venv/**` and `models/**` from the installer. Gemini/ElevenLabs/Fish work without it, so this only bites a user who picks the free local Piper voice (the only no-key voice) in an installed copy. `docs/WINDOWS-EXE.md` not read.
- Fix: say it in the voice picker ("Piper isn't installed here — Install steps"), or ship a small first-run installer to a per-user folder.
- Estimate: 3 h (message only: 0.5 h)

---

# LOW

- **L1. Orphan-reaper match is a first-word comparison.** `childTree.ts:185,199` takes `recorded.split(" ")[0]` and checks the process command line contains it; with an absolute program path containing a space ("CLAUDE SPACE") that is `C:\Users\strav\Documents\CLAUDE` — loose. With the default relative path the real command line may never match (not tested). Fix: store the full exe path, compare exactly. 0.5 h
- **L2. Keys appear in web addresses** (Pixabay `mediaSearch.ts:91`, `testProvider.ts:116`; Freesound `soundSearch.ts:59-60`; Gemini voice socket `geminiEngine.ts:96,164`). Those services require it; the code never logs the address (checked `console.*` calls). Only noted. 0 h
- **L3. LocalAI address check allows all of `100.0.0.0/8`** (`main.ts:300`), but Tailscale only uses `100.64.0.0/10`. Tighten the pattern. 0.1 h
- **L4. 69 empty `cards-<time>` folders in the renders folder.** `joinCards.ts:151` creates the temp folder; the early return at `:175-177` and the failure return skip the delete at `:202`. Harmless, grows. 0.1 h
- **L5. Dead code and dead settings** that describe features that do not exist: `voiceRefsDir` (`useSettingsStore.ts:48`, `settingsTypes.ts` — read by nothing, the very pattern `settingsTypes.ts:6-12` warns about); `explainer:ensureGoogleFont` (`explainerIpc.ts:151`, not in preload); `electron/net/readPage.ts` and `electron/net/youtube.ts` (not imported by the app; `youtube.ts` is used only by `tools/youtube-*.mjs`); `dramabox:writeBlocks` IPC. 1 h
- **L6. Gemini "free live voice" assumption.** Each line can use up to 3 takes × 2 sessions (`geminiEngine.ts:237-266`, four lines in parallel `buildNarration.ts:253-271`). Free only if the key belongs to a project without billing; the app cannot tell. Unknown whether the owner's key is billed. 1 h to add a "this key looks billed" note, if there is any way to detect it (not verified).
- **L7. Twin language uses "the last narration made"**, a single global file (`twinNarration.ts:29-31,39-45`), not the open project. Make a narration, open another project, tick "Also in Greek": it translates the old script. 0.5 h
- **L8. Autosave writes the whole explainer draft on every keystroke** (`ExplainerStudio.tsx:107`), including thousands of word timings; on quota error it silently stops saving. 0.5 h
- **L9. Untrusted explainer window may talk to Google Fonts** (`tools/lib/explainerRun.mjs:49-54`); a hostile page could put data in a font name in the web address. Window has no preload and `sandbox: true` (:70), so nothing sensitive is reachable — theoretical. 0.5 h
- **L10. Untested Windows cases.** No test or code path was run with a Greek user name, paths over 260 characters, or OneDrive-redirected folders. The code uses `windowsHide`, array arguments and `path.join` everywhere (good); the concat list file `joinCards.ts:195-199` escapes apostrophes but not backslashes (unverified for odd names). 2 h to test
- **L11. Sheet and download limits.** `parseCsv` / `fetchSheet` have no row or size cap (`sheet.ts`, `http.ts:90-95`); a huge link hangs the app. 0.3 h
- **L12. `forge:orderPuppet` "make it without me" (auto)** (`main.ts:249-266`, `forgeShelf.mjs:72`) asks Image Forge to generate with no human present; whether that spends money depends on Image Forge's settings — not visible from this repo. Unknown.

---

# Checked and clean (so nobody re-checks)

- **Process spawning:** every `spawn/execFile` uses an argument array; no `shell: true` anywhere in `electron/`, `tools/lib/`, `src/` (grep). Task kills are by PID with `taskkill /PID … /T /F` (`childTree.ts:91,229`), never by name.
- **Hard-coded keys:** none in tracked files; `.gitignore` covers `.env`, `client_secret*.json`, `youtube-token.json`, `tools/windows-ca-bundle.pem`.
- **Key transport/logging:** keys go in headers or provider-required query strings; no `console.log` prints a key or an address containing one (grep of all `console.*` near `key/token`). Shared-key file is DPAPI-locked through PowerShell with the secret on stdin, atomic write (`forgeKeys.mjs:43-70,126-131`). Masked hint only in `getKeyStatus` (`keyStore.ts:120-127`).
- **Other ports:** the only listeners found in app code are Piper's (H1) and the optional `tools/youtube-auth.mjs:679` (a dev tool, localhost redirect). HyperFrames binds `127.0.0.1` in the places read (`listen(0,"127.0.0.1")`); whether `hyperframes render` opens any port was not observed — check with `netstat` during a render.
- **Retries and loops that could spend:** all bounded — Gemini take retries 3 (`geminiEngine.ts:237`), Piper 3 (`piperEngine.ts:161`), NVIDIA planner 6 + model walk (`backgroundPlanner.ts:105-198`), explainer scenes 3×3 (`explainerLlm.mjs:53,77`), narration and plan results are cached (`buildNarration.ts:196-209`, `runJob.ts:762-787`). No unbounded retry loop found.
- **Rented GPU:** no app code starts or stops any cloud machine. The only code is archived (`tools/archive/google-cloud/*`, project `tier-1-ak`, which is dead per `CLAUDE SPACE/CLAUDE.md`). Nothing can leave a GPU running.
- **Shelf/orders/made-list:** `forgeShelf.mjs` validates every id, slug and file name with strict patterns; moves deleted puppets to a bin; JSONL made-list is append-only and skips broken lines.
- **Model-written explainer pages:** run in a separate offscreen window with its own session, `sandbox: true`, no preload, network blocked except Google Fonts, permissions denied, downloads blocked, new windows and navigation blocked (`explainerRun.mjs:46-79`). Style ids are regex-checked (`explainerIpc.ts:96,137,260`).
- **Character cards:** one field list normalises everything from a person or a model (`characters/core/card.mjs`); no `eval`, `new Function` or dynamic `import` in `characters/core`, `explainer/core`, `explainer/kits`, `explainer/stage` (grep).
- **Render temp files:** the per-render folder is made with `mkdtemp` and removed in `finally` (`renderVideo.ts:189,699`); the temp folder in `%TEMP%` had 0 leftovers.
- **Project start-up:** `electron/migrateUserData.ts` keeps old data in place, tested. Settings store has a real `migrate`.
- **Hover help:** a test fails the build if any clickable control lacks a tip (`tools/lib/hoverHelp.test.mjs`).
- **SFX generation spend guard:** exists (`makeSfxEleven.ts`) — H5 asks for the same on speech.

# Not verified (unknown stays unknown)

- Whether closing/dropping/navigating behaves as predicted in M1 and H6 (not run; app not started).
- What Electron 43 does with an unhandled promise rejection in the main process (M3).
- Whether `hyperframes render` opens a local port or any other network call besides the update check (H2 shows the update check).
- Whether the owner's Gemini key is on a billed project (L6).
- `docs/HANDOFF.md:107`: "LocalAI still listens on every network until `.localai-lockdown.sh` is run" on the mini PC — still open per the doc; not checked (outside this repo).
- UI wording of screens not opened (Background, Music, SFX, Subtitle panels, Cast details) — only the files listed at the top were read.

---

# F. Quick wins (each under 1 human hour)

| # | Do | Fixes | Hours |
|---|---|---|---|
| 1 | `--host 127.0.0.1` on Piper | H1 | 0.2 |
| 2 | HyperFrames env: `HYPERFRAMES_NO_UPDATE_CHECK=1`, `HYPERFRAMES_NO_AUTO_INSTALL=1` | H2 | 0.3 |
| 3 | Delete `keys:get` (main, preload, types) | H3 | 0.3 |
| 4 | Correct BackendPanel ElevenLabs sentence now ("cost is not shown yet") | H5 (interim) | 0.1 |
| 5 | Error boundary around `<App/>` | M4 | 0.5 |
| 6 | `storage:openPath`: `path.relative` + extension allow-list | M2 | 0.4 |
| 7 | `.gitignore`: `nelly/`, `handoff *.md`, `image-*.png`; commit character WIP | M13 | 0.3 |
| 8 | `requestSingleInstanceLock` | M14 | 0.3 |
| 9 | `powerSaveBlocker` during batch/render | M16 | 0.3 |
| 10 | Open `will-navigate` + https-only `openExternal` | part of M1 | 0.3 |
| 11 | README license → MIT; add `"typecheck": "tsc --noEmit -p ."`; NOT-BUILT.md "historical, 19 Aug" banner; rename header "AI video generator · BYOK" | M8 (part) | 0.4 |
| 12 | Add Groq key card (and OpenAI/Cerebras/Mistral) | M5 | 0.8 |
| 13 | Delete `cards-*` temp folder on all return paths | L4 | 0.1 |
| 14 | Tighten Tailscale pattern | L3 | 0.1 |
| 15 | Time limits on the five untimed network calls | part of M10 | 0.5 |
| 16 | Atomic vault write + refuse to save over an unreadable vault | H7 | 0.9 |
| 17 | Download to `.part` then rename | H8 | 0.9 |

Total of the 17 quick wins: about 6.8 human hours; clears H1, H2, H3, H7, H8 and the cheap parts of M1/M2/M4/M5/M13/M14/M16.

# Suggested order of work

1. Quick wins 1-3 (security/rule breaks, one sitting, 0.8 h).
2. Quick wins 16-17 (data safety, 1.8 h).
3. H5 (money) and H6 (stop/close) — the two that cost real time or money in overnight use.
4. H4 + M1 together (one refactor: main picks paths, sandbox + CSP).
5. M5-M8 (what the owner sees: keys box, Many videos bugs, save-project, wording).
