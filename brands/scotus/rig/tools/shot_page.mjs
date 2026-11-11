// Full-page screenshot of a local page + console errors. node shot_page.mjs page.html out.png [width]
import path from "node:path"; import { createRequire } from "node:module"; import fs from "node:fs";
const require_ = createRequire(path.resolve("package.json")); const puppeteer = require_("puppeteer-core");
const exe = path.resolve("node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const [pg, out, w = "1280"] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: exe, args: ["--allow-file-access-from-files"] });
const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 });
const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text())); p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("file:///" + path.resolve(pg).split(path.sep).join("/"), { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 5000));
const frames = p.frames().length;
await p.screenshot({ path: out, fullPage: true });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log("frames", frames, "scrollWidth", sw, "errors", errs.length ? errs : "none");
await b.close();
