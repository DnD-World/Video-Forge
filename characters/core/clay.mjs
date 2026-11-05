// ---------------------------------------------------------------------------
// Clay details (5 Nov 2026): what makes a drawn character read like a soft 3D
// toy (Ak's reference avatar), on top of the hint of 3D (paint.mjs formFill):
//
//   contact shadows   the fringe darkens the forehead under it, the nose the
//                     skin beside it (where parts touch, light can't get in)
//   warm edge         skin turns a little red where light turns to shadow
//                     (light scattering in skin) — in paint.mjs formFill
//   shine spots       soft highlights on the nose tip, the cheeks, the lower lip
//   soft creases      cloth folds and the hoodie pocket as soft shading, not lines
//
// All of it is blurred and faint (Ak: "a hint", "subtle"), scaled by the look's
// form strength, and only drawn when the card asks for it (card.formDetail).
// ---------------------------------------------------------------------------

const light = (G) => [-0.55 * (G.fsx ?? 1), -0.83];
// formDetail: true = the standard strength; a number scales it (the lab compares 0.6 = the first try).
// Standard was raised 1.7× on 5 Nov 2026 (Ak: "stronger first").
export const CLAY_K = 1.7;
export const clayK = (look) => (typeof look.formDetail === "number" ? look.formDetail : 1) * CLAY_K;
// the clay keeps the strength Ak approved (seen at a hint of 3D, form 0.5) whatever the body's 3D strength:
// at full 3D it doubled and the nose shadow turned into a smudge (5 Nov 2026)
const strength = (look) => 0.5 * clayK(look);
const DARK = "#4a1830";

/** The fringe's shadow on the forehead: the hair front, offset away from the light, blurred, clipped to the head. */
export function hairContactShadow(G, clipHead, drawFront) {
  const { ctx, S, look } = G, [lx, ly] = light(G), k = strength(look);
  ctx.save();
  clipHead(); ctx.clip();
  ctx.translate(-lx * S * 0.01, -ly * S * 0.02);
  ctx.filter = `blur(${Math.max(1, S * 0.006)}px)`;
  ctx.globalAlpha = Math.min(0.7, 0.3 * k + 0.15);
  const f0 = G.fill, l0 = G.line;
  G.fill = () => { ctx.fillStyle = DARK; ctx.fill(); };
  G.line = (c, w) => { ctx.strokeStyle = DARK; ctx.lineWidth = Math.max(1, w * S); ctx.lineCap = "round"; ctx.stroke(); };
  try { drawFront(); } finally { G.fill = f0; G.line = l0; ctx.restore(); }
}

const blob = (ctx, x, y, rx, ry, color, blur) => {
  ctx.save();
  ctx.filter = `blur(${Math.max(1, blur)}px)`;
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
};

/** Face details, in head space (px): nose shadow and shine, cheek shine, lip shine. */
export function faceClay(G, { R, nx, ny, mx, my, mw, eyes, side, lips }) {
  const { ctx, S, look } = G, [lx, ly] = light(G), k = strength(look), u = R * S;
  if (side < 0.55) {
    // the nose: a soft shadow on the skin away from the light, a shine on the tip towards it
    blob(ctx, nx - lx * u * 0.08, ny - ly * u * 0.05 + u * 0.03, u * 0.07, u * 0.045, `rgba(120,40,40,${0.42 * k})`, u * 0.03);
    blob(ctx, nx + lx * u * 0.03, ny + ly * u * 0.03, u * 0.03, u * 0.022, `rgba(255,255,255,${0.75 * k})`, u * 0.012);
  }
  // cheeks: a broad soft sheen high on each cheek, stronger on the lit side
  for (const e of eyes) if (e.visible) {
    const lit = Math.sign(e.x) === Math.sign(lx) ? 1 : 0.55;
    blob(ctx, (e.x + lx * R * 0.06) * S, (e.y + R * 0.23) * S, u * 0.13 * e.scaleX, u * 0.065, `rgba(255,250,244,${0.5 * k * lit})`, u * 0.045);
  }
  // the lower lip catches the light: a short soft stroke just under the mouth line
  const lw = mw * (lips ? 0.3 : 0.22);
  ctx.save();
  ctx.filter = `blur(${Math.max(1, u * 0.012)}px)`;
  ctx.beginPath(); ctx.moveTo(mx - lw, my + u * (lips ? 0.07 : 0.06)); ctx.quadraticCurveTo(mx, my + u * (lips ? 0.1 : 0.085), mx + lw, my + u * (lips ? 0.07 : 0.06));
  ctx.strokeStyle = `rgba(255,255,255,${(lips ? 0.6 : 0.3) * k})`; ctx.lineWidth = Math.max(1, u * 0.03); ctx.lineCap = "round"; ctx.stroke();
  ctx.restore();
}

