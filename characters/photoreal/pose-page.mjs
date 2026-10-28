// Finds a person's joints in a picture with MediaPipe's pose model (free,
// runs on this computer). tools/detect-pose.mjs opens this in a hidden window.
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let landmarker = null;

/** wasmDir and model: file URLs. Returns nothing; sets up the detector. */
window.__init = async (wasmDir, model) => {
  const files = await FilesetResolver.forVisionTasks(wasmDir);
  landmarker = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: model, delegate: "CPU" }, runningMode: "IMAGE", numPoses: 1, outputSegmentationMasks: true });
  return "ready";
};

/** One picture (a data URL) → { w, h, points: [{x, y, z, v}] in pixels } and an overlay PNG to check by eye. */
window.__detect = async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const res = landmarker.detect(img);
  const lm = res.landmarks?.[0] ?? [];
  // the person's outline (the model's own mask): everything else becomes see-through
  let keyed = null;
  const mask = res.segmentationMasks?.[0];
  if (mask) {
    const m = mask.getAsFloat32Array(), mw = mask.width, mh = mask.height;
    const kc = document.createElement("canvas"); kc.width = img.width; kc.height = img.height;
    const kx = kc.getContext("2d"); kx.drawImage(img, 0, 0);
    const d = kx.getImageData(0, 0, img.width, img.height);
    // the model's outline, sampled smoothly (it is coarser than the picture)
    const at = (x, y) => {
      const fx = Math.max(0, Math.min(mw - 1.001, (x * mw) / img.width - 0.5)), fy = Math.max(0, Math.min(mh - 1.001, (y * mh) / img.height - 0.5));
      const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
      const v = (i, j) => m[(y0 + j) * mw + x0 + i];
      return (v(0, 0) * (1 - tx) + v(1, 0) * tx) * (1 - ty) + (v(0, 1) * (1 - tx) + v(1, 1) * tx) * ty;
    };
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const out = Math.max(0, Math.min(1, (at(x, y) - 0.25) / 0.35));
      // Image Forge puppets stand on flat magenta: its key gives the crisp edge,
      // the outline throws away stray background haze the key would keep
      const r = d.data[i], g = d.data[i + 1], bl = d.data[i + 2];
      const key = 1 - Math.max(0, Math.min(1, ((Math.min(r, bl) - g) - 28) / 42));
      // a stray speck outside the person (the outline is sure it is background) goes too
      d.data[i + 3] = Math.round(255 * Math.min(out > 0.12 ? 1 : 0, key) * Math.min(1, out * 2.5));
      // magenta spill on the edge: pull the pink out of what stays
      if (d.data[i + 3] > 0 && r > g + 20 && bl > g + 20) { const m = Math.min(r, bl) - g; d.data[i] -= m * 0.6; d.data[i + 2] -= m * 0.6; }
    }
    kx.putImageData(d, 0, 0);
    keyed = kc.toDataURL("image/png");
    mask.close();
  }
  const points = lm.map((p) => ({ x: p.x * img.width, y: p.y * img.height, z: p.z, v: p.visibility ?? 0 }));
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const bones = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [15, 19], [16, 20]];
  ctx.lineWidth = 4; ctx.strokeStyle = "#5be3b5";
  for (const [a, b] of bones) if (points[a] && points[b]) { ctx.beginPath(); ctx.moveTo(points[a].x, points[a].y); ctx.lineTo(points[b].x, points[b].y); ctx.stroke(); }
  ctx.fillStyle = "#ffe14d";
  points.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#000"; ctx.font = "11px sans-serif"; ctx.fillText(String(i), p.x + 7, p.y - 7); ctx.fillStyle = "#ffe14d"; });
  return { w: img.width, h: img.height, points, overlay: cv.toDataURL("image/png"), keyed };
};
