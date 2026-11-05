// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): one character on the stage. Puts the layers together:
// the move's keys (anim.mjs) → a pose with an animator's touch → the body
// solver (body.mjs) → contacts with a partner → loose parts with physics
// (physics.mjs) → the state drawCharacter needs. Also: blinks, eye darts,
// and where every part is on the stage (for contacts, smears, the camera).
//
// Stage units are body heights; x right, y down, the floor at y = 0.
// ---------------------------------------------------------------------------

import { solveRig } from "../core/rig.mjs";
import { hash } from "../core/math.mjs";
import { clamp, compileMove, lerp, noise1, poseAt, scalePose } from "./anim.mjs";
import { restPose, solvePose } from "./body.mjs";
import { Loose, STEP } from "./physics.mjs";

/** Build a move for a card: builders are written against the rest pose of the move's own view. */
export const HEAD_MAX = 0.9;

export function buildFor(card, look, builder, opts) {
  const probe = builder(restPose(card, look, 0), opts);
  return builder(restPose(card, look, probe.view ?? 0), opts);
}

export class Actor {
  constructor({ card, look, x = 0, mirror = false, move, seed = 0, physics = true, alive = 1, loose = 1 }) {
    Object.assign(this, { card, look, x, mirror, seed, alive, looseness: loose });
    this.h = card.height ?? 1;
    this.m = mirror ? -1 : 1;
    this.loose = physics ? new Loose(card) : null;
    this.simT = -1;
    if (move) this.setMove(move);
  }
  setMove(move) {
    this.move = compileMove(move, restPose(this.card, this.look, move.view ?? 0));
    this.props = move.props ?? [];
  }

  /** The pose at t (ms), scaled, with any extras (a sway, a nod pressed by a partner). */
  poseAt(t, extra = {}) {
    const p = scalePose(poseAt(this.move, t, { seed: this.seed, alive: this.alive, loose: this.looseness }), this.h);
    if (extra.sway) p.hip[0] += extra.sway;
    if (extra.nod) { p.tilt += extra.nod[0]; p.nod += extra.nod[1]; }
    if (extra.hands) p.hands = { ...p.hands, ...extra.hands };
    return p;
  }

  /** Solve a pose: the rig's joints plus the body solver; returns a frame. */
  solve(pose, t) {
    const sol = solvePose(this.card, this.look, pose);
    const base = { t: t / 1000, joints: sol.joints, breath: pose.breath };
    const sk = sol.adjust(solveRig(this.card, this.look, base));
    return this.frame(pose, sol, sk, t);
  }

  frame(pose, sol, sk, t) {
    const self = this, m = this.m, sq = pose.squash ?? 0, rot = (pose.rot ?? 0) * m;
    const sx = 1 / Math.sqrt(1 + sq), sy = 1 + sq, c = Math.cos(rot), s = Math.sin(rot);
    // body space → stage: the rig's shift, the mirror, squash and rotation about the feet
    const toWorld = ([lx, ly]) => {
      const px = m * (lx + sk.root[0]) * sx, py = (ly + sk.root[1]) * sy;
      return [self.x + px * c - py * s, px * s + py * c];
    };
    const toLocal = ([wx, wy]) => {
      const dx = wx - self.x, dy = wy;
      const px = (dx * c + dy * s) / sx, py = (-dx * s + dy * c) / sy;
      return [px * m - sk.root[0], py - sk.root[1]];
    };
    const F = {
      t, pose, sol, sk, toWorld, toLocal, rot, squash: sq, actor: this,
      hand: (w) => toWorld(sk.arms[w === "B" ? 0 : 1].ha),
      handsMid() { const a = F.hand("F"), b = F.hand("B"); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; },
      back: () => toWorld([sk.neck[0] - (sk.side > 0.5 ? 0.02 : sk.sx * 0.9), sk.sy + 0.07]),
      headTop: () => toWorld([sk.head[0], sk.head[1] - sk.ry * 1.05]),
      head: () => toWorld(sk.head),
      feet: () => sk.legs.map((l) => toWorld(l.foot)),
    };
    return F;
  }

  /** Lock hands to stage points: [{hand: "F"|"B", at: [x, y], w}]. Returns a re-solved frame. */
  withContacts(F, contacts) {
    if (!contacts.length) return F;
    const { pose, sol, sk } = F;
    const turned = pose.view >= 1; // the same hand convention as body.mjs
    for (const c of contacts) {
      const arm = sk.arms[c.hand === "B" ? 0 : 1];
      const T = F.toLocal(c.at);
      const rel = [(T[0] - arm.sh[0]) * (turned ? 1 : arm.dir), T[1] - arm.sh[1]];
      const key = c.hand === "B" ? "hB" : "hF";
      pose[key] = [lerp(pose[key][0], rel[0], c.w), lerp(pose[key][1], rel[1], c.w)];
    }
    const sk2 = sol.adjust(solveRig(this.card, this.look, { t: F.t / 1000, joints: sol.joints, breath: pose.breath }));
    return this.frame(pose, sol, sk2, F.t);
  }

  /** Physics: step the hair and hem from the last time stepped up to t (catching up from 0 after a jump back). */
  simulate(F, t, wind, sampleAt) {
    if (!this.loose) return;
    if (t < this.simT - 1 || this.simT < 0) { this.loose = new Loose(this.card); this.simT = 0; this.prevW = null; }
    const W = this.world(F, wind);
    // a long gap (the page jumped): solve the body at 30 a second on the way, so the hair has a history
    if (t - this.simT > 120 && sampleAt) {
      for (let tt = this.simT; tt < t - 34; tt += 33) {
        const Wt = this.world(sampleAt(tt), wind);
        for (let s = 0; s < 4; s++) this.loose.step(Wt, (tt + s * STEP * 1000) / 1000);
        this.simT = tt + 33;
      }
    }
    const prev = this.prevW ?? W, n = Math.max(0, Math.round((t - this.simT) / (STEP * 1000)));
    for (let i = 1; i <= n; i++) this.loose.step(mixWorld(prev, W, i / n), (this.simT + i * STEP * 1000) / 1000);
    this.simT += n * STEP * 1000;
    this.prevW = W;
  }

