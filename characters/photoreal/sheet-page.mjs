// Contact sheet for photoreal bending (skin.mjs + glmesh.mjs): rows are
// moves, columns moments, each frame posed by the SAME motion layer and
// skeleton as the drawn characters. tools/photoreal-sheet.mjs saves it.
import { SHELF, performAt, characterState, solveRig, defaultCard, lookById } from "../core/index.mjs";
import { buildSkin, poseSkin } from "./skin.mjs";
import { makeMeshRenderer } from "./glmesh.mjs";
import { makePuppet } from "./multi.mjs";

const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

window.__sheet = async ({ image, pose, moves = ["wave", "point", "shrug", "cheer", "explain", "thumbs-up", "dance"], cols = 6, cell = 240, view = 0 }) => {
  const img = await loadImg(image);
  const pc = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }).getContext("2d");
  pc.drawImage(img, 0, 0);
  const data = pc.getImageData(0, 0, img.width, img.height).data;
  const alpha = new Uint8Array(img.width * img.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const skin = buildSkin(alpha, img.width, img.height, pose.points);
  const card = defaultCard({ name: "Rig", look: "corp" });
  const look = lookById("corp");
  const rest = solveRig(card, look, { view });
  const R = makeMeshRenderer(img, skin, cell * 2, cell * 2);
  const { rig } = skin;
  const bodyH = rig.floor - rig.top;

  const labelW = 120;
  const cv = Object.assign(document.createElement("canvas"), { width: labelW + cols * cell, height: moves.length * cell });
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, cv.width, cv.height);
  const stats = { verts: Object.values(skin.layers).reduce((n, l) => n + l.pos.length, 0), tris: Object.values(skin.layers).reduce((n, l) => n + l.tris.length / 3, 0) };
  moves.forEach((id, r) => {
    const m = SHELF[id];
    const span = m.hold !== null ? m.lengthMs * 1.6 : m.loop ? m.lengthMs * 2 : m.lengthMs;
    const spans = [{ startMs: 300, endMs: 300 + span, move: id, seed: 1 }];
    ctx.fillStyle = "#e8f1f2"; ctx.font = "600 14px sans-serif"; ctx.fillText(m.name, 10, r * cell + cell / 2);
    for (let c = 0; c < cols; c++) {
      const ms = 300 + span * (0.1 + (0.8 * c) / (cols - 1));
      const perf = performAt({ moveSpans: spans, shelf: SHELF }, ms, { view, energy: 0.5, seed: 1 });
      const state = characterState({ timeMs: ms, viseme: 0, view, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: [], face: null }, breath: perf.breath });
      const sk = solveRig(card, look, state);
      const posed = poseSkin(skin, sk, rest, { bodyH });
      // the picture frame shown: the body centred, with room above for raised arms
      const side = bodyH * 1.25, cx = (rig.torso[0][0] + rig.torso[1][0]) / 2;
      const view4 = [cx - side / 2, rig.floor - side + bodyH * 0.06, side, side];
      const gl = R.draw(posed, view4);
      const x0 = labelW + c * cell, y0 = r * cell;
      ctx.fillStyle = "#ffe6f2"; ctx.fillRect(x0 + 2, y0 + 2, cell - 4, cell - 4);
      ctx.drawImage(gl, x0 + 2, y0 + 2, cell - 4, cell - 4);
    }
  });
  return { url: cv.toDataURL("image/png"), stats };
};

// which cells went to which layer, drawn over the picture (to check the cut)
window.__layers = async ({ image, pose }) => {
  const img = await loadImg(image);
  const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  const alpha = new Uint8Array(img.width * img.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
  const skin = buildSkin(alpha, img.width, img.height, pose.points);
  const col = { body: "rgba(80,160,255,0.35)", arm0: "rgba(255,80,80,0.55)", arm1: "rgba(255,200,40,0.55)" };
  for (const [name, L] of Object.entries(skin.layers)) {
    ctx.fillStyle = col[name];
    for (let i = 0; i < L.tris.length; i += 3) {
      const [a, b, d] = [L.pos[L.tris[i]], L.pos[L.tris[i + 1]], L.pos[L.tris[i + 2]]];
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    }
  }
  return { url: c.toDataURL("image/png") };
};

// several rest pictures mixed per arm (multi.mjs): sources [{ image, pose, armEdges }]
window.__multi = async ({ sources, moves = ["wave", "point", "shrug", "cheer", "explain", "thumbs-up", "dance", "facepalm"], cols = 6, cell = 240, view = 0 }) => {
  const built = [];
  for (const src of sources) {
    const img = await loadImg(src.image);
    const pc = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }).getContext("2d");
    pc.drawImage(img, 0, 0);
    const data = pc.getImageData(0, 0, img.width, img.height).data;
    const alpha = new Uint8Array(img.width * img.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
    built.push({ image: img, skin: buildSkin(alpha, img.width, img.height, src.pose.points, { armEdges: !!src.armEdges }) });
  }
  const puppet = makePuppet(built, { size: cell * 2 });
  const card = defaultCard({ name: "Rig", look: "corp" });
  const look = lookById("corp");
  const rest = solveRig(card, look, { view });
  const labelW = 120;
  const cv = Object.assign(document.createElement("canvas"), { width: labelW + cols * cell, height: moves.length * cell });
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2a"; ctx.fillRect(0, 0, cv.width, cv.height);
  moves.forEach((id, r) => {
    const m = SHELF[id];
    const span = m.hold !== null ? m.lengthMs * 1.6 : m.loop ? m.lengthMs * 2 : m.lengthMs;
    const spans = [{ startMs: 300, endMs: 300 + span, move: id, seed: 1 }];
    ctx.fillStyle = "#e8f1f2"; ctx.font = "600 14px sans-serif"; ctx.fillText(m.name, 10, r * cell + cell / 2);
    for (let c = 0; c < cols; c++) {
      const ms = 300 + span * (0.1 + (0.8 * c) / (cols - 1));
      const perf = performAt({ moveSpans: spans, shelf: SHELF }, ms, { view, energy: 0.5, seed: 1 });
      const state = characterState({ timeMs: ms, viseme: 0, view, move: { joints: perf.joints, hands: perf.hands ?? { F: "relaxed", B: "relaxed" }, props: [], face: null }, breath: perf.breath });
      const sk = solveRig(card, look, state);
      const x0 = labelW + c * cell, y0 = r * cell;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0 + 2, y0 + 2, cell - 4, cell - 4); ctx.clip();
      ctx.fillStyle = "#ffe6f2"; ctx.fillRect(x0 + 2, y0 + 2, cell - 4, cell - 4);
      puppet.draw(ctx, sk, rest, { x: x0 + cell / 2, y: y0 + cell * 0.95, h: cell * 0.78 });
      ctx.restore();
    }
  });
  return { url: cv.toDataURL("image/png") };
};
