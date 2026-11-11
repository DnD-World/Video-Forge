// ---------------------------------------------------------------------------
// MARKS: tattoos, scars, freckles, birthmarks and moles (character creator phase 3, 7 Nov 2026).
//
// Simple shapes that ride on a body part and move with it: on the face they are drawn with the
// face (so they turn, tilt and hide with it), on the neck with the neck, on a forearm or hand
// with that arm (between the skin and the sleeve, so a long sleeve covers a forearm tattoo, as
// clothes would). Only the places the animation carries easily, and only those: cheeks, brows,
// forehead, chin, neck, forearms, backs of the hands. Nothing on the body under the clothes
// (strict modesty), no words or pictures in a tattoo, just plain shapes.
//
// LEFT AND RIGHT are as you look at the character from the front. In the engine the viewer's
// left eye is the near one (it stays in view in profile) and the viewer's right arm is the front
// arm, so a mark keeps its side through every turn.
//
// A card holds up to MAX_MARKS in `marks`: [{ kind, on, shape?, size, color, angle }].
// ---------------------------------------------------------------------------

export const MAX_MARKS = 6;

export const MARK_KINDS = {
  tattoo: { label: "Tattoo", color: "#2e3f66", shapes: ["heart", "star", "anchor", "wave", "dots", "band"] },
  scar: { label: "Scar", color: "#c98f86" },
  freckles: { label: "Freckles", color: "#9a5f3c" },
  birthmark: { label: "Birthmark", color: "#a8724f" },
  mole: { label: "Mole", color: "#5a3a2a" },
};
export const MARK_KIND_IDS = Object.keys(MARK_KINDS);

/** Where a mark can sit. side: which eye or arm it follows (L = viewer's left). */
export const MARK_SPOTS = {
  cheekL: { label: "Left cheek", area: "face" },
  cheekR: { label: "Right cheek", area: "face" },
  browL: { label: "Left eyebrow", area: "face" },
  browR: { label: "Right eyebrow", area: "face" },
  forehead: { label: "Forehead", area: "face" },
  chin: { label: "Chin", area: "face" },
  neck: { label: "Neck", area: "neck" },
  forearmL: { label: "Left forearm", area: "arm" },
  forearmR: { label: "Right forearm", area: "arm" },
  handL: { label: "Left hand", area: "hand" },
  handR: { label: "Right hand", area: "hand" },
};
export const MARK_SPOT_IDS = Object.keys(MARK_SPOTS);
export const MARK_SIZE = [0.5, 2];
export const MARK_ANGLE = [-90, 90];

const HEX = /^#[0-9a-f]{6}$/i;
const round = (n) => Math.round(n * 100) / 100;

/** Any list to valid marks. Returns { marks, problems }. */
export function normalizeMarks(value) {
  const problems = [];
  if (value === undefined || value === null) return { marks: [], problems };
  if (!Array.isArray(value)) return { marks: [], problems: ["Marks: not a list of marks"] };
  const marks = [];
  for (const raw of value) {
    if (marks.length >= MAX_MARKS) { problems.push(`Marks: at most ${MAX_MARKS}, the rest left out`); break; }
    const k = MARK_KINDS[raw?.kind];
    if (!k) { problems.push(`Marks: "${raw?.kind}" isn't one of ${MARK_KIND_IDS.join(", ")}`); continue; }
    if (!MARK_SPOTS[raw.on]) { problems.push(`Marks: a ${k.label.toLowerCase()} can't go on "${raw.on}" (places: ${MARK_SPOT_IDS.join(", ")})`); continue; }
    const m = { kind: raw.kind, on: raw.on };
    if (raw.kind === "tattoo") {
      m.shape = k.shapes.includes(raw.shape) ? raw.shape : "heart";
      if (raw.shape !== undefined && m.shape !== raw.shape) problems.push(`Marks: tattoo shape "${raw.shape}" isn't one of ${k.shapes.join(", ")}, used heart`);
      if (m.shape === "band" && MARK_SPOTS[m.on].area !== "arm") { problems.push("Marks: a band tattoo goes round a forearm only, made a star"); m.shape = "star"; }
    }
    const num = (x, [lo, hi], d, what) => {
      if (x === undefined || x === null) return d;
      const n = Number(x);
      if (!Number.isFinite(n)) { problems.push(`Marks: ${what} "${x}" isn't a number`); return d; }
      if (n < lo || n > hi) problems.push(`Marks: ${what} ${n} is outside ${lo} to ${hi}`);
      return round(Math.min(hi, Math.max(lo, n)));
    };
    m.size = num(raw.size, MARK_SIZE, 1, "size");
    m.color = HEX.test(raw.color ?? "") ? raw.color.toLowerCase() : k.color;
    if (raw.color !== undefined && !HEX.test(raw.color ?? "")) problems.push(`Marks: colour "${raw.color}" isn't a colour like #2e3f66`);
    m.angle = num(raw.angle, MARK_ANGLE, 0, "angle");
    for (const key of Object.keys(raw ?? {})) if (!["kind", "on", "shape", "size", "color", "angle"].includes(key)) problems.push(`Marks: "${key}" isn't a mark setting, ignored`);
    marks.push(m);
  }
  return { marks, problems };
}

