// The four half-body sets, live: photoreal presenters (and drawn characters)
// seated in them, talking in turn, moving through the motion library.
// Built by tools/sets-page.mjs with the presenter folders inside.
import { SHELF, performAt, characterState, solveRig, defaultCard, lookById, drawFigure, frameFor, normalizeCard, DRAWN_PRESETS, autoPerformance } from "../core/index.mjs";
import { loadPresenter } from "../photoreal/load.mjs";
import { SETS } from "./sets.mjs";

const { presenters } = window.__SETS;
const pr = [];
for (const p of presenters) pr.push(await loadPresenter(p.manifest, (f) => p.files[f], { getPose: async (f) => JSON.parse(p.files[f]), size: 700 }));
const rigCard = defaultCard({ name: "Rig", look: "corp" });
const rigLook = lookById("corp");
const rests = {};
const restFor = (view) => (rests[view] ??= solveRig(rigCard, rigLook, { view }));
const layer = document.createElement("canvas");

// who sits where in each set: photoreal ("p") or a drawn preset
const CASTS = {
  news: [{ p: 0 }],
  meeting: [{ p: 0 }, { d: "soft-team-lead" }, { d: "soft-new-hire" }, { d: "ai-office-skeptic" }],
  stage: [{ p: 0 }, { d: "soft-coach" }, { d: "manip-wise-friend" }],
  podcast: [{ p: 0 }, { d: "everyday-teen" }],
};
const MOVES = ["explain", "point", "shrug", "thumbs-up", "wave", "facepalm", "explain"];
const SEAT = (perf) => { const j = { ...perf.joints }; delete j.legF; delete j.legB; delete j.footF; delete j.footB; j.root = [0, 0]; j.sit = [0]; return { ...perf, joints: j }; };

function draw(cv, id, ms) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const set = SETS[id], cast = CASTS[id], seats = set.seats(cast.length, W, H);
  const opts = { t: ms / 1000, title: id === "news" ? "MORNING BRIEF" : id === "stage" ? "THE FUTURE OF WORK" : "" };
  set.back(ctx, W, H, opts);
  // people take turns: one talks for 3 s, the others listen
  const speaker = Math.floor(ms / 3000) % cast.length;
  cast.forEach((c, i) => {
    const seat = seats[i];
    const view = seat.face === "camera" ? 0 : 1;
    const mirror = seat.face === "left";
    const talking = i === speaker;
    const spans = talking ? [{ startMs: Math.floor(ms / 3000) * 3000 + 300, endMs: Math.floor(ms / 3000) * 3000 + 2700, move: MOVES[(Math.floor(ms / 3000) + i) % MOVES.length], seed: i + 1 }] : [];
    const perf = SEAT(performAt({ moveSpans: spans, shelf: SHELF }, ms, { view, energy: 0.5, seed: i + 1 }));
    const talk = autoPerformance(ms / 1000, { seed: i, talking });
    const state = characterState({ timeMs: ms, viseme: talk.mouth.to, prevViseme: talk.mouth.from, mix: talk.mouth.mix, lidFrom: talk.lid.to, view, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: perf.props, face: perf.faceCue }, breath: perf.breath, active: talking });
    if (c.p !== undefined) {
      const sk = solveRig(rigCard, rigLook, { ...state, view: 0 });
      ctx.save();
      if (mirror) { ctx.translate(seat.x * 2, 0); ctx.scale(-1, 1); }
      pr[c.p].draw(ctx, sk, restFor(0), { x: seat.x, y: seat.y + seat.h * 0.46, h: seat.h, face: { viseme: talk.mouth.to, prevViseme: talk.mouth.from, mix: talk.mouth.mix, lid: talk.lid.to, brow: perf.faceCue?.brows ?? talk.brows.left } });
      ctx.restore();
    } else {
      const p = DRAWN_PRESETS.find((x) => x.id === c.d);
      const card = normalizeCard({ ...p.card, name: p.name, look: "sticker" }).card;
      // a little shorter above the table than the photoreal person: cartoon
      // heads are bigger, so the same height reads as a giant
      const S = seat.h * 0.72;
      const fr = { S };
      // feet would be at the bottom of a standing figure: put the hips at the seat line
      const hipFromFeet = -lookById("sticker").p.hy * fr.S;
      drawFigure(ctx, card, { look: "sticker", S: fr.S, x: seat.x, y: seat.y + hipFromFeet, mirror, state, layerSize: { w: W, h: H }, layerCanvas: layer });
    }
  });
  set.front(ctx, W, H, opts);
}

const stages = [...document.querySelectorAll("canvas[data-set]")];
function frame(now) {
  const ms = window.__freeze ?? now;
  for (const cv of stages) draw(cv, cv.dataset.set, ms);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
