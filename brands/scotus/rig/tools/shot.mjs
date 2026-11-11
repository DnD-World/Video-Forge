// Screenshot a rig page in test mode. node shot.mjs rig.html out.png [query]
// query e.g. "v=AA&k=0" (viseme, blink). Uses the headless Chrome Remotion ships.
import fs from "node:fs"; import path from "node:path"; import os from "node:os";
import { createRequire } from "node:module";
const require_ = createRequire(path.resolve("package.json"));
const puppeteer = require_("puppeteer-core");
function chrome() {
  const roots = [path.resolve("node_modules/.remotion/chrome-headless-shell"), path.join(os.homedir(), ".cache/puppeteer/chrome-headless-shell")];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const stack = [r];
    while (stack.length) { const d = stack.pop(); for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name); if (f.isDirectory()) stack.push(p); else if (f.name === "chrome-headless-shell.exe") return p; } }
  }
  throw new Error("no headless chrome");
}
const [page_, out, q = ""] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: chrome(), args: ["--allow-file-access-from-files"] });
const shots = q.split("|");
try {
  const p = await b.newPage(); await p.setViewport({ width: 896, height: 1200 });
  for (let i = 0; i < shots.length; i++) {
    await p.goto("file:///" + path.resolve(page_).split(path.sep).join("/") + "?still=1&freeze=1&" + shots[i]);
    await new Promise((r) => setTimeout(r, 600));
    const el = await p.$("#stage");
    const o = shots.length > 1 ? out.replace(/\.png$/, `-${i}.png`) : out;
    await el.screenshot({ path: o }); console.log(o);
  }
} finally { await b.close(); }
