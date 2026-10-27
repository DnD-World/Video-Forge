// Draws a bent photoreal puppet (skin.mjs) with WebGL: the picture is the
// texture, every layer a mesh of triangles whose corners poseSkin moved.
// One renderer per picture; draw() renders into its own canvas, which the
// caller then copies onto its 2D canvas (drawImage), so it mixes with
// everything else drawn there.

const VS = `#version 300 es
in vec2 aPos; in vec2 aUv; uniform vec4 uView; out vec2 vUv;
void main(){ vec2 p = (aPos - uView.xy) / uView.zw; gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0); vUv = aUv; }`;
const FS = `#version 300 es
precision mediump float; in vec2 vUv; uniform sampler2D uTex; out vec4 o;
void main(){ vec4 c = texture(uTex, vUv); if (c.a < 0.02) discard; o = vec4(c.rgb * c.a, c.a); }`;

export function makeMeshRenderer(image, skin, width, height) {
  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) throw new Error("WebGL2 is not available here.");
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  gl.useProgram(prog);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const aPos = gl.getAttribLocation(prog, "aPos"), aUv = gl.getAttribLocation(prog, "aUv"), uView = gl.getUniformLocation(prog, "uView");
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const bufs = {};
  for (const [name, L] of Object.entries(skin.layers)) {
    const uv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uv); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(L.uv.flat()), gl.STATIC_DRAW);
    const idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(L.tris), gl.STATIC_DRAW);
    bufs[name] = { uv, idx, pos: gl.createBuffer(), n: L.tris.length };
  }
  /**
   * Draw a posed puppet. posed: poseSkin's result; view: the picture-frame
   * rectangle [x, y, w, h] that fills this canvas. Order: arms behind, body,
   * arms in front.
   */
  const draw = (posed, view, only = null) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4f(uView, view[0], view[1], view[2], view[3]);
    const order = only ?? [...[0, 1].filter((i) => !posed.front[i]).map((i) => "arm" + i), "body", ...[0, 1].filter((i) => posed.front[i]).map((i) => "arm" + i)];
    for (const name of order) {
      const b = bufs[name];
      if (!b.n) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posed[name].flat()), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.uv); gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_INT, 0);
    }
    return canvas;
  };
  return { draw, canvas };
}
