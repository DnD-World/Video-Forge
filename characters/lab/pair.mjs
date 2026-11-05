// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): two people touching. Each scene gives both actors a
// move (anim.mjs keys: steps, leans, faces), and CONTACTS: at any moment a
// hand can be locked to a point on the other person (their hand, the back
// of their shoulders, the top of their head) or to a ball in the air. The
// page solves the partner first, reads where that point is on the stage,
// and turns it into the hand's target (lab.mjs `contact`).
//
// Draw order matters for a hug: each person's near arm goes round the
// other's back IN FRONT of them, the far arm goes BEHIND. `order(t)` says.
// ---------------------------------------------------------------------------

import { clamp, lerp } from "./anim.mjs";
import { GRAVITY } from "./physics.mjs";

const k = (t, pose = {}) => ({ t, ...pose });
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const HAPPY = { smile: 0.85, brows: "happy" };

// stepping in: the body moves by dx in three keys, feet one after the other
function stepIn(r, t0, dx, ms = 700) {
  return [
    k(t0, { fF: r.fF, fB: r.fB, hip: [0, 0] }),
    k(t0 + ms * 0.45, { fF: [r.fF[0] + dx, 0], hip: [dx * 0.55, 0], ease: "inOut" }),
    k(t0 + ms, { fB: [r.fB[0] + dx, 0], hip: [dx, 0], ease: "inOut" }),
  ];
}

// ---- handshake ----------------------------------------------------------------------------------------
// Right hands (Ak, 4 Nov: "it seems to be with the left hand of the girl"). Facing
// right, a person shows us their left side, so her right hand is the far arm (B);
// he faces left, so his right hand is the near arm (F).
export function handshake(rA, rB) {
  const v = 1.45, gap = 0.66, step = 0.08; // bodies turned to each other, an arm's length apart
  const actor = (r, h) => {
    const hk = h === "F" ? "hF" : "hB", ek = h === "F" ? "eF" : "eB";
    return {
      view: v, len: 5200,
      keys: [
        k(0, { ...r, view: v }),
        ...stepIn(r, 300, step),
        k(1150, { [hk]: [0.17, 0.13], [ek]: [0.3, 1], face: HAPPY, tilt: 3, ease: "inOut" }),
        k(3150, { [hk]: [0.17, 0.13] }),
        // letting go: the hand draws back towards its own body first, then drops
        k(3450, { [hk]: [0.09, 0.17], ease: "inOut" }),
        k(3900, { [hk]: r[hk], [ek]: r[ek], tilt: 0, ease: "inOut" }),
        k(5200, { face: { smile: 0.5, brows: "serious" } }),
      ],
    };
  };
  return {
    id: "handshake", label: "Handshake", len: 5200,
    actors: [{ x: -gap / 2, mirror: false, move: actor(rA, "B") }, { x: gap / 2, mirror: true, move: actor(rB, "F") }],
    // both right hands meet halfway, then pump together
    contacts(t, A) {
      const w = ramp(t, 1050, 1350) * (1 - ramp(t, 3150, 3350));
      if (w <= 0) return [];
      const ha = A[0].hand("B"), hb = A[1].hand("F");
      const pump = Math.sin(((t - 1400) / 330) * Math.PI * 2) * 0.022 * ramp(t, 1350, 1500) * (1 - ramp(t, 2900, 3100));
      // halfway between the two people (not between the hands, or the shorter reach loses)
      const meet = [(A[0].head()[0] + A[1].head()[0]) / 2, (ha[1] + hb[1]) / 2 + pump];
      return [{ actor: 0, hand: "B", at: meet, w }, { actor: 1, hand: "F", at: meet, w }];
    },
    // only the shaking hand grips: her right (B), his right (F)
    hands: (t, i) => (t > 1250 && t < 3300 ? (i === 0 ? { B: "grip" } : { F: "grip" }) : null),
    // her right arm crosses in front of her chest while it reaches for his hand
    order: (t) => [{ actor: 0, front: t > 800 && t < 3800 ? ["B"] : null }, { actor: 1 }],
  };
}

