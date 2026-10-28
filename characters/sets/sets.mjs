// ---------------------------------------------------------------------------
// SETS for half-body scenes (Ak, 28 Oct 2026): a news desk, a team in a
// conference room, speakers at a conference, a recorded podcast. Furniture
// hides the legs, so photoreal presenters (characters/photoreal) and drawn
// characters can share them.
//
// A set draws in two passes: back() behind the people, front() in front of
// them (the desk, the table, the podium). seats(n, W, H) says where up to n
// people sit: { x, y (the hips, hidden by the furniture), h (body height),
// face: "camera" | "left" | "right" }. Drawn by code, deterministic, sized
// to any frame.
// ---------------------------------------------------------------------------

const lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rad = (ctx, x, y, r, stops) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };

/** Seats spread evenly across a span of the frame. */
const spread = (n, W, from, to, y, h, faceFor) => Array.from({ length: n }, (_, i) => {
  const x = n === 1 ? W * (from + to) / 2 : W * (from + (to - from) * (i / (n - 1)));
  return { x, y, h, face: faceFor(i, n) };
});
const towardsMiddle = (i, n) => (n === 1 ? "camera" : i < (n - 1) / 2 ? "right" : i > (n - 1) / 2 ? "left" : "camera");

export const SETS = {
  news: {
    label: "News desk",
    help: "A presenter behind a news desk in a studio with screens behind.",
    max: 2,
    back(ctx, W, H, { accent = "#5be3b5", t = 0 } = {}) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#0e2340"], [1, "#06111f"]]); ctx.fillRect(0, 0, W, H);
      // a world map of dots on the back wall, slowly drifting
      ctx.fillStyle = "rgba(127,211,255,0.10)";
      for (let i = 0; i < 260; i++) { const gx = (i * 37) % 97, gy = (i * 53) % 41; ctx.beginPath(); ctx.arc(((gx / 97) * W + t * 6) % W, H * 0.06 + (gy / 41) * H * 0.48, W * 0.0035, 0, 6.3); ctx.fill(); }
      for (const [x, w, c] of [[0.06, 0.24, accent], [0.7, 0.24, "#7fd3ff"]]) {
        ctx.fillStyle = c + "1a"; rr(ctx, W * x, H * 0.1, W * w, H * 0.4, W * 0.01); ctx.fill();
        ctx.strokeStyle = c + "66"; ctx.lineWidth = Math.max(1, W * 0.002); ctx.stroke();
      }
      ctx.fillStyle = rad(ctx, W / 2, H * 0.35, W * 0.45, [[0, "rgba(255,255,255,0.08)"], [1, "rgba(255,255,255,0)"]]); ctx.fillRect(0, 0, W, H);
    },
    front(ctx, W, H, { accent = "#5be3b5", title = "" } = {}) {
      const top = H * 0.7;
      ctx.fillStyle = lin(ctx, 0, top - H * 0.02, 0, top + H * 0.04, [[0, "#eef2f7"], [1, "#a9b6c4"]]);
      ctx.beginPath(); ctx.moveTo(W * 0.03, top); ctx.lineTo(W * 0.97, top); ctx.lineTo(W, top + H * 0.035); ctx.lineTo(0, top + H * 0.035); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, top, 0, H, [[0, "#1b3556"], [1, "#0b1a2e"]]); ctx.fillRect(0, top + H * 0.035, W, H);
      ctx.fillStyle = accent; ctx.fillRect(0, top + H * 0.06, W, H * 0.008);
      if (title) { ctx.fillStyle = "#e8f1f2"; ctx.font = `700 ${Math.round(H * 0.05)}px Sora, sans-serif`; ctx.textAlign = "center"; ctx.fillText(title, W / 2, top + H * 0.17); ctx.textAlign = "start"; }
    },
    seats: (n, W, H) => spread(Math.min(n, 2), W, n > 1 ? 0.3 : 0.5, n > 1 ? 0.7 : 0.5, H * 0.74, H * 1.15, towardsMiddle),
  },

  meeting: {
    label: "Conference room",
    help: "A team around a meeting table, a window wall and a screen behind.",
    max: 4,
    back(ctx, W, H) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#e9edf1"], [1, "#cfd6de"]]); ctx.fillRect(0, 0, W, H);
      // window wall with a city outside
      ctx.fillStyle = lin(ctx, 0, H * 0.05, 0, H * 0.6, [[0, "#9cc7e8"], [1, "#d8e8f3"]]); ctx.fillRect(W * 0.04, H * 0.05, W * 0.6, H * 0.55);
      ctx.fillStyle = "rgba(60,90,120,0.35)";
      for (let i = 0; i < 14; i++) { const bw = W * (0.02 + ((i * 7) % 5) * 0.006), bh = H * (0.12 + ((i * 11) % 7) * 0.035); ctx.fillRect(W * 0.05 + i * W * 0.042, H * 0.6 - bh, bw, bh); }
      ctx.strokeStyle = "#8a96a3"; ctx.lineWidth = Math.max(2, W * 0.004);
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(W * (0.04 + i * 0.15), H * 0.05); ctx.lineTo(W * (0.04 + i * 0.15), H * 0.6); ctx.stroke(); }
      // a screen on the right wall
      ctx.fillStyle = "#1b2433"; rr(ctx, W * 0.7, H * 0.12, W * 0.25, H * 0.3, W * 0.008); ctx.fill();
      ctx.fillStyle = "#5be3b5"; for (let i = 0; i < 4; i++) ctx.fillRect(W * (0.73 + i * 0.05), H * (0.36 - i * 0.045), W * 0.03, H * (0.04 + i * 0.045));
      // a plant
      ctx.fillStyle = "#3f8f4a"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(W * 0.67, H * 0.52, W * 0.012, H * 0.08, -0.9 + i * 0.3, 0, 6.3); ctx.fill(); }
    },
    front(ctx, W, H) {
      const top = H * 0.72;
      ctx.fillStyle = lin(ctx, 0, top, 0, top + H * 0.08, [[0, "#8a5a36"], [1, "#5e3c22"]]);
      ctx.beginPath(); ctx.moveTo(W * 0.06, top); ctx.lineTo(W * 0.94, top); ctx.lineTo(W * 1.02, top + H * 0.09); ctx.lineTo(-W * 0.02, top + H * 0.09); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#4a2f1a"; ctx.fillRect(-W * 0.02, top + H * 0.09, W * 1.04, H * 0.03);
      // laptops and cups on the table
      for (const x of [0.22, 0.5, 0.78]) {
        ctx.fillStyle = "#c9d1d9"; ctx.beginPath(); ctx.moveTo(W * (x - 0.05), top + H * 0.02); ctx.lineTo(W * (x + 0.05), top + H * 0.02); ctx.lineTo(W * (x + 0.06), top + H * 0.045); ctx.lineTo(W * (x - 0.06), top + H * 0.045); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e9e4da"; rr(ctx, W * (x + 0.075), top + H * 0.005, W * 0.018, H * 0.035, W * 0.004); ctx.fill();
      }
      ctx.fillStyle = lin(ctx, 0, top + H * 0.12, 0, H, [[0, "#b7c0ca"], [1, "#9aa5b1"]]); ctx.fillRect(0, top + H * 0.12, W, H);
    },
    seats: (n, W, H) => spread(Math.min(n, 4), W, n > 1 ? 0.2 : 0.5, n > 1 ? 0.8 : 0.5, H * 0.76, H * 0.95, towardsMiddle),
  },

  stage: {
    label: "Conference stage",
    help: "Speakers at a podium and on a panel on a conference stage, a big screen behind.",
    max: 3,
    back(ctx, W, H, { accent = "#b48cff", t = 0, title = "" } = {}) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#140a26"], [1, "#05030b"]]); ctx.fillRect(0, 0, W, H);
      // the big screen
      ctx.fillStyle = lin(ctx, W * 0.15, 0, W * 0.85, 0, [[0, "#2a1650"], [1, "#0e2d52"]]); rr(ctx, W * 0.14, H * 0.06, W * 0.72, H * 0.42, W * 0.01); ctx.fill();
      if (title) { ctx.fillStyle = "#ffffff"; ctx.font = `700 ${Math.round(H * 0.06)}px Sora, sans-serif`; ctx.textAlign = "center"; ctx.fillText(title, W / 2, H * 0.3); ctx.textAlign = "start"; }
      // spotlights
      for (const [x, c] of [[0.25, accent], [0.75, "#7fd3ff"]]) {
        ctx.fillStyle = lin(ctx, W * x, 0, W * x, H * 0.85, [[0, c + "40"], [1, c + "00"]]);
        ctx.beginPath(); ctx.moveTo(W * x - W * 0.02, 0); ctx.lineTo(W * x + W * 0.02, 0); ctx.lineTo(W * x + W * 0.16 + Math.sin(t) * W * 0.01, H * 0.85); ctx.lineTo(W * x - W * 0.16, H * 0.85); ctx.closePath(); ctx.fill();
      }
    },
    front(ctx, W, H, { accent = "#b48cff" } = {}) {
      const floor = H * 0.8;
      ctx.fillStyle = lin(ctx, 0, floor, 0, H, [[0, "#241640"], [1, "#0b0614"]]); ctx.fillRect(0, floor, W, H);
      ctx.fillStyle = accent; ctx.fillRect(0, floor, W, H * 0.006);
      // a podium (left seat) and a low panel table (the others)
      ctx.fillStyle = lin(ctx, W * 0.2, 0, W * 0.34, 0, [[0, "#2c2c3a"], [1, "#1a1a24"]]);
      ctx.beginPath(); ctx.moveTo(W * 0.19, H * 0.66); ctx.lineTo(W * 0.35, H * 0.66); ctx.lineTo(W * 0.33, H); ctx.lineTo(W * 0.21, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(W * 0.19, H * 0.66, W * 0.16, H * 0.01);
      ctx.fillStyle = "#1a1a24"; ctx.fillRect(W * 0.45, H * 0.72, W * 0.47, H * 0.3);
      ctx.fillStyle = accent + "aa"; ctx.fillRect(W * 0.45, H * 0.72, W * 0.47, H * 0.006);
    },
    seats: (n, W, H) => {
      const s = [{ x: W * 0.27, y: H * 0.7, h: H * 1.05, face: "right" }];
      if (n > 1) s.push(...spread(Math.min(n - 1, 2), W, 0.58, 0.8, H * 0.76, H * 0.9, () => "left"));
      return s.slice(0, n);
    },
  },

  podcast: {
    label: "Podcast",
    help: "Two hosts recording a podcast: microphones on arms, a soundproofed wall, an ON AIR light.",
    max: 2,
    back(ctx, W, H, { accent = "#ff5f7a", t = 0 } = {}) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#2a2230"], [1, "#16121b"]]); ctx.fillRect(0, 0, W, H);
      // acoustic foam panels
      const cw = W * 0.06, ch = H * 0.1;
      for (let y = H * 0.06; y < H * 0.62; y += ch * 1.05) for (let x = W * 0.08; x < W * 0.92; x += cw * 1.05) {
        ctx.fillStyle = lin(ctx, x, y, x + cw, y + ch, [[0, "#3a2e44"], [1, "#2a2133"]]); rr(ctx, x, y, cw, ch, cw * 0.15); ctx.fill();
      }
      // ON AIR sign, softly pulsing
      const on = 0.75 + 0.25 * Math.sin(t * 3);
      ctx.fillStyle = `rgba(255,95,122,${0.25 * on})`; ctx.fillRect(W * 0.41, H * 0.02, W * 0.18, H * 0.075);
      ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1, W * 0.002); ctx.strokeRect(W * 0.41, H * 0.02, W * 0.18, H * 0.075);
      ctx.fillStyle = accent; ctx.globalAlpha = on; ctx.font = `700 ${Math.round(H * 0.045)}px Sora, sans-serif`; ctx.textAlign = "center"; ctx.fillText("ON AIR", W / 2, H * 0.073); ctx.textAlign = "start"; ctx.globalAlpha = 1;
      // warm lamp glow
      ctx.fillStyle = rad(ctx, W * 0.5, H * 0.5, W * 0.5, [[0, "rgba(255,180,110,0.12)"], [1, "rgba(255,180,110,0)"]]); ctx.fillRect(0, 0, W, H);
    },
    front(ctx, W, H) {
      const top = H * 0.73;
      ctx.fillStyle = lin(ctx, 0, top, 0, top + H * 0.05, [[0, "#3b2a1e"], [1, "#24180f"]]); ctx.fillRect(0, top, W, H * 0.05);
      ctx.fillStyle = "#1a120c"; ctx.fillRect(0, top + H * 0.05, W, H);
      // a microphone on an arm in front of each host
      for (const [x, dir] of [[0.3, 1], [0.7, -1]]) {
        ctx.strokeStyle = "#1c1c22"; ctx.lineWidth = Math.max(3, W * 0.006); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(W * (x - dir * 0.14), top); ctx.lineTo(W * (x - dir * 0.08), H * 0.5); ctx.lineTo(W * (x - dir * 0.03), H * 0.53); ctx.stroke();
        ctx.fillStyle = "#2a2a33"; rr(ctx, W * (x - dir * 0.03) - W * 0.018, H * 0.5, W * 0.036, H * 0.09, W * 0.018); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.15)"; for (let i = 0; i < 5; i++) ctx.fillRect(W * (x - dir * 0.03) - W * 0.014, H * (0.51 + i * 0.014), W * 0.028, H * 0.003);
        // headphones lying on the desk
        ctx.strokeStyle = "#111"; ctx.lineWidth = Math.max(2, W * 0.004); ctx.beginPath(); ctx.arc(W * (x + dir * 0.1), top + H * 0.01, W * 0.025, Math.PI, 0); ctx.stroke();
      }
    },
    seats: (n, W, H) => spread(Math.min(n, 2), W, n > 1 ? 0.3 : 0.5, n > 1 ? 0.7 : 0.5, H * 0.76, H * 1.05, towardsMiddle),
  },
};
export const SET_IDS = Object.keys(SETS);
