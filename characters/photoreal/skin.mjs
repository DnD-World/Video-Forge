// ---------------------------------------------------------------------------
// PHOTOREAL PUPPETS THAT MOVE (27 Oct 2026, best-effort attempt for Ak).
//
// Cutting a photo into stiff pieces shows every joint (tried: #49b). This
// bends it instead, the way game and animation rigs do: the picture is laid
// on a fine mesh, every mesh point follows the bones near it with smooth
// weights (linear blend skinning), so an elbow or a knee flexes like skin.
// The arms are their own layers over the body, so they can pass behind it or
// in front of it, by the same rule as the drawn characters.
//
// The picture should be a T-pose or an A-pose made by Image Forge: then
// nothing hides behind anything, every part's pixels exist, and the skeleton
// can put the limbs anywhere. The joints come from MediaPipe's pose model
// (tools/detect-pose.mjs), so a new puppet needs no hand work.
//
//   buildSkin(alpha, w, h, points)  → the bones and the mesh layers
//   poseSkin(skin, sk, opts)        → every mesh point's position for a
//                                     skeleton pose (solveRig, front view)
// Drawing: glmesh.mjs.
// ---------------------------------------------------------------------------

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const rot = (v, t) => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
const ang = (v) => Math.atan2(v[1], v[0]);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Distance from p to the segment a–b. */
function segDist(p, a, b) {
  const ab = sub(b, a), ap = sub(p, a);
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / Math.max(1e-6, ab[0] * ab[0] + ab[1] * ab[1])));
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t);
}

/**
 * MediaPipe's 33 points (pixels) → our bones. Index 0 = the side on the
 * picture's LEFT (the person's right), which is the skeleton's arm/leg 0.
 */
export function bonesFromPose(P) {
  const pt = (i) => [P[i].x, P[i].y];
  const hipC = mid(pt(23), pt(24)), shC = mid(pt(11), pt(12));
  const headC = mid(pt(7), pt(8));
  // the model's "index" point is a knuckle: the hand reaches about as far again past it
  const tip = (wr, idx) => { const d = sub(pt(idx), pt(wr)); return add(pt(idx), [d[0] * 0.9, d[1] * 0.9]); };
  const side = (sh, el, wr, idx, hip, kn, an, toe) => ({
    upper: [pt(sh), pt(el)], fore: [pt(el), pt(wr)], hand: [pt(wr), tip(wr, idx)],
    thigh: [pt(hip), pt(kn)], shin: [pt(kn), pt(an)], foot: [pt(an), pt(toe)],
  });
  // the picture's left is the person's right: 12/14/16/20 and 24/26/28/32
  const L = side(12, 14, 16, 20, 24, 26, 28, 32), R = side(11, 13, 15, 19, 23, 25, 27, 31);
  const left = pt(12)[0] < pt(11)[0];
  const [s0, s1] = left ? [L, R] : [R, L];
  return {
    torso: [hipC, shC], neck: [shC, headC], head: headC,
    bones: [
      { id: "torso", a: hipC, b: shC, parent: null },
      { id: "head", a: shC, b: headC, parent: "torso" },
      { id: "upper0", a: s0.upper[0], b: s0.upper[1], parent: "torso" },
      { id: "fore0", a: s0.fore[0], b: s0.hand[1], wrist: s0.fore[1], parent: "upper0" },
      { id: "upper1", a: s1.upper[0], b: s1.upper[1], parent: "torso" },
      { id: "fore1", a: s1.fore[0], b: s1.hand[1], wrist: s1.fore[1], parent: "upper1" },
      { id: "thigh0", a: s0.thigh[0], b: s0.thigh[1], parent: "torso" },
      { id: "shin0", a: s0.shin[0], b: s0.foot[1], parent: "thigh0" },
      { id: "thigh1", a: s1.thigh[0], b: s1.thigh[1], parent: "torso" },
      { id: "shin1", a: s1.shin[0], b: s1.foot[1], parent: "thigh1" },
    ],
    top: Math.min(P[0].y, headC[1]) - Math.hypot(...sub(pt(7), pt(8))) * 0.9,
    floor: Math.max(P[31].y, P[32].y, P[29]?.y ?? 0, P[30]?.y ?? 0),
  };
}

const LAYER_BONES = {
  body: ["torso", "head", "thigh0", "shin0", "thigh1", "shin1", "upper0", "upper1"],
  arm0: ["torso", "upper0", "fore0"],
  arm1: ["torso", "upper1", "fore1"],
};

/**
 * The mesh. alpha: a Uint8Array (w×h) of the picture's opacity. A grid of
 * `cell` px over every opaque part; each cell goes to the layer of the bone
 * it is nearest (an arm, or the body), and each corner gets smooth weights
 * over that layer's bones.
 */
