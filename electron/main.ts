import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from "electron";
import path from "node:path";
import fsp from "node:fs/promises";
import * as keyStore from "./keyStore";
import { request } from "./net/http";
import { rememberNarration, twinNarration } from "./tts/twinNarration";
import { loadPronunciations, savePronunciations, type SayItLike } from "./tts/pronunciations";
import { recordMade } from "../tools/lib/forgeHub.mjs";
import { removePuppet, listPuppets, orderResult, placeOrder, shelfRoot } from "../tools/lib/forgeShelf.mjs";
import { fetchSheet, parseCsv, runMany, type ManyEvent, type ManyRequest } from "./batch/manyVideos";
import { resolveUserData, NEW_APP_NAME } from "./migrateUserData";
import { listPiperVoices, synthesizeWithPiper, shutdownAllPiperServers, setPiperStartGuard } from "./tts/piperEngine";
import { guard, addReadOnlyRoot, pythonAllowed } from "./security/guard";
import { OPEN_EXTENSIONS, isAppPage, safeExternalUrl, safeMediaId, safeMediaUrl } from "./security/pathGuard";
import { pathToFileURL } from "node:url";
import { haveFile } from "./net/partFile";
import { analyzeNarration } from "./audio/analyzeNarration";
import { listMusic } from "./audio/musicLibrary";
import * as elevenlabs from "./tts/elevenlabsEngine";
import { listMedia } from "./net/mediaLibrary";
import { draftScript } from "./llm/glmScenePlanner";
import { testProvider } from "./net/testProvider";
import { searchVideos, downloadTo, type MediaProvider } from "./net/mediaSearch";
import { ensureFont, SUBTITLE_FONTS } from "./net/fonts";
import { searchSounds } from "./net/soundSearch";
import { planBackgrounds, pickBackgrounds } from "./llm/backgroundPlanner";
import { renderVideo, type RenderJob } from "./render/renderVideo";
import { cacheStats, cleanUp, touch } from "./media/mediaCache";
import { installExitHandlers, killAllTracked, reapOrphansFromLastSession } from "./process/childTree";
import { abortAllWork, busyWith, closeQuestion, isBusy, startWork } from "./process/work";
import { buildNarration, estimatePaid, type NarrationInput } from "./tts/buildNarration";
import { describePaid, type PaidPolicy } from "./tts/paidVoice";
import { runBatchJob, type BatchJob } from "./batch/runJob";
import { makeSfxEleven } from "./audio/makeSfxEleven";
import { getSfxFreesound } from "./audio/getSfxFreesound";
import { addOutros } from "./render/addOutros";
import { loadActiveBrand } from "./brand";
import { registerExplainerIpc } from "./explainer/explainerIpc";
import { registerCharacterIpc } from "./characters/characterIpc";
import type { BrandInfo } from "../src/store/builtinCast";
import {
  buildBlocks,
  describeBuild,
  type BlockSpeaker,
} from "../src/lib/narration/buildBlocks";

// Pin the identity before anything asks where it lives.
//
// app.getPath("userData") is derived from app.getName(), and getName only
// finds "video-forge" when Electron was pointed at a directory holding a
// package.json. Launched as `electron out/main/main.js` — which is exactly how
// a headless job run starts — it falls back to "Electron", and every path in
// the app silently moves to %APPDATA%/Electron.
//
// That is not a cosmetic difference. It cost the first long render: the key
// vault, the saved settings and the renders folder all live under the real
// name, so a headless run wrote its narration somewhere nobody would look and
// then failed with "No NVIDIA API key saved" while the key sat safely in the
// other folder. Setting the name here makes the identity independent of how
// the process was started.
app.setName(NEW_APP_NAME);
// The app used to be called BYOK-Vid-Creator. A computer that already has that
// data folder keeps using it in place; fresh installs get "video-forge".
// See electron/migrateUserData.ts.
// VIDEOFORGE_USER_DATA: a separate data folder, for running a test copy while
// the real app is open (two copies sharing one folder lock each other out).
app.setPath("userData", process.env.VIDEOFORGE_USER_DATA || resolveUserData(app.getPath("appData")));

const isDev = !app.isPackaged;

