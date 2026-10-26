// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PathGuard, safeMediaId, safeMediaUrl, looksLikePython, safeExternalUrl, isAppPage } from "../../electron/security/pathGuard.ts";

function world() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "vf-guard-"));
  const own = path.join(base, "userData");
  const app = path.join(base, "app");
  const picked = path.join(base, "elsewhere");
  const secret = path.join(base, "secrets");
  for (const d of [own, app, picked, secret]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(secret, "keys.txt"), "x");
  fs.writeFileSync(path.join(picked, "song.mp3"), "x");
  fs.writeFileSync(path.join(picked, "cover.png"), "x");
  fs.writeFileSync(path.join(app, "music.wav"), "x");
  const grantsFile = path.join(own, "grants.json");
  const make = () => new PathGuard({ ownRoots: () => [own], readOnlyRoots: () => [app], grantsFile });
  return { base, own, app, picked, secret, grantsFile, make };
}

test("the app's own folders may be read; a folder it does not own may not", () => {
  const w = world();
  const g = w.make();
  assert.ok(g.canRead(path.join(w.own, "media", "a.mp4")));
  assert.ok(g.canRead(path.join(w.app, "music.wav")));
  assert.ok(!g.canRead(path.join(w.secret, "keys.txt")));
  assert.ok(!g.canRead(path.join(w.own, "..", "secrets", "keys.txt")), "a .. walk out is refused");
  assert.ok(!g.canRead(""));
  assert.ok(!g.canRead(null));
  assert.ok(!g.canRead(path.join(w.own, "a\0.mp4")));
});

test("a folder whose name merely starts like an allowed one is not inside it", () => {
  const w = world();
  const g = w.make();
  assert.ok(!g.canRead(w.own + "-old" + path.sep + "x.mp4"));
  assert.ok(!g.canWrite(w.own + "-old" + path.sep + "x.json"));
});

test("a file picked in an Open dialog can be read, and so can its neighbours, and it survives a restart", () => {
  const w = world();
  const g = w.make();
  assert.ok(!g.canRead(path.join(w.picked, "song.mp3")));
  g.grantRead(path.join(w.picked, "song.mp3"));
  assert.ok(g.canRead(path.join(w.picked, "song.mp3")));
  assert.ok(g.canRead(path.join(w.picked, "cover.png")), "the picked file's folder is readable");
  assert.ok(!g.canRead(path.join(w.secret, "keys.txt")));
  // a new guard (a new session) remembers the pick
  const again = w.make();
  assert.ok(again.canRead(path.join(w.picked, "song.mp3")));
});

test("picking a file straight in a drive root grants only that file", () => {
  const w = world();
  const g = w.make();
  const root = path.parse(w.base).root;
  g.grantRead(path.join(root, "clip.mp4"));
  assert.ok(g.canRead(path.join(root, "clip.mp4")));
  assert.ok(!g.canRead(path.join(root, "other.mp4")));
});

test("writing: own folder yes (safe types only), elsewhere only what a Save dialog chose", () => {
  const w = world();
  const g = w.make();
  assert.ok(g.canWrite(path.join(w.own, "renders", "v.mp4")));
  assert.ok(!g.canWrite(path.join(w.own, "renders", "run.bat")), "never a program");
  assert.ok(!g.canWrite(path.join(w.own, "renders", "run.exe")));
  assert.ok(!g.canWrite(path.join(w.picked, "v.mp4")));
  g.grantWrite(path.join(w.picked, "v.mp4"));
  assert.ok(g.canWrite(path.join(w.picked, "v.mp4")));
  assert.ok(g.canWrite(path.join(w.picked, "v.srt")), "files sharing the saved name are fine");
  assert.ok(g.canWrite(path.join(w.picked, "v-clip.mp4")));
  assert.ok(!g.canWrite(path.join(w.picked, "other.mp4")));
  assert.ok(!g.canWrite(path.join(w.picked, "v.bat")));
  assert.ok(!g.canWrite(path.join(w.app, "x.json")), "read-only roots stay read-only");
});

test("write grants are for this session only", () => {
  const w = world();
  const g = w.make();
  g.grantWrite(path.join(w.picked, "v.mp4"));
  assert.ok(!w.make().canWrite(path.join(w.picked, "v.mp4")));
});

