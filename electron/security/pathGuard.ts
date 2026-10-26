// ---------------------------------------------------------------------------
// Which files the app window may ask main to touch.
//
// The window used to be trusted completely: it could ask main to read or write
// any file you can, or to start any program. Nothing in the window today is
// hostile, but "nothing today" is not a defence — one injection bug anywhere
// and the window's requests become the attacker's.
//
// THE RULE. A path is allowed when it is
//   * inside one of the app's own folders (its data folder, the app itself,
//     the Forge shelf, the active brand pack), or
//   * a file you picked yourself in an Open or Save dialog. Main remembers
//     those picks; the window cannot invent one.
//
// Picks for READING are remembered between sessions (a saved project points at
// music you chose last week), and cover the picked file's own folder so that a
// puppet file can find the pictures beside it. Picks for WRITING are remembered
// for this session only and cover just the file you named (plus files that
// share its name, such as video.srt next to video.mp4).
//
// No electron import on purpose: tools/lib/pathGuard.test.mjs runs this file.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** What the window may write. Nothing that can be double-clicked into a program. */
export const WRITE_EXTENSIONS = new Set([
  ".json", ".srt", ".vtt", ".txt", ".csv", ".md",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".mp4", ".webm", ".wav", ".mp3",
]);

/** What "open this file in your usual player" may open. */
export const OPEN_EXTENSIONS = new Set([".mp4", ".srt", ".vtt", ".gif", ".png", ".mp3", ".wav"]);

export interface GuardOptions {
  /** Folders the app itself owns — read AND write. Looked up fresh each time. */
  ownRoots: () => string[];
  /** Folders the app only reads from (the app's own files, the Forge shelf…). */
  readOnlyRoots: () => string[];
  /** Where remembered read picks are kept between sessions. Omit for none. */
  grantsFile?: string;
  /** Windows paths ignore case. Defaults to the platform; tests set it. */
  caseInsensitive?: boolean;
}

const MAX_GRANTS = 500;

export class PathGuard {
  private readGrants: string[] = [];
  private writeFiles = new Set<string>();
  private writeStems: { dir: string; stem: string }[] = [];
  private ci: boolean;
  private opts: GuardOptions;

  constructor(opts: GuardOptions) {
    this.opts = opts;
    this.ci = opts.caseInsensitive ?? process.platform === "win32";
    this.load();
  }

  // ---- normal form --------------------------------------------------------
  private norm(p: string): string {
    let r = path.resolve(p);
    if (r.length > 3 && (r.endsWith("\\") || r.endsWith("/"))) r = r.slice(0, -1);
    return this.ci ? r.toLowerCase() : r;
  }

  /** True when `p` is `root` or sits somewhere under it (a separator-aware
   *  check — "renders-old" is not inside "renders"). */
  isInside(root: string, p: string): boolean {
    const rel = path.relative(this.norm(root), this.norm(p));
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  }

  /** The path with links followed, so a junction inside an allowed folder
   *  cannot lead out of it. For a file that does not exist yet, its folder. */
  private real(p: string): string {
    const full = path.resolve(p);
    try {
      return fs.realpathSync.native(full);
    } catch {
      try {
        return path.join(fs.realpathSync.native(path.dirname(full)), path.basename(full));
      } catch {
        return full;
      }
    }
  }

  private under(roots: string[], p: string): boolean {
    const real = this.real(p);
    return roots.some((r) => !!r && this.isInside(r, p) && this.isInside(this.real(r), real));
  }

  private static clean(p: unknown): string | null {
    if (typeof p !== "string" || !p || p.includes("\0")) return null;
    return p;
  }

  // ---- asking -------------------------------------------------------------
  canRead(p: unknown): boolean {
    const f = PathGuard.clean(p);
    if (!f) return false;
    if (this.under([...this.opts.ownRoots(), ...this.opts.readOnlyRoots()], f)) return true;
    return this.readGrants.some((g) => this.isInside(g, f) && this.isInside(this.real(g), this.real(f)));
  }

  canWrite(p: unknown): boolean {
    const f = PathGuard.clean(p);
    if (!f) return false;
    if (!WRITE_EXTENSIONS.has(path.extname(f).toLowerCase())) return false;
    if (this.under(this.opts.ownRoots(), f)) return true;
    const n = this.norm(f);
    if (this.writeFiles.has(n)) return true;
    const dir = this.norm(path.dirname(f));
    const base = path.basename(n);
    return this.writeStems.some((s) => s.dir === dir && base.startsWith(s.stem));
  }