const userDir = () => app.getPath("userData");
const outputDir = () => path.join(userDir(), "renders");

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: "#000000",
    show: false,
    autoHideMenuBar: true,
    title: "Video Forge",
    // The taskbar and title-bar icon. The installed .exe carries its own
    // (build/icon.png, via electron-builder); this covers the dev build too.
    icon: path.join(app.getAppPath(), "out", "renderer", "icon-256.png"),
    webPreferences: {
      // A CommonJS preload (electron.vite.config.ts): Electron only sandboxes
      // a window whose preload is not an ES module.
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // The window stays on the app's own page. Anything else — a dropped file, a
  // link, a redirect — is stopped, and a web link goes to the user's browser.
  const appPages = (isDev && process.env["ELECTRON_RENDERER_URL"])
    ? [process.env["ELECTRON_RENDERER_URL"]]
    : [pathToFileURL(path.join(__dirname, "../renderer/index.html")).toString()];
  const stayHome = (event: Electron.Event, url: string) => {
    if (isAppPage(url, appPages)) return;
    event.preventDefault();
    const web = safeExternalUrl(url);
    if (web) void shell.openExternal(web);
  };
  mainWindow.webContents.on("will-navigate", stayHome);
  mainWindow.webContents.on("will-redirect", stayHome);
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only web addresses ever reach the system: no file:, smb:, or app protocols.
    const web = safeExternalUrl(url);
    if (web) void shell.openExternal(web);
    return { action: "deny" };
  });
  // The page needs no camera, microphone, location or the like. Electron's
  // default is to say yes to everything; this says no, except copying text.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "clipboard-sanitized-write");
  });

  // Electron ships no right-click menu at all — without this, right-clicking a
  // key field does literally nothing, which makes pasting an API key feel
  // broken even though Ctrl+V works. Built from editFlags so the items are
  // greyed out honestly rather than always looking available.
  mainWindow.webContents.on("context-menu", (_event, params) => {
    const { editFlags, isEditable, selectionText } = params;
    const hasSelection = selectionText.trim().length > 0;
    if (!isEditable && !hasSelection) return;

    const template: Electron.MenuItemConstructorOptions[] = [];
    if (isEditable) {
      template.push({ role: "cut", enabled: editFlags.canCut });
    }
    template.push({ role: "copy", enabled: editFlags.canCopy });
    if (isEditable) {
      template.push(
        { role: "paste", enabled: editFlags.canPaste },
        { type: "separator" },
        { role: "selectAll", enabled: editFlags.canSelectAll }
      );
    }
    Menu.buildFromTemplate(template).popup({ window: mainWindow! });
  });

  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Closing the window while a video (or a batch) is being made would throw the
  // work away and, before this, leave the renderer running with nobody to
  // collect it. Ask first; if the answer is quit, stop what THIS app started.
  let asking = false;
  let leaving = false;
  mainWindow.on("close", (event) => {
    if (leaving || !isBusy()) return;
    event.preventDefault();
    if (asking) return;
    asking = true;
    const q = closeQuestion(busyWith());
    void dialog
      .showMessageBox(mainWindow!, {
        type: "warning",
        title: "Video Forge",
        message: q.message,
        detail: q.detail,
        buttons: ["Keep working", "Stop it and quit"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      })
      .then(async (r) => {
        asking = false;
        if (r.response !== 1) return;
        leaving = true;
        manyStop = true;
        abortAllWork();
        await killAllTracked(); // by process id: only what this app started
        mainWindow?.close();
      });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// `--project <file>` opens the app on a saved project instead of the autosave —
// so the look a batch job rendered with can be looked at in the app itself.
// Pulled by the window once it has loaded, rather than pushed, so there is no
// race between the message and the page being ready to hear it.
ipcMain.handle("project:startup", async () => {
  const i = process.argv.indexOf("--project");
  const file = i === -1 ? null : process.argv[i + 1];
  if (!file) return null;
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    return null;
  }
});


// ---------------------------------------------------------------------------
// Key vault IPC — all reads/writes go through electron/keyStore.ts, the
// single source of truth for encrypted key storage. Nothing in the renderer
// ever sees or persists a raw key outside this channel.
// ---------------------------------------------------------------------------

ipcMain.handle("keys:list", async () => {
  return keyStore.listKeys();
});

// There is deliberately no "keys:get": a key read by the window could be read
// by anything that ever ran inside it. Main reads keys itself, where they are used.

ipcMain.handle("keys:set", async (_e, provider: string, value: string) => {
  const result = await keyStore.setKey(provider, value);
  // A refusal (the key file could not be read) reaches the screen as a message.
  if (!result.ok) throw new Error(result.problem ?? "The key could not be saved.");
  return result.ok;
});

ipcMain.handle("keys:delete", async (_e, provider: string) => {
  const result = await keyStore.deleteKey(provider);
  if (!result.ok) throw new Error(result.problem ?? "The key could not be removed.");
  return result.ok;
});

ipcMain.handle("keys:encryptionAvailable", async () => {
  return keyStore.encryptionAvailable();
});

// Analyse an arbitrary audio file the user attached by hand. There are no
// speaker segments for it — nobody said who is talking — so every frame is
// marked "unknown speaker" and only the loudness envelope is real. That's
// enough to make the waveform react, which is what the user expects the moment
// they attach a file.
ipcMain.handle(
  "audio:analyzeFile",
  async (
    _e,
    filePath: string,
    segments?: { speakerId: string; startMs: number; endMs: number }[],
    speakerOrder?: string[]
  ) => {
    const buf = await fsp.readFile(guard().assertRead(filePath));
    return analyzeNarration(buf, segments ?? [], speakerOrder ?? []);
  }
);

// Runs in main rather than the renderer on purpose: the key never has to be
// handed back across the bridge just to be tested.
ipcMain.handle(
  "keys:test",
  async (_e, provider: string, opts?: { azureRegion?: string }) => {
    return testProvider(provider, opts ?? {});
  }
);

ipcMain.handle("dialog:openFile", async (_e, filters?: Electron.FileFilter[]) => {
  const res = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters,
  });
  if (res.canceled) return null;
  // A file you picked is a file the window may then read (electron/security).
  guard().grantRead(res.filePaths[0]);
  return res.filePaths[0];
});

