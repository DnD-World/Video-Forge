// Run: npm test   (needs Node 22.18+, which strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { startWork, busyWith, isBusy, abortAllWork, closeQuestion } from "../../electron/process/work.ts";

test("nothing running means the window can just close", () => {
  assert.equal(isBusy(), false);
  assert.deepEqual(busyWith(), []);
});

test("a registered job makes the app busy until it ends", () => {
  const end = startWork("a video", new AbortController());
  assert.equal(isBusy(), true);
  assert.deepEqual(busyWith(), ["a video"]);
  end();
  assert.equal(isBusy(), false);
  end(); // ending twice is harmless
  assert.equal(isBusy(), false);
});

test("closing anyway aborts every stoppable job, and only those", () => {
  const a = new AbortController();
  const b = new AbortController();
  const endA = startWork("a video", a);
  const endB = startWork("a batch of videos", b);
  const endC = startWork("a narration"); // cannot be interrupted
  assert.equal(abortAllWork(), 2);
  assert.equal(a.signal.aborted, true);
  assert.equal(b.signal.aborted, true);
  assert.equal(isBusy(), true, "aborting asks; the job ends itself");
  endA();
  endB();
  endC();
  assert.equal(isBusy(), false);
});

test("the question names what is running, once each", () => {
  const q = closeQuestion(["a video", "a video", "a batch of videos"]);
  assert.match(q.message, /Still making a video and a batch of videos\./);
  assert.match(q.detail, /stopped and thrown away/);
  assert.match(q.detail, /Paid voice lines already made are kept/);
});

test("renders are stoppable and the window asks before closing on one", () => {
  const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  const main = read("electron/main.ts");
  assert.match(main, /startWork\("a video", controller\)/);
  assert.match(main, /startWork\("a batch of videos", manyAbort\)/);
  assert.match(main, /mainWindow\.on\("close"/);
  assert.match(main, /ipcMain\.handle\("render:cancel"/);
  // stopping goes by process id through the tracked list, never by name
  assert.match(main, /killAllTracked\(\)/);
  const hf = read("electron/render/hyperframes/renderHyperframes.ts");
  assert.match(hf, /spawnTracked\(cmd/);
  assert.match(hf, /killTree\(p\.pid\)/);
  assert.ok(!/taskkill|Stop-Process/i.test(hf + main.replace(/\/\/.*$/gm, "")), "no kill by name");
  // the screen has a Stop that calls it
  assert.match(read("src/components/render/RenderBar.tsx"), /render\.cancel\(\)/);
});