// ---- hug ----------------------------------------------------------------------------------------------
export function hug(rA, rB) {
  const v = 1.6, gap = 0.72, step = 0.22;
  const actor = (r) => ({
    view: v, len: 6400,
    keys: [
      k(0, { ...r, view: v, face: HAPPY }),
      // arms open on the way in (anticipation)
      ...stepIn(r, 250, step, 800),
      k(700, { hF: [0.16, -0.02], hB: [0.16, -0.0], eF: [0.6, 1], eB: [0.6, 1], tilt: 4, ease: "inOut" }),
      k(1250, { hF: [0.2, 0.06], hB: [0.2, 0.08], lean: 0.1, tilt: 10, face: { smile: 0.9, lids: "closed", brows: "happy" }, ease: "inOut" }),
      k(4100, { lean: 0.1, tilt: 10 }),
      k(4600, { hF: [0.12, 0.08], hB: [0.12, 0.1], lean: 0, tilt: 4, face: HAPPY, ease: "inOut" }),
      k(5200, { hF: r.hF, hB: r.hB, eF: r.eF, eB: r.eB, tilt: 0 }),
      k(6400, {}),
    ],
  });
  return {
    id: "hug", label: "Hug", len: 6400,
    actors: [{ x: -gap / 2, mirror: false, move: actor(rA) }, { x: gap / 2, mirror: true, move: actor(rB) }],
    // each wraps the other: near hand on the shoulder blade, far hand lower and hidden
    contacts(t, A) {
      const w = ramp(t, 1050, 1400) * (1 - ramp(t, 4300, 4700));
      if (w <= 0) return [];
      const sway = Math.sin(((t - 1400) / 1300) * Math.PI * 2) * 0.008;
      const out = [];
      for (const [me, other] of [[0, 1], [1, 0]]) {
        const back = A[other].back(); // the far side of the other's upper back
        out.push({ actor: me, hand: "F", at: [back[0], back[1] + 0.03 + sway], w });
        out.push({ actor: me, hand: "B", at: [back[0], back[1] + 0.09 - sway], w });
      }
      return out;
    },
    sway: (t) => Math.sin(((t - 1400) / 1300) * Math.PI * 2) * 0.012 * ramp(t, 1400, 1700) * (1 - ramp(t, 3900, 4300)),
    // far arms behind the other person, near arms in front of them
    order: (t) => (t > 1100 && t < 4500
      ? [{ actor: 0, skip: ["F"] }, { actor: 1, skip: ["F"] }, { actor: 0, only: ["F"] }, { actor: 1, only: ["F"] }]
      : [{ actor: 0 }, { actor: 1 }]),
  };
}

// ---- a pat on the head (the taller one pats; the little one closes her eyes) -------------------------------
export function headPat(rA, rB) {
  const v = 1.15, gap = 0.34;
  const PAT = 380, t0 = 1300, n = 5;
  const A = {
    view: v, len: 5600,
    keys: [
      k(0, { ...rA, view: v, face: { smile: 0.6, brows: "happy" } }),
      k(700, { tilt: 8, nod: 0.06, lean: 0.06 }),
      k(1100, { hF: [0.18, -0.02], eF: [1, 0.5], ease: "inOut" }),
      k(t0 + n * PAT, { hF: [0.18, -0.02] }),
      k(t0 + n * PAT + 450, { hF: rA.hF, eF: rA.eF, tilt: 3, nod: 0, lean: 0, ease: "inOut" }),
      k(5600, {}),
    ],
  };
  const B = {
    view: v, len: 5600,
    keys: [
      k(0, { ...rB, view: v, tilt: -4 }),
      k(t0 - 100, { face: { smile: 0.95, lids: "closed", brows: "happy" }, tilt: -6 }),
      k(t0 + n * PAT + 300, { face: { smile: 0.9, lids: "open", brows: "happy" }, tilt: 3 }),
      k(5600, { tilt: 0 }),
    ],
  };
  const press = (t) => (t > t0 && t < t0 + n * PAT ? Math.max(0, Math.sin(((t - t0) / PAT) * Math.PI)) : 0);
  return {
    id: "headpat", label: "Pat on the head", len: 5600,
    actors: [{ x: -gap / 2, mirror: false, move: A }, { x: gap / 2, mirror: true, move: B }],
    contacts(t, act) {
      const w = ramp(t, 1000, 1300) * (1 - ramp(t, t0 + n * PAT, t0 + n * PAT + 300));
      if (w <= 0) return [];
      const top = act[1].headTop();
      return [{ actor: 0, hand: "F", at: [top[0] - 0.035, top[1] - 0.012 + press(t) * 0.012 - (1 - press(t)) * 0.02], w }];
    },
    // each pat presses the little head down a touch (and her hair answers it)
    nod: (t) => [0, press(t) * 0.05],
    hands: (t) => (t > 1100 && t < t0 + n * PAT ? { F: "open" } : null),
    order: () => [{ actor: 1 }, { actor: 0 }],
  };
}

