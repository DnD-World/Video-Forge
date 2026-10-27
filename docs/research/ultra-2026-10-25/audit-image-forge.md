# Image Forge audit (read-only) - 25 Oct 2026

App: `C:\Users\strav\Documents\CLAUDE SPACE\qwen image creator`, version 1.0.4, Electron shell.
Method: code reading, plus `npm test`, `npm run typecheck`, `npm audit` (no app, server or generation run). The repo was not changed (git status identical before and after; `docs/puppet-recipe.md` was already modified).
Scratch files (outside the repo): `scratchpad\test.out`, `tc.out`, `audit.json`, `audit\san.cjs`, `audit\xss.html`.

Two claims are by rule, not seen in a running browser (the browser pane would not run a local test page): the review popup being trapped (item H6) and the SVG script actually firing (item H4). The sanitiser output in H4 was checked on a scratch copy of its code.
Hours = human work hours. Line numbers are from the files as they are today.

## 0. Answers to the direct questions

| Question | Answer |
|---|---|
| Which shell is shipped? | Electron only. `release.yml` builds with `node scripts/build-exe.js`; `release/` holds `Image Forge Setup 1.0.4.exe` and the portable exe. Tauri is never built in CI (HANDOFF.md section 2), has no `gen/` or `target/` folder, and lacks the proxies, vault, shared keys, workshop, link, Canva and updater, so it would be a different, broken product. |
| `@supabase/supabase-js` | Listed in `package.json:25`. Zero imports anywhere in `src/`, `electron/`, `scripts/` (grep); not in `dist/`. Nothing is sent to Supabase. Dead weight, remove it. |
| `src/market` (there is no top-level `market/`) | The "Emberfair" demo shop: `src/market/MarketApp.tsx` (717 lines) and `data.ts` (156 lines), statically imported at `src/App.tsx:124`, switched at `App.tsx:212-216`. No `fetch` and no network import in it. Uses a localStorage key `emberfair-v1` (`App.tsx:1456`). Nothing leaves the machine. |
| `xlsx` 0.18.5 | In `devDependencies` (`package.json:58`) but bundled as a lazy chunk. Used only to WRITE files: `App.tsx:1247-1263`, `PromptFactory.tsx:208-212`. Never parses a workbook. Its two CVEs (prototype pollution, ReDoS) are in the parsing path, so exposure here is very low. No fixed version exists on npm. The Flow sheet export does not need it. |
| Anything off-machine at startup | `index.html:10-17` loads Google Fonts on every launch (IP sent to Google). Update check (GitHub) unverified - I did not read it. |
| Servers on 0.0.0.0 | Only the Vite dev server (`vite.config.js:8`), used by `npm run dev` and `start-forge.bat:51`. The Electron servers bind `127.0.0.1` (`main.js:506,607`). |
| Keys printed or logged | No `console.*` in the key-handling files; keys only go in `Authorization` or `x-goog-api-key` headers (`engines.mjs:709,794,859,886,954,1013`; `visionEngine.ts:279,340,414`; `testConnection.ts`; `geminiBatch.mjs:20`). Not in URLs. Provider error bodies are shown up to 300 characters (`engines.mjs:explainFailure`) and could echo a masked key. Not seen. |

## 1. Test health (item F)

| Command | Result |
|---|---|
| `npm test` (vitest 5.0.2) | 40 files, 728 tests, all passed, 4.64 s. |
| `npm run typecheck` (tsc) | Exit 0, no errors. |
| `npm audit --omit=dev` | 7 vulnerabilities: 1 critical, 4 high, 2 moderate. Direct: `@modelcontextprotocol/sdk` 1.30.0 (several advisories; fixed in 1.32 or later), `zod` 4.6.5 (memory exhaustion on oversized collections). Indirect through the SDK's web stack: `proxy-addr` (critical), `body-parser`, `fast-uri`, `hono`, `ip-address`. The MCP server uses stdio only (`mcp-server.js:627-630`), so the HTTP-stack advisories are not reachable. `fixAvailable: true` for all. |
| `npm audit` (with dev) | 16 total (1 critical, 11 high, 4 moderate). Adds `electron` 44.4.4 (high, range 44.0.0 to 44.9.0, two advisories), `vite` 8.3.1 (high, dev server and `launch-editor` on Windows), `brace-expansion`, and `xlsx` (high, no fix). |
| Doc drift | HANDOFF.md says 715 tests in 39 files (line 7) and 727 (line 579); actual is 728 in 40. |

## 2. Ranked findings

### CRITICAL (the "asks before spending a penny" promise is broken)

**C1. The "New euro/2 delayed queue" button spends money without asking, and sends free rows to Google too.**
- Where: `src/App.tsx:1327-1364` (`sendBatch`), button at `App.tsx:2149-2158`.
- Why it matters: one click sends every waiting picture to Google's paid batch service and only tells you the price after it is sent.
- Detail: there is no `PaidConfirm` and no `confirmPaidRuns` check. The model is taken from the first waiting row only (`:1334`), then ALL pending/failed rows are submitted (`:1331`, `:1348`), including rows meant for free engines (OVH, Cloudflare, local). The label "New euro/2 delayed queue" does not say it costs money.
- Fix: run `checkPaidRun(rows, s, {batch:true})` on the Google rows only; show `PaidConfirm`; submit only rows whose route is Google; rename the button "Send to Google at half price (paid)".
- Hours: 1.5.

