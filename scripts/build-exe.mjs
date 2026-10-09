#!/usr/bin/env node
/**
 * One-command Windows packaging — the same shape as Image Forge's.
 *
 *   npm run build-exe
 *
 * 1. builds the app                       → out/
 * 2. packages it with electron-builder    → release/
 *      · "Video Forge Setup x.y.z.exe"   installer: pick a folder, desktop
 *                                              and Start menu shortcuts, a real
 *                                              uninstaller in Settings → Apps
 *      · "video-forge-portable.exe"      one file, runs without installing
 *
 * WHY THE APP IS NOT PACKED INTO AN ASAR ARCHIVE, which is electron-builder's
 * default and makes the install smaller. Rendering works by handing
 * remotion/index.ts to webpack at render time, and webpack reads real files
 * from a real folder: the composition's sources, the src/ files it imports and
 * node_modules. Inside an archive those paths do not exist and every render
 * would fail on its first step. A larger install that renders beats a smaller
 * one that cannot.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const step = (msg) => console.log(`\n▸ ${msg}`);
const ok = (msg) => console.log(`✓ ${msg}`);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

// shell:true parses the command through cmd, so a path containing a space
// ("C:\...\CLAUDE SPACE\...") has to be quoted or it splits in two.
const quoted = (p) => (/\s/.test(p) ? `"${p}"` : p);
const bin = (name) =>
  path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);

function run(name, args, what) {
  const exe = bin(name);
  if (!fs.existsSync(exe)) fail(`${name} is not installed — run "npm install" once, then try again`);
  const r = spawnSync(quoted(exe), args, { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) fail(`${what} failed — scroll up for the real error`);
}

step("building the app");
run("electron-vite", ["build"], "the build");
ok("built into out/");

if (!fs.existsSync(path.join(ROOT, "build", "icon.png"))) {
  console.log("  (no build/icon.png — the installer will use Electron's default icon)");
}

step("packaging the installer (the slow part — the first run downloads ~150 MB)");
run("electron-builder", ["--win", "nsis", "portable", "--x64"], "packaging");
ok("done — look in release/");
