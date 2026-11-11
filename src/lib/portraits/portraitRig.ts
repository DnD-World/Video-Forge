// PORTRAIT RIG — an illustrated portrait that talks (brands/scotus/rig).
//
// The drawing is the artist's own pixels cut into layers (background, hair,
// robe, head, eyes, lips) by the Python build. This file is the animation
// half of that build's test page (pipeline2/rig_template.html), rewritten so
// every frame is a pure function of time: Remotion renders frames out of
// order and in parallel, so nothing here may remember the previous frame.
// What the page did with smoothing and springs is done here with closed forms:
// the mouth comes already blended from the Forge's viseme track, the hair's
// lag is the head's own sway a beat late, and blinks follow a seeded schedule.

import { VISEME, SMILE_VISEME, HALF } from "../visemes/visemeMap";

export type PortraitFile = {
  v: 1;
  name: string;
  w: number;
  h: number;
  svg: string;
  data: PortraitData;
};
type Box = [number, number, number, number];
export type PortraitData = {
  f: { name: string; cx: number; hw: number; pivot: [number, number]; scale: number };
  m2: Record<"mU" | "mL" | "mC" | "mS" | "mJ", Box> & { lipbot: Record<string, number>; JY1: number };
  seam: { x: number[]; y: number[] };
  e2: Record<"L" | "R", { xr: [number, number]; topc: number[]; botc: number[]; xc: number; D: number; yb: number }>;
};

/** Mouth parameters: J jaw open px, U upper lip lift px, W width, P pucker,
 *  Sm smile, T teeth, Tg tongue (a sliver at most). */
export type Mouth = { J: number; U: number; W: number; P: number; Sm: number; T: number; Tg: number };
const K: (keyof Mouth)[] = ["J", "U", "W", "P", "Sm", "T", "Tg"];
const REST: Mouth = { J: 0, U: 0, W: 1, P: 0, Sm: 0, T: 0, Tg: 0 };
// the shapes Ak approved on the Sotomayor rig, in her pixels (scaled per face)
const SHAPES: Record<string, Mouth> = {
  rest: REST,
  MBP: { J: -0.5, U: -0.4, W: 0.985, P: 0.15, Sm: 0, T: 0, Tg: 0 },
  AA: { J: 13, U: 2.4, W: 1.03, P: 0, Sm: 0, T: 1, Tg: 0.5 },
  E: { J: 7, U: 1.6, W: 1.09, P: 0, Sm: 0.3, T: 1, Tg: 0.3 },
  EE: { J: 3.6, U: 0.9, W: 1.17, P: 0, Sm: 0.8, T: 1, Tg: 0 },
  OH: { J: 9, U: 1.6, W: 0.78, P: 0.7, Sm: 0, T: 0.3, Tg: 0.3 },
  OO: { J: 4.6, U: 0.9, W: 0.62, P: 1, Sm: 0, T: 0, Tg: 0 },
  FV: { J: 2.2, U: 0.5, W: 1.0, P: 0, Sm: 0, T: 1, Tg: 0 },
  TH: { J: 3.8, U: 0.6, W: 1.0, P: 0, Sm: 0, T: 0.8, Tg: 0.8 },
};
const mix = (a: Mouth, b: Mouth, t: number): Mouth => Object.fromEntries(K.map((k) => [k, a[k] + (b[k] - a[k]) * t])) as Mouth;

/** The Forge's mouth ids (src/lib/visemes/visemeMap.ts) as rig shapes. */
export function shapeFor(v: number): Mouth {
  switch (v) {
    case VISEME.AH: return SHAPES.AA;
    case VISEME.EE: return SHAPES.E;
    case VISEME.OH: return SHAPES.OH;
    case VISEME.OO: return SHAPES.OO;
    case VISEME.MBP: return SHAPES.MBP;
    case VISEME.FV: return SHAPES.FV;
    // consonants and the "ee" family are most of English and Greek; at video size
    // their approved shapes barely part the lips, so they borrow some of E's opening
    case VISEME.L: return mix(SHAPES.TH, SHAPES.E, 0.5);
    case VISEME.CH_SH: return { ...SHAPES.EE, J: 5.2, U: 1.2 };
    case SMILE_VISEME: return { ...REST, Sm: 0.5 };
    case HALF.AH: return mix(REST, SHAPES.AA, 0.7);
    case HALF.OH: return mix(REST, SHAPES.OH, 0.7);
    case HALF.EE: return mix(REST, SHAPES.E, 0.7);
    default: return REST;
  }
}
export function mouthFor(from: number, to: number, t: number, scale: number): Mouth {
  const q = mix(shapeFor(from), shapeFor(to), Math.max(0, Math.min(1, t)));
  return { ...q, J: q.J * scale, U: q.U * scale };
}

/** Give every id in the drawing a prefix, so two justices on screen at once
 *  don't share clip paths or mouth images. Data URIs are left alone. */
export function prefixSvg(svg: string, p: string): string {
  return svg
    .replace(/\bid="([^"]+)"/g, `id="${p}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${p}$1"`);
}

