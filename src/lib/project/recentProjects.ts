// The "Recent projects" list: the last few project files saved or opened.
// Pure list logic; src/store/useRecentStore.ts keeps it between sessions.

export interface RecentProject {
  path: string;
  name: string;
  /** ms since 1970 */
  openedAt: number;
}

export const RECENT_MAX = 10;

const sameFile = (a: string, b: string) => a.replace(/\\/g, "/").toLowerCase() === b.replace(/\\/g, "/").toLowerCase();

export function nameOf(path: string): string {
  const base = path.split(/[\\/]/).pop() || path;
  return base.replace(/\.byokproj\.json$/i, "").replace(/\.json$/i, "") || base;
}

/** Put a file at the top; the same file is never listed twice. */
export function addRecent(list: RecentProject[], path: string, now: number, max = RECENT_MAX): RecentProject[] {
  const rest = list.filter((r) => !sameFile(r.path, path));
  return [{ path, name: nameOf(path), openedAt: now }, ...rest].slice(0, max);
}

export function removeRecent(list: RecentProject[], path: string): RecentProject[] {
  return list.filter((r) => !sameFile(r.path, path));
}

/** Keep only well-formed entries (the list comes from disk). */
export function cleanRecent(raw: unknown, max = RECENT_MAX): RecentProject[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentProject[] = [];
  for (const r of raw) {
    if (r && typeof r.path === "string" && r.path && typeof r.openedAt === "number") {
      out.push({ path: r.path, name: typeof r.name === "string" && r.name ? r.name : nameOf(r.path), openedAt: r.openedAt });
    }
  }
  return out.slice(0, max);
}

export function ago(then: number, now: number): string {
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m <= 1 ? "a minute ago" : `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "an hour ago" : `${h} hours ago`;
  const d = Math.round(h / 24);
  if (d < 14) return d === 1 ? "yesterday" : `${d} days ago`;
  const w = Math.round(d / 7);
  if (d < 60) return `${w} weeks ago`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `${mo} months ago` : "over a year ago";
}
