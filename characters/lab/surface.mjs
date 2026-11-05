// ---------------------------------------------------------------------------
// 2D lab (4 Nov 2026): what the characters are MADE OF. The figure is drawn
// flat as today, then a small GPU program (WebGL2, no library) re-lights it:
// it guesses a shape from the outline (round in the middle, falling off at
// the edges, creased where two colours meet) and lights that shape.
//
//   flat     today, untouched
//   lit      soft shading, a rim of the room's light, a hair shine
//   clay     puffy plasticine, thumbprints, warm matte light, a little boil
//   gouache  painted: pigment pooling at the edges, paper grain, brush streaks
//   ink      a comic print: hatching in the shadows, a heavy line on the dark side
//
// One shared GL canvas does every layer (browsers allow only a few GL
// contexts), and the result is copied back with drawImage.
// ---------------------------------------------------------------------------

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex;
uniform vec2 res;       // layer size in px
uniform float scale;    // px per body height (keeps texture sizes in body units)
uniform int mode;       // 1 lit, 2 clay, 3 gouache, 4 ink
uniform vec3 light;     // light colour
uniform vec2 ldir;      // where the light comes from (screen, y down)
uniform float time;

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }

// the guessed height: blurred coverage (round bodies), minus creases where colours change
float cover(vec2 q, float r){
  float s = 0.0, w = 0.0;
  for (int i = 0; i < 20; i++){
    float a = float(i) * 2.39996, d = sqrt((float(i) + 0.5) / 20.0) * r;
    vec2 off = vec2(cos(a), sin(a)) * d / res;
    s += texture(tex, q + off).a; w += 1.0;
  }
  return s / w;
}
float crease(vec2 q, float r){
  vec3 c = texture(tex, q).rgb; float e = 0.0;
  for (int i = 0; i < 8; i++){ float a = float(i) * 0.785; vec2 off = vec2(cos(a), sin(a)) * r / res;
    vec4 t = texture(tex, q + off); e += length(t.rgb - c) * t.a; }
  return clamp(e / 8.0 * 1.6, 0.0, 1.0);
}
float height(vec2 q, float r){ return cover(q, r) - crease(q, r * 0.35) * 0.35; }

