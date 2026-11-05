// The 2D Lab (Ak, 4 Nov 2026: "full round"). Seven side-by-side tests of the
// Season 1 plan (docs/research/2d-motion-plan-2026-11.md): today's engine on
// the left, the lab's layers on the right, on the Red Flag cast.
import { SHELF, lookById, stageOf, drawFigure, drawCharacter, characterState, performAt, movesAt, normalizeCard, followAt, autoPerformance } from "../core/index.mjs";
import CAST from "../../brands/redflag/cast.json";
import { Actor, buildFor } from "../lab/actor.mjs";
import { restPose } from "../lab/body.mjs";
import * as MV from "../lab/moves.mjs";
import * as PR from "../lab/pair.mjs";
import { Leaves, Flag, HEM_LIFT_MAX } from "../lab/physics.mjs";
import { applySurface } from "../lab/surface.mjs";
import * as FR from "../lab/frame.mjs";
import { clamp, lerp } from "../lab/anim.mjs";
import { RecordingCtx } from "../core/record.mjs";
import { textScene, transitionScene, subtitleScene, RED } from "../lab/words.mjs";

// ---- the cast ------------------------------------------------------------------------------------------
const GEO_OWN = { ...lookById("geo"), eyes: undefined }; // Ak's pick: own white eyes with lids
const lookObj = (id) => (id === "geo" ? GEO_OWN : lookById(id));
const UI = { speed: 1, blur: false, fps: 30, playing: true, look: "own", beat: false };
const NAMES = {};
function cardOf(id) {
  const p = CAST.people.find((x) => x.id === id);
  NAMES[id] = p.name ?? id;
  const face = p.faces.find((f) => f.id === p.chosen?.face) ?? p.faces[0];
  const ids = p.chosen?.outfits ?? [p.outfits[0].id];
  const o = p.outfits.find((x) => x.id === ids[0]) ?? p.outfits[0];
  const lookId = UI.look === "own" ? p.look : UI.look;
  const card = normalizeCard({ ...p.base, ...face.set, form: CAST.form ?? 0, formDetail: CAST.formDetail ?? false, formLimbs: CAST.formLimbs ?? 1, look: lookId, wear: [...o.wear, ...p.accessories] }).card;
  return { card, look: lookObj(lookId) };
}

