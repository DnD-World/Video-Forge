// ---------------------------------------------------------------------------
// Text that fits, and a record of everything drawn.
//
// THE RECORD is how the checking page knows a frame is right without asking a
// model to look: every piece of text and every card a style draws is logged
// with its box, its role (headline / label / number), its size and its
// colours. The checks then measure: is it big enough to read on a phone, is
// it inside the frame, does it stay out of the puppet spots, is the contrast
// high enough.
// ---------------------------------------------------------------------------

/** Per-frame draw log. The stage clears it before each frame. */
export const drawLog = { items: [], on: true };

export function logBox(entry) {
  if (drawLog.on) drawLog.items.push(entry);
}

export const font = (weight, px, family) => `${weight} ${Math.round(px)}px ${family}`;

/** Split text into lines no wider than maxW at the context's current font. */
export function wrap(c, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (line && c.measureText(next).width > maxW) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Largest size from `max` down to `min` at which `text` fits in maxW × maxH
 * within `maxLines` lines. Returns { size, lines, lineH, width, fits }.
 * If nothing fits even at `min`, returns the `min` layout with fits: false —
 * the checking page reports it, rather than the text shrinking out of sight.
 */
export function fit(c, text, { weight, family, max, min, maxW, maxH, maxLines = 3, leading = 1.18 }) {
  let size = Math.max(max, min);
  for (;;) {
    c.font = font(weight, size, family);
    const lines = wrap(c, text, maxW);
    const lineH = size * leading;
    const width = Math.max(...lines.map((l) => c.measureText(l).width));
    const fits = lines.length <= maxLines && lines.length * lineH <= maxH && width <= maxW;
    if (fits || size <= min) return { size, lines, lineH, width, fits };
    size = Math.max(min, Math.floor(size * 0.94));
  }
}

/**
 * Draw fitted lines. align: left | center. Words appear one by one when
 * `reveal` (0–1) is below 1 — each rises a little and fades in.
 * Logs one box for the whole block.
 */
export function drawLines(c, f, x, y, { weight, family, color, align = "left", reveal = 1, role, unit, bg, rise = 0.35 }) {
  c.save();
  c.font = font(weight, f.size, family);
  c.textBaseline = "alphabetic";
  c.fillStyle = color;
  const total = f.lines.reduce((n, l) => n + l.split(" ").length, 0);
  let k = 0;
  f.lines.forEach((line, li) => {
    const words = line.split(" ");
    const lw = c.measureText(line).width;
    let cx = align === "center" ? x - lw / 2 : x;
    const by = y + f.size * 0.92 + li * f.lineH;
    for (const w of words) {
      const appear = Math.max(0, Math.min(1, reveal * total - k));
      const ww = c.measureText(w + " ").width;
      if (appear > 0) {
        c.globalAlpha = appear;
        c.fillText(w, cx, by + (1 - appear) * f.size * rise);
      }
      cx += ww;
      k++;
    }
  });
  c.restore();
  const h = f.lines.length * f.lineH;
  const bx = align === "center" ? x - f.width / 2 : x;
  if (reveal > 0) logBox({ kind: "text", role, text: f.lines.join(" "), x: bx, y, w: f.width, h, px: f.size / unit, fits: f.fits, fg: color, bg });
  return h;
}