/** Soft cloth folds on a top: drape from the armpits to the waist, a little bunching above the hem. */
export function torsoCreases(G, sk) {
  const { ctx, S, look, pen } = G, [lx, ly] = light(G), k = strength(look);
  const l = sk.neck[0], U = (p) => [p[0] * S, p[1] * S];
  ctx.save();
  // keep it on the body
  const t = sk.torso.map(([x, y]) => [l + (x - l) * 1.08, y]);
  ctx.beginPath(); t.forEach((p, i) => { const q = U(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.clip();
  const fold = (pts, w, a) => {
    const q = pts.map(U);
    const path = () => { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.quadraticCurveTo(q[1][0], q[1][1], q[2][0], q[2][1]); };
    ctx.lineCap = "round"; ctx.filter = `blur(${Math.max(1, S * 0.004)}px)`;
    path(); ctx.strokeStyle = `rgba(40,12,40,${a * k})`; ctx.lineWidth = S * w; ctx.stroke();
    // its lit lip, just towards the light
    ctx.save(); ctx.translate(lx * S * 0.005, ly * S * 0.005); path();
    ctx.strokeStyle = `rgba(255,248,240,${a * 0.6 * k})`; ctx.lineWidth = S * w * 0.6; ctx.stroke(); ctx.restore();
  };
  for (const s of [-1, 1]) {
    fold([[l + s * sk.sx * 0.82, sk.sy + 0.05], [l + s * sk.hx * 0.75, sk.waistY - 0.02], [l + s * sk.hx * 0.35, sk.hy - 0.035]], 0.007, 0.16);
  }
  for (const [dx, dy] of [[-0.3, 0], [0.35, 0.008]]) {
    const y = sk.hy - 0.03 + dy, x = l + dx * sk.hx;
    fold([[x - sk.hx * 0.22, y], [x, y + 0.008], [x + sk.hx * 0.22, y - 0.002]], 0.005, 0.13);
  }
  ctx.restore();
}

/** A pocket as soft shading: the opening is a shadow with a lit edge, the patch itself barely there. */
export function softPocket(G, pts) {
  const { ctx, S, look } = G, [lx, ly] = light(G), k = strength(look);
  const q = pts.map(([x, y]) => [x * S, y * S]);
  ctx.save();
  ctx.filter = `blur(${Math.max(1, S * 0.003)}px)`;
  ctx.lineCap = "round";
  // the opening along the top: a shadow just inside, a lit lip just above
  ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1] + S * 0.004); ctx.lineTo(q[1][0], q[1][1] + S * 0.004);
  ctx.strokeStyle = `rgba(40,12,40,${0.32 * k})`; ctx.lineWidth = S * 0.006; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1] - S * 0.002); ctx.lineTo(q[1][0], q[1][1] - S * 0.002);
  ctx.strokeStyle = `rgba(255,248,240,${0.22 * k})`; ctx.lineWidth = S * 0.003; ctx.stroke();
  // the sides: faint seams, the one away from the light a touch darker
  for (const [a, b] of [[q[0], q[3]], [q[1], q[2]]]) {
    const away = (b[0] - (q[0][0] + q[1][0]) / 2) * lx < 0;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = `rgba(40,12,40,${(away ? 0.18 : 0.08) * k})`; ctx.lineWidth = S * 0.004; ctx.stroke();
  }
  ctx.restore();
}