// ---- canvas helpers ------------------------------------------------------------------------------------
function fit(cv) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (W < 16 || H < 16) return null;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  return { W, H };
}
const canvases = new Map();
const scratch = (key, w, h) => {
  let c = canvases.get(key);
  if (!c) { c = document.createElement("canvas"); canvases.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
};

// ---- TODAY: the engine as it is (shelf move + springs + follow-through) --------------------------------
class TodayScene {
  constructor({ who, move, x = 0, view = 0, note = null, follow = false }) {
    Object.assign(this, { who, moveId: move, x, view, note, follow });
    this.c = cardOf(who);
    const m = move ? SHELF[move] : null;
    this.len = m ? Math.round((m.loop ? m.lengthMs * 2 : m.hold !== null ? m.lengthMs * 1.5 : m.lengthMs) + 900) : 4000;
    this.spans = m ? [{ startMs: 300, endMs: this.len - 600, move, seed: 2 }] : [];
  }
  frame(t) {
    const src = { poseSpans: [], moveSpans: this.spans, shelf: SHELF };
    const perf = performAt(src, t, { view: this.view, energy: 0.6, seed: 2 });
    const ap = autoPerformance(t / 1000, { seed: 2, talking: false });
    const state = characterState({ timeMs: t, viseme: 0, mix: 1, head: ap.head, active: false, view: this.view, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath });
    state.lid = ap.lid;
    if (this.follow) state.follow = followAt((ms) => {
      const mv = movesAt(this.spans, SHELF, Math.max(0, ms), { energy: 0.6, seed: 2 });
      const J = mv?.joints, w = J ? J.w ?? 1 : 0, root = J?.root ? [J.root[0] * w, J.root[1] * w] : [0, 0];
      return { x: root[0], y: root[1], rot: ((J?.head ? J.head[0] * w : 0) * Math.PI) / 180, hipX: root[0], hipY: root[1] };
    }, t);
    return { state, perf };
  }
  draw(ctx, W, H, t, o = {}) {
    const unit = o.unit ?? H * 0.62, cam = { x: 0, y: 0, zoom: 1 };
    FR.room(ctx, W, H, this.c.look, cam, unit, { t: t / 1000 });
    const V = FR.view(W, H, cam, unit);
    const { state, perf } = this.frame(t);
    const [fx, fy] = V.toScreen([this.x, 0]);
    FR.contactShadow(ctx, V, this.x, 0);
    const info = drawFigure(ctx, this.c.card, { look: this.c.look, S: V.S, x: fx, y: fy, mirror: perf.facing === "left", state, layerSize: { w: W, h: H }, layerCanvas: scratch("today-layer", W, H) });
    if (this.note) noteCard(ctx, W, H, this.note);
    return { V, info };
  }
}

function noteCard(ctx, W, H, text) {
  ctx.save();
  ctx.fillStyle = "rgba(18,11,14,0.78)"; FR.round(ctx, W * 0.1, H * 0.38, W * 0.8, H * 0.2, 18); ctx.fill();
  ctx.fillStyle = "#f5ece8"; ctx.font = `600 ${Math.round(Math.min(W, H) * 0.045)}px Sora, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  text.split("\n").forEach((line, i, a) => ctx.fillText(line, W / 2, H * 0.48 + (i - (a.length - 1) / 2) * Math.min(W, H) * 0.06));
  ctx.restore();
}

// ---- LAB: the new layers --------------------------------------------------------------------------------
class LabScene {
  /** cast: [{who, x, mirror}], solo builder or pair builder; wind; surface; camera script */
  constructor({ cast, builder = null, pair = null, wind = null, leaves = false, surface = "flat", camera = null, unit = 0.62, extras = null, physics = true }) {
    Object.assign(this, { castSpec: cast, builder, pairB: pair, wind, surface, camera, unitK: unit, extras, physics });
    this.leaves = leaves ? new Leaves(26, 3, [-1.8, -1.5, 1.8, 0]) : null;
    this.build();
  }
  build() {
    this.cs = this.castSpec.map((c) => {
      const r = cardOf(c.who);
      // a child drawn smaller than the cast sheet (big heads make the kids almost adult height)
      if (c.shrink) r.card = { ...r.card, height: r.card.height * c.shrink, headSize: (r.card.headSize ?? 1) * c.shrink };
      if (c.form !== undefined) r.look = { ...r.look, form: c.form, formDetail: c.detail ?? false, formLimbs: c.limbs ?? 1 }; // section 6 sets it, even to 0 (flat)
      return r;
    });
    if (this.pairB) {
      const rests = (v) => this.cs.map(({ card, look }) => restPose(card, look, v));
      const probe = this.pairB(...rests(0));
      this.pair = this.pairB(...this.cs.map(({ card, look }, i) => restPose(card, look, probe.actors[i].move.view ?? 0)));
      this.actors = this.pair.actors.map((a, i) => new Actor({ card: this.cs[i].card, look: this.cs[i].look, x: a.x, mirror: a.mirror, move: a.move, seed: i * 3 + 1, physics: this.physics }));
      this.len = this.pair.len;
    } else {
      this.actors = this.castSpec.map((c, i) => {
        const { card, look } = this.cs[i];
        const mv = c.move ?? buildFor(card, look, c.builder ?? this.builder, c.opts);
        const a = new Actor({ card, look, x: c.x ?? 0, mirror: !!c.mirror, move: mv, seed: i * 3 + 1, physics: this.physics });
        if (c.headMax !== undefined) a.headMax = c.headMax;
        return a;
      });
      this.len = Math.max(...this.actors.map((a) => a.move.len));
    }
    this.events = this.actors.flatMap((a, i) => (a.move.events ?? []).map((e) => ({ ...e, actor: i })));
    this.hist = this.actors.map(() => []);
    this.simT = -1;
  }
  /** Every actor's frame at t, with contacts between them. */
  frames(t) {
    const extra = (i) => ({
      sway: this.pair?.sway?.(t) ?? 0,
      nod: i === 1 && this.pair?.nod ? this.pair.nod(t) : null,
      hands: this.pair?.hands?.(t, i) ?? null,
      ...(this.extras?.(i, t) ?? {}),
    });
    let F = this.actors.map((a, i) => a.solve(a.poseAt(t, extra(i)), t));
    let ball = null;
    if (this.pair?.ball) {
      const probe = (i, tt) => this.actors[i].solve(this.actors[i].poseAt(tt, extra(i)), tt);
      ball = this.pair.ball(t, probe);
    }
    if (this.pair?.contacts) {
      const cs = this.pair.contacts(t, F, ball);
      F = F.map((f, i) => this.actors[i].withContacts(f, cs.filter((c) => c.actor === i)));
      if (ball?.held !== undefined) ball.at = ball.hand ? F[ball.held].hand(ball.hand) : F[ball.held].handsMid();
    }
    return { F, ball };
  }
  draw(ctx, W, H, t, o = {}) {
    // a camera that tips (the Sunday red-flag nudge): the whole frame turns about its middle,
    // scaled just enough that no corner shows
    const rot = this.camera?.(t)?.rot ?? 0;
    if (!rot) return this.drawFlat(ctx, W, H, t, o);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(rot);
    const k = 1 + Math.abs(rot) * (W + H) / Math.min(W, H); ctx.scale(k, k);
    ctx.translate(-W / 2, -H / 2);
    const r = this.drawFlat(ctx, W, H, t, o);
    ctx.restore();
    return r;
  }
  drawFlat(ctx, W, H, t, o = {}) {
    const unit = H * this.unitK;
    const cam = this.camera ? this.camera(t) : { x: 0, y: 0, zoom: 1 };
    const V = FR.view(W, H, cam, unit);
    const mood = cam.mood ?? 0;
    // ---- simulate (once per real frame, not per motion-blur sample)
    const { F, ball } = this.frames(t);
    if (o.sim !== false) {
      const wind = typeof this.wind === "function" ? this.wind(t) : this.wind;
      F.forEach((f, i) => this.actors[i].simulate(f, t, wind, (tt) => this.frames(tt).F[i]));
      if (this.leaves) {
        if (t < this.simT || this.simT < 0) { this.leaves.reset(); this.simT = 0; }
        while (this.simT < t) { this.leaves.step(wind, this.simT / 1000); this.simT += 1000 / 120; }
      }
    }
    FR.room(ctx, W, H, this.cs[0].look, cam, unit, { t: t / 1000, mood });
    const wind = typeof this.wind === "function" ? this.wind(t) : this.wind;
    // ---- each actor (each pass of it) into its own upright layer
    const order = this.pair?.order?.(t) ?? this.actors.map((_, i) => ({ actor: i }));
    const passes = order.map((p) => {
      const a = this.actors[p.actor], f = F[p.actor];
      const st = a.drawState(f, { talk: this.extras?.(p.actor, t)?.talk, hands: this.pair?.hands?.(t, p.actor) ?? null, gazeAt: this.extras?.(p.actor, t)?.gaze });
      if (p.skip) st.armsSkip = p.skip;
      if (p.only) st.armsOnly = p.only;
      if (p.front) st.armsFront = p.front;
      const lw = Math.ceil(V.S * 2.6), lh = Math.ceil(V.S * 1.6), ox = lw / 2, oy = lh - V.S * 0.1;
      const L = scratch(`lab-${this.id}-${p.actor}-${p.only ? "o" : p.skip ? "s" : "a"}`, lw, lh);
      const lc = L.getContext("2d");
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, lw, lh);
      const info = drawFigure(lc, a.card, { look: a.look, S: V.S, x: ox, y: oy, mirror: a.mirror, state: st, layerSize: { w: lw, h: lh }, layerCanvas: scratch(`lab-tmp-${lw}x${lh}`, lw, lh) });
      const surf = o.surface ?? this.surface;
      if (surf !== "flat") applySurface(L, { surface: surf, S: V.S, light: mood > 0.5 ? "#9fb8ff" : "#ffe1bd", ldir: [-0.55, -0.85], t: t / 1000 });
      return { p, a, f, L, ox, oy, info };
    });
    // ---- shadows under everyone first
    for (const { p, a, f, L, ox, oy } of passes) {
      if (p.only) continue;
      const lift = f.info?.lift ?? f.sol.info.lift;
      FR.contactShadow(ctx, V, a.x + a.m * f.sk.root[0], lift, 0.11);
      if (!f.rot && (o.cast ?? true)) {
        const [fx, fy] = V.toScreen([a.x, 0]);
        FR.castShadow(ctx, L, fx - ox, fy - oy, fy, { alpha: 0.16 * clamp(1 + lift * 4, 0.2, 1) });
      }
    }
    // a chair behind someone who sits (drawn by the lab so the seat is under the hips)
    for (const a of this.actors) if (a.move.chair) chair(ctx, V, a.x + a.m * a.move.chair.x * a.h, a.h, a.m);
    // dust under the feet, from events (landings)
    for (const e of this.events) if (e.kind === "dust") FR.dust(ctx, V, this.actors[e.actor].x, t - e.t);
    // ---- smears (fast hands and feet), then the figures
    for (const { p, a, f, L, ox, oy } of passes) {
      if (!p.only && o.sim !== false && o.smears !== false) this.drawSmears(ctx, V, p.actor, f, t);
      const [fx, fy] = V.toScreen([a.x, 0]);
      const sq = f.squash ?? 0;
      ctx.save();
      ctx.translate(fx, fy); ctx.rotate(f.rot); ctx.scale(1 / Math.sqrt(1 + sq), 1 + sq);
      ctx.drawImage(L, -ox, -oy);
      ctx.restore();
      if (o.bones) bones(ctx, V, f);
      if (o.paths) this.drawPath(ctx, V, p.actor, f, t);
    }
    if (ball) drawBall(ctx, V, ball);
    if (this.leaves) drawLeaves(ctx, V, this.leaves);
    if (o.modesty) this.drawModesty(ctx, V, F);
    if (this.overlay) this.overlay(ctx, W, H, t, V, F, passes);
    return { V, F, passes };
  }
  drawSmears(ctx, V, i, f, t) {
    const h = this.hist[i];
    const pts = { hF: V.toScreen(f.hand("F")), hB: V.toScreen(f.hand("B")), fF: V.toScreen(f.feet()[1]), fB: V.toScreen(f.feet()[0]) };
    if (h.length && t < h[h.length - 1].t) h.length = 0;
    h.push({ t, pts });
    while (h.length > 5) h.shift();
    if (h.length < 3) return;
    const dt = (t - h[0].t) / 1000 || 1;
    for (const key of ["hF", "hB", "fF", "fB"]) {
      const trail = h.map((e) => e.pts[key]);
      const d = Math.hypot(trail.at(-1)[0] - trail[0][0], trail.at(-1)[1] - trail[0][1]) / V.S;
      if (d / dt > 2.6) FR.smear(ctx, trail, key[0] === "h" ? this.actors[i].card.skin : "#ffffff", V.S * 0.035);
    }
  }
  drawPath(ctx, V, i, f, t) {
    this.paths ??= this.actors.map(() => []);
    const P = this.paths[i];
    if (P.length && t < P[P.length - 1].t) P.length = 0;
    P.push({ t, p: V.toScreen(f.hand("F")) });
    while (P.length && t - P[0].t > 1400) P.shift();
    pathLine(ctx, P.map((e) => e.p), "#ffb36b");
  }
  drawModesty(ctx, V, F) {
    F.forEach((f, i) => {
      const a = this.actors[i], sk = f.sk;
      const lift = a.loose?.readLift?.() ?? 0;
      a.maxLift = Math.max(a.maxLift ?? 0, lift);
      const knee = f.toWorld(sk.legs[1].knee);
      const [x0, y] = V.toScreen([a.x - 0.25, knee[1]]), [x1] = V.toScreen([a.x + 0.25, knee[1]]);
      ctx.save();
      ctx.setLineDash([6, 6]); ctx.strokeStyle = "#7be0a5"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.setLineDash([]);
      const pct = (lift / HEM_LIFT_MAX) * 100, max = ((a.maxLift ?? 0) / HEM_LIFT_MAX) * 100;
      ctx.font = `600 ${Math.round(V.S * 0.04)}px Sora, sans-serif`; ctx.fillStyle = max <= 100.5 ? "#7be0a5" : "#ff4d57";
      ctx.textAlign = "right"; ctx.fillText(`hem lift ${pct.toFixed(0)}%`, x0 - 6, y + 4); ctx.fillText(`worst ${max.toFixed(0)}% of limit`, x0 - 6, y + 4 + V.S * 0.045);
      ctx.restore();
    });
  }
}

function chair(ctx, V, x, h, m) {
  const P = (px, py) => V.toScreen([x + px * m, py]);
  const seatY = -0.27 * h, half = 0.11 * h, th = 0.03 * h;
  ctx.save(); ctx.fillStyle = "#6b4429"; ctx.strokeStyle = "#6b4429"; ctx.lineCap = "round";
  // back legs and the back rest (behind her), the front leg, the seat
  ctx.lineWidth = V.S * 0.022;
  ctx.beginPath(); ctx.moveTo(...P(-half, 0)); ctx.lineTo(...P(-half, -0.62 * h)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(...P(half * 0.85, 0)); ctx.lineTo(...P(half * 0.85, seatY)); ctx.stroke();
  ctx.lineWidth = V.S * 0.03;
  ctx.beginPath(); ctx.moveTo(...P(-half, -0.56 * h)); ctx.lineTo(...P(-half, -0.44 * h)); ctx.stroke();
  const a = P(-half - 0.01, seatY - th / 2), b = P(half + 0.02, seatY - th / 2);
  ctx.fillStyle = "#8a5a36"; ctx.beginPath(); ctx.moveTo(a[0], a[1] - (th * V.S) / 2); ctx.lineTo(b[0], b[1] - (th * V.S) / 2); ctx.lineTo(b[0], b[1] + (th * V.S) / 2); ctx.lineTo(a[0], a[1] + (th * V.S) / 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function bones(ctx, V, f) {
  const sk = f.sk, P = (p) => V.toScreen(f.toWorld(p));
  ctx.save(); ctx.lineCap = "round";
  for (const leg of sk.legs) {
    const a = P(leg.hip), b = P(leg.knee), c = P(leg.foot);
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.stroke();
    ctx.fillStyle = "#ffb36b"; ctx.beginPath(); ctx.arc(...b, 6, 0, FR.TAU); ctx.fill();
    ctx.fillStyle = "#7be0a5"; ctx.beginPath(); ctx.arc(...c, 5, 0, FR.TAU); ctx.fill();
  }
  for (const arm of sk.arms) {
    const a = P(arm.sh), b = P(arm.el), c = P(arm.ha);
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.stroke();
  }
  ctx.restore();
}
function pathLine(ctx, pts, color) {
  if (pts.length < 2) return;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    ctx.strokeStyle = FR.hexA(color, (i / pts.length) * 0.9); ctx.lineWidth = 1 + (i / pts.length) * 4;
    ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke();
  }
  ctx.restore();
}
function drawBall(ctx, V, ball) {
  const [x, y] = V.toScreen(ball.at), r = V.S * 0.05;
  ctx.save();
  const [sx, sy] = V.toScreen([ball.at[0], 0]);
  ctx.fillStyle = `rgba(0,0,0,${0.18 * clamp(1 + ball.at[1] * 1.5, 0.2, 1)})`; ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.3, r * 0.3, 0, 0, FR.TAU); ctx.fill();
  ctx.translate(x, y); ctx.rotate(ball.spin ?? 0);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#d8d8e0");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, FR.TAU); ctx.fill();
  ctx.fillStyle = "#e0405e"; ctx.beginPath(); ctx.arc(0, 0, r, -0.5, 0.5); ctx.arc(0, 0, r * 0.35, 0.5, -0.5, true); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI - 0.5, Math.PI + 0.5); ctx.arc(0, 0, r * 0.35, Math.PI + 0.5, Math.PI - 0.5, true); ctx.fill();
  ctx.restore();
}
function drawLeaves(ctx, V, L) {
  const cols = ["#f2a541", "#e8604c", "#ffd36b"];
  for (const l of L.p) {
    const [x, y] = V.toScreen([l.x, l.y]);
    ctx.save(); ctx.translate(x, y); ctx.rotate(l.a); ctx.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(l.a * 1.7)));
    ctx.fillStyle = cols[l.hue]; ctx.beginPath(); ctx.ellipse(0, 0, l.size * V.S, l.size * V.S * 0.55, 0, 0, FR.TAU); ctx.fill();
    ctx.restore();
  }
}

// ---- a stage: one canvas, a scene, the clock, motion blur ---------------------------------------------
const stages = [];
class Stage {
  constructor(el, make, opts = {}) {
    Object.assign(this, { el, make, opts });
    this.scene = make();
    this.scene.id = stages.length;
    this.t = 0; this.last = -1; this.visible = false;
    new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; }, { rootMargin: "120px" }).observe(el);
    stages.push(this);
  }
  rebuild() { this.scene = this.make(); this.scene.id = stages.indexOf(this); this.last = -1; }
  tick(dt) {
    if (!this.visible) return;
    if (UI.playing) this.t = (this.t + dt * UI.speed) % (this.scene.len + (this.opts.pad ?? 700));
    // the picture changes at the video's own rate (30 a second), like a real render
    const step = 1000 / UI.fps, tq = Math.floor(this.t / step) * step;
    if (tq === this.last && UI.playing) return;
    this.last = tq;
    const f = fit(this.el); if (!f) return;
    const { W, H } = f, ctx = this.el.getContext("2d");
    const o = { ...this.opts.draw?.() };
    const blur = UI.blur && this.opts.blur !== false && this.scene instanceof LabScene;
    if (!blur) { this.scene.draw(ctx, W, H, Math.min(tq, this.scene.len), o); return; }
    // motion blur: the same frame drawn at moments inside the shutter, averaged
    const N = 5, shutter = step * 0.5, acc = scratch(`acc-${W}x${H}`, W, H), tmp = scratch(`blur-${W}x${H}`, W, H);
    const ac = acc.getContext("2d"), tc = tmp.getContext("2d");
    for (let i = 0; i < N; i++) {
      const tt = Math.max(0, Math.min(tq, this.scene.len) - (shutter * i) / (N - 1));
      tc.setTransform(1, 0, 0, 1, 0, 0);
      this.scene.draw(tc, W, H, tt, { ...o, sim: i === 0, smears: i === 0 });
      ac.globalAlpha = 1 / (i + 1);
      ac.drawImage(tmp, 0, 0);
    }
    ac.globalAlpha = 1;
    ctx.drawImage(acc, 0, 0);
  }
}

// ---- the sections -----------------------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const chipState = {};
function chips(id, items, onPick, start = 0) {
  const el = $(id);
  el.innerHTML = items.map((it, i) => `<button class="chip${i === start ? " on" : ""}" data-i="${i}">${it.label}</button>`).join("");
  chipState[id] = start;
  el.querySelectorAll("button").forEach((b) => b.onclick = () => {
    el.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    chipState[id] = +b.dataset.i; onPick(items[+b.dataset.i]);
  });
  return items[start];
}
function toggle(id, key, store, after) {
  const el = $(id); store[key] = el.checked;
  el.onchange = () => { store[key] = el.checked; after?.(); };
}

// 1 · smoothness
const S1 = { paths: true };
const s1today = new Stage($("c1a"), () => new TodayScene({ who: "chloe", move: "wave", view: 0.3 }), { blur: false });
const s1lab = new Stage($("c1b"), () => new LabScene({ cast: [{ who: "chloe" }], builder: MV.wave }), { draw: () => ({ paths: S1.paths }) });
toggle("t1path", "paths", S1);
// the today side draws its own hand path from the info drawFigure returns
const todayDraw = TodayScene.prototype.draw;
TodayScene.prototype.draw = function (ctx, W, H, t, o = {}) {
  const r = todayDraw.call(this, ctx, W, H, t, o);
  if (this === s1today.scene && S1.paths && r.info?.hands) {
    this.trail ??= [];
    if (this.trail.length && t < this.trail.at(-1).t) this.trail.length = 0;
    const hnd = r.info.hands.reduce((a, b) => (a.y < b.y ? a : b));
    this.trail.push({ t, p: [hnd.x, hnd.y] });
    while (this.trail.length && t - this.trail[0].t > 1400) this.trail.shift();
    pathLine(ctx, this.trail.map((e) => e.p), "#ffb36b");
  }
  return r;
};

// the jumpiness meter: how suddenly the hand's speed changes, frame to frame, at 30 a second
// (the average change in acceleration, relative to the average speed; lower is smoother)
function jumpiness(pts) {
  const d = (a, b) => [b[0] - a[0], b[1] - a[1]];
  const v = pts.slice(1).map((p, i) => d(pts[i], p)), a = v.slice(1).map((p, i) => d(v[i], p)), j = a.slice(1).map((p, i) => d(a[i], p));
  const mean = (xs) => xs.reduce((s, x) => s + Math.hypot(x[0], x[1]), 0) / xs.length;
  return (mean(j) / mean(v)) * 100;
}
setTimeout(() => {
  const T = s1today.scene, L = s1lab.scene, step = 1000 / 30;
  const todayPts = [], labPts = [];
  for (let t = 0; t < T.len; t += step) {
    const { state, perf } = T.frame(t), rc = new RecordingCtx(600, 600);
    const info = drawCharacter(rc, T.c.card, { look: T.c.look, S: 1, state, mirror: perf.facing === "left" });
    const h = info.hands[1]; todayPts.push([h.x, h.y]); // the front (waving) hand, as on the lab side
  }
  for (let t = 0; t < L.len; t += step) labPts.push(L.frames(t).F[0].hand("F"));
  const a = jumpiness(todayPts), b = jumpiness(labPts), max = Math.max(a, b);
  $("m1").innerHTML = `<b>Jumpiness of the hand</b> (how suddenly its speed changes between frames; lower is smoother)
    <div class="bars"><span>Today</span><i style="--w:${(a / max) * 100}%"></i><em>${a.toFixed(0)}</em>
    <span>Lab</span><i class="lab" style="--w:${(b / max) * 100}%"></i><em>${b.toFixed(0)}</em></div>`;
}, 400);

// 2 · knees and feet
const S2 = { bones: true };
new Stage($("c2a"), () => new TodayScene({ who: "chloe", move: "sit-down-up", view: 0 }), { blur: false });
new Stage($("c2b"), () => new LabScene({ cast: [{ who: "chloe" }], builder: MV.sitStand }), { draw: () => ({ bones: S2.bones }) });
toggle("t2bones", "bones", S2);

// 2b · faces turning: the face turning all the way with the body (today) vs held at three-quarter (lab)
let who2b = "chloe";
const s2b = [2, 0.9].map((headMax, i) => new Stage($("c2b" + "ab"[i]), () => new LabScene({ cast: [{ who: who2b, headMax }], builder: MV.turn, unit: 0.66 }), { blur: false }));
chips("k2b", [{ label: "Chloe", who: "chloe" }, { label: "Margo", who: "margo" }, { label: "Lucas", who: "lucas" }, { label: "Amber", who: "amber" }], (it) => { who2b = it.who; s2b.forEach((s) => { s.rebuild(); s.t = 0; }); });

// 3 · variety
const VARIETY = [
  { label: "Jump", who: "chloe", lab: MV.jump, today: "cheer" },
  { label: "Kick", who: "lucas", lab: MV.kick, today: null, note: "No kick today:\nlegs can't plant or balance" },
  { label: "Dance to the beat", who: "chloe", lab: MV.dance, today: "dance" },
  { label: "Faint + cartoon get-up", who: "amber", x: 0.42, lab: MV.faint, today: null, note: "No falls today:\nthe body can't leave upright" },
];
let v3 = VARIETY[0];
const s3a = new Stage($("c3a"), () => new TodayScene({ who: v3.who, move: v3.today, view: 0.2, note: v3.note }), { blur: false });
const s3b = new Stage($("c3b"), () => new LabScene({ cast: [{ who: v3.who, x: v3.x ?? 0 }], builder: v3.lab }));
chips("k3", VARIETY, (it) => { v3 = it; s3a.rebuild(); s3b.rebuild(); s3a.t = s3b.t = 0; });

// 4 · two people
const PAIRS = [
  { label: "Handshake", cast: ["chloe", "lucas"], b: PR.handshake },
  { label: "Hug", cast: ["chloe", "margo"], b: PR.hug },
  { label: "Pat on the head", cast: ["chloe", "young_amber"], shrink: [1, 0.8], b: PR.headPat },
  { label: "Playing catch", cast: ["amber", "lucas"], b: PR.playCatch },
];
let p4 = PAIRS[0];
const s4 = new Stage($("c4"), () => new LabScene({ cast: p4.cast.map((who, i) => ({ who, shrink: p4.shrink?.[i] })), pair: p4.b, unit: 0.62 }));
chips("k4", PAIRS, (it) => { p4 = it; s4.rebuild(); s4.t = 0; });

// 5 · wind
const WINDS = [
  { label: "Calm", wind: { strength: 0 } },
  { label: "Breeze", wind: { strength: 0.55, gusty: 0.4, dir: 1 } },
  { label: "Gusty", wind: { strength: 1.25, gusty: 1, dir: 1 } },
  { label: "Jump in the wind", wind: { strength: 0.8, gusty: 0.6, dir: -1 }, move: MV.jump },
];
let w5 = WINDS[2];
const S5 = { modesty: true };
const s5a = new Stage($("c5a"), () => new TodayScene({ who: "chloe", move: w5.move ? "cheer" : "waiting", view: 0.35, follow: true }), { blur: false });
const s5b = new Stage($("c5b"), () => new LabScene({ cast: [{ who: "chloe" }], builder: w5.move ?? MV.windStand, wind: w5.wind, leaves: w5.wind.strength > 0 }), { draw: () => ({ modesty: S5.modesty }) });
chips("k5", WINDS, (it) => { w5 = it; s5a.rebuild(); s5b.rebuild(); s5a.t = s5b.t = 0; }, 2);
toggle("t5mod", "modesty", S5);

// 6 · fake 3D (Ak, 4 Nov: "can we imitate a 3D look with fake shading?"): the same movement,
// flat on the left, each part shaded as what it is on the right (paint.mjs form)
let who6 = "chloe";
// three strengths: none, a hint (Ak: "less aggressive and more detailed"), fuller
// and the hint with the clay details (Ak, 5 Nov: "yes, build them"): contact shadows, warm skin edges, shine spots, soft creases
// the clay strength (Ak, 5 Nov: "stronger first"): the first try was 1/1.7 of today's standard
// Ak, 5 Nov: "stronger clay, full 3D, just tone down the hands, arms and legs" = the new Red Flag look
const s6 = [[0.5, false, 1], [0.5, true, 1], [1, true, 0.5], [1, false, 1]].map(([form, detail, limbs], i) => new Stage($("c6" + "abcd"[i]), () => new LabScene({ cast: [{ who: who6, form, detail, limbs }], builder: MV.wave, unit: 0.66 }), { blur: false }));
// the slow turn in the new look (Ak: "have a character turn slowly with this look to see if there are issues"):
// the head turns all the way here, as it does on a walk, a hug or a handshake
const s6t = new Stage($("c6t"), () => new LabScene({ cast: [{ who: who6, x: -0.36, headMax: 2 }, { who: who6 === "lucas" ? "chloe" : "lucas", x: 0.36, headMax: 2 }], builder: MV.turnSlow, unit: 0.62 }), { blur: false });
chips("k6", [{ label: "Chloe", who: "chloe" }, { label: "Amber", who: "amber" }, { label: "Young Amber", who: "young_amber" }, { label: "Lucas", who: "lucas" }, { label: "Margo", who: "margo" }], (it) => { who6 = it.who; [...s6, s6t].forEach((s) => { s.rebuild(); s.t = 0; }); });

// 7 · the wow reel: a reveal, a reaction zoom, the RED FLAG frame, a whip pan
const k = (t, p = {}) => ({ t, ...p });
const WOW_LEN = 9000;
// two strengths (Ak, 4 Nov: "too obvious, and we are doing subtle"): SUBTLE for the Sunday
// show, LOUD for the clips shown in the discussions on the other days
const wowScene = (subtle) => {
  const lucas = (r) => ({ view: 1.2, len: WOW_LEN, keys: [
    k(0, { ...r, view: 1.2, hF: [0.16, 0.12], face: { smile: 0.4 } }),
    k(900, { hF: [0.19, 0.04], hands: { F: "open" }, tilt: 4 }), k(1700, { hF: [0.14, 0.15], tilt: -3 }), k(2500, { hF: [0.2, 0.02], tilt: 5 }),
    k(3000, { hF: [0.12, 0.2], face: { smile: 0.7, brows: "raised" } }),
    // after the flag: caught out, a sheepish shrug
    // caught out: a small shrug, hands out low with the palms up, elbows close to the body
    k(5600, { hF: [0.12, 0.15], hB: [0.1, 0.16], eF: [-0.6, 1], eB: [-0.6, 1], nod: 0.05, tilt: -8, hands: { F: "open", B: "open" }, face: { smile: 0.2, brows: "worried" }, ease: "pop" }),
    k(7600, {}), k(WOW_LEN, { ...r, view: 1.2 }),
  ] });
  const chloe = (r) => ({ view: 1.2, len: WOW_LEN, keys: [
    k(0, { ...r, view: 1.2, face: { smile: 0.5, brows: "happy" } }),
    k(2900, { tilt: 3 }),
    // the reaction: a snap back, eyes wide
    k(3150, { lean: -0.12, tilt: -10, nod: -0.04, hF: [0.06, 0.22], face: { lids: "wide", brows: "raised", smile: -0.2 }, ease: "pop" }),
    k(5300, { lean: -0.08 }),
    // then arms folded, unimpressed
    k(5800, { lean: 0, tilt: -4, hF: [0.07, 0.14], hB: [0.08, 0.12], eF: [-0.4, 1], eB: [-0.4, 1], face: { lids: "half", brows: "angry", smile: -0.35 }, ease: "inOut" }),
    k(WOW_LEN - 600, {}), k(WOW_LEN, { ...r, view: 1.2 }),
  ] });
  const sc = new LabScene({
    cast: [{ who: "chloe", x: -0.42, move: null }, { who: "lucas", x: 0.42, mirror: true }],
    pair: (rA, rB) => ({ id: "wow", len: WOW_LEN, actors: [{ x: -0.42, mirror: false, move: chloe(rA) }, { x: 0.42, mirror: true, move: lucas(rB) }],
      // folded arms: both forearms cross in front of the chest
      order: (t) => [{ actor: 0, front: t > 5600 ? ["B"] : null }, { actor: 1, front: t > 5500 && t < 7900 ? ["B"] : null }] }),
    unit: 0.55,
    camera: (t) => {
      const ease = (k) => k * k * (3 - 2 * k);
      if (subtle) {
        // a slow drift in, an unhurried push in on her face, a slow pan to him, back out; no shake
        // Ak, 5 Nov 2026: on the Sunday show the red flag moves the camera "a tiny tiny bit": as the
        // flag goes up the camera leans in 5% and tips under a degree, then eases back
        let x = lerp(-0.1, 0.02, clamp(t / 3000)), zoom = lerp(0.9, 0.98, clamp(t / 3000)), y = 0;
        const nudge = ease(clamp((t - 3550) / 900)) * (1 - ease(clamp((t - 5600) / 1400)));
        x = lerp(x, -0.06, nudge); zoom *= 1 + 0.05 * nudge; y = lerp(0, -0.03, nudge);
        return { x, y, zoom, rot: -0.014 * nudge, mood: nudge * 0.25 };
      }
      // a slow push-in, the reaction zoom with a shake, the impact, a whip pan to him, back out
      let x = lerp(-0.1, 0.05, clamp(t / 3000)), zoom = lerp(0.82, 1, clamp(t / 3000)), y = 0;
      const zIn = clamp((t - 3080) / 160), zOut = clamp((t - 5150) / 160);
      x = lerp(x, -0.42, zIn); zoom = lerp(zoom, 2.1, zIn); y = lerp(0, -0.55, zIn);
      const pan = clamp((t - 5150) / 260);
      x = lerp(x, 0.42, pan); zoom = lerp(zoom, 1.7, zOut); y = lerp(y, -0.5, zOut);
      const back = ease(clamp((t - 7000) / 1400));
      x = lerp(x, 0, back); zoom = lerp(zoom, 0.9, back); y = lerp(y, 0, back);
      const shake = Math.max(0, 1 - Math.abs(t - 3250) / 400) * 9;
      return { x, y, zoom, shakeX: Math.sin(t * 0.13) * shake, shakeY: Math.cos(t * 0.17) * shake, mood: clamp((t - 5300) / 600) * (1 - clamp((t - 7600) / 900)) * 0.7 };
    },
    extras: (i, t) => ({ talk: i === 1 && t < 3000, gaze: i === 0 && t > 3100 && t < 5300 ? 0.9 : undefined }),
  });
  // the impact frame over everything, with a flag on the wind
  // a big flag for the loud frame, a tiny one for the Sunday show
  const flag = subtle ? new Flag(9, 6, 0.5, 0.3) : new Flag(13, 8, 0.85, 0.5);
  let flagT = -1;
  sc.overlay = (ctx, W, H, t, V, F, passes) => {
    const stepFlag = (strength) => {
      if (t < flagT - 300 || flagT < 0) { flag.p.forEach((p, i) => { p[0] = (i % flag.cols) * flag.dx; p[1] = Math.floor(i / flag.cols) * flag.dy; }); flag.q = flag.p.map((p) => p.slice()); flagT = 3350; }
      while (flagT < t) { flag.step([0, 0], { strength, gusty: 0.8, dir: 1 }, flagT / 1000); flagT += 1000 / 120; }
    };
    if (subtle) {
      // a small flag pops up over her head and flutters, a faint red breath at the edges; nothing freezes
      const k2 = clamp((t - 3500) / 200) * (1 - clamp((t - 5300) / 300));
      if (k2 > 0) {
        // a tiny exclamation mark appears over her head, then the flag is RAISED up it (not waved)
        stepFlag(0.45);
        const top = F[0].headTop(), [x, y] = V.toScreen([top[0] + 0.05, top[1] - 0.1]);
        const hoist = clamp((t - 3700) / 900), eased = hoist * hoist * (3 - 2 * hoist);
        ctx.save(); ctx.globalAlpha = k2; ctx.translate(x, y);
        FR.flagMast(ctx, flag, [0, 0], V.S * 0.085, eased);
        ctx.restore();
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        g.addColorStop(0, "rgba(255,40,60,0)"); g.addColorStop(1, `rgba(200,0,30,${0.28 * k2})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    } else {
      const kIn = clamp((t - 3350) / 120), kOut = 1 - clamp((t - 5000) / 140), k2 = kIn * kOut;
      if (k2 > 0) {
        stepFlag(1.5);
        const ch = passes.find((p) => p.p.actor === 0);
        const [fx, fy] = V.toScreen([ch.a.x, 0]);
        const slide = (1 - clamp((t - 3350) / 260)) * W * 0.6;
        FR.impact(ctx, W, H, k2, { t: t / 1000, figure: ch.L, fx: fx - ch.ox, fy: fy - ch.oy, flag, flagAt: [W * 0.66 + slide, H * 0.08], unit: H * 0.36 });
      }
    }
    // a sweat drop on him after the flag
    if (t > 5600 && t < 7800) {
      const h = F[1].headTop(), [x, y] = V.toScreen([h[0] - 0.09, h[1] + 0.06 + clamp((t - 5600) / 2000) * 0.05]);
      ctx.save(); ctx.fillStyle = "#8fd3ff"; ctx.strokeStyle = "#1b3f6a"; ctx.lineWidth = 2;
      const r = V.S * 0.022;
      ctx.beginPath(); ctx.moveTo(x, y - r * 2.2); ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.3, x, y + r); ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.3, x, y - r * 2.2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // the whip pan: streaks across the frame
    const whip = subtle ? 0 : Math.max(0, 1 - Math.abs(t - 5280) / 140);
    if (whip > 0) { ctx.save(); ctx.globalAlpha = whip * 0.5; ctx.filter = `blur(${8 * whip}px)`; ctx.drawImage(ctx.canvas, -W * 0.03 * whip, 0); ctx.restore(); }
    FR.foreground(ctx, W, H, sc.camera(t), H * 0.55, t / 1000);
  };
  return sc;
};
let loud7 = false;
const s7 = new Stage($("c7"), () => wowScene(!loud7), { pad: 400 });
chips("k7", [{ label: "Subtle · the Sunday show", loud: false }, { label: "Loud · clips on discussion days", loud: true }], (it) => { loud7 = it.loud; s7.rebuild(); s7.t = 0; });