test("canWriteDir: own folder, or the folder of a saved file", () => {
  const w = world();
  const g = w.make();
  assert.ok(g.canWriteDir(path.join(w.own, "x")));
  assert.ok(!g.canWriteDir(w.picked));
  g.grantWrite(path.join(w.picked, "blocks.json"));
  assert.ok(g.canWriteDir(w.picked));
  assert.ok(!g.canWriteDir(w.secret));
});

test("assertRead / assertWrite say what to do in plain words", () => {
  const w = world();
  const g = w.make();
  assert.throws(() => g.assertRead(path.join(w.secret, "keys.txt")), /only opens files you picked/);
  assert.throws(() => g.assertWrite(path.join(w.secret, "x.json")), /only saves where you chose/);
  assert.equal(g.assertRead(path.join(w.own, "a.mp4")), path.join(w.own, "a.mp4"));
});

test("a link inside an allowed folder cannot lead out of it", (t) => {
  const w = world();
  const g = w.make();
  const link = path.join(w.own, "sneaky");
  try {
    fs.symlinkSync(w.secret, link, "junction");
  } catch {
    t.skip("cannot make a link here");
    return;
  }
  assert.ok(!g.canRead(path.join(link, "keys.txt")));
});

test("clip ids can only be plain file names", () => {
  for (const ok of ["pexels-12345", "pixabay_9.1", "a-b_c.d"]) assert.ok(safeMediaId(ok), ok);
  for (const bad of ["..\\evil", "../evil", "a/b", "a\\b", "..", ".hidden", "", "a b", "x".repeat(200), 5, null]) assert.ok(!safeMediaId(bad), String(bad));
});

test("clip downloads: https from the stock libraries only", () => {
  assert.ok(safeMediaUrl("https://cdn.pixabay.com/video/2020/a.mp4"));
  assert.ok(safeMediaUrl("https://videos.pexels.com/video-files/1/a.mp4"));
  assert.ok(safeMediaUrl("https://cdn.freesound.org/previews/1/2.mp3"));
  assert.equal(safeMediaUrl("http://cdn.pixabay.com/a.mp4"), null);
  assert.equal(safeMediaUrl("file:///C:/Windows/system.ini"), null);
  assert.equal(safeMediaUrl("https://evil.example.com/a.mp4"), null);
  assert.equal(safeMediaUrl("https://pixabay.com.evil.example/a.mp4"), null);
  assert.equal(safeMediaUrl("https://user:pw@cdn.pixabay.com/a.mp4"), null);
  assert.equal(safeMediaUrl("not a url"), null);
});

test("only a Python interpreter may be started as the voice server", () => {
  for (const ok of ["python.exe", "C:\\v\\Scripts\\python.exe", "/usr/bin/python3", "python3.11", "Python.EXE"]) assert.ok(looksLikePython(ok), ok);
  for (const bad of ["cmd.exe", "powershell.exe", "C:\\x\\evil.bat", "python.bat", "pythonw-evil.exe", "", null]) assert.ok(!looksLikePython(bad), String(bad));
});

test("only web addresses go to the system browser", () => {
  assert.ok(safeExternalUrl("https://example.com/a?b=1"));
  assert.ok(safeExternalUrl("http://example.com"));
  for (const bad of ["file:///C:/x.exe", "smb://host/share", "javascript:alert(1)", "ms-msdt:/id", "calc.exe", "", null]) assert.equal(safeExternalUrl(bad), null, String(bad));
});

test("the window may stay on the app's own page and nowhere else", () => {
  const app = ["file:///C:/app/out/renderer/index.html", "http://localhost:5173/"];
  assert.ok(isAppPage("file:///C:/app/out/renderer/index.html", app));
  assert.ok(isAppPage("file:///C:/app/out/renderer/index.html#/x", app));
  assert.ok(isAppPage("http://localhost:5173/some/path", app));
  assert.ok(!isAppPage("file:///C:/Users/me/evil.html", app));
  assert.ok(!isAppPage("https://example.com/", app));
  assert.ok(!isAppPage("http://localhost:9999/", app));
  assert.ok(!isAppPage("garbage", app));
});
