// ---------------------------------------------------------------------------
// Text exports that need no browser: captions (SRT / VTT) from word times and
// a YouTube chapter list from the scenes. Shared by the tools and the app.
// ---------------------------------------------------------------------------

export const stamp = (sec, sep) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(r).padStart(3, "0")}`;
};

/**
 * Caption cues from word times: lines of up to 42 characters and 3.5 s,
 * broken after sentence ends. words = [{ text, start, end }].
 */
export function captionCues(words, { maxChars = 42, maxSec = 3.5 } = {}) {
  const cues = [];
  let cur = null;
  for (const w of words ?? []) {
    const text = String(w.text).trim();
    if (!text) continue;
    if (cur && ((cur.text + " " + text).length > maxChars || w.end - cur.start > maxSec)) { cues.push(cur); cur = null; }
    if (!cur) cur = { start: w.start, end: w.end, text };
    else { cur.text += " " + text; cur.end = w.end; }
    if (/[.!?;:]$/.test(text)) { cues.push(cur); cur = null; }
  }
  if (cur) cues.push(cur);
  return cues;
}

export const toSrt = (cues) => cues.map((c, i) => `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`).join("\n");
export const toVtt = (cues) => "WEBVTT\n\n" + cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}\n`).join("\n");

/**
 * YouTube chapter lines from the scenes ("00:00 Title"). YouTube needs the
 * first at 00:00, at least three, each at least 10 s long — shorter scenes are
 * merged into the one before. Returns "" when there are not enough.
 */
export function chapters(spec, resolved) {
  const name = (s) => s.title ?? s.text ?? s.label ?? (s.kind === "compare" ? `${s.left?.title} vs ${s.right?.title}` : s.kind);
  const rows = [];
  for (const s of resolved.scenes) {
    const t = Math.floor(s.start);
    if (rows.length && t - rows[rows.length - 1].t < 10) continue;
    rows.push({ t, label: String(name(s)).slice(0, 60) });
  }
  if (rows.length < 3) return "";
  rows[0].t = 0;
  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  return rows.map((r) => `${mmss(r.t)} ${r.label}`).join("\n");
}