**C2. The guard treats a paid model with an unknown price as free.**
- Where: `src/lib/paidGuard.ts:98-112` (`paidRows` needs `total > 0`), `src/lib/engines.mjs:331-343` (`estimateCost` counts unknown as `unknown++`, adds $0), `engines.mjs:417` (`resolveRouteIgnoringPauses`: a model name not in the catalogue becomes `{engine: s.provider, apiModel: wanted}` with no `def`).
- Why it matters: typing any model name the catalogue does not know (a `model` cell in the table, an imported CSV or sheet, a custom OpenAI-compatible model, or a "link" request from another program) makes the run say "This run is free" and spend real money. That includes Google models the owner banned (for example a Pro image model).
- Detail: `tests/paidGuard.test.ts` has no case for unpriced models (grep for "unknown" and "unpriced" found nothing). `link.mjs:144` lets a link request carry any `model` string up to 60 characters; `App.tsx:1628` then runs it.
- Fix: for any engine not in `FREE_ENGINES`, an unknown price counts as a cost (`costs=true`, dialog says "price unknown"); add tests for gemini/openai with an unknown model; optionally refuse model names containing "pro".
- Hours: 1.

### HIGH

**H1. The puppet maker spends on paid engines with no confirmation, and the fix rounds are not priced.**
- Where: `PuppetMaker.tsx:158` (cost = text only), `:981-985` (an amber line "About $x-$y"), `:990` (Draw 4 faces starts at once), `:717-765` (`checkAndFix`, 2 rounds), `src/lib/puppet/pageIO.ts:87-88` (prices hard-coded at 0.034 and 0.067), `:127-150` (`pageGenerate` calls `generateBytes` directly). `autoPick` plus an Video Forge order (`:99`, `:309-315`) runs the whole puppet unattended.
- Why it matters: choosing a Nano Banana engine for a puppet can spend several dollars with one click, and "Check and fix" can triple it.
- Detail: worst case on a paid part engine: 3 tries per part, then 2 fix rounds of 3 tries each = up to 9 pictures per part, across about 20 parts (plus side and sitting views) = roughly 200 pictures, about $7 to $13 at the listed prices. The on-screen "worst" figure only covers the first build (`pictureBudget`, `maker.ts:301-304`, 3 tries).
- Fix: use `checkPaidRun` and `PaidConfirm`; price from `MODELS`, not hard-coded; show worst case including fix rounds; add a per-puppet spend cap setting (default $0 = free engines only).
- Hours: 3.

**H2. Other direct generation paths skip the guard.**
- Where: "Forge a variant" `App.tsx:1202`; Sheet maker `SheetMaker.tsx:131,140,154` (shows "about $x" at `:397` but runs on one click); `confirmPaidRuns` is consulted only at `App.tsx:825`.
- Why it matters: one click, extra paid pictures, no dialog.
- Fix: route through one shared `ensureAffordable()` helper used by every caller.
- Hours: 1.5.

**H3. MCP server (agent API) has no spending limit, and two overlapping runs double-generate.**
- Where: `scripts/mcp-server.js:157-164` (env keys for Google and OpenAI), `:370-389` (tools), `:544-580` (`forge_generate_pending` loops all pending rows, no cap), `:475-480` (price only reported in `forge_status`).
- What an agent can do: add rows (filename validated by `safeFilename` `:291-305`, `model` must be a catalogue id `:381`), generate them, retry, change model columns, list. It cannot read or write other paths (`--csv`/`--out` are set by the operator `:57-59`), cannot run commands, and uses stdio only (no network listener). It CAN spend if any paid key is in the environment or the `--settings` file; env Google keys go into the "free" pool, so even a billing-enabled key is used first. The README and `.env.example` admit "no spending guard". Same-name files in `OUT_DIR` are overwritten.
- Overlap: the loop holds the manifest in memory and marks rows "generating" only in memory (`:552`); if the agent's call times out and it calls again, the second call sees the rows still "pending" on disk and generates them again (double cost, double files). The stale in-memory manifest is also saved over the file after each row (`:577`), erasing rows added meanwhile.
- Fix: `FORGE_ALLOW_PAID` (default off, refuse non-free engines) and `FORGE_MAX_USD`; persist "generating" and refuse a second run while one is active (lock file); re-read before each save.
- Hours: 2.5.

**H4. A script can get past the SVG cleaner and there is no Content Security Policy, so one bad model-written SVG could steal every key.**
- Where: cleaner `src/lib/vectorAssets.ts:83` (banned tag list: no `img`, `a`, `style`, `use`, `image`), `:121-126` (the event-handler pattern needs a whitespace before `on...`, so `/onerror` slips by), sinks `dangerouslySetInnerHTML` at `ChatView.tsx:772`, `LibraryViews.tsx:23`, `MadeView.tsx:371`, `ManifestView.tsx:117,496`, `ui.tsx:423`; no CSP in `index.html` (whole file) or `main.js:476` (headers = Content-Type only).
- Checked on a scratch copy: input `<svg><img/src=x/onerror=alert(1)></svg>` comes out unchanged except for the added `xmlns` (the cleaner reported nothing removed). `<style>@import url(http://...)</style>` also survives. By HTML parsing rules `<img>` inside `<svg>` leaves the SVG and its `onerror` runs in the app origin; not run in a real browser here.
- Why it matters: in the app's origin, a script can call `/app/keys` and `/app/vault` with the `X-Forge-App` header (`main.js:228,347,236`) and send everything anywhere (no `connect-src` limit). Entry route: a prompt list from a shared sheet telling the code model to write that SVG.
- Fix: replace the regex cleaner by an allow-list through `DOMParser` (keep only a short list of SVG shapes and presentation attributes; drop everything starting with `on`, any `style`/`image`/`a`/`use` with external refs); add a CSP header in `startServer` (`default-src 'self'; img-src 'self' data: blob:; connect-src 'self' https: http://127.0.0.1:*; script-src 'self' 'unsafe-eval'` - `unsafe-eval` is needed for `cursorChaser.ts:67`), first as report-only.
- Hours: 3.

