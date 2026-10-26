// ---------------------------------------------------------------------------
// A canvas that records instead of drawing: it keeps the transform, notes
// every point that gets filled or stroked (the drawing's bounding box) and
// logs every call (to prove two drawings are identical). Used to measure a
// figure for framing, and by the checks. No browser needed.
// ---------------------------------------------------------------------------

const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

export class RecordingCtx {
  constructor(w = 400, h = 400) {
    this.canvas = { width: w, height: h };
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.path = [];
    this.log = [];
    this.box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    this.bad = 0;
    for (const k of ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha", "globalCompositeOperation", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY", "filter", "font", "textAlign", "textBaseline", "imageSmoothingEnabled"]) this[k] = undefined;
  }
  _pt(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) this.bad++;
    const m = this.m;
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }
  _rec(name, args) { this.log.push(name + "(" + args.map((a) => (typeof a === "number" ? a.toFixed(2) : typeof a === "string" ? a : "·")).join(",") + ")"); }
  save() { this.stack.push(this.m); this._rec("save", []); }
  restore() { this.m = this.stack.pop() ?? [1, 0, 0, 1, 0, 0]; this._rec("restore", []); }
  translate(x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); }
  scale(x, y) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); }
  rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.m = mul(this.m, [c, s, -s, c, 0, 0]); }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push(this._pt(x, y)); }
  lineTo(x, y) { this.path.push(this._pt(x, y)); }
  closePath() {}
  arc(x, y, r) { this.path.push(this._pt(x - r, y - r), this._pt(x + r, y + r)); }
  ellipse(x, y, rx, ry) { this.path.push(this._pt(x - rx, y - ry), this._pt(x + rx, y + ry)); }
  rect(x, y, w, h) { this.path.push(this._pt(x, y), this._pt(x + w, y + h)); }
  quadraticCurveTo(a, b, x, y) { this.path.push(this._pt(x, y)); }
  bezierCurveTo(a, b, c, d, x, y) { this.path.push(this._pt(x, y)); }
  _mark(extra = 0) { for (const [x, y] of this.path) { this.box.x0 = Math.min(this.box.x0, x - extra); this.box.y0 = Math.min(this.box.y0, y - extra); this.box.x1 = Math.max(this.box.x1, x + extra); this.box.y1 = Math.max(this.box.y1, y + extra); } }
  fill() { if (this.globalCompositeOperation !== "destination-out") this._mark(); this._rec("fill", [this.path.length, String(this.fillStyle)]); }
  stroke() { this._mark((this.lineWidth ?? 1) / 2); this._rec("stroke", [this.path.length, String(this.strokeStyle), this.lineWidth ?? 1]); }
  clip() {}
  fillRect(x, y, w, h) { this._rec("fillRect", [x, y, w, h]); }
  strokeRect() {}
  clearRect() {}
  drawImage() { this._rec("drawImage", []); }
  fillText() {}
  measureText(s) { return { width: String(s).length * 6 }; }
  createPattern() { return { pattern: true, toString: () => "pattern" }; }
  createLinearGradient() { return { addColorStop() {}, toString: () => "gradient" }; }
  createRadialGradient() { return { addColorStop() {}, toString: () => "gradient" }; }
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  getImageData(x, y, w, h) { return this.createImageData(w, h); }
  putImageData() {}
}