// 8 · words on screen: four text styles, and four transitions between two shots ------------------------------
// canvas text needs its fonts loaded first (nothing on the page asks for these two)
document.fonts?.load('40px "Permanent Marker"'); document.fonts?.load("40px Bangers");
// the two shots: a close-up of each, talking, in the hint of 3D, each on its own wall
const shot = (who, wall, mirror) => {
  const c = cardOf(who), a = new Actor({ ...c, mirror, move: buildFor(c.card, c.look, MV.windStand), seed: who.length });
  return (ctx, W, H, t, talking = true) => {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.35, H * 0.1, W * 0.5, H * 0.5, W * 0.8);
    g.addColorStop(0, wall[0]); g.addColorStop(1, wall[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const F = a.solve(a.poseAt(t), t);
    return drawCharacter(ctx, c.card, { look: c.look, S: H * 1.55, x: W / 2, y: H * 1.62, mirror, state: a.drawState(F, { talk: talking, gazeAt: 0.2 }) });
  };
};
const shotA = shot("chloe", ["#f4c9a8", "#9a5a52"], false), shotB = shot("lucas", ["#a9c4d8", "#3d5a70"], true);
const s8t = new Stage($("c8t"), () => transitionScene(shotA, shotB), { pad: 0 });
// subtitles over the talking shots (Ak, 5 Nov: "we need it more for subtitles than for call to action")
for (const [id, style] of [["c8a", "classic"], ["c8b", "karaoke"], ["c8c", "kinetic"], ["c8d", "drama"]]) new Stage($(id), () => subtitleScene(style, { chloe: shotA, lucas: shotB }), { pad: 300 });

// ---- top bar --------------------------------------------------------------------------------------------
$("play").onclick = () => { UI.playing = !UI.playing; $("play").textContent = UI.playing ? "❚❚ Pause" : "▶ Play"; };
$("speed").onchange = (e) => { UI.speed = +e.target.value; };
$("fps").onchange = (e) => { UI.fps = +e.target.value; };
$("blur").onchange = (e) => { UI.blur = e.target.checked; };
$("look").onchange = (e) => { UI.look = e.target.value; stages.forEach((s) => s.rebuild()); };
$("restart").onclick = () => stages.forEach((s) => { s.t = 0; s.last = -1; });

// the dance beat: a little drum machine, in time with the dancer
let audio = null, lastBeat = -1;
$("beat").onclick = () => {
  UI.beat = !UI.beat; $("beat").classList.toggle("on", UI.beat);
  if (UI.beat && !audio) audio = new AudioContext();
};
function drum(kind) {
  if (!audio) return;
  const now = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
  o.connect(g); g.connect(audio.destination);
  if (kind === "kick") { o.frequency.setValueAtTime(140, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.12); g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.18); }
  else { o.type = "square"; o.frequency.setValueAtTime(6000, now); g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04); }
  o.start(now); o.stop(now + 0.2);
}