export function buildSkin(alpha, w, h, points, { cell = 8, armEdges = false } = {}) {
  const rig = bonesFromPose(points);
  const byId = Object.fromEntries(rig.bones.map((b) => [b.id, b]));
  const armW = Math.hypot(...sub(byId.upper0.a, byId.upper1.a)) * 0.16; // a rough limb thickness
  const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && alpha[(y | 0) * w + (x | 0)] > 24;
  // each arm's real thickness, measured on the picture across the middle of
  // its forearm (the side away from the body when the upper arm touches it)
  const across = (p, n) => { let k = 0; while (k < 160 && opaque(p[0] + n[0] * k, p[1] + n[1] * k)) k++; return k; };
  const radius = {};
  for (const k of ["0", "1"]) {
    const f = byId["fore" + k], u = byId["upper" + k];
    // measured at a few points along the bone (the middle can fall between fingers)
    const rad = (a, b) => {
      const d = sub(b, a), l = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / l, d[0] / l];
      const got = [0.35, 0.5, 0.65].map((t) => {
        const m = [a[0] + d[0] * t, a[1] + d[1] * t];
        const s1 = across(m, n), s2 = across(m, [-n[0], -n[1]]);
        return Math.min(s1, s2) || Math.max(s1, s2);
      }).filter((x) => x > 2).sort((x, y) => x - y);
      return got.length ? got[Math.floor(got.length / 2)] : 0;
    };
    const rf = rad(f.a, f.wrist), ru = rad(u.a, u.b);
    radius[k] = Math.max(10, rf ? Math.min(rf * 1.35, ru ? ru * 1.2 : Infinity) : ru * 1.1 || 18);
  }
  // an arm cell: close to the arm's own line (within its thickness), and past
  // the shoulder joint — the shoulder itself stays with the body
  const armOf = (p) => {
    for (const k of ["0", "1"]) {
      const u = byId["upper" + k], f = byId["fore" + k], r = radius[k];
      const d = Math.min(segDist(p, u.a, u.b), segDist(p, f.a, f.b));
      // within the arm's thickness; or a little beyond it when this arm is the
      // nearest bone of all (its edge), but never as far as a nearby apron
      if (d > r * 1.15) {
        if (!armEdges || d > r * 2.2) continue;
        let nearer = false;
        for (const b of rig.bones) if (!b.id.endsWith(k) && segDist(p, b.a, b.b) < d) { nearer = true; break; }
        if (nearer) continue;
      }
      const ax = sub(u.b, u.a), len = Math.hypot(ax[0], ax[1]) || 1;
      const along = ((p[0] - u.a[0]) * ax[0] + (p[1] - u.a[1]) * ax[1]) / len;
      if (along > -r * 0.35) return k;
    }
    return null;
  };
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const layers = { body: new Map(), arm0: new Map(), arm1: new Map() };
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell;
    // a cell counts if any of its 5 sample points is opaque
    if (![[cx, cy], [gx * cell + 1, gy * cell + 1], [(gx + 1) * cell - 1, gy * cell + 1], [gx * cell + 1, (gy + 1) * cell - 1], [(gx + 1) * cell - 1, (gy + 1) * cell - 1]].some(([x, y]) => opaque(x, y))) continue;
    const k = armOf([cx, cy]);
    layers[k === null ? "body" : "arm" + k].set(gx + gy * cols, [gx, gy]);
    // the arm's root overlaps the shoulder a little, so the joint stays covered
    if (k === null) for (const j of ["0", "1"]) {
      const sh = byId["upper" + j].a;
      if (Math.hypot(cx - sh[0], cy - sh[1]) < radius[j] * 1.1) layers["arm" + j].set(gx + gy * cols, [gx, gy]);
    }
  }
  const out = {};
  for (const [name, cells] of Object.entries(layers)) {
    const verts = new Map(), pos = [], uv = [], weights = [], tris = [];
    const vid = (x, y) => {
      const key = x + y * (cols + 1);
      if (verts.has(key)) return verts.get(key);
      const p = [x * cell, y * cell];
      const ids = LAYER_BONES[name];
      // smooth weights: closer bones count far more (1/d^4), normalised
      let ws = ids.map((id) => 1 / Math.pow(segDist(p, byId[id].a, byId[id].b) + armW * 0.35, 4));
      if (name === "body") {
        // the shoulder bends with the arm, like a deltoid: fully out at the
        // sleeve, fading to nothing towards the chest (so a T-pose's sleeve
        // stubs come down with the arms instead of sticking out)
        for (const k of ["0", "1"]) {
          const j = ids.indexOf("upper" + k), up = byId["upper" + k];
          const dj = Math.hypot(p[0] - up.a[0], p[1] - up.a[1]); // px from the shoulder joint
          ws[j] *= Math.max(0, 1 - dj / (radius[k] * 1.5)) ** 2 * 0.6;
        }
      } else {
        // an arm layer only bends with the torso right at the shoulder
        const sh = byId["upper" + name.slice(-1)].a, dsh = Math.hypot(p[0] - sh[0], p[1] - sh[1]);
        ws[0] *= Math.max(0, 1 - dsh / (armW * 1.6)) ** 2;
      }
      const sum = ws.reduce((a, b) => a + b, 0) || 1;
      ws = ws.map((x) => x / sum);
      const i = pos.length;
      pos.push(p); uv.push([p[0] / w, p[1] / h]); weights.push(ids.map((id, j) => [id, ws[j]]).filter(([, x]) => x > 0.01));
      verts.set(key, i);
      return i;
    };
    for (const [gx, gy] of cells.values()) {
      const a = vid(gx, gy), b = vid(gx + 1, gy), c = vid(gx + 1, gy + 1), d = vid(gx, gy + 1);
      tris.push(a, b, c, a, c, d);
    }
    out[name] = { pos, uv, weights, tris };
  }
  // how far each arm is raised in this picture (radians from hanging straight down)
  const raised = (k) => { const u = byId["upper" + k], d = sub(u.b, u.a); return Math.abs(Math.atan2(d[0], d[1])); };
  return { w, h, rig, layers: out, armAngle: [raised("0"), raised("1")] };
}