  world(F, wind) {
    const { sk } = F, h = F.toWorld(sk.head), w = F.toWorld([0, sk.waistY]);
    return {
      head: { x: h[0], y: h[1], rot: sk.rot * this.m + F.rot, rx: sk.rx, ry: sk.ry },
      waist: { x: w[0], y: w[1], hx: sk.hx, y0: sk.waistY },
      legs: sk.legs.map((l) => [F.toWorld(l.hip), F.toWorld(l.knee), F.toWorld(l.foot)]),
      legR: sk.legW * 0.6 + 0.012, mirror: this.mirror, wind, view: sk.v,
    };
  }

  /** The state drawCharacter wants for a frame. */
  drawState(F, { talk = false, hands = null, gazeAt = null } = {}) {
    const { pose, sol, t } = F;
    const face = pose.face ?? {};
    const ts = t / 1000;
    // blinks every 2.5–4.5 s, three frames shut; a face that closes its eyes keeps them shut
    const period = 2.5 + hash(Math.floor(ts / 3.5), this.seed + 3) * 2;
    const bp = (ts + this.seed * 0.71) % period;
    const blink = bp < 0.045 ? "half" : bp < 0.11 ? "closed" : bp < 0.15 ? "half" : "open";
    const lids = face.lids ?? blink;
    // eye darts: the gaze jumps to a new spot every second or two (a person's eyes never glide)
    const dart = Math.floor(ts / 1.3 + hash(this.seed, 5));
    const gaze = gazeAt ?? (0.35 + (hash(dart, this.seed + 17) - 0.5) * 0.9);
    const mouth = talk ? talkMouth(t) : { from: 0, to: 0, mix: 1 };
    const fields = this.loose?.fields() ?? {};
    const ear = this.loose?.hair ? clamp((this.loose.hair[1].p[5][0] - this.loose.hair[1].p[0][0]) * 4 * this.m, -0.8, 0.8) : 0;
    return {
      t: ts, view: pose.view, joints: sol.joints, adjust: (sk) => F.sk,
      // the face never turns past three-quarter: the body can go to profile, the face cheats to camera
      headView: Math.min(pose.view, pose.headView ?? this.headMax ?? HEAD_MAX),
      hands: { ...pose.hands, ...(hands ?? {}) }, props: this.props,
      smile: face.smile ?? 0,
      // a sad, hurt or fainted face drops the card's built-in resting smile
      mouthRest: (face.smile ?? 0) < 0 ? 0 : undefined,
      lid: { from: lids, to: lids, mix: 1 },
      brows: { left: face.brows ?? "serious", right: face.brows ?? "serious" },
      mouth, gaze, breath: pose.breath, talk: talk ? 1 : 0,
      follow: this.loose ? { ...fields, ear } : null,
    };
  }
}

function mixWorld(a, b, k) {
  const L = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  return {
    ...b,
    head: { ...b.head, x: lerp(a.head.x, b.head.x, k), y: lerp(a.head.y, b.head.y, k), rot: lerp(a.head.rot, b.head.rot, k) },
    waist: { ...b.waist, x: lerp(a.waist.x, b.waist.x, k), y: lerp(a.waist.y, b.waist.y, k) },
    legs: b.legs.map((leg, i) => leg.map((p, j) => L(a.legs[i][j], p))),
  };
}

// TALKING (5 Nov 2026): speech is syllables, not random shapes. Each syllable (140–230 ms, about
// five a second) opens on a vowel and closes towards a consonant; every change blends over 70 ms
// (at least two frames, never a snap), lips shut fully for M/B/P now and then, and a phrase ends
// in a rest. Lip-sync practice (Rhubarb, Animation Mentor): hold a shape ≥ 2 frames, blend
// through in-betweens, always close on M/B/P.
const OPEN = [1, 10, 2, 12, 3, 11, 1, 10];
const CLOSE = [0, 5, 6, 7, 8, 12, 0, 4];
const BLEND = 70;
function talkTrack(t) {
  const phrase = 3200, pt = ((t % phrase) + phrase) % phrase, n = Math.floor(t / phrase);
  if (pt > 2600) return [{ at: 2600, id: 0 }];
  const out = [];
  let tt = 0, i = 0;
  while (tt < 2600) {
    const len = 140 + hash(n * 97 + i, 11) * 90;
    out.push({ at: tt, id: OPEN[Math.floor(hash(n * 97 + i, 13) * OPEN.length)] });
    out.push({ at: tt + len * 0.62, id: CLOSE[Math.floor(hash(n * 97 + i, 17) * CLOSE.length)] });
    tt += len; i++;
  }
  return out;
}
function talkMouth(t) {
  const phrase = 3200, pt = ((t % phrase) + phrase) % phrase;
  const tr = talkTrack(t);
  let j = 0;
  while (j < tr.length - 1 && tr[j + 1].at <= pt) j++;
  const cur = tr[j], prev = tr[j - 1] ?? { id: 0 };
  const k = Math.min(1, (pt - cur.at) / BLEND), s = k * k * (3 - 2 * k);
  return { from: prev.id, to: cur.id, mix: pt > 2600 ? Math.min(1, (pt - 2600) / 140) : s };
}
export { noise1 };