  /** A folder the window may write into (own folders, or the folder of a file
   *  you chose to save). */
  canWriteDir(d: unknown): boolean {
    const f = PathGuard.clean(d);
    if (!f) return false;
    if (this.under(this.opts.ownRoots(), f)) return true;
    const n = this.norm(f);
    return this.writeStems.some((s) => s.dir === n);
  }

  /** Throws a plain-words error unless the path may be read. Returns it. */
  assertRead(p: unknown): string {
    if (!this.canRead(p)) throw new Error(`Video Forge only opens files you picked or its own files — "${String(p)}" is neither. Pick it again with the Open button.`);
    return path.resolve(p as string);
  }

  assertWrite(p: unknown): string {
    if (!this.canWrite(p)) throw new Error(`Video Forge only saves where you chose with Save, or in its own folder — "${String(p)}" is neither.`);
    return path.resolve(p as string);
  }

  // ---- granting (only main calls these, after a dialog) -------------------
  /** A drive root or your home folder is too wide to hand over wholesale. */
  private tooBroad(dir: string): boolean {
    const resolved = path.resolve(dir);
    if (path.parse(resolved).root === resolved) return true;
    // the home folder itself, or anything above it
    return this.isInside(resolved, os.homedir());
  }

  /** The user picked this file to open: it, and its folder, may be read. */
  grantRead(file: string): void {
    const f = PathGuard.clean(file);
    if (!f) return;
    const dir = path.dirname(path.resolve(f));
    const entry = this.tooBroad(dir) ? path.resolve(f) : dir;
    const n = this.norm(entry);
    this.readGrants = this.readGrants.filter((g) => this.norm(g) !== n);
    this.readGrants.push(entry);
    if (this.readGrants.length > MAX_GRANTS) this.readGrants = this.readGrants.slice(-MAX_GRANTS);
    this.save();
  }

  /** The user chose this file to save: it, and same-named siblings, may be written. */
  grantWrite(file: string): void {
    const f = PathGuard.clean(file);
    if (!f) return;
    this.writeFiles.add(this.norm(f));
    const ext = path.extname(f);
    const stem = path.basename(this.norm(f), this.ci ? ext.toLowerCase() : ext);
    this.writeStems.push({ dir: this.norm(path.dirname(f)), stem });
  }

  // ---- remembering --------------------------------------------------------
  private load(): void {
    if (!this.opts.grantsFile) return;
    try {
      const j = JSON.parse(fs.readFileSync(this.opts.grantsFile, "utf8"));
      if (Array.isArray(j?.read)) this.readGrants = j.read.filter((x: unknown) => typeof x === "string" && x).slice(-MAX_GRANTS);
    } catch {
      /* no file yet, or unreadable — start with none */
    }
  }

  private save(): void {
    if (!this.opts.grantsFile) return;
    try {
      fs.mkdirSync(path.dirname(this.opts.grantsFile), { recursive: true });
      const tmp = `${this.opts.grantsFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ version: 1, read: this.readGrants }, null, 1));
      fs.renameSync(tmp, this.opts.grantsFile);
    } catch {
      /* the pick still works for this session */
    }
  }
}

// ---- small checks that need no state ---------------------------------------

/** A clip's id becomes a file name, so it may be letters, digits, dot, dash,
 *  underscore — and not start with a dot ("..", ".hidden"). */
export function safeMediaId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/.test(id) && !id.includes("..");
}

/** Clip downloads come from the three stock libraries and nowhere else. */
const MEDIA_HOSTS = ["pixabay.com", "pexels.com", "vimeo.com", "freesound.org"];

export function safeMediaUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  return MEDIA_HOSTS.some((h) => host === h || host.endsWith("." + h)) ? u.toString() : null;
}

/** Only a real Python interpreter may be started as the Piper voice server. */
export function looksLikePython(file: unknown): boolean {
  if (typeof file !== "string") return false;
  return /^python(\d+(\.\d+)*)?(\.exe)?$/i.test(path.basename(file));
}

/** Only web addresses are ever handed to the system browser. */
export function safeExternalUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** True when the window may navigate to `url` inside itself: the app's own
 *  page (a file: page of the build, or the dev server) and nothing else. */
export function isAppPage(url: string, appUrls: string[]): boolean {
  try {
    const u = new URL(url);
    return appUrls.some((a) => {
      const b = new URL(a);
      if (u.protocol === "file:" || b.protocol === "file:") return u.protocol === b.protocol && decodeURIComponent(u.pathname).toLowerCase() === decodeURIComponent(b.pathname).toLowerCase();
      return u.origin === b.origin;
    });
  } catch {
    return false;
  }
}