/**
 * Bend the mesh to a skeleton pose. sk: solveRig's skeleton (front view);
 * rest: solveRig at rest (for the torso's own angle). Each bone turns so it
 * points the way the skeleton's matching bone points; the picture keeps its
 * own proportions. Returns { body, arm0, arm1 }: positions (px, picture
 * frame) and which arms go in front.
 */
export function poseSkin(skin, sk, rest, { bodyH } = {}) {
  const { rig } = skin;
  const byId = Object.fromEntries(rig.bones.map((b) => [b.id, b]));
  const H = bodyH ?? rig.floor - rig.top; // picture px per body height
  // the skeleton's bone directions (screen space, y down)
  const dir = (a, b) => ang(sub(b, a));
  const want = {
    torso: dir([0, sk.hy], [sk.neck[0], sk.sy]) - dir([0, rest.hy], [rest.neck[0], rest.sy]) + ang(sub(byId.torso.b, byId.torso.a)),
    upper0: dir(sk.arms[0].sh, sk.arms[0].el), fore0: dir(sk.arms[0].el, sk.arms[0].ha),
    upper1: dir(sk.arms[1].sh, sk.arms[1].el), fore1: dir(sk.arms[1].el, sk.arms[1].ha),
    thigh0: dir(sk.legs[0].hip, sk.legs[0].knee), shin0: dir(sk.legs[0].knee, sk.legs[0].foot),
    thigh1: dir(sk.legs[1].hip, sk.legs[1].knee), shin1: dir(sk.legs[1].knee, sk.legs[1].foot),
  };
  // forward kinematics: each bone turned about its own start, carried by its parent
  const T = {};
  const solve = (id) => {
    if (T[id]) return T[id];
    const b = byId[id];
    const restA = ang(sub(b.b, b.a));
    let turn = id === "head" ? (T.torso ? solve("torso").turn : 0) + (sk.rot ?? 0) : wrap((want[id] ?? restA) - restA);
    let start;
    if (!b.parent) {
      // the hips: moved by the body's shift and drop (crouch, sit, jump)
      start = add(b.a, [(sk.root?.[0] ?? 0) * H, ((sk.hy - rest.hy) + (sk.root?.[1] ?? 0)) * H]);
    } else {
      const p = solve(b.parent), pb = byId[b.parent];
      start = add(p.start, rot(sub(b.a, pb.a), p.turn));
    }
    return (T[id] = { start, turn });
  };
  for (const b of rig.bones) solve(b.id);
  const place = (layer) => layer.pos.map((p, i) => {
    let x = 0, y = 0;
    for (const [id, w] of layer.weights[i]) {
      const t = T[id], b = byId[id];
      const q = add(t.start, rot(sub(p, b.a), t.turn));
      x += q[0] * w; y += q[1] * w;
    }
    return [x, y];
  });
  // arms in front only while the hand crosses the body (the drawn characters' rule)
  const crossing = (i) => {
    const half = Math.abs(sk.arms[i].sh[0] - sk.neck[0]);
    const reach = (sk.arms[i].ha[0] - sk.neck[0]) * Math.sign(sk.arms[i].sh[0] - sk.neck[0]);
    return reach < half * 0.72 && sk.arms[i].ha[1] > sk.head[1] - sk.R && sk.arms[i].ha[1] < sk.hy + 0.03;
  };
  return { body: place(skin.layers.body), arm0: place(skin.layers.arm0), arm1: place(skin.layers.arm1), front: [crossing(0), crossing(1)] };
}