// ---- playing catch: a ball flies on a real arc and is caught in both hands ------------------------------
export function playCatch(rA, rB) {
  const v = 1.5, gap = 1.05, FLIGHT = 900, CYCLE = 2600, throws = 4;
  // the wind-up takes the ball back past the shoulder, low enough to keep the face clear
  const ready = [0.17, 0.08], hold = [0.15, 0.13], wind = [-0.17, 0.02], release = [0.18, -0.1];
  // who holds when: thrower winds up then throws; the other gets ready
  const actor = (r, first) => {
    const keys = [k(0, { ...r, view: v, face: HAPPY })];
    for (let i = 0; i < throws; i++) {
      const T = 300 + i * CYCLE, mine = (i % 2 === 0) === first;
      if (mine) keys.push(
        k(T, { hF: hold, hB: hold, eF: [0.3, 1], eB: [0.3, 1], lean: 0, hands: { F: "open", B: "open" } }),
        k(T + 450, { hF: wind, hB: [0.12, 0.12], lean: -0.1, eF: [-0.3, 1], hip: [-0.02, 0.01], ease: "inOut" }),
        k(T + 650, { hF: release, lean: 0.14, hip: [0.02, 0], ease: "snap" }),
        k(T + 1000, { hF: [0.12, 0.22], hB: [0.08, 0.26], lean: 0.03, eF: [0.5, 1], hip: [0, 0] }),
      );
      else keys.push(
        k(T + 300, { hF: ready, hB: ready, eF: [0.4, 1], eB: [0.4, 1], hip: [0, 0.012], lean: 0.06, hands: { F: "open", B: "open" }, ease: "inOut" }),
        k(T + 650 + FLIGHT + 40, { hF: hold, hB: hold, hip: [-0.02, 0.03], lean: -0.04, face: HAPPY, ease: "pop" }),
        k(T + 650 + FLIGHT + 350, { hip: [0, 0.01], lean: 0 }),
      );
    }
    const len = 300 + throws * CYCLE + 600;
    keys.push(k(len - 400, { hF: r.hF, hB: r.hB, hands: { F: "relaxed", B: "relaxed" } }), k(len, {}));
    return { view: v, keys, len };
  };
  const len = 300 + throws * CYCLE + 600;
  const paths = new Map();
  return {
    id: "catch", label: "Playing catch", len,
    actors: [{ x: -gap / 2, mirror: false, move: actor(rA, true) }, { x: gap / 2, mirror: true, move: actor(rB, false) }],
    // the ball: in the holder's hands, or in flight on a parabola between two hand positions
    ball(t, probe) {
      const i = Math.min(throws - 1, Math.max(0, Math.floor((t - 300) / CYCLE)));
      const T = 300 + i * CYCLE, from = i % 2 === 0 ? 0 : 1, to = 1 - from;
      const rel = T + 650, land = rel + FLIGHT;
      // winding up, the ball goes with the throwing hand; otherwise it sits between both hands
      if (t < rel) { const hand = t > T + 250 ? "F" : null, f = probe(from, t); return { at: hand ? f.hand(hand) : f.handsMid(), held: from, hand }; }
      if (t >= land) {
        if (i === throws - 1 || t < T + CYCLE) return { at: probe(to, t).handsMid(), held: to, caught: t - land };
      }
      let P = paths.get(i);
      if (!P) {
        const a = probe(from, rel).hand("F"), b = probe(to, land).handsMid();
        const s = FLIGHT / 1000, vx = (b[0] - a[0]) / s, vy = (b[1] - a[1] - 0.5 * GRAVITY * s * s) / s;
        P = { a, vx, vy }; paths.set(i, P);
      }
      const s = (t - rel) / 1000;
      return { at: [P.a[0] + P.vx * s, P.a[1] + P.vy * s + 0.5 * GRAVITY * s * s], spin: s * 9 * (from ? -1 : 1), flying: true, to, left: land - t };
    },
    contacts(t, A, ball) {
      if (!ball) return [];
      if (ball.flying) {
        const w = clamp(1 - ball.left / 260);
        return w > 0 ? [{ actor: ball.to, hand: "F", at: [ball.at[0], ball.at[1] + 0.01], w }, { actor: ball.to, hand: "B", at: [ball.at[0], ball.at[1] - 0.01], w }] : [];
      }
      return [];
    },
    order: () => [{ actor: 0 }, { actor: 1 }],
  };
}

export const PAIRS = { handshake, hug, headPat, playCatch };
export { lerp };