**H5. A picture lives only in memory unless an output folder is linked.**
- Where: `src/App.tsx:589-606` (`saveToFolder` returns silently when no folder), `HANDOFF.md` section 5 ("imagesRef is in memory only"), no `beforeunload` guard (grep: none). Only a 220 px thumbnail is kept (`thumbStore.ts:24-54`).
- Why it matters: close or crash the app after a paid run and the full pictures are gone while the table still says "done" (the link feature then reports them as failed, `HANDOFF` line 530).
- Fix: when no folder is linked, auto-save to `<userData>\images\` (or Pictures\Image Forge) as the picture arrives; warn on close if unsaved pictures exist.
- Hours: 2.

**H6. (Owner complaint) The full-image popup in the puppet review is anchored inside a scrolling, blurred box, so it scrolls away.**
- Where: `PuppetMaker.tsx:813` (outer box: `fixed inset-0 overflow-y-auto ... backdrop-blur-md`), popup `:1242-1249` rendered inside it, `index.css:553` (`.forge-zoom {position: fixed; inset: 0}`). Only `TipLayer.tsx:116` uses a portal.
- Why: `backdrop-filter` makes the box the containing block for "fixed" children, and the box scrolls, so the popup sits at the top of the scroll area, not the screen. Open it while scrolled down and it opens above what you can see; scroll and it moves.
- Fix: render the popup with `createPortal(..., document.body)`. Also move the other overlays there.
- Hours: 0.25.

**H7. The review screen has no prompts, no attempt history, and loses the alternatives (owner complaints: "no prompt on every image", "old renders not reachable", "alternatives hard to reach").** Details in section 3.
- Where: `src/lib/puppet/workshop.ts:27-51` (no prompt, seed, engine, votes), `maker.ts:52-59,238` (the prompt is built inline and never emitted), `PuppetMaker.tsx:357-383` (the first-build handler ignores the `options` event; `:628` handles it only for redo/fix runs), `:410-417` (side/sitting parts get no cards after the first build), `:544-560` plus `:648-653` and `maker.ts:281` (an earlier version's thumbnail can be a different try's picture).
- Fix: see the redesign.
- Hours: 5 (data model plus plumbing); full workspace is separate (section 3).

**H8. The quality check fails open and lets a single objection be outvoted - this is why about half of the bad pictures got through.** Details in section 4.
- Where: `src/lib/puppet/quality.ts:149-163` (unanswered questions are skipped; a checker needs only half answered), `:169-185` (green = 2 clean votes, with 3 checkers one dissent is ignored; `tieBreak` is never passed, `pageIO.ts:273-275`), `maker.ts:262` (no checker at all = green "done").
- Hours: 3 for the rule changes; 5 more for the gold set that proves them.

**H9. Vulnerable dependencies.** See section 1. Fix: `npm audit fix` for the MCP SDK and zod (1.32 or later), bump Electron to a patched 44.x, drop `@supabase/supabase-js`, move off `xlsx` (CSV and TSV export is enough). Rebuild and reinstall-test the exe after the Electron bump.
- Hours: 1.5 (2 with the rebuild).

### MEDIUM

**M1. Nothing checks the Host header on the local API (DNS-rebinding).** `main.js:227-233` guards `/app/*` only with the `X-Forge-App: 1` header, which a rebound web page on the same port is allowed to send. `GET /app/keys` (`:347`) and `GET /app/vault` (`:236`) return keys in plain text. Modern Chrome's local-network prompt helps, other browsers less. Fix: reject any request whose `Host` is not `127.0.0.1:<port>` or `localhost:<port>`. Hours 0.5.

**M2. Keys are also on disk in plain text, so the DPAPI lock is partly cosmetic.** `vault.ts:73-95` mirrors the page's whole localStorage (settings with keys) into `vault.bin`, but the page keeps its own copy; `appctl.mjs:37-48` writes the whole localStorage to `mode-handover.json` in plain text (deleted after reading, `:51-67`); the settings backup file holds keys by design. I did not open `%APPDATA%\image-forge` to confirm the leveldb copy. DPAPI "CurrentUser" also does not stop other programs run by the same Windows user. Fix: say this plainly in SECURITY.md; encrypt the handover file with DPAPI; keep browser mode off by default (browser extensions with access to 127.0.0.1 can read the page's storage). Hours 2 (a real "keys only in the vault" change is 8+ and not recommended now).

**M3. Tauri shell is too open and is dead weight.** `src-tauri/capabilities/default.json:7-17` allows writing, creating folders and testing existence for `**` (any path); `tauri.conf.json:25-27` has `csp: null`; `shell:allow-open`. Not shipped (see section 0), but 38 `isTauri`/`tauriWrite` references remain in `App.tsx` and `tauriFs.ts`, `tests/version.test.ts` keeps its version in step, and three `@tauri-apps/*` dev dependencies stay. Fix: move `src-tauri/`, `TAURI.md`, `tauriFs.ts` and the branches to an `archive/` branch; or at least scope fs to the chosen folder. Hours 1.5.

**M4. `npm run dev` / `start-forge.bat` serve the app, plus the Cloudflare and NVIDIA relays, to the whole network.** `vite.config.js:8` `host: "0.0.0.0"`; `start-forge.bat:51` is the double-click route for non-technical users. Plus a high Vite advisory (dev server). Fix: `host: "127.0.0.1"`. Hours 0.1.

**M5. Any link or page navigation is handed to Windows.** `main.js:822-827` `will-navigate` calls `shell.openExternal(url)` for any non-app URL, whatever the scheme; `:818-821` accepts anything starting with "http". With H4 this is a way to launch protocol handlers. Fix: allow only `https:` and `http:` after parsing. Hours 0.25.

**M6. Any program on the computer can queue picture jobs.** `link.mjs:167 (pendingRequests)`, `App.tsx:1590-1628`: a JSON dropped in `%APPDATA%\image-forge\link\inbox` is validated (`link.mjs:111-157`), then free jobs run by themselves (GPU heat, free quota) and the `model` field is free text (see C2). No rate limit on the number of requests. Fix: a setting "ask me before link jobs start" (default on) and a daily cap. Hours 1.

**M7. Auto-update runs an unsigned installer with no checksum.** `main.js:374-389`, `appctl.mjs:73-120`: URL is limited to this repo's release page (good, `isTrustedInstallerUrl`), but the file is not verified (exes are unsigned, HANDOFF line 246) and `image-forge-update-<time>.exe` is never deleted from temp. Fix: check the SHA-512 from `latest.yml` before running; delete after. Hours 2.

**M8. "Stop" does not stop the local graphics card.** `main.js:407-431` (`proxyLocal`) has no handling for the page hanging up (`upstream.setTimeout(0)`, `req.pipe`), nor does `proxyUpstream` `:96-138`. Pressing Stop in the puppet maker leaves the GPU running the last 5-minute edit (the owner's heat concern). Fix: on `res.on('close')` destroy `upstream`. Hours 0.5.

**M9. Names with no Latin letters give an unstable puppet folder name.** `rig.ts:292-301` returns `puppet-${Date.now().toString(36)}` (a new value on every call) when the name and description reduce to nothing; `PuppetMaker.tsx:162` calls it on every render, and later saves (`onPartEvent` `:655`, `shelvePuppet`) use the current render's value while the saved record keeps the first (`:203-213`). Greek-only name and description would scatter files across folders. Fix: compute the slug once, store it in `metaRef`, use that everywhere; transliterate Greek. Hours 1.

**M10. Large libraries will get slow.** Made renders every row, no virtual list (`MadeView.tsx:362`, no `react-window`/observer); every thumbnail is read into memory at start (`thumbStore.ts:57-79`); the manifest is in the 5 MB localStorage (`App.tsx:453`); the vault is flushed every 2 s (`vault.ts:123`) and each write spawns a PowerShell to encrypt (`forgeKeys.mjs:36-46`, `vault.mjs:52-56`). Fix: paginate or virtualise Made, load thumbnails on demand, batch vault writes (at most every 10 s, only changed keys), cache the DPAPI call. Hours 5.

**M11. "Send to Video Forge" is not gated on unsure or missing parts.** `PuppetMaker.tsx:1198-1201`. A flagged-but-unreviewed part goes to the shelf silently. Fix: confirm "3 parts are unsure/unapproved - send anyway?". Hours 0.5.

**M12. Text AI calls have no money guard.** `confirmPaidRuns` covers pictures only (`App.tsx:825`); Chat, Prompt factory, prompt tailoring and the puppet checkers use the text/vision accounts as configured (`pageIO.ts visionFor :179` uses the first Google key and `gemini-flash-lite-latest`; if that key is billing-enabled it is billed, cheaply). Fix: show "paid" on any text account whose price is known; refuse unknown-price text models for batch jobs. Hours 1.5.

### LOW

- **L1.** `main.js:462` `decodeURIComponent` is outside any `try`: a request for `/%` throws an uncaught error and an error box appears in the main process (any web page can fire it with an `<img>`). Wrap it. 0.1 h.
- **L2.** `/cf-api` and `/nv-api` relays have no `X-Forge-App` check (`main.js:439-443`). Harmless without a key of the caller's own; still add the check. 0.1 h.
- **L3.** `proxyUpstream` sets no upstream timeout; hung sockets pile up. 0.2 h.
- **L4.** First-run "harvest" can delay start by up to 4 x 8 s if its marker file cannot be written (`main.js:571-618`). 0.3 h.
- **L5.** `index.html:10-17` loads Google Fonts (privacy, fails offline); `@fontsource/sora` is already bundled. 0.5 h.
- **L6.** `scripts/build-exe.js:62-64` falls back to downloading the icon from `image.qwenlm.ai`. Remove. 0.1 h.
- **L7.** Leftover `.pid.tmp` files after a crash during atomic writes (`workshop.mjs:55-58`, `link.mjs`, `forgeShelf.mjs`) and update installers in temp. 0.5 h.
- **L8.** No per-row attempt counter: a row that fails the same way (blocked prompt) is retried on every Forge press and by auto-retry every 20 s window (`App.tsx:529-545`; auto-retry only re-queues, it does not run). 0.5 h.
- **L9.** HANDOFF/test counts out of date (section 1). 0.1 h.
- **L10.** Local engine result URL is fetched without checking the host (`engines.mjs:984-988`). 0.2 h.

## 3. Puppet review UI: current structure and redesign proposal

### 3.1 Current structure (all in `src/components/PuppetMaker.tsx`, 1,399 lines, one default export)

| Piece | Lines | What it is |
|---|---|---|
| Overlay shell | 812-814, 1250 | `fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md`; inside it a `forge-pop max-w-5xl` card. |
| Steps 1-2 | 834-1064 | Describe, then Pick a face. |
| Review grid (steps 3 and 4) | 1066-1181 | `grid-cols-1 sm:2 xl:3` of cards, one per part (`reports`). Each card: preview (`h-32`, `object-contain`, `:1091`), status dot, checker's `why`, your last note, `options` strip (`h-14` thumbnails, `:1123`), `earlier versions` strip (`w-16 h-12`, `:1141`), note box, "Looks good", "Mark to remake". |
| Right column | 1183-1239 | `PuppetPreview` canvas (`:1278`, a live talking loop), Send to Video Forge, Add side view, Save zip, Remake marked, Check and fix, Try unsure/missing again, Delete. |
| Zoom overlay | 1242-1249 | The trapped popup (H6). |
| State | 100-127 | `reports: PartReview[]`, `previews`, `optionPics`, `versionPics`, `parts`, `viewsRef` (side and sitting), `metaRef` (the saved record). |
| Opening an old puppet | 218-263 | `loadWorkshop` + `meta.reports/options/versions` -> pictures `<id>.pair.png`, `<id>.opt<n>.pair.png`, `<id>.v<n>.pair.png`. |
| Entry from Made | `MadeView.tsx:99-103, 312-343` | Lists `WorkshopMeta`, `onOpenPuppet` opens the maker with `open`. |

### 3.2 Data model versus what the screen shows

| Stored (`<userData>\workshop\<slug>\`, `workshop.ts:27-51`, `electron/workshop.mjs`) | Shown | Gap |
|---|---|---|
| `meta.reports[]`: status, tries, `why` (one string with the vote tally), approved, note, redo | status dot, `why`, note | Votes and each checker's answers are flattened into one string. |
| `<id>.pair.png` (before/after crop of the LAST try) | 128 px high tile | Too small to judge; popup is broken (H6). |
| `<id>.layer/keyed/full.png`, `boxes` | used for the rig | - |
| `options[id][]` (+ `.opt<n>.*` files): up to 3 best tries of a part that never got green | strip of tiny thumbnails | Saved ONLY by redo/fix runs (`onPartEvent :628`). The first build (`:357-383`) throws the `options` event away, so after the first build there are none. Green parts keep no alternatives at all (`maker.ts:274` stores `tried` only on rejection). |
| `versions[id][]` (+ `.v<n>.*`): earlier accepted parts | strip of tiny thumbnails, click replaces the part at once | Only made on redo/fix. The thumbnail copy (`archiveCurrent :544-560`) reads `<id>.pair.png` AFTER failed tries of the new run already overwrote it (`:648-653`, `maker.ts:281`), so a "v1" thumbnail can show a rejected try, not the version it labels. |
| NOT stored | - | Prompt, negative prompt, "fix" text, seed, engine, time per try; the full edit picture of a rejected try; why a cut was refused (`cutPart.detail`, only the last survives in `why`); each checker's raw answers. |
| Side and sitting parts | no cards | `build` handler `:410-417` handles only `picture` and `kept`; those parts get reports only after a later "Check and fix". |

### 3.3 Redesign proposal

1. Fix the popup now (portal, 0.25 h) - ships alone.
2. One record per try. Replace `options` + `versions` by `attempts: Record<partId, Attempt[]>`:
   `Attempt { n, at, engine, model, seed, prompt, negative, fix, note, outcome: "cut-refused"|"rejected"|"green"|"chosen"|"kept", reasons[], votes: {checker, broken[], answered}[], files: {pair, layer, keyed, full?, edit?} }`.
   Save rejected tries too (a 768 px JPEG of the edit costs about 60 KB; 20 parts x 5 tries = 6 MB per puppet). The "current" part is just a pointer to one attempt. This answers "old renders", "alternatives" and "prompt on every image" with one change. Keep reading old `options`/`versions` for puppets already saved.
3. Replace the card grid with a review workspace (full page, not inside the blurred modal; keep the modal for steps 1-3):
   - Left rail: parts grouped (Mouths 8, Eyes 3, Brows 5, Arms 4, Side view, Sitting), each with a status chip and a filter (Needs me / Checkers disagreed / Red / Green / Approved) and "12 of 31 approved". Sort "riskiest first" (fewest margin between checkers).
   - Main pane: large before/after (about 600 px, flip or slider), under it the prompt in a read-only box with Copy and "Edit prompt and redo", seed and engine, and the checkers' votes with their answers.
   - Attempt strip: every try as a 96 px tile with a badge (green / rejected: reason / cut refused: reason / chosen). Hover enlarges in place, click swaps it into the main pane, "Use this one" makes it the part. Nothing scrolls away because the zoom is in the pane.
   - Keys: Up/Down part, Left/Right attempt, A approve, M mark to remake, N note, Space flip, P prompt.
   - "Contact sheet" tab: all mouths side by side on the base face at the same scale (and all brows, lids) - the quickest way for a person to see that visemes do not match each other. About 3 h; the biggest single help for variations across a library.
4. Export (owner request): "Copy for Google Sheets" and "Download CSV" in the flow format (section 5).
5. Honest words: replace "unsure/missing" with "Needs you / No picture", fix tooltips that say "two checkers" and "three rounds" (code runs three checkers, `pageIO.ts:265-272`, and 2 rounds, `PuppetMaker.tsx:718`).
6. Hide-nothing rule: if "Check and fix" is not available (needs two checker accounts, `pageIO.ts:236-272`), show the button greyed with "needs a free NVIDIA key" instead of removing it (`PuppetMaker.tsx:1214`).

Estimated hours: data model and plumbing 5; workspace 12-16; contact sheet 3; export 2-3 (section 5). Total about 22-27 h. Do the data model first: the screen can be rebuilt on it in pieces.

## 4. QC: what it checks, what it misses

### 4.1 What runs, in order (puppet maker)

| # | Check | Where | Tests | Thresholds |
|---|---|---|---|---|
| 1 | Face check (4 faces) | `maker.ts:82-120`, `pageIO.ts:189-200` | One vision model (the Google flash-lite fallback or your vision engine) is asked a yes/no JSON question: one character, mouth closed, eyes same direction, face inside the picture, flat background, lips as chosen, framing. | Pass/fail text only; `autoPick` takes the first "ok" face, else just face 1 (`PuppetMaker.tsx:309-315`). Missing checker = "not checked". |
| 2 | Cut sanity (mechanical) | `pixels.ts:363-505` | Same size; the change must exist; sits inside the part's band; one tight patch; not a full redraw; mouth not above the eyes. | Per-channel change T=26; cell 1/64 of width (16 px at 1024); busy cell >= 18% of the peak; a cell needs >= 8% changed pixels for "something changed"; keep patches >= 25% of the strongest; box area <= 30% (arms 60%) - `recipe.ts:494`; bands: head mouth 42-100% of height, lids 20-70%, brows 12-62% (`recipe.ts:486-491`); colour match of edit to base (gain 0.8-1.25, `pixels.ts:335-361`). |
| 3 | Picture panel (3 vision models) | `quality.ts`, `pageIO.ts:236-277` | Each checker answers 8-9 single yes/no or number questions on a before/after crop: wanted shape visible, tongue visible/past teeth, smiling, lips drawn left/right, facial hair same, marks same, eyes same direction, "looks broken", for arms: arm count, hand count, hand over face, face changed. | Rules `brokenRules :81-105` turn facts into faults (e.g. tongue sticking out, lips on a lipless puppet, smile where none asked, `arms != 2`, `hands < 2`). Pair image is at most 768 px wide total (`maker.ts:255`). 35 requests a minute per provider (`pageIO.ts:217`). |
| 4 | Vote | `quality.ts:169-185` | A checker with less than half its questions answered has no vote; unanswered questions count as "nothing wrong". Green = at least 2 clean votes. | With 3 checkers, 2 clean + 1 faulty = green. |
| 5 | Retries | `maker.ts:234-282` | Up to 3 tries; the panel's findings are fed into the next prompt as "Make sure: ..."; after 3 the least-faulty try is kept as "unsure" with up to 3 options. | Fault count only (not severity). |
| 6 | Other pictures | `lib/validate.ts:53-61` (7 filename rules), `engines.mjs` (file type from the bytes), `selfCheck.ts` (settings health) | Names, extensions, settings. | No test of picture content at all for normal images (blank, black, tiny, duplicate, wrong aspect, unreadable text). `App.tsx:748-780` marks a picture "done" as soon as bytes arrive. |

### 4.2 Why it catches only about half (docs/puppet-recipe.md:108-115)

1. **Fails open.** A question the checker could not read (`readAnswer :66-75`: "yes ... no" in one reply, or neither) is skipped, and a checker needs only half its questions answered (`quality.ts:162`). A hedging checker therefore counts as "clean".
2. **Majority beats the one who saw the fault.** Three checkers, two clean = green (`pageIO.ts:265-275`); the third's objection is dropped. No fault is treated as a veto, even the hard ones (tongue out, wrong arm count, picture broken).
3. **Yes/no confirmation is easy to pass.** "Is the mouth this shape: ...?" (`quality.ts:41`) invites "yes". Nothing asks the checker to pick which of the 8 shapes it sees, which is far harder to fake.
4. **Too small, too local.** Checkers see a crop of the part plus 60% margin, at most 768 px for both halves together (`maker.ts:163-176,255`). Teeth, tongue and lip edges are a few pixels.
5. **Nothing compares parts with each other.** Eight mouths, five brows and the lids are never judged as a set: width, position on the face midline, lip colour, teeth style and thickness can all drift between parts. Nothing renders the animation.
6. **Nothing checks the rest of the picture moved.** `cutPart` ignores everything outside the band. If the engine shifted or tilted the head by a few pixels, the pasted part misaligns, yet the cut is "clean". There is no outside-the-box difference test.
7. **Clean-but-wrong cuts pass.** Only one of two eyes cut (its patch under 25% of the strongest), a mouth patch that also took chin or beard changes inside the 42-100% band, a lid part with no second eye - all pass the mechanical check (`pixels.ts:449`).
8. **No edge test.** Magenta fringe or holes in the keyed layer (`keyed`) are not measured; only the model is asked "visible seam".
9. **"Not checked" is green.** With no checker at all, `maker.ts:262` accepts the part and the card shows "done" with a green dot; only the small `why` text says "not checked".
10. **Keeps and sends flagged parts.** An "unsure" part goes into the rig (`maker.ts:284-290`), and "Send to Video Forge" is not gated (M11).
11. **No proof set in the repo.** `tests/quality.test.ts` uses stand-in checkers that answer "nothing wrong" for every fact they are not told about (`:13-19`); `tests/puppet.test.ts` has one species (owl, `tests/fixtures/puppet/`). The real scoring (Super VL 27/30, Step 5 26/30, Omni 24/30, HANDOFF line 583) was done off-repo (`%TEMP%\qc`) and is not repeatable.

### 4.3 Fixes, cheapest first

| Fix | Hours | Cost risk |
|---|---|---|
| Veto rule: any checker that answers a "hard" fault (tongue out, broken, wrong arm count, missing hand, hand over face) blocks green; unanswered critical question = "unsure", not clean. | 1 | More redraws (time), tune on the gold set. |
| "Not checked" is never green. Show amber "not checked" and block "send". | 0.5 | none |
| Ask "which of these 8 shapes is this?" for mouths and compare with the expected one. | 1.5 | same number of requests |
| Bigger crops: send the part region alone at 512 px per side for mouths/brows; keep the wide one for arms. | 1 | more tokens, free tiers |
| Pixel checks in the app (free, no model): (a) outside-the-box difference and shift (reject if the head moved more than 2 px), (b) key-colour fringe on `keyed`, (c) both eyes present in a lid patch, (d) mouth width and centre against the closed mouth and against the other 7. | 4 | none |
| Port the mouth ruler (`%TEMP%\qc\measure\ruler.py`, HANDOFF line 591) once it handles tongue vs lips. | 6+ | none |
| Gold set: put Ak's verdicts on Maria, Lucky, Blip, Grump (46 edits) in `tests/fixtures/qc/` and a `npm run qc:score` that prints precision and recall per checker and per rule. Required to tune any of the above. | 5 | none |
| Rank the review screen by risk (checker disagreement first) so a human sees the likely-bad ones first. | 1 | none |
| Stronger part engine: the 23 Oct test found Nano Banana 2.1 batch kept the character across all 46 edits with about 4 redos (puppet-recipe.md:108-115). Conflicts with "zero cost": about 46 x $0.034-0.067, half by batch. AVOID as default; RECOMMENDED only as the opt-in "keeper" engine behind the confirm in H1. | - | about $1.6-3.1 per puppet (calculation from the prices in `pageIO.ts:87-88`) |

## 5. Export to the Flow Chrome extension (owner request)

What the extension reads (`C:\Users\strav\Documents\flow`, `content.js:340-370, 405-413`; README "Per-row settings"):

| Column | Meaning | Rule |
|---|---|---|
| A (setting `promptColumn`, default A) | The prompt text. | Required; rows with an empty cell are skipped. |
| B | Per-prompt style suffix (empty = the global suffix). | Optional, if "Column B = suffix" is ticked (default on). |
| C | Aspect ratio, typed as "16:9". | Optional; added as "<value> aspect ratio" to the prompt (`content.js:411`). |
| Header | Row 1 is skipped if the prompt column's first cell matches `prompt`, `text`, `description` or `idea`, or is empty. | Use `prompt`. |
| Columns D and beyond | Ignored by the extension. | Safe place for our own columns. |

The extension loads a Google Sheet "published to the web as CSV" or an `/export?format=csv` link, types the text, and the user presses Generate. Saved files are named `flow_{index}_{slug}` from the row order and text (so keep the row order stable). It cannot attach a reference picture (it only types text; whether Flow accepts a reference picture some other way is unknown). So: export prompts that do not depend on one, or tell the user to attach the base face by hand.

Proposed export: columns `prompt, style, aspect_ratio, part_id, puppet, attempt, seed, engine, status, checker_note`. One row per part (current attempt) or one per attempt (checkbox).
- "Copy for Google Sheets": tab-separated text on the clipboard; paste into cell A1. Needs no login and no Google API (the same trick Prompt Factory uses in the other direction).
- "Download CSV": UTF-8, quoted per RFC 4180; Sheets: File, Import, Replace current sheet. Prefix a cell that starts with `= + - @` with an apostrophe.
- Writing straight into a Sheet from the app would need a Google OAuth client; not recommended now. Option for later: a webhook to the owner's n8n (minipc) with its Google Sheets node (key stays in n8n).
- Hours: 2.5 (builder, buttons, test against the extension's own parser rules). Needs the prompt stored per attempt (H7).

## 6. UI usability notes (item D, from code and docs)

Good: hover help is enforced by a test (`tests/hoverHelp.test.ts`, `scripts/hoverHelp.mjs`); Start is the front door (HANDOFF 14.1); paid dialog is plain (`PaidConfirm.tsx`).
Weak:
- Forge slang hides meaning: "struck", "forge lit", "awaiting the hammer" (`App.tsx:2137`), "New euro/2 delayed queue" (`:2156`, C1), "Collect delayed" (`:2147`), "Simulated Forge" as an engine name (`TopMenu.tsx:124`). A ten-year-old (HANDOFF's own test) would not know these cost money or what they do.
- Puppet statuses "unsure / missing / done" (`PuppetMaker.tsx:38-44`) do not say what the person should do.
- Hidden dead ends: "Check and fix" vanishes without checker accounts (`:1214`); the text says "two checkers" and "three rounds" but the code runs three and two (`:1215` vs `:718`, `pageIO.ts:265-275`).
- The puppet maker is one 1,399-line modal doing four jobs; the review needs 20-50 parts of scrolling, no filter, no keyboard.
- Engine names mix model jargon ("Z-Image Turbo (LocalAI)", "FLUX.2 klein 4B") with prices; a paid choice looks like any other in the dropdown (`PuppetMaker.tsx:1388-1394` shows "paid" text only).
- `SettingsSection` is kept in two places by hand (HANDOFF line 431) - a drift risk, not visible to the user.
- Components have almost no tests (HANDOFF line 416); the only review-screen test is none.

## 7. Stability notes (item B), beyond the findings above

| Topic | Finding | Evidence |
|---|---|---|
| Unhandled errors | Lanes are caught (`App.tsx:875-896`); Electron has no `uncaughtException` handler (grep) and one real throw path (L1). | `main.js:462` |
| Retries | All capped: OVH 3 attempts with a 31 s pacer (`engines.mjs:670-700`), puppet part 3 tries, fix 2 rounds, checker 4 waits (`pageIO.ts:249-258`), Gemini one pass per key. | listed |
| Timeouts | Every cloud call 120-240 s, local 900 s (`engines.mjs:947-958`). The Electron relays have none (L3). | |
| Crash resume | Rows stuck "generating" go back to pending at start (`App.tsx:175, 1272-1278`), saved every 350 ms plus a 2 s vault flush. Pictures themselves do not survive (H5). MCP: the row is regenerated after a crash (small double-spend window). | |
| Temp and leftover files | See L7. | |
| Windows paths, spaces, Greek | Build script quotes spaces (`build-exe.js`); `start-forge.bat` uses `%~dp0`. The folder picker uses the browser API (Unicode safe). MCP and link filenames must be lowercase ASCII (`mcp-server.js:301`, `link.mjs:41`) - Greek filenames are refused there. Puppet slugs break on non-Latin names (M9). | |
| Two shells | Electron is shipped; Tauri is not (M3). | |
| Concurrency in files | Atomic writes (tmp + rename) are used in workshop, shelf, vault, link, shared keys - good. The MCP CSV write is not atomic and not locked (H3). | `mcp-server.js:265-267` |

## 8. Quick wins under one hour (item G)

| # | What | File | Hours |
|---|---|---|---|
| 1 | Portal for the zoom popup (fixes the owner's scrolling complaint) | `PuppetMaker.tsx:1242` | 0.25 |
| 2 | Unknown price on a non-free engine = "costs" | `paidGuard.ts`, test | 0.75 |
| 3 | Vite `host: "127.0.0.1"` | `vite.config.js:8` | 0.1 |
| 4 | Host-header check on the local server | `main.js:~435` | 0.5 |
| 5 | `will-navigate` and window-open: parse URL, allow `http:`/`https:` only | `main.js:818-827` | 0.25 |
| 6 | Wrap `decodeURIComponent`; add the header check to `/cf-api` and `/nv-api` | `main.js:439-462` | 0.2 |
| 7 | Remove `@supabase/supabase-js`; `npm audit fix` for the SDK and zod; run tests | `package.json` | 0.5 |
| 8 | Handle the `options` event in the first build (reuse `onPartEvent`) | `PuppetMaker.tsx:357-383` | 0.5 |
| 9 | Gate "Send to Video Forge" on unsure/missing/unapproved | `PuppetMaker.tsx:1198` | 0.5 |
| 10 | Show the prompt on each card (store it in `PartReport`, print under the picture) | `maker.ts:238`, `PuppetMaker.tsx:1106` | 1 (borderline) |
| 11 | "Not checked" never shows green | `maker.ts:262-266` | 0.5 |
| 12 | Rename the batch button, add the paid warning to its tooltip (until C1 is fixed) | `App.tsx:2156` | 0.1 |
| 13 | Fix tooltips "two checkers / three rounds" | `PuppetMaker.tsx:726,1215` | 0.1 |
| 14 | Update HANDOFF test counts (728 / 40 files) | `HANDOFF.md:7,579` | 0.1 |
| 15 | `proxyLocal`: destroy upstream when the page hangs up | `main.js:407-431` | 0.5 |

## 9. Suggested order of work

1. Money first: C1, C2, H1, H2, H3 (about 9 h). Without these, "zero cost" is a promise, not a property.
2. Keys: H4 (cleaner + CSP), M1, M5, then H9 (about 5 h).
3. Lost work: H5 (2 h).
4. Owner's review complaints: quick wins 1, 8, 9, 10, 11, then H7 data model, then the workspace and contact sheet (about 22-27 h).
5. QC: gold set first (5 h), then veto rule and pixel checks (about 6 h).
6. Housekeeping: Tauri archive (M3), scale work (M10), update checksum (M7).

Deviation note: no deviations from the brief. Helpers: none used.