ipcMain.handle("dialog:saveFile", async (_e, defaultName: string, filters?: Electron.FileFilter[]) => {
  const res = await dialog.showSaveDialog(mainWindow!, {
    // basename: the window names a file, not a folder to save into
    defaultPath: path.join(app.getPath("downloads"), path.basename(String(defaultName || "file"))),
    filters,
  });
  if (res.canceled || !res.filePath) return null;
  // The one place outside its own folder the window may write.
  guard().grantWrite(res.filePath);
  return res.filePath;
});

ipcMain.handle("storage:outputDir", async () => {
  await fsp.mkdir(outputDir(), { recursive: true });
  return outputDir();
});

/** The Forge switch: open Image Forge, Video Forge's sister app.
 *  Looked for where its installer puts it (per-user install). Returns false
 *  when it is not installed, so the UI can say so instead of doing nothing. */
async function openImageForge(): Promise<boolean> {
  const exe = path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Image Forge", "Image Forge.exe");
  try {
    await fsp.access(exe);
  } catch {
    return false;
  }
  const err = await shell.openPath(exe);
  return err === "";
}
ipcMain.handle("forge:openImageForge", openImageForge);

// Explainers (animated videos drawn by code): electron/explainer/explainerIpc.ts
registerExplainerIpc(() => mainWindow);
registerCharacterIpc(() => mainWindow);

/** The Forge shelf (tools/lib/forgeShelf.mjs): puppets Image Forge made, and
 *  orders for new ones. Image Forge notices an order within 20 seconds of
 *  opening — and is opened here so it does. */