// ---- drawing -------------------------------------------------------------------------------------
// Every shape is drawn round (0, 0) at unit size u (px), already turned by the mark's angle.

function shapePath(ctx, shape, u) {
  ctx.beginPath();
  if (shape === "heart") {
    ctx.moveTo(0, u * 0.9);
    ctx.bezierCurveTo(-u * 1.3, 0, -u * 0.9, -u * 1.05, 0, -u * 0.35);
    ctx.bezierCurveTo(u * 0.9, -u * 1.05, u * 1.3, 0, 0, u * 0.9);
  } else if (shape === "star") {
    for (let i = 0; i < 10; i++) { const r = i % 2 ? u * 0.45 : u, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath();
  }
}

/** One mark at (x, y) px. sx squeezes it sideways (a cheek turning away); along = the limb's angle. */
export function drawMark(ctx, m, x, y, u0, o = {}) {
  const { sx = 1, along = 0, ink = null, alpha = 1 } = o;
  const u = u0 * m.size;
  const color = ink ?? m.color;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  ctx.rotate(along + (m.angle * Math.PI) / 180);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (m.kind === "scar") {
    ctx.beginPath(); ctx.moveTo(-u * 1.1, 0); ctx.quadraticCurveTo(0, -u * 0.18, u * 1.1, 0);
    ctx.lineWidth = Math.max(1, u * 0.22); ctx.stroke();
    ctx.lineWidth = Math.max(0.8, u * 0.1);
    for (const t of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(u * t, -u * 0.32); ctx.lineTo(u * t, u * 0.26); ctx.stroke(); }
  } else if (m.kind === "freckles") {
    const dots = [[-0.8, -0.3], [-0.3, 0.2], [0.2, -0.4], [0.6, 0.15], [-0.1, -0.05], [0.95, -0.25], [-0.55, 0.45]];
    ctx.globalAlpha = alpha * 0.65;
    for (const [a, b] of dots) { ctx.beginPath(); ctx.arc(a * u, b * u, Math.max(0.6, u * 0.11), 0, Math.PI * 2); ctx.fill(); }
  } else if (m.kind === "birthmark") {
    const g = ctx.createRadialGradient(0, 0, u * 0.1, 0, 0, u);
    g.addColorStop(0, color); g.addColorStop(0.7, color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.globalAlpha = alpha * 0.55;
    ctx.beginPath(); ctx.ellipse(0, 0, u, u * 0.7, 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (m.kind === "mole") {
    ctx.beginPath(); ctx.arc(0, 0, Math.max(0.8, u * 0.22), 0, Math.PI * 2); ctx.fill();
  } else if (m.kind === "tattoo") {
    ctx.globalAlpha = alpha * 0.85;
    if (m.shape === "heart" || m.shape === "star") { shapePath(ctx, m.shape, u); ctx.fill(); }
    else if (m.shape === "anchor") {
      ctx.lineWidth = Math.max(1, u * 0.2);
      ctx.beginPath(); ctx.moveTo(0, -u * 0.9); ctx.lineTo(0, u * 0.8); ctx.moveTo(-u * 0.45, -u * 0.45); ctx.lineTo(u * 0.45, -u * 0.45);
      ctx.moveTo(-u * 0.8, u * 0.2); ctx.quadraticCurveTo(0, u * 1.25, u * 0.8, u * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -u * 1.05, u * 0.18, 0, Math.PI * 2); ctx.stroke();
    } else if (m.shape === "wave") {
      ctx.lineWidth = Math.max(1, u * 0.2);
      ctx.beginPath(); ctx.moveTo(-u * 1.1, 0);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(-u * 1.1 + u * 0.55 * (i + 0.5), (i % 2 ? 1 : -1) * u * 0.5, -u * 1.1 + u * 0.55 * (i + 1), 0);
      ctx.stroke();
    } else if (m.shape === "dots") {
      for (const a of [-0.7, 0, 0.7]) { ctx.beginPath(); ctx.arc(a * u, 0, u * 0.2, 0, Math.PI * 2); ctx.fill(); }
    } else if (m.shape === "band") {
      // round the forearm: two lines across it (along = the forearm, so across = +90°)
      ctx.lineWidth = Math.max(1, u * 0.22);
      for (const d of [-0.35, 0.35]) { ctx.beginPath(); ctx.moveTo(d * u, -u * 1.1); ctx.lineTo(d * u, u * 1.1); ctx.stroke(); }
    }
  }
  ctx.restore();
}

/** Face marks, in the head's own coordinates (drawFace calls this after freckles). */
export function drawFaceMarks(G, F, R, marks, o = {}) {
  const { ctx, S } = G;
  const eye = (side) => F.eyes[side === "L" ? 0 : 1];
  for (const m of marks) {
    const spot = MARK_SPOTS[m.on];
    if (spot?.area !== "face") continue;
    let x, y, sx = 1, vis = true;
    if (m.on === "cheekL" || m.on === "cheekR") { const e = eye(m.on.at(-1)); vis = e.visible; x = e.x + R * 0.04 * Math.sign(e.x - F.faceDX || 1); y = e.y + R * 0.32; sx = e.scaleX; }
    else if (m.on === "browL" || m.on === "browR") { const e = eye(m.on.at(-1)); vis = e.visible; x = e.x; y = e.y - R * 0.36; sx = e.scaleX; }
    else if (m.on === "forehead") { x = F.faceDX; y = -R * 0.62; }
    else { x = F.mouth.x; y = F.mouth.y + R * 0.3; }
    if (!vis) continue;
    drawMark(ctx, m, x * S, y * S, R * 0.12 * S, { sx: Math.max(0.2, sx), ink: o.ink ?? null });
  }
}

/** A mark on the neck (body coordinates, after the neck's skin). */
export function drawNeckMarks(G, sk, marks, o = {}) {
  const { ctx, S } = G;
  for (const m of marks) if (m.on === "neck") drawMark(ctx, m, (sk.neck[0] + sk.R * 0.04) * S, (sk.sy - 0.014) * S, sk.R * 0.07 * S, { sx: 1 - (sk.side ?? 0) * 0.4, ink: o.ink ?? null });
}

/** Marks on one arm: the forearm (before its sleeve) or the back of the hand (after the hand). */
export function drawArmMarks(G, arm, marks, where, o = {}) {
  const { ctx, S, sk } = G;
  const side = arm.front ? "R" : "L";
  for (const m of marks) {
    if (m.on !== (where === "hand" ? `hand${side}` : `forearm${side}`)) continue;
    const along = Math.atan2(arm.ha[1] - arm.el[1], arm.ha[0] - arm.el[0]);
    if (where === "hand") drawMark(ctx, m, arm.ha[0] * S, arm.ha[1] * S, sk.limbW * 0.32 * S, { along, ink: o.ink ?? null });
    else {
      const t = 0.5, x = arm.el[0] + (arm.ha[0] - arm.el[0]) * t, y = arm.el[1] + (arm.ha[1] - arm.el[1]) * t;
      drawMark(ctx, m, x * S, y * S, sk.limbW * 0.38 * S, { along: along + (m.shape === "band" ? 0 : -Math.PI / 2), ink: o.ink ?? null });
    }
  }
}