/** Seeded blink times (seconds): every 2.2-5.4 s, like the test page. */
export function blinkAt(t: number, seed: number): number {
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  let at = 1.5 + rnd() * 1.5;
  while (at <= t) {
    const p = (t - at) / 0.17;
    if (p < 1) return p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
    at += 2.2 + rnd() * 3.2;
  }
  return 0;
}

const NS = "http://www.w3.org/2000/svg";
type Strip = { x: number; g: SVGGElement; yt?: number };

/** Builds the mouth strips once (they are DOM, not state) and returns a
 *  function that puts the whole portrait in the pose for time t. */
export function mountPortrait(root: Element, d: PortraitData, p: string) {
  const $ = (id: string) => root.querySelector(`[id="${p}${id}"]`) as SVGGraphicsElement;
  const { cx: CX, hw: HW } = d.f;
  const PV = d.f.pivot.join(" ");
  const SX = d.seam.x, SY = d.seam.y, M2 = d.m2, SW = 2;
  const sAt = (x: number) => SY[Math.max(0, Math.min(SX.length - 1, Math.round(x) - SX[0]))];
  const wf = (x: number) => { const u = (x - CX) / HW; return Math.abs(u) >= 1 ? 0 : Math.pow(1 - u * u, 0.6); };
  const smf = (x: number, q: Mouth) => q.Sm * Math.pow(Math.min(Math.abs((x - CX) / HW), 1.1), 3) * 1.6;
  const LB = M2.lipbot;
  const lbAt = (x: number) => { const k = Math.round(x); return LB[k] !== undefined ? LB[k] : sAt(x) + 12; };
  const clip = (x: number, y: number, h: number, img: string, into: Element): SVGGElement => {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("x", String(x)); s.setAttribute("y", String(y));
    s.setAttribute("width", String(SW + 0.7)); s.setAttribute("height", String(h));
    s.setAttribute("viewBox", `${x} ${y} ${SW + 0.7} ${h}`); s.setAttribute("overflow", "hidden");
    const u = document.createElementNS(NS, "use"); u.setAttribute("href", `#${p}img_${img}`); s.appendChild(u);
    const g = document.createElementNS(NS, "g"); g.appendChild(s); into.appendChild(g); return g;
  };
  const strips = (name: "mU" | "mL" | "mC", into: Element): Strip[] => {
    const [x0, y0, w, h] = M2[name]; const out: Strip[] = [];
    for (let x = x0; x < x0 + w; x += SW) out.push({ x: x + SW / 2, g: clip(x, y0, h, name, into) });
    return out;
  };
  for (const id of ["mouthUg", "mouthLg", "chinG", "jawG"]) $(id).replaceChildren();
  const SU = strips("mU", $("mouthUg")), SL = strips("mL", $("mouthLg")), SC = strips("mC", $("chinG"));
  const SJ: Strip[] = [];
  {
    const [x0, y0, w] = M2.mJ;
    for (let x = x0; x < x0 + w; x += SW) {
      const yt = Math.max(y0, (LB[Math.round(x + 1)] !== undefined ? LB[Math.round(x + 1)] : y0) - 2);
      SJ.push({ x: x + SW / 2, yt, g: clip(x, yt, M2.JY1 - yt, "mJ", $("jawG")) });
    }
  }
  const place = (arr: Strip[], q: Mouth, kind: "U" | "L" | "C") => {
    for (const s of arr) {
      const x = s.x, sy = sAt(x), w = wf(x);
      let k = 1 + 0.35 * q.P, f: number;
      if (kind === "U") f = sy - sy * k - q.U * w - smf(x, q);
      else if (kind === "L") f = sy - sy * k + q.J * w - smf(x, q);
      else { k = 1; f = q.J * w + 0.35 * q.P * (lbAt(x) - sy) * w - smf(x, q); }
      const e = CX - CX * q.W;
      s.g.setAttribute("transform", `matrix(${q.W.toFixed(4)} 0 0 ${k.toFixed(4)} ${e.toFixed(3)} ${f.toFixed(3)})`);
    }
  };
  const mouth = (q: Mouth) => {
    place(SU, q, "U"); place(SL, q, "L"); place(SC, q, "C");
    for (const s of SJ) {
      const x = s.x, sy = sAt(x), w = wf(x), yt = s.yt!;
      const dd = Math.max(0, q.J * w + 0.35 * q.P * (lbAt(x) - sy) - smf(x, q));
      const k = (M2.JY1 - yt - dd) / (M2.JY1 - yt), f = yt + dd - yt * k;
      s.g.setAttribute("transform", `matrix(1 0 0 ${k.toFixed(4)} 0 ${f.toFixed(3)})`);
    }
    const open = Math.max(0, q.J + q.U);
    const ids = ["mDark", "mTeeth", "mTongue"];
    if (open <= 0.6) { for (const id of ids) $(id).setAttribute("d", ""); return; }
    const xs: number[] = []; for (let x = SX[0]; x <= SX[SX.length - 1]; x += 2) xs.push(x);
    const top: number[][] = [], bot: number[][] = [];
    for (const x of xs) { const w = wf(x), s = sAt(x), xw = CX + (x - CX) * q.W, Sm = smf(x, q); top.push([xw, s - q.U * w - Sm - 1.8]); bot.push([xw, s + q.J * w - Sm + 1.8]); }
    const poly = (a: number[][], b: number[][]) => "M" + a.map((v) => v[0].toFixed(1) + " " + v[1].toFixed(1)).join("L") + "L" + b.slice().reverse().map((v) => v[0].toFixed(1) + " " + v[1].toFixed(1)).join("L") + "Z";
    $("mDark").setAttribute("d", poly(top, bot));
    const gap = (i: number) => Math.max(0, bot[i][1] - top[i][1]);
    const th = top.map((v, i) => [v[0], v[1] + Math.min(Math.max(0, gap(i) - 3.6) * 0.5 + 1.8, 6.4) * q.T]);
    $("mTeeth").setAttribute("d", q.T > 0.04 ? poly(top, th) : "");
    const tg = bot.map((v, i) => { const u = (xs[i] - CX) / HW; const h = Math.max(0, 1 - (u / 0.55) ** 2) * Math.min(2.0, gap(i) * 0.2) * q.Tg; return [v[0], v[1] - 1.8 - h]; });
    $("mTongue").setAttribute("d", q.Tg > 0.05 && open > 6 ? poly(tg, bot) : "");
  };
  const eye = (s: "L" | "R", kRaw: number, gx: number, gy: number) => {
    const e = d.e2[s], k = Math.max(0, Math.min(1, kRaw));
    const sy = 1 - 0.3 * k, dy = k * (e.D + 0.5), yb = e.yb;
    const tf = (y: number) => yb + (y - 1.5 - yb) * sy + dy + (k > 0 ? 1.5 * (1 - k) : 0);
    $("lid" + s).setAttribute("transform", `translate(0 ${(yb * (1 - sy) + dy).toFixed(2)}) scale(1 ${sy.toFixed(3)})`);
    const x0 = e.xr[0], tc = e.topc;
    let dd = `M${x0 - 4} 2000L${x0 - 4} ${tf(tc[0]).toFixed(2)}`;
    for (let i = 0; i < tc.length; i++) dd += `L${x0 + i} ${tf(tc[i]).toFixed(2)}`;
    dd += `L${e.xr[1] + 4} ${tf(tc[tc.length - 1]).toFixed(2)}L${e.xr[1] + 4} 2000Z`;
    $("bcp" + s).setAttribute("d", dd);
    $("iris" + s).setAttribute("transform", `translate(${gx.toFixed(2)} ${gy.toFixed(2)})`);
  };
  const browBase: Record<string, string> = {};
  for (const id of ["browLg", "browRg"]) browBase[id] = $(id)?.getAttribute("transform") ?? "";

  /** t in seconds; `talk` 0-1 is how much this justice is speaking now. */
  return function pose(t: number, q: Mouth, seed: number, talk: number) {
    mouth(q);
    const k = blinkAt(t, seed);
    const ph = seed * 1.7;
    const gx = Math.sin(t * 0.37 + ph) * 1.6 + Math.sin(t * 0.91 + ph) * 0.6, gy = Math.sin(t * 0.29 + 1 + ph) * 0.8;
    eye("L", k, gx, gy); eye("R", k, gx, gy);
    const r = (tt: number) => Math.sin(tt * 0.45 + ph) * 0.55 + Math.sin(tt * 1.1 + ph) * 0.2;
    const hr0 = r(t) + talk * q.J * 0.02;
    const tx = Math.sin(t * 0.31 + ph) * 1.1, ty = Math.sin(t * 0.52 + ph) * 0.7, breath = Math.sin(t * 1.25 + ph);
    // hair: the head's sway a beat late, a little more of it (the page's spring, settled)
    const hr = (r(t - 0.18) - r(t)) * 1.4;
    const hy = -Math.sin(t * 1.25 + ph - 0.6) * 0.012;
    $("headG").setAttribute("transform", `translate(${tx.toFixed(2)} ${(ty + breath * 2).toFixed(2)}) rotate(${hr0.toFixed(3)} ${PV})`);
    $("hairG").setAttribute("transform", `translate(${tx.toFixed(2)} ${(ty + breath * 2 + hy).toFixed(2)}) rotate(${(hr0 + hr).toFixed(3)} ${PV})`);
    const sc = 1 + 0.0035 * breath;
    $("bodyG").setAttribute("transform", `translate(0 ${(1200 * (1 - sc)).toFixed(2)}) scale(1 ${sc.toFixed(4)})`);
    const b = Math.max(-1, Math.min(3, q.J * 0.1 + Math.sin(t * 0.7 + ph) * 0.5));
    for (const id of ["browLg", "browRg"]) $(id)?.setAttribute("transform", `translate(0 ${(-b).toFixed(2)}) ${browBase[id]}`);
  };
}