ipcMain.handle("forge:shelfPuppets", async () => listPuppets(shelfRoot()));
ipcMain.handle(
  "forge:orderPuppet",
  async (_e, order: { name: string; description: string; style: string; framing: "head" | "waist" | "full"; auto: boolean }, pictures: string[] = []) => {
    const bufs: Buffer[] = [];
    for (const p of pictures.slice(0, 3)) {
      try {
        bufs.push(await fsp.readFile(guard().assertRead(p)));
      } catch {
        /* a picture that cannot be read is left out */
      }
    }
    const id = `order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const placed = placeOrder(shelfRoot(), { ...order, id, from: "Video Forge" }, bufs);
    if (!placed.ok) return { ok: false, problem: placed.problem };
    const opened = await openImageForge();
    return { ok: true, id, opened };
  }
);
ipcMain.handle("forge:orderResult", async (_e, id: string) => orderResult(shelfRoot(), id));
/** Off the shelf — moved to puppets-deleted/, not erased (forgeShelf.mjs). */
ipcMain.handle("forge:removePuppet", async (_e, slug: string) => removePuppet(shelfRoot(), String(slug)));

/** Many videos from one sheet (electron/batch/manyVideos.ts). One run at a
 *  time; progress goes to the window as "batch:event". */
let manyStop = false;
let manyRunning = false;
ipcMain.handle("batch:readSheet", async (_e, source: { url?: string; file?: string }) => {
  const text = source.file ? await fsp.readFile(guard().assertRead(source.file), "utf8") : await fetchSheet(source.url ?? "");
  return parseCsv(text);
});
ipcMain.handle("batch:runMany", async (e, req: ManyRequest) => {
  if (manyRunning) return { ok: false, problem: "A batch is already running." };
  manyRunning = true;
  manyStop = false;
  const manyAbort = new AbortController();
  const endWork = startWork("a batch of videos", manyAbort);
  const send = (ev: ManyEvent) => !e.sender.isDestroyed() && e.sender.send("batch:event", ev);
  void runMany(
    req,
    { projectRoot: app.getAppPath(), outputDir: outputDir(), fontsDir: fontsDir(), mediaDir: path.join(app.getPath("userData"), "media"), signal: manyAbort.signal },
    send,
    () => manyStop || manyAbort.signal.aborted
  ).finally(() => {
    manyRunning = false;
    endWork();
  });
  return { ok: true };
});
/** What a LocalAI on this computer (or on Tailscale) offers. Only those
 *  addresses: this is a settings check, not a way to call any server. */
ipcMain.handle("voice:pronunciations", async () => loadPronunciations());
ipcMain.handle("voice:savePronunciations", async (_e, list: SayItLike[]) => savePronunciations(Array.isArray(list) ? list : []));
ipcMain.handle("local:models", async (_e, base: string) => {
  const b = String(base || "").trim().replace(/\/+$/, "").replace(/\/v1$/, "");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\]|100\.\d+\.\d+\.\d+)(:\d+)?$/i.test(b)) {
    return { ok: false, problem: "Only an address on this computer (127.0.0.1) or on Tailscale (100.x.x.x)." };
  }
  try {
    const res = await request(`${b}/v1/models`, { method: "GET", timeoutMs: 8000 });
    if (res.status >= 400) return { ok: false, problem: `It answered ${res.status}.` };
    const ids = ((JSON.parse(res.body) as { data?: { id?: string }[] }).data ?? []).map((d) => d.id ?? "").filter(Boolean);
    return { ok: true, models: ids };
  } catch (e) {
    return { ok: false, problem: `Nothing answered at ${b}. Is LocalAI running?` };
  }
});
ipcMain.handle("batch:stopMany", async () => {
  manyStop = true;
  return true;
});

/** Downloaded background clips: how much room they take, and clearing them
 *  (electron/media/mediaCache.ts). `keep` = clips the open project uses. */
const mediaDir = () => path.join(app.getPath("userData"), "media");
ipcMain.handle("media:cacheStats", async () => cacheStats(mediaDir()));
ipcMain.handle("media:cleanUp", async (_e, limitBytes: number, keep: string[] = []) => cleanUp(mediaDir(), limitBytes, keep));

/** Open a finished video in the computer's own player. Only media files inside
 *  the app's output folder (a real folder check, not a text prefix), so a page
 *  can never ask to run something else. */
ipcMain.handle("storage:openPath", async (_e, p: string) => {
  const full = path.resolve(String(p));
  if (!OPEN_EXTENSIONS.has(path.extname(full).toLowerCase())) return false;
  if (!guard().isInside(outputDir(), full)) return false;
  return (await shell.openPath(full)) === "";
});

ipcMain.handle("storage:openOutputDir", async () => {
  await fsp.mkdir(outputDir(), { recursive: true });
  await shell.openPath(outputDir());
  return true;
});

/** Plan and pick in one call. They are separate functions because they fail
 *  for different reasons — no API key vs nothing found — but the UI only ever
 *  wants both, and splitting the round trip would just make the renderer hold
 *  a plan it cannot use. */
ipcMain.handle(
  "media:autoBackgrounds",
  async (
    _e,
    opts: {
      segments: { text: string; startMs: number; endMs: number; speakerLabel: string }[];
      languageName: string;
      portrait: boolean;
      topic?: string;
      minSceneMs?: number;
    }
  ) => {
    const plan = await planBackgrounds(opts);
    const chosen = await pickBackgrounds(plan, { portrait: opts.portrait });
    return { look: plan.look, scenes: chosen };
  }
);

ipcMain.handle(
  "media:searchVideos",
  // Shape-filtered (Ak, 12 Oct 2026): a vertical video is only offered
  // vertical clips, a wide one only wide ones — checked by size as well, since
  // not every library filters at the source.
  async (_e, query: string, providers?: MediaProvider[], orientation?: "portrait" | "landscape") => {
    const res = await searchVideos(query, { providers, orientation });
    if (!orientation) return res;
    return { ...res, hits: res.hits.filter((h) => (orientation === "portrait" ? h.height >= h.width : h.width >= h.height)) };
  }
);

/** Sound effects. CC0 only — the filter lives in searchSounds and is not a
 *  parameter, deliberately. Downloads reuse media:download below, since a clip
 *  and a bark want exactly the same caching. */
ipcMain.handle("sound:search", async (_e, query: string) => searchSounds(query));

/** Fetch a clip into the app's media folder and hand back its path.
 *
 *  Named by provider and id rather than by the query that found it, so the
 *  same clip picked twice reuses one file instead of accumulating copies. */
ipcMain.handle("media:download", async (_e, id: string, url: string) => {
  // The id becomes a file name and the address is fetched: both come from the
  // window, so neither is trusted (no "..\" in the name, https from the stock
  // libraries only).
  if (!safeMediaId(id)) throw new Error("That clip has an id this app will not use as a file name.");
  const safeUrl = safeMediaUrl(url);
  if (!safeUrl) throw new Error("Clips can only be downloaded over https from Pixabay, Pexels or Freesound.");
  url = safeUrl;
  const dir = path.join(app.getPath("userData"), "media");
  const ext = (url.split("?")[0].match(/\.(mp4|mov|webm|mp3|wav|ogg)$/i)?.[1] ?? "mp4").toLowerCase();
  const dest = path.join(dir, `${id}.${ext}`);
  // A whole file under its real name is one; a half-finished download never
  // has the real name (net/partFile.ts), and an empty file does not count.
  if (haveFile(dest)) return dest; // already have it
  await downloadTo(url, dest);
  return dest;
});

/**
 * The brand pack this computer has switched on, or null for none.
 *
 * The renderer cannot work this out for itself: it has no filesystem and no
 * notion of where the app was installed. It gets the pack's name, cast, sample
 * and puppet folder; everything else in the pack stays on this side.
 */
ipcMain.handle("brand:active", async (): Promise<BrandInfo | null> => {
  // app.getAppPath() is the repo root in dev and the app root when packaged;
  // brands/ sits beside package.json in both, provided it is listed in the
  // build's `files`. Puppet ART referenced from outside git is resolved
  // relative to each puppet.json, so it follows the same folder.
  const b = await loadActiveBrand(app.getAppPath());
  return b && { id: b.id, name: b.name, puppetDir: b.puppetDir, cast: b.cast, sample: b.sample };
});

// Subtitle fonts. The cache lives beside the media cache, under userData, so
// that clearing app data clears both and neither ends up in the install dir.
const fontsDir = () => path.join(app.getPath("userData"), "fonts");

ipcMain.handle("fonts:list", async () => SUBTITLE_FONTS);

ipcMain.handle("fonts:ensure", async (_e, family: string, weight: number) =>
  ensureFont(family, weight, fontsDir())
);

ipcMain.handle("storage:readFile", async (_e, filePath: string) => {
  const buf = await fsp.readFile(guard().assertRead(filePath));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});

ipcMain.handle("storage:writeFile", async (_e, filePath: string, data: ArrayBuffer) => {
  await fsp.writeFile(guard().assertWrite(filePath), Buffer.from(data));
  return true;
});

// ---------------------------------------------------------------------------
// DramaBox — the two files the GPU box reads.
//
// THIS IS THE STEP THAT WAS MISSING. Every voice knob in the Cast panel was
// saved onto the speaker and then read by nothing, because the only thing that
// built blocks.json was a command-line script reading a job file. The settings
// existed in the app and could not leave it.
//
// The work itself is in src/lib/narration/buildBlocks.ts, shared with that
// script, so the button and the command line cannot produce different files.
// ---------------------------------------------------------------------------

// The local media library: clips and sounds already on this machine. Both
// folders, because downloads land under userData and the sound effects that
// ship with the app live in the repo.
ipcMain.handle("media:library", async () => {
  return listMedia([
    path.join(app.getPath("userData"), "media"),
    path.join(app.getAppPath(), "sfx", "library"),
  ]);
});

// The voices on the ElevenLabs account, so the Cast panel can offer a list
// rather than asking someone to go and find an id and paste it.
ipcMain.handle("tts:listElevenVoices", async () => {
  return elevenlabs.listVoices();
});

// The music library — the loops that ship with the app, in music/.
ipcMain.handle("music:list", async () => {
  return listMusic(path.join(app.getAppPath(), "music"));
});

ipcMain.handle(
  "dramabox:writeBlocks",
  async (_e, scriptText: string, speakers: BlockSpeaker[], outDir: string) => {
    const result = buildBlocks(scriptText, speakers);
    if (result.errors.length) {
      return { ok: false as const, errors: result.errors, summary: [] as string[] };
    }
    // Only the app's own folder or the folder of a file you just chose to save.
    if (!guard().canWriteDir(outDir)) {
      return { ok: false as const, errors: ["Save into a folder you choose with the Save button."], summary: [] as string[] };
    }
    await fsp.mkdir(outDir, { recursive: true });
    await fsp.writeFile(
      path.join(outDir, "blocks.json"),
      JSON.stringify(result.blocks, null, 1),
      "utf8"
    );
    await fsp.writeFile(
      path.join(outDir, "align.json"),
      JSON.stringify(result.align, null, 1),
      "utf8"
    );
    return {
      ok: true as const,
      errors: [],
      count: result.blocks.length,
      summary: describeBuild(result),
    };
  }
);

// ---------------------------------------------------------------------------
// Render — Remotion. Progress is pushed back to the renderer on the
// "render:progress" channel rather than returned, since a render is long
// running and the UI needs to move while it happens.
// ---------------------------------------------------------------------------

/** The renders running now, so a Stop (or closing the window) can end them. */
const renderControllers = new Set<AbortController>();
ipcMain.handle("render:cancel", async () => {
  for (const c of renderControllers) c.abort();
  return renderControllers.size > 0;
});

ipcMain.handle("render:start", async (_e, job: RenderJob) => {
  const jobId = Date.now().toString(36);
  const controller = new AbortController();
  renderControllers.add(controller);
  const endWork = startWork("a video", controller);
  const send = (pct: number, note: string) => {
    // The window can be closed mid-render; dropping the update is correct.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("render:progress", { jobId, pct, note });
    }
  };

  // The clips this render uses count as "just used", so a clean-up keeps them.
  try {
    await touch((job.backgrounds ?? []).map((b) => b.filePath).filter((p): p is string => !!p));
    const result = await renderVideo(job, {
      projectRoot: app.getAppPath(),
      outputDir: outputDir(),
      fontsDir: fontsDir(),
      onProgress: send,
      signal: controller.signal,
    });
    // On the Forge hub's list of everything made (tools/lib/forgeHub.mjs) —
    // what the Social Forge will post from.
    try {
      const first = job.narrationSegments?.[0]?.text;
      recordMade(shelfRoot(), {
        app: "video-forge",
        kind: "video",
        file: result.outputPath,
        width: job.width,
        height: job.height,
        durationSec: result.durationSec,
        title: first ? first.replace(/\[[^\]]*\]/g, "").trim().slice(0, 80) : undefined,
        madeWith: "Video Forge",
        aiMade: true,
      });
    } catch {
      /* the list is a convenience; the video is made either way */
    }
    return { ok: true as const, jobId, ...result };
  } catch (err) {
    // A Stop is not a failure: say so, and keep the screen's wording calm.
    if (controller.signal.aborted) {
      send(0, "Stopped");
      return { ok: false as const, jobId, error: "Stopped — the half-made video was removed." };
    }
    const message = err instanceof Error ? err.message : String(err);
    send(0, `Render failed: ${message}`);
    return { ok: false as const, jobId, error: message };
  } finally {
    renderControllers.delete(controller);
    endWork();
  }
});

// ---------------------------------------------------------------------------
// TTS — Piper. Persistent per-voice HTTP servers, spawned lazily and kept
// warm. The only engine that synthesises inside this app: DramaBox runs on a
// rented GPU and Chatterbox was removed on 18 Aug 2026.
// ---------------------------------------------------------------------------

ipcMain.handle("tts:listPiperVoices", async (_e, voicesDir: string) => {
  if (!guard().canRead(voicesDir)) return [];
  return listPiperVoices(voicesDir);
});

ipcMain.handle("tts:synthesizePiper", async (_e, pythonPath: string, onnxPath: string, text: string) => {
  return synthesizeWithPiper(pythonPath, onnxPath, text);
});

// ---------------------------------------------------------------------------
// Narration generation — the actual Phase 2 goal: turn a resolved list of
// (speaker, text, voice) segments into ONE combined audio file, with each
// segment's timing preserved for later viseme/subtitle sync. Script parsing
// and speaker->voice resolution happen in the renderer (it's the one with
// the project state); this just executes synthesis + concatenation.
// ---------------------------------------------------------------------------

/** Paid voices: before a narration that buys ElevenLabs lines starts, say how
 *  many characters and about how much, and wait for a yes. The yes covers
 *  exactly that many characters (tts/paidVoice.ts). Lines already bought, or a
 *  narration already made, cost nothing and are not asked about. */
const ELEVEN_PRICE_FALLBACK = 0.3; // USD per 1,000 characters, until the user sets theirs
async function askBeforeBuying(
  segments: NarrationInput[],
  pauses: { sameMs: number; turnMs: number },
  pricePer1000?: number
): Promise<PaidPolicy> {
  const est = await estimatePaid(segments, pauses, outputDir());
  if (est.narrationCached || est.chars === 0) return { mode: "attended", approvedChars: 0 };
  const price = pricePer1000 && pricePer1000 > 0 ? pricePer1000 : ELEVEN_PRICE_FALLBACK;
  const opts: Electron.MessageBoxOptions = {
    type: "question",
    title: "Paid voice",
    message: "This narration uses your paid ElevenLabs voice.",
    detail: describePaid(est, price),
    buttons: ["Buy and make it", "Cancel"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  };
  const r = mainWindow && !mainWindow.isDestroyed() ? await dialog.showMessageBox(mainWindow, opts) : await dialog.showMessageBox(opts);
  if (r.response !== 0) throw new Error("Cancelled — nothing was bought.");
  return { mode: "attended", approvedChars: est.chars };
}

ipcMain.handle("tts:generateNarration", async (
  _e,
  segments: NarrationInput[],
  speakerOrder: string[] = [],
  pauses: { sameMs: number; turnMs: number } = { sameMs: 0, turnMs: 0 },
  paid?: { pricePer1000?: number }
) => {
  await rememberNarration({ segments, speakerOrder, pauses });
  const policy = await askBeforeBuying(segments, pauses, paid?.pricePer1000);
  const endWork = startWork("a narration");
  try {
    return await buildNarration(segments, speakerOrder, pauses, outputDir(), { paid: policy });
  } finally {
    endWork();
  }
});
/** The same script in the other language, same cast (tts/twinNarration.ts). */
ipcMain.handle("tts:twinNarration", async (_e, target: string, paid?: { pricePer1000?: number }) =>
  twinNarration(String(target), outputDir(), (segs, pauses) => askBeforeBuying(segs, pauses, paid?.pricePer1000))
);


// ---------------------------------------------------------------------------
// GLM-5.2 script draft assistant (NVIDIA NIM). Reads the key from the same
// encrypted vault as everything else — never touches the renderer.
// ---------------------------------------------------------------------------

ipcMain.handle(
  "llm:draftScript",
  async (
    _e,
    opts: { topic: string; speakerLabels: string[]; languageName: string; tone?: string }
  ) => {
    return draftScript(opts);
  }
);

// Cleanup used to live in a single will-quit handler, which covers the one exit
// where nothing has gone wrong. Crashes, force-quits and dev restarts left the
// spawned Python servers running — holding several GB of an 8 GB card, with no
// window to explain themselves. installExitHandlers covers every exit path.
installExitHandlers(async () => {
  shutdownAllPiperServers();
});

app.whenReady().then(async () => {
  // Before anything is started, take down anything a previous session left
  // behind. Checked against the recorded command line first, so a recycled
  // process id never gets someone else's program killed.
  const reaped = await reapOrphansFromLastSession();
  if (reaped > 0) {
    console.log(`Cleaned up ${reaped} engine process(es) left by a previous session.`);
  }

  // `--job <file>` renders one video and exits, with no window ever created.
  // Electron rather than plain node because everything underneath assumes it:
  // app.getPath for the output folders, and Chromium's network stack for every
  // outbound call — which on this machine is the difference between working
  // and "unable to verify the first certificate" (see the antivirus note).
  const jobArg = process.argv.indexOf("--job");
  if (jobArg !== -1 && process.argv[jobArg + 1]) {
    await runHeadless(process.argv[jobArg + 1]);
    return;
  }

  // `--sfx <wanted.csv>` makes a course's sound effects before anything is
  // rendered. Headless for the same reasons as --job: the key is in the vault.
  // `--add-outros` repairs finished lessons that rendered without their outro.
  if (process.argv.includes("--add-outros")) {
    // indexOf returns -1 when --only is absent, and argv[-1 + 1] is argv[0],
    // which is the path to electron itself. That matched no lesson, so every
    // video was skipped in silence: "done 0, skipped 0" on a run meant to
    // repair 68 files (20 Sep 2026).
    const onlyAt = process.argv.indexOf("--only");
    const only = onlyAt === -1 ? undefined : process.argv[onlyAt + 1];
    try {
      // The outro clips and the lessons belong to a brand pack, not the app.
      const brand = await loadActiveBrand(app.getAppPath());
      const lessonsSrc = brand?.addOutros?.lessonsSrc;
      const outrosDir = brand?.addOutros?.outrosDir;
      if (!lessonsSrc || !outrosDir) {
        throw new Error(
          "--add-outros needs a brand pack with `addOutros` set (outrosDir and lessonsSrc). " +
            "Switch one on with: npm run brand -- <name>"
        );
      }
      await addOutros({
        videosDir: path.join(outputDir(), "lessons"),
        lessonsSrc,
        outrosDir,
        apply: process.argv.includes("--apply"),
        only: only && !only.startsWith("--") ? only : undefined,
        fps: 24,
      });
      app.exit(0);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      app.exit(1);
    }
    return;
  }

  // `--sfx-free <wanted.csv>` gathers CC0 candidates from Freesound first —
  // free, and a real recording of a clicker beats a generated one.
  const freeArg = process.argv.indexOf("--sfx-free");
  if (freeArg !== -1 && process.argv[freeArg + 1]) {
    try {
      await getSfxFreesound(process.argv.slice(freeArg + 1));
      app.exit(0);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      app.exit(1);
    }
    return;
  }

  const sfxArg = process.argv.indexOf("--sfx");
  if (sfxArg !== -1 && process.argv[sfxArg + 1]) {
    try {
      await makeSfxEleven(process.argv.slice(sfxArg + 1));
      app.exit(0);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      app.exit(1);
    }
    return;
  }

  // From here on the app window is asking, so what it asks for is checked
  // (the headless runs above read the user's own job file and are not).
  setPiperStartGuard((python, onnx) => {
    if (!pythonAllowed(python)) {
      throw new Error("The voice server must be a Python program: use \"python\", or the python file inside your piper-venv folder.");
    }
    if (!guard().canRead(onnx)) throw new Error("That voice file is outside the folders this app reads from.");
  });
  // The active brand pack's puppet art may live outside the app folder.
  try {
    const brand = await loadActiveBrand(app.getAppPath());
    addReadOnlyRoot(brand?.dir);
    addReadOnlyRoot(brand?.puppetDir);
  } catch { /* no brand pack: nothing to add */ }
  // `--project <file>` came from the command line, i.e. from the user.
  const projArg = process.argv.indexOf("--project");
  if (projArg !== -1 && process.argv[projArg + 1]) guard().grantRead(process.argv[projArg + 1]);

  createWindow();
  // Give Image Forge the keys typed here before it existed (in the background).
  void keyStore.syncShared();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

async function runHeadless(jobPath: string): Promise<void> {
  const started = Date.now();
  let lastLine = "";
  try {
    const job = JSON.parse(await fsp.readFile(jobPath, "utf8")) as BatchJob;
    const result = await runBatchJob(job, {
      projectRoot: app.getAppPath(),
      outputDir: outputDir(),
      fontsDir: fontsDir(),
      mediaDir: path.join(app.getPath("userData"), "media"),
      // A progress bar nobody watches is noise in a log file. Only whole
      // percent changes are printed, and each carries the elapsed time —
      // which is the number this whole exercise exists to find out.
      onProgress: (pct, note) => {
        // Deduped on the whole line rather than the percentage: planning holds
        // at 14% for several minutes while its batches tick past, and dropping
        // those would leave the log looking hung during the slowest stage.
        const line = `[${String(pct).padStart(3)}%] ${note}`;
        if (line === lastLine) return;
        lastLine = line;
        const mins = ((Date.now() - started) / 60000).toFixed(1);
        console.log(`[${String(pct).padStart(3)}%] ${mins}m  ${note}`);
      },
    });

    if (result.unmatchedLines.length > 0) {
      console.warn(
        `\n${result.unmatchedLines.length} script line(s) matched no speaker and were skipped:`
      );
      for (const line of result.unmatchedLines.slice(0, 10)) console.warn(`  ${line}`);
    }

    // NAMED AFTER THE LESSON, in its own folder. A batch otherwise leaves a
    // pile of render-<timestamp>.mp4 files with nothing to say which is 101.3.
    if (job.outputName) {
      const lessonsDir = path.join(outputDir(), "lessons");
      await fsp.mkdir(lessonsDir, { recursive: true });
      const named = path.join(lessonsDir, `${job.outputName}.mp4`);
      await fsp.rm(named, { force: true });
      await fsp.rename(result.outputPath, named);
      result.outputPath = named;
    }

    console.log(`\nDone in ${((Date.now() - started) / 60000).toFixed(1)} minutes.`);
    console.log(`  video     ${result.outputPath}`);
    console.log(`  narration ${result.narrationPath}`);
    console.log(`  ${result.durationSec}s, ${result.frames} frames`);
    app.exit(0);
  } catch (err) {
    console.error(`\nJob failed after ${((Date.now() - started) / 60000).toFixed(1)} minutes:`);
    console.error(err instanceof Error ? err.stack ?? err.message : String(err));
    app.exit(1);
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