let prev = performance.now();
function loop(now) {
  const dt = Math.min(100, now - prev); prev = now;
  for (const s of stages) s.tick(dt);
  // drum in step with the lab dancer
  if (UI.beat && v3.lab === MV.dance && s3b.visible) {
    const beat = s3b.scene.actors[0].move.beat, b = Math.floor(s3b.t / beat);
    if (b !== lastBeat && s3b.t < s3b.scene.len - 900) { drum("kick"); setTimeout(() => drum("hat"), beat / 2 / UI.speed); lastBeat = b; }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// a contact sheet of one stage at chosen moments (for checking frame by frame)
function sheet(i, times, { cols = 4, size = 300 } = {}) {
  const st = stages[i], rows = Math.ceil(times.length / cols);
  const cv = document.createElement("canvas");
  const ar = st.el.clientHeight / st.el.clientWidth;
  cv.width = cols * size; cv.height = Math.round(rows * size * ar);
  const c = cv.getContext("2d"), w = size, h = Math.round(size * ar);
  const tmp = document.createElement("canvas"); tmp.width = w * 2; tmp.height = h * 2;
  let prevT = -1;
  for (const [n, t] of times.entries()) {
    // run the physics up to this moment like playback would
    if (st.scene instanceof LabScene && t < prevT) st.scene.build();
    const tc = tmp.getContext("2d"); tc.setTransform(1, 0, 0, 1, 0, 0);
    st.scene.draw(tc, w * 2, h * 2, t, { ...st.opts.draw?.() });
    c.drawImage(tmp, (n % cols) * w, Math.floor(n / cols) * h, w, h);
    c.fillStyle = "#000a"; c.fillRect((n % cols) * w, Math.floor(n / cols) * h, 64, 20);
    c.fillStyle = "#fff"; c.font = "12px Sora"; c.fillText(Math.round(t) + " ms", (n % cols) * w + 4, Math.floor(n / cols) * h + 14);
    prevT = t;
  }
  let ov = document.getElementById("sheet");
  if (!ov) { ov = document.createElement("div"); ov.id = "sheet"; ov.style.cssText = "position:fixed;inset:0;z-index:99;background:#000e;display:grid;place-items:center;overflow:auto"; ov.onclick = () => ov.remove(); document.body.append(ov); }
  ov.innerHTML = ""; cv.style.cssText = "max-width:100%;max-height:100%"; ov.append(cv);
  return { len: st.scene.len };
}
window.__lab = { stages, UI, sheet, dbg: { drawCharacter, cardOf } };