void main(){
  vec4 base = texture(tex, uv);
  if (base.a < 0.003){ o = vec4(0); return; }
  float R = scale * (mode == 2 ? 0.045 : 0.03);
  if (mode == 3){
    // gouache: edges wobble like wet paint
    vec2 wob = (vec2(fbm(uv * res / scale * 9.0 + time * 0.0), fbm(uv * res / scale * 9.0 + 5.2)) - 0.5) * 2.2 / res;
    base = texture(tex, uv + wob);
    if (base.a < 0.003){ o = vec4(0); return; }
  }
  vec2 e = vec2(1.5, 0) / res;
  float hC = height(uv, R);
  float hx = height(uv + e.xy, R) - height(uv - e.xy, R);
  float hy = height(uv + e.yx, R) - height(uv - e.yx, R);
  vec3 n = normalize(vec3(-hx * 7.0, -hy * 7.0, 1.0));
  vec2 bodyUV = uv * res / scale; // texture coordinates in body heights
  vec3 L = normalize(vec3(-ldir, 0.9));
  vec3 col = base.rgb;

  if (mode == 1){
    float lam = dot(n, L);
    float shade = mix(0.74, 1.04, smoothstep(-0.05, 0.25, lam));
    float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.6) * smoothstep(0.0, 0.6, dot(normalize(n.xy + 1e-5), -ldir));
    float ao = mix(0.86, 1.0, smoothstep(0.15, 0.6, hC));
    col = col * shade * ao + light * rim * 0.55;
    // a soft shine on the upper side of round shapes
    col += light * pow(max(dot(reflect(-L, n), vec3(0, 0, 1)), 0.0), 18.0) * 0.18;
  } else if (mode == 2){
    // clay: puffy rounded forms, thumbprints and tool marks, warm matte light; the
    // surface marks change on twos, like stop-motion
    float step2 = floor(time * 12.0);
    vec3 nc = normalize(vec3(-hx * 16.0, -hy * 16.0, 1.0));
    vec2 p = bodyUV * 30.0 + step2 * 0.37;
    vec2 g = vec2(fbm(p + vec2(0.11, 0)) - fbm(p - vec2(0.11, 0)), fbm(p + vec2(0, 0.11)) - fbm(p - vec2(0, 0.11)));
    vec2 q = bodyUV * 7.0 + vec2(step2 * 0.13, 0.0);
    float prints = sin(length(fract(q) - 0.5) * 55.0 + fbm(bodyUV * 11.0) * 7.0);
    float printMask = smoothstep(0.55, 0.75, fbm(bodyUV * 3.0 + 4.0));
    nc = normalize(nc + vec3(g * 1.3 + vec2(prints) * 0.035 * printMask, 0.0));
    float lam = dot(nc, L) * 0.5 + 0.5;
    float cr = crease(uv, scale * 0.01);
    vec3 c2 = pow(col, vec3(1.12)) * vec3(1.05, 0.98, 0.9);
    c2 = mix(vec3(dot(c2, vec3(0.3, 0.59, 0.11))), c2, 1.12);
    c2 *= mix(0.68, 1.14, lam);
    c2 += pow(max(dot(reflect(-L, nc), vec3(0, 0, 1)), 0.0), 7.0) * 0.12 * vec3(1.0, 0.95, 0.85);
    c2 *= mix(0.7, 1.0, smoothstep(0.04, 0.5, hC));   // the rounded edges roll away into shadow
    c2 *= 1.0 - cr * 0.35;                             // a dark seam where two pieces of clay meet
    col = c2;
  } else if (mode == 3){
    // gouache: flat paint, pigment pooling at shape edges, paper grain, dry-brush streaks
    float edge = 1.0 - smoothstep(0.0, 0.35, cover(uv, scale * 0.012)) + crease(uv, scale * 0.006) * 0.9;
    float lam = dot(n, L);
    col *= mix(0.86, 1.03, smoothstep(-0.2, 0.3, lam));
    col *= 1.0 - clamp(edge, 0.0, 1.0) * 0.22;
    float grain = fbm(uv * res * 0.35) - 0.5;
    float streak = fbm(vec2(bodyUV.x * 4.0, bodyUV.y * 60.0)) - 0.5;
    col *= 1.0 + grain * 0.16 + streak * 0.1;
    col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.08);
  } else if (mode == 4){
    // ink: crosshatch in the shadow side, a thicker line where the shape turns away
    float lam = dot(n, L);
    float lum = clamp(0.5 + lam * 0.6, 0.0, 1.0);
    vec2 px = uv * res;
    float h1 = step(0.5, fract((px.x + px.y) / (scale * 0.012)));
    float h2 = step(0.5, fract((px.x - px.y) / (scale * 0.012)));
    float hatch = lum < 0.3 ? min(h1, h2) : lum < 0.45 ? h1 : 1.0;
    col *= mix(0.55, 1.0, hatch);
    float rimDark = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0) * smoothstep(0.2, -0.4, dot(normalize(n.xy + 1e-5), -ldir));
    col *= 1.0 - rimDark * 0.85;
  }
  o = vec4(clamp(col, 0.0, 1.0) * base.a, base.a);
}`;

export const SURFACES = ["flat", "lit", "clay", "gouache", "ink"];
const MODE = { lit: 1, clay: 2, gouache: 3, ink: 4 };

let G = null;
function setup() {
  if (G) return G;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) return (G = { failed: true });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const U = (n) => gl.getUniformLocation(prog, n);
  G = { canvas, gl, prog, buf, loc, tex, u: { tex: U("tex"), res: U("res"), scale: U("scale"), mode: U("mode"), light: U("light"), ldir: U("ldir"), time: U("time") } };
  return G;
}

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

/**
 * Re-light a figure layer in place. layer: a canvas with the figure on
 * transparent; opts: { surface, S (px per body height), light "#rrggbb", ldir [x, y], t (s) }.
 * Returns false when WebGL is missing (the layer is left flat).
 */
export function applySurface(layer, { surface = "flat", S = 300, light = "#ffe6c8", ldir = [-0.6, -0.8], t = 0 } = {}) {
  if (surface === "flat") return true;
  const g = setup();
  if (g.failed) return false;
  const { gl } = g, w = layer.width, h = layer.height;
  if (g.canvas.width !== w || g.canvas.height !== h) { g.canvas.width = w; g.canvas.height = h; }
  gl.viewport(0, 0, w, h);
  gl.useProgram(g.prog);
  gl.bindTexture(gl.TEXTURE_2D, g.tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer);
  gl.bindBuffer(gl.ARRAY_BUFFER, g.buf);
  gl.enableVertexAttribArray(g.loc);
  gl.vertexAttribPointer(g.loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(g.u.tex, 0);
  gl.uniform2f(g.u.res, w, h);
  gl.uniform1f(g.u.scale, S);
  gl.uniform1i(g.u.mode, MODE[surface] ?? 1);
  gl.uniform3f(g.u.light, ...hex(light));
  const d = Math.hypot(ldir[0], ldir[1]) || 1;
  gl.uniform2f(g.u.ldir, ldir[0] / d, ldir[1] / d);
  gl.uniform1f(g.u.time, t);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const c = layer.getContext("2d");
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  c.drawImage(g.canvas, 0, 0);
  c.restore();
  return true;
}
