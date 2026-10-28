// Load a photoreal presenter from its photoreal.json (tools/make-photoreal.mjs):
// the pictures, their joints, the face parts → a puppet that draws itself
// (multi.mjs). url(file) turns a file name in the folder into something an
// <img> can load (a file URL in the app, a served path in a render).
import { buildSkin } from "./skin.mjs";
import { makePuppet } from "./multi.mjs";

const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(`Could not load ${String(src).slice(0, 80)}`)); i.src = src; });

/** Image Forge parts are cut from a flat magenta background: take out any left on the edges. */
function unMagenta(img) {
  const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2], m = Math.min(r, b) - g;
    if (m > 40) d.data[i + 3] = Math.round(d.data[i + 3] * Math.max(0, 1 - (m - 40) / 50));
    if (m > 15) { d.data[i] -= m * 0.6; d.data[i + 2] -= m * 0.6; }
  }
  x.putImageData(d, 0, 0);
  return c;
}

/** A face part cut to the body picture's own outline (alpha: its opacity, w wide). */
function onBody(part, alpha, w, box) {
  const x = part.getContext("2d"), d = x.getImageData(0, 0, part.width, part.height);
  const sx = box.w / part.width, sy = box.h / part.height;
  for (let j = 0; j < part.height; j++) for (let i = 0; i < part.width; i++) {
    const a = alpha[Math.round(box.y + j * sy) * w + Math.round(box.x + i * sx)] ?? 0;
    if (a < 200) d.data[(j * part.width + i) * 4 + 3] = Math.min(d.data[(j * part.width + i) * 4 + 3], a);
  }
  x.putImageData(d, 0, 0);
  return part;
}

export async function loadPresenter(manifest, url, { size = 900, getPose } = {}) {
  const built = [];
  for (const [n, s] of manifest.sources.entries()) {
    const img = await loadImg(url(s.image));
    const pose = getPose ? await getPose(s.pose) : await (await fetch(url(s.pose))).json();
    const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height }).getContext("2d");
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, img.width, img.height).data;
    const alpha = new Uint8Array(img.width * img.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = d[i * 4 + 3];
    const src = { image: img, skin: buildSkin(alpha, img.width, img.height, pose.points, { armEdges: !!s.armEdges }) };
    // the face parts belong to the first picture (the arms-down one they were made on)
    if (n === 0 && manifest.face?.parts) {
      src.face = {};
      // each part keeps only what lies on the person (some mouths carried specks beside the head)
      for (const [name, p] of Object.entries(manifest.face.parts)) src.face[name] = { img: onBody(unMagenta(await loadImg(url(p.file))), alpha, img.width, p.box), box: p.box };
    }
    built.push(src);
  }
  return makePuppet(built, { size });
}

/** All files a presenter needs (to copy into a render, or embed in a page). */
export function presenterFiles(manifest) {
  return [...manifest.sources.flatMap((s) => [s.image, s.pose]), ...Object.values(manifest.face?.parts ?? {}).map((p) => p.file)];
}
