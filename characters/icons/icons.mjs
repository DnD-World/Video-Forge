// ---------------------------------------------------------------------------
// ANIMATED ICONS (#20, 28 Oct 2026): pop-ups beside a speaker, drawn by code
// so there is nothing to download or licence, each with its own little life
// (a gear turns, a red flag waves, a bulb glows, a d20 rolls, a paw stamps).
// Picked for Ak's subjects: D&D, dogs, manipulation defence, soft skills,
// seasonal, ELI5 AI, tropes — plus everyday reactions.
//
//   ICONS            id → { label, subjects, names, draw(ctx, t, r, k) }
//                    drawn centred on 0,0 inside radius r; t seconds since
//                    it appeared; k (0–1) how far it has popped in
//   drawPop(ctx, pop, x, y, size, ms)   the whole pop: scale-in with an
//                    overshoot, a gentle float, a fade-out at the end; an
//                    emoji ("🎉") is drawn the same way from the font
//   findIcon(words)  "red flag" / "κόκκινη σημαία" / "flag" → an icon id
// Deterministic: a pure function of the time, like everything drawn here.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const ease = (k) => 1 - Math.pow(1 - k, 3);
const back = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// ---- little drawing helpers --------------------------------------------------------------
const P = {
  circle(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } },
  poly(ctx, pts, fill, stroke, lw) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke(); } },
  rrect(ctx, x, y, w, h, rad, fill, stroke, lw) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, rad) : ctx.rect(x, y, w, h); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } },
  line(ctx, pts, stroke, lw) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); },
  star(ctx, x, y, r, n, inner, rot, fill, stroke, lw) { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r * inner : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } P.poly(ctx, pts, fill, stroke, lw); },
  heart(ctx, x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.moveTo(x, y + r * 0.85); ctx.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.75, y - r * 1.05, x, y - r * 0.4); ctx.bezierCurveTo(x + r * 0.75, y - r * 1.05, x + r * 1.3, y - r * 0.1, x, y + r * 0.85); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } },
  sparkles(ctx, t, r, color, n = 4) { for (let i = 0; i < n; i++) { const a = i * (TAU / n) + t * 0.8, d = r * (1.05 + 0.12 * Math.sin(t * 5 + i)), s = r * 0.13 * (0.6 + 0.4 * Math.sin(t * 7 + i * 2)); P.star(ctx, Math.cos(a) * d, Math.sin(a) * d, s, 4, 0.35, 0, color); } },
  text(ctx, s, x, y, size, fill, weight = 800) { ctx.font = `${weight} ${size}px Sora, "Segoe UI", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = fill; ctx.fillText(s, x, y); },
};
const INK = "#20152e";
const L = (r) => Math.max(1.5, r * 0.09); // line width

// ---- the icons ---------------------------------------------------------------------------
export const ICONS = {
  // everyday reactions
  heart: { label: "Heart", subjects: ["everyday", "seasonal", "dogs"], names: ["heart", "love", "καρδιά", "αγάπη"],
    draw(ctx, t, r) { const b = 1 + 0.12 * Math.max(0, Math.sin(t * 7)) ** 6; ctx.scale(b, b); P.heart(ctx, 0, 0, r * 0.9, "#ff4d6d", INK, L(r)); P.circle(ctx, -r * 0.35, -r * 0.35, r * 0.15, "rgba(255,255,255,0.6)"); } },
  star: { label: "Star", subjects: ["everyday", "tropes"], names: ["star", "great", "αστέρι"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 2) * 0.15); P.star(ctx, 0, 0, r, 5, 0.48, 0, "#ffd400", INK, L(r)); P.sparkles(ctx, t, r, "#fff3a0"); } },
  check: { label: "Tick", subjects: ["everyday", "softskills", "dogs"], names: ["check", "tick", "yes", "correct", "right", "σωστό", "ναι"],
    draw(ctx, t, r, k) { P.circle(ctx, 0, 0, r, "#2ecc71", INK, L(r)); const d = Math.min(1, t * 3); const pts = [[-r * 0.45, 0], [-r * 0.1, r * 0.35], [r * 0.5, -r * 0.35]]; const seg = d < 0.4 ? [pts[0], [pts[0][0] + (pts[1][0] - pts[0][0]) * d / 0.4, pts[0][1] + (pts[1][1] - pts[0][1]) * d / 0.4]] : [pts[0], pts[1], [pts[1][0] + (pts[2][0] - pts[1][0]) * (d - 0.4) / 0.6, pts[1][1] + (pts[2][1] - pts[1][1]) * (d - 0.4) / 0.6]]; P.line(ctx, seg, "#ffffff", r * 0.2); } },
  cross: { label: "Cross", subjects: ["everyday", "manipulation", "dogs"], names: ["cross", "no", "wrong", "x", "λάθος", "όχι"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 18) * 0.12 * Math.max(0, 1 - t * 1.5)); P.circle(ctx, 0, 0, r, "#ff4d4d", INK, L(r)); P.line(ctx, [[-r * 0.4, -r * 0.4], [r * 0.4, r * 0.4]], "#fff", r * 0.2); P.line(ctx, [[r * 0.4, -r * 0.4], [-r * 0.4, r * 0.4]], "#fff", r * 0.2); } },
  question: { label: "Question", subjects: ["everyday", "softskills", "ai"], names: ["question", "why", "what", "ερώτηση", "γιατί"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 3) * 0.2); P.circle(ctx, 0, 0, r, "#7fd3ff", INK, L(r)); P.text(ctx, "?", 0, r * 0.06, r * 1.4, INK); } },
  exclaim: { label: "Exclamation", subjects: ["everyday", "manipulation"], names: ["exclamation", "wow", "attention", "προσοχή", "!"],
    draw(ctx, t, r) { const s = 1 + 0.08 * Math.sin(t * 12); ctx.scale(s, s); P.poly(ctx, [[0, -r], [r * 0.95, r * 0.75], [-r * 0.95, r * 0.75]], "#ffb000", INK, L(r)); P.text(ctx, "!", 0, r * 0.2, r * 1.1, INK); } },
  idea: { label: "Light bulb", subjects: ["everyday", "softskills", "ai"], names: ["idea", "bulb", "light bulb", "ιδέα"],
    draw(ctx, t, r) { const g = 0.5 + 0.5 * Math.sin(t * 4); ctx.save(); ctx.globalAlpha = 0.35 * g; P.circle(ctx, 0, -r * 0.15, r * 1.15, "#fff3a0"); ctx.restore(); P.circle(ctx, 0, -r * 0.2, r * 0.65, "#ffe14d", INK, L(r)); P.rrect(ctx, -r * 0.3, r * 0.35, r * 0.6, r * 0.45, r * 0.1, "#b8c2cc", INK, L(r)); P.line(ctx, [[-r * 0.15, -r * 0.1], [0, r * 0.1], [r * 0.15, -r * 0.1]], "#c98a00", r * 0.08); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; P.line(ctx, [[Math.cos(a) * r * 0.85, -r * 0.2 + Math.sin(a) * r * 0.85], [Math.cos(a) * r * (1.05 + 0.1 * g), -r * 0.2 + Math.sin(a) * r * (1.05 + 0.1 * g)]], "#ffd400", r * 0.08); } } },
  laugh: { label: "Ha ha", subjects: ["everyday", "tropes"], names: ["laugh", "haha", "funny", "lol", "γέλιο"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 10) * 0.08); P.rrect(ctx, -r, -r * 0.6, r * 2, r * 1.2, r * 0.4, "#ff48b0", INK, L(r)); P.poly(ctx, [[-r * 0.3, r * 0.55], [-r * 0.6, r * 0.95], [0, r * 0.55]], "#ff48b0", INK, L(r)); P.text(ctx, "HA HA", 0, 0, r * 0.62, "#fff"); } },
  thumbsup: { label: "Thumbs up", subjects: ["everyday", "softskills"], names: ["thumbs up", "like", "good", "μπράβο", "τέλεια"],
    draw(ctx, t, r) { ctx.rotate(-0.1 + Math.sin(t * 4) * 0.08); P.rrect(ctx, -r * 0.55, -r * 0.1, r * 1.05, r * 0.95, r * 0.25, "#ffcf9a", INK, L(r)); P.rrect(ctx, -r * 0.25, -r * 0.95, r * 0.42, r * 1.0, r * 0.2, "#ffcf9a", INK, L(r)); P.rrect(ctx, -r * 0.95, -r * 0.05, r * 0.38, r * 0.95, r * 0.12, "#3a6fb0", INK, L(r)); } },

  // D&D
  d20: { label: "D20 dice", subjects: ["dnd"], names: ["d20", "dice", "roll", "ζάρι"],
    draw(ctx, t, r) { const roll = Math.max(0, 1 - t * 1.4); ctx.rotate(roll * 9); const pts = []; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } P.poly(ctx, pts, "#b48cff", INK, L(r)); P.poly(ctx, [[0, -r * 0.55], [r * 0.5, r * 0.32], [-r * 0.5, r * 0.32]], "#d5c2ff", INK, L(r) * 0.8); for (const p of [pts[0], pts[2], pts[4]]) P.line(ctx, [p, [p[0] * 0.55, p[1] * 0.55]], INK, L(r) * 0.6); ctx.rotate(-roll * 9); const n = roll > 0 ? 1 + Math.floor((t * 30) % 20) : 20; P.text(ctx, String(n), 0, r * 0.05, r * 0.42, roll > 0 ? INK : "#e2231a"); } },
  sword: { label: "Sword", subjects: ["dnd", "tropes"], names: ["sword", "fight", "attack", "σπαθί"],
    draw(ctx, t, r) { ctx.rotate(-0.8 + Math.sin(t * 3) * 0.12); P.poly(ctx, [[-r * 0.1, -r], [r * 0.1, -r], [r * 0.1, r * 0.35], [-r * 0.1, r * 0.35]], "#d9e2ea", INK, L(r)); P.poly(ctx, [[-r * 0.1, -r], [0, -r * 1.2], [r * 0.1, -r]], "#d9e2ea", INK, L(r)); P.rrect(ctx, -r * 0.42, r * 0.33, r * 0.84, r * 0.14, r * 0.05, "#c99a5b", INK, L(r)); P.rrect(ctx, -r * 0.08, r * 0.45, r * 0.16, r * 0.45, r * 0.05, "#7a5230", INK, L(r)); const sh = (t * 2) % 2; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.abs(sh - 0.5) * 3); P.line(ctx, [[0, -r * 0.9], [0, -r * 0.2]], "#ffffff", r * 0.06); ctx.restore(); } },
  shield: { label: "Shield", subjects: ["dnd", "manipulation"], names: ["shield", "defend", "protect", "ασπίδα", "προστασία"],
    draw(ctx, t, r) { const s = 1 + 0.05 * Math.sin(t * 5); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, -r * 0.8, r * 0.85, -r * 0.6); ctx.quadraticCurveTo(r * 0.8, r * 0.5, 0, r); ctx.quadraticCurveTo(-r * 0.8, r * 0.5, -r * 0.85, -r * 0.6); ctx.quadraticCurveTo(-r * 0.9, -r * 0.8, 0, -r); ctx.closePath(); ctx.fillStyle = "#3a6fb0"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); P.star(ctx, 0, -r * 0.05, r * 0.38, 5, 0.45, 0, "#ffd400", INK, L(r) * 0.6); } },
  potion: { label: "Potion", subjects: ["dnd", "seasonal"], names: ["potion", "magic", "heal", "φίλτρο", "μαγεία"],
    draw(ctx, t, r) { P.circle(ctx, 0, r * 0.25, r * 0.7, "#ff4d9a", INK, L(r)); P.rrect(ctx, -r * 0.2, -r * 0.75, r * 0.4, r * 0.45, r * 0.06, "#cfe8ff", INK, L(r)); P.rrect(ctx, -r * 0.25, -r * 0.95, r * 0.5, r * 0.22, r * 0.06, "#8a5a36", INK, L(r)); for (let i = 0; i < 3; i++) { const y = ((t * 0.8 + i / 3) % 1); P.circle(ctx, (i - 1) * r * 0.22, r * 0.6 - y * r * 1.9, r * 0.07 * (1 - y), "#ffffff"); } } },
  scroll: { label: "Scroll", subjects: ["dnd", "softskills"], names: ["scroll", "quest", "letter", "list", "πάπυρος"],
    draw(ctx, t, r) { const o = Math.min(1, t * 2.5); P.rrect(ctx, -r * 0.7, -r * 0.7 * o, r * 1.4, r * 1.4 * o, r * 0.05, "#f3e2b8", INK, L(r)); for (let i = 0; i < 3 && o > 0.6; i++) P.line(ctx, [[-r * 0.45, (-0.3 + i * 0.3) * r * o], [r * 0.45, (-0.3 + i * 0.3) * r * o]], "#b08a50", r * 0.07); P.rrect(ctx, -r * 0.85, -r * 0.82 * o - r * 0.12, r * 1.7, r * 0.24, r * 0.12, "#d9b878", INK, L(r)); P.rrect(ctx, -r * 0.85, r * 0.82 * o - r * 0.12, r * 1.7, r * 0.24, r * 0.12, "#d9b878", INK, L(r)); } },
  coin: { label: "Gold coin", subjects: ["dnd", "softskills"], names: ["coin", "gold", "money", "treasure", "χρυσό", "λεφτά"],
    draw(ctx, t, r) { const sx = Math.cos(t * 5); ctx.scale(Math.max(0.12, Math.abs(sx)), 1); P.circle(ctx, 0, 0, r, "#ffc93c", INK, L(r)); P.circle(ctx, 0, 0, r * 0.72, null, "#d99a00", r * 0.08); if (sx > 0) P.text(ctx, "$", 0, r * 0.05, r * 1.0, "#b37a00"); } },
  skull: { label: "Skull", subjects: ["dnd", "seasonal", "tropes"], names: ["skull", "death", "danger", "κρανίο"],
    draw(ctx, t, r) { const j = Math.max(0, Math.sin(t * 8)) * r * 0.08; P.circle(ctx, 0, -r * 0.15, r * 0.8, "#f4f1e8", INK, L(r)); P.rrect(ctx, -r * 0.42, r * 0.35 + j, r * 0.84, r * 0.45, r * 0.1, "#f4f1e8", INK, L(r)); P.circle(ctx, -r * 0.3, -r * 0.15, r * 0.2, INK); P.circle(ctx, r * 0.3, -r * 0.15, r * 0.2, INK); P.poly(ctx, [[0, r * 0.05], [-r * 0.08, r * 0.2], [r * 0.08, r * 0.2]], INK); } },
  crown: { label: "Crown", subjects: ["dnd", "tropes"], names: ["crown", "king", "queen", "royal", "winner", "στέμμα", "βασιλιάς"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 2) * 0.08); P.poly(ctx, [[-r, r * 0.5], [-r, -r * 0.4], [-r * 0.5, r * 0.05], [0, -r * 0.6], [r * 0.5, r * 0.05], [r, -r * 0.4], [r, r * 0.5]], "#ffd400", INK, L(r)); for (const [x, c] of [[-r * 0.5, "#e2231a"], [0, "#3a6fb0"], [r * 0.5, "#2ecc71"]]) P.circle(ctx, x, r * 0.25, r * 0.12, c, INK, L(r) * 0.6); P.sparkles(ctx, t, r, "#fff3a0", 3); } },
  dragon: { label: "Fire breath", subjects: ["dnd"], names: ["fire", "dragon", "flame", "burn", "φωτιά", "δράκος"],
    draw(ctx, t, r) { for (let i = 0; i < 3; i++) { const f = 1 - i * 0.28, w = Math.sin(t * 9 + i) * r * 0.1; ctx.beginPath(); ctx.moveTo(0, r * f); ctx.bezierCurveTo(-r * f, r * 0.3 * f, -r * 0.4 * f + w, -r * 0.5 * f, w, -r * f); ctx.bezierCurveTo(r * 0.4 * f + w, -r * 0.5 * f, r * f, r * 0.3 * f, 0, r * f); ctx.fillStyle = ["#ff4d1a", "#ff9a1a", "#ffe14d"][i]; ctx.fill(); if (!i) { ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); } } } },

  // dogs
  paw: { label: "Paw print", subjects: ["dogs"], names: ["paw", "dog", "puppy", "πατούσα", "σκύλος"],
    draw(ctx, t, r) { const stamp = Math.min(1, t * 4); ctx.scale(1.3 - 0.3 * stamp, 1.3 - 0.3 * stamp); P.circle(ctx, 0, r * 0.25, r * 0.5, "#6b3f2a", INK, L(r)); for (const [x, y] of [[-r * 0.55, -r * 0.25], [-r * 0.2, -r * 0.6], [r * 0.2, -r * 0.6], [r * 0.55, -r * 0.25]]) P.circle(ctx, x, y, r * 0.2, "#6b3f2a", INK, L(r)); } },
  bone: { label: "Bone", subjects: ["dogs"], names: ["bone", "treat", "κόκαλο", "λιχουδιά"],
    draw(ctx, t, r) { ctx.rotate(-0.5 + Math.sin(t * 3) * 0.15); for (const s of [-1, 1]) for (const v of [-1, 1]) P.circle(ctx, s * r * 0.7, v * r * 0.22, r * 0.28, "#f4ead2", INK, L(r)); P.rrect(ctx, -r * 0.7, -r * 0.2, r * 1.4, r * 0.4, r * 0.1, "#f4ead2"); P.line(ctx, [[-r * 0.6, -r * 0.2], [r * 0.6, -r * 0.2]], INK, L(r)); P.line(ctx, [[-r * 0.6, r * 0.2], [r * 0.6, r * 0.2]], INK, L(r)); } },
  ball: { label: "Ball", subjects: ["dogs"], names: ["ball", "fetch", "play", "μπάλα", "παιχνίδι"],
    draw(ctx, t, r) { const b = Math.abs(Math.sin(t * 5)); ctx.translate(0, -b * r * 0.35); ctx.scale(1 + (1 - b) * 0.08, 1 - (1 - b) * 0.08); P.circle(ctx, 0, 0, r * 0.75, "#d7f04a", INK, L(r)); ctx.beginPath(); ctx.arc(-r * 0.9, 0, r * 0.7, -0.7, 0.7); ctx.strokeStyle = "#fff"; ctx.lineWidth = r * 0.08; ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.7, Math.PI - 0.7, Math.PI + 0.7); ctx.stroke(); } },
  bowl: { label: "Food bowl", subjects: ["dogs"], names: ["bowl", "food", "dinner", "φαγητό", "μπολ"],
    draw(ctx, t, r) { for (let i = 0; i < 5; i++) P.circle(ctx, (i - 2) * r * 0.25, -r * 0.15 - Math.abs(Math.sin(t * 6 + i)) * r * 0.05, r * 0.16, "#a0522d", INK, L(r) * 0.5); P.poly(ctx, [[-r, -r * 0.1], [r, -r * 0.1], [r * 0.7, r * 0.6], [-r * 0.7, r * 0.6]], "#e2231a", INK, L(r)); P.text(ctx, "DOG", 0, r * 0.25, r * 0.38, "#fff"); } },
  whistle: { label: "Whistle", subjects: ["dogs", "softskills"], names: ["whistle", "command", "call", "σφυρίχτρα", "εντολή"],
    draw(ctx, t, r) { P.circle(ctx, r * 0.15, r * 0.15, r * 0.55, "#c9d1d9", INK, L(r)); P.rrect(ctx, -r * 0.95, -r * 0.3, r * 0.9, r * 0.35, r * 0.08, "#c9d1d9", INK, L(r)); for (let i = 0; i < 3; i++) { const p = (t * 1.5 + i / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(-r * 0.95, -r * 0.15, r * (0.3 + p * 0.6), Math.PI * 0.75, Math.PI * 1.25); ctx.strokeStyle = "#7fd3ff"; ctx.lineWidth = r * 0.08; ctx.stroke(); ctx.restore(); } } },

  // manipulation defence
  redflag: { label: "Red flag", subjects: ["manipulation", "softskills"], names: ["red flag", "flag", "warning sign", "κόκκινη σημαία", "σημαία"],
    draw(ctx, t, r) { P.line(ctx, [[-r * 0.6, -r], [-r * 0.6, r]], "#5a3825", r * 0.12); ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.95); for (let i = 0; i <= 10; i++) { const x = -r * 0.6 + i * r * 0.14, w = Math.sin(t * 6 - i * 0.7) * r * 0.08 * (i / 10); ctx.lineTo(x, -r * 0.95 + w); } for (let i = 10; i >= 0; i--) { const x = -r * 0.6 + i * r * 0.14, w = Math.sin(t * 6 - i * 0.7) * r * 0.08 * (i / 10); ctx.lineTo(x, -r * 0.15 + w); } ctx.closePath(); ctx.fillStyle = "#e2231a"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); } },
  warning: { label: "Warning", subjects: ["manipulation", "ai"], names: ["warning", "danger", "careful", "κίνδυνος", "προσοχή"],
    draw(ctx, t, r) { const on = Math.floor(t * 3) % 2 === 0; P.poly(ctx, [[0, -r], [r, r * 0.8], [-r, r * 0.8]], on ? "#ffd400" : "#ffb000", INK, L(r)); P.text(ctx, "!", 0, r * 0.25, r * 1.0, INK); } },
  mask: { label: "Mask", subjects: ["manipulation", "tropes"], names: ["mask", "fake", "lie", "two faces", "μάσκα", "ψέμα"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 2) * 0.12); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r, 0, 0, TAU); ctx.fillStyle = "#f4f1e8"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); P.circle(ctx, -r * 0.3, -r * 0.2, r * 0.16, INK); P.circle(ctx, r * 0.3, -r * 0.2, r * 0.16, INK); ctx.beginPath(); ctx.arc(0, r * 0.25, r * 0.35, 0.2, Math.PI - 0.2); ctx.stroke(); const crack = Math.min(1, t); P.line(ctx, [[r * 0.05, -r], [-r * 0.1, -r * 0.5 * crack - r * 0.5 * (1 - crack)], [r * 0.12, -r * 0.1 * crack - r * 0.9 * (1 - crack)]], INK, L(r) * 0.7); } },
  chain: { label: "Broken chain", subjects: ["manipulation", "softskills"], names: ["chain", "break free", "free", "αλυσίδα", "ελευθερία"],
    draw(ctx, t, r) { const gap = Math.min(1, t * 2) * r * 0.35; for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * gap, 0); ctx.rotate(s * Math.min(1, t * 2) * 0.3); ctx.beginPath(); ctx.ellipse(s * r * 0.45, 0, r * 0.45, r * 0.28, 0, 0, TAU); ctx.strokeStyle = "#9aa5b1"; ctx.lineWidth = r * 0.16; ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = L(r) * 0.5; ctx.stroke(); ctx.restore(); } P.sparkles(ctx, t, r * 0.5, "#ffe14d", 3); } },
  eye: { label: "Eye", subjects: ["manipulation", "ai", "tropes"], names: ["eye", "watch", "notice", "see", "μάτι", "πρόσεξε"],
    draw(ctx, t, r) { const blink = Math.max(0, Math.sin(t * 2.2)) ** 30; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r * (0.9 - 0.85 * blink), r, 0); ctx.quadraticCurveTo(0, r * (0.9 - 0.85 * blink), -r, 0); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); ctx.save(); ctx.clip(); P.circle(ctx, Math.sin(t * 1.5) * r * 0.25, 0, r * 0.38, "#3a6fb0"); P.circle(ctx, Math.sin(t * 1.5) * r * 0.25, 0, r * 0.17, INK); ctx.restore(); } },
  bell: { label: "Alarm bell", subjects: ["manipulation", "everyday"], names: ["alarm", "bell", "alert", "συναγερμός", "καμπάνα"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 20) * 0.25 * Math.max(0.2, 1 - t * 0.5)); ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.5); ctx.quadraticCurveTo(-r * 0.65, -r * 0.8, 0, -r * 0.8); ctx.quadraticCurveTo(r * 0.65, -r * 0.8, r * 0.7, r * 0.5); ctx.closePath(); ctx.fillStyle = "#ffc93c"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); P.circle(ctx, 0, r * 0.65, r * 0.17, "#c98a00", INK, L(r)); } },

  // soft skills
  speech: { label: "Speech bubble", subjects: ["softskills", "everyday"], names: ["speech", "talk", "chat", "say", "μιλάω", "κουβέντα"],
    draw(ctx, t, r) { P.rrect(ctx, -r, -r * 0.7, r * 2, r * 1.2, r * 0.45, "#ffffff", INK, L(r)); P.poly(ctx, [[-r * 0.4, r * 0.45], [-r * 0.6, r * 0.9], [-r * 0.05, r * 0.45]], "#ffffff", INK, L(r)); P.rrect(ctx, -r * 0.42, r * 0.4, r * 0.4, r * 0.12, 0, "#ffffff"); for (let i = 0; i < 3; i++) P.circle(ctx, (i - 1) * r * 0.45, -r * 0.1 - Math.max(0, Math.sin(t * 6 - i)) * r * 0.12, r * 0.12, INK); } },
  handshake: { label: "Deal", subjects: ["softskills"], names: ["deal", "agree", "handshake", "συμφωνία"],
    draw(ctx, t, r) { const sh = Math.sin(t * 9) * r * 0.06; P.rrect(ctx, -r, -r * 0.3 + sh, r * 1.1, r * 0.55, r * 0.25, "#ffcf9a", INK, L(r)); P.rrect(ctx, -r * 0.1, -r * 0.2 - sh, r * 1.1, r * 0.55, r * 0.25, "#e0a878", INK, L(r)); P.sparkles(ctx, t, r * 0.9, "#ffe14d", 3); } },
  target: { label: "Target", subjects: ["softskills", "ai"], names: ["target", "goal", "aim", "στόχος"],
    draw(ctx, t, r) { for (const [k, c] of [[1, "#e2231a"], [0.7, "#ffffff"], [0.4, "#e2231a"]]) P.circle(ctx, 0, 0, r * k, c, INK, L(r) * 0.7); const hit = Math.min(1, t * 2.5); ctx.save(); ctx.translate(r * 1.2 * (1 - hit), -r * 1.2 * (1 - hit)); ctx.rotate(-0.8); P.line(ctx, [[0, 0], [0, -r * 0.9]], INK, r * 0.08); P.poly(ctx, [[0, 0], [-r * 0.12, -r * 0.2], [r * 0.12, -r * 0.2]], INK); ctx.restore(); } },
  clock: { label: "Clock", subjects: ["softskills", "everyday"], names: ["clock", "time", "late", "wait", "ρολόι", "ώρα"],
    draw(ctx, t, r) { P.circle(ctx, 0, 0, r, "#ffffff", INK, L(r)); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; P.line(ctx, [[Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78], [Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88]], INK, r * 0.05); } P.line(ctx, [[0, 0], [Math.cos(t * 0.5 - Math.PI / 2) * r * 0.45, Math.sin(t * 0.5 - Math.PI / 2) * r * 0.45]], INK, r * 0.1); P.line(ctx, [[0, 0], [Math.cos(t * 6 - Math.PI / 2) * r * 0.7, Math.sin(t * 6 - Math.PI / 2) * r * 0.7]], "#e2231a", r * 0.06); } },
  chart: { label: "Chart going up", subjects: ["softskills", "ai"], names: ["growth", "chart", "progress", "better", "πρόοδος", "ανάπτυξη"],
    draw(ctx, t, r) { P.rrect(ctx, -r, -r, r * 2, r * 2, r * 0.25, "#12233a", INK, L(r)); const g = Math.min(1, t * 1.6); [0.3, 0.55, 0.8].forEach((h, i) => P.rrect(ctx, -r * 0.7 + i * r * 0.5, r * 0.75 - h * r * 1.4 * g, r * 0.35, h * r * 1.4 * g, r * 0.05, "#5be3b5")); P.line(ctx, [[-r * 0.6, r * 0.3], [-r * 0.1, -r * 0.1], [r * 0.3, 0], [r * 0.7, -r * 0.6]].map(([x, y]) => [x, y * g]), "#ffd400", r * 0.09); } },
  puzzle: { label: "Puzzle piece", subjects: ["softskills", "ai"], names: ["puzzle", "fit", "solve", "piece", "παζλ", "λύση"],
    draw(ctx, t, r) { const s = Math.min(1, t * 2); ctx.translate(0, -r * 0.3 * (1 - s)); ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.7); ctx.lineTo(-r * 0.2, -r * 0.7); ctx.arc(0, -r * 0.7, r * 0.2, Math.PI, 0); ctx.lineTo(r * 0.7, -r * 0.7); ctx.lineTo(r * 0.7, -r * 0.2); ctx.arc(r * 0.7, 0, r * 0.2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(r * 0.7, r * 0.7); ctx.lineTo(-r * 0.7, r * 0.7); ctx.closePath(); ctx.fillStyle = "#b48cff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); } },

  // seasonal
  snowflake: { label: "Snowflake", subjects: ["seasonal"], names: ["snow", "snowflake", "winter", "christmas", "χιόνι", "χριστούγεννα"],
    draw(ctx, t, r) { ctx.rotate(t * 0.6); for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(i * TAU / 6); P.line(ctx, [[0, 0], [0, -r]], "#cfe8ff", r * 0.12); P.line(ctx, [[0, -r * 0.55], [-r * 0.25, -r * 0.8]], "#cfe8ff", r * 0.09); P.line(ctx, [[0, -r * 0.55], [r * 0.25, -r * 0.8]], "#cfe8ff", r * 0.09); ctx.restore(); } P.circle(ctx, 0, 0, r * 0.15, "#ffffff"); } },
  gift: { label: "Gift", subjects: ["seasonal", "everyday"], names: ["gift", "present", "surprise", "δώρο", "έκπληξη"],
    draw(ctx, t, r) { const lid = Math.max(0, Math.min(1, (t - 0.4) * 3)); P.rrect(ctx, -r * 0.8, -r * 0.2, r * 1.6, r * 1.1, r * 0.08, "#e2231a", INK, L(r)); P.rrect(ctx, -r * 0.12, -r * 0.2, r * 0.24, r * 1.1, 0, "#ffd400"); ctx.save(); ctx.translate(0, -lid * r * 0.5); ctx.rotate(-lid * 0.4); P.rrect(ctx, -r * 0.9, -r * 0.45, r * 1.8, r * 0.3, r * 0.06, "#ff4d4d", INK, L(r)); P.circle(ctx, -r * 0.2, -r * 0.6, r * 0.2, null, "#ffd400", r * 0.1); P.circle(ctx, r * 0.2, -r * 0.6, r * 0.2, null, "#ffd400", r * 0.1); ctx.restore(); if (lid > 0.5) P.sparkles(ctx, t, r * 0.8, "#ffe14d", 5); } },
  pumpkin: { label: "Pumpkin", subjects: ["seasonal"], names: ["pumpkin", "halloween", "κολοκύθα"],
    draw(ctx, t, r) { const glow = 0.6 + 0.4 * Math.sin(t * 8 + Math.sin(t * 3)); for (const x of [-0.45, 0.45, 0]) { ctx.beginPath(); ctx.ellipse(x * r, r * 0.1, r * 0.55, r * 0.75, 0, 0, TAU); ctx.fillStyle = "#ff8c1a"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); } P.rrect(ctx, -r * 0.08, -r * 0.85, r * 0.16, r * 0.3, r * 0.05, "#3f8f4a", INK, L(r)); const fc = `rgba(255,${200 + 55 * glow},80,1)`; P.poly(ctx, [[-r * 0.4, -r * 0.1], [-r * 0.2, -r * 0.35], [-r * 0.05, -r * 0.1]], fc); P.poly(ctx, [[r * 0.4, -r * 0.1], [r * 0.2, -r * 0.35], [r * 0.05, -r * 0.1]], fc); P.poly(ctx, [[-r * 0.45, r * 0.2], [r * 0.45, r * 0.2], [r * 0.25, r * 0.45], [0, r * 0.32], [-r * 0.25, r * 0.45]], fc); } },
  egg: { label: "Easter egg", subjects: ["seasonal"], names: ["egg", "easter", "αυγό", "πάσχα"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 5) * 0.2); ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.7, r * 0.95, 0, 0, TAU); ctx.fillStyle = "#c2185b"; ctx.fill(); ctx.save(); ctx.clip(); for (let i = -2; i <= 2; i++) P.line(ctx, Array.from({ length: 9 }, (_, j) => [-r + j * r * 0.25, i * r * 0.38 + (j % 2 ? r * 0.08 : -r * 0.08)]), ["#ffd400", "#5be3b5", "#fff", "#5be3b5", "#ffd400"][i + 2], r * 0.1); ctx.restore(); ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.7, r * 0.95, 0, 0, TAU); ctx.strokeStyle = INK; ctx.lineWidth = L(r); ctx.stroke(); } },
  tree: { label: "Christmas tree", subjects: ["seasonal"], names: ["tree", "christmas tree", "δέντρο"],
    draw(ctx, t, r) { for (let i = 0; i < 3; i++) P.poly(ctx, [[0, -r + i * r * 0.45], [r * (0.5 + i * 0.2), -r * 0.35 + i * r * 0.5], [-r * (0.5 + i * 0.2), -r * 0.35 + i * r * 0.5]], "#2e8b57", INK, L(r)); P.rrect(ctx, -r * 0.12, r * 0.65, r * 0.24, r * 0.3, 0, "#7a5230", INK, L(r)); P.star(ctx, 0, -r, r * 0.22, 5, 0.45, t, "#ffd400", INK, L(r) * 0.6); for (let i = 0; i < 6; i++) P.circle(ctx, ((i * 37) % 11 - 5) * r * 0.08, -r * 0.4 + (i % 3) * r * 0.4, r * 0.08, Math.floor(t * 4 + i) % 2 ? "#e2231a" : "#ffe14d"); } },
  fireworks: { label: "Fireworks", subjects: ["seasonal", "everyday"], names: ["fireworks", "celebrate", "party", "yay", "πυροτεχνήματα", "γιορτή"],
    draw(ctx, t, r) { const p = (t * 1.2) % 1; for (let i = 0; i < 12; i++) { const a = i * TAU / 12, d = r * p; ctx.save(); ctx.globalAlpha = 1 - p; P.line(ctx, [[Math.cos(a) * d * 0.4, Math.sin(a) * d * 0.4], [Math.cos(a) * d, Math.sin(a) * d]], ["#ff48b0", "#ffd400", "#5be3b5", "#7fd3ff"][i % 4], r * 0.09); ctx.restore(); } P.circle(ctx, 0, 0, r * 0.12 * (1 - p), "#fff"); } },

  // ELI5 AI and automation
  robot: { label: "Robot", subjects: ["ai"], names: ["robot", "ai", "bot", "ρομπότ"],
    draw(ctx, t, r) { ctx.rotate(Math.sin(t * 3) * 0.08); P.line(ctx, [[0, -r * 0.6], [0, -r * 0.95]], INK, r * 0.07); P.circle(ctx, 0, -r * 0.98, r * 0.12, Math.floor(t * 3) % 2 ? "#e2231a" : "#ffd400", INK, L(r) * 0.5); P.rrect(ctx, -r * 0.8, -r * 0.6, r * 1.6, r * 1.3, r * 0.3, "#9fd8ff", INK, L(r)); const bl = Math.max(0, Math.sin(t * 2.5)) ** 20; for (const s of [-1, 1]) P.rrect(ctx, s * r * 0.35 - r * 0.15, -r * 0.2 + bl * r * 0.12, r * 0.3, r * 0.3 * (1 - bl) + r * 0.04, r * 0.08, INK); P.rrect(ctx, -r * 0.35, r * 0.3, r * 0.7, r * 0.14, r * 0.07, "#ffffff", INK, L(r) * 0.5); } },
  gear: { label: "Gears", subjects: ["ai"], names: ["gear", "gears", "automation", "settings", "process", "γρανάζι", "αυτοματισμός"],
    draw(ctx, t, r) { const g = (x, y, rr, n, a, c) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); const pts = []; for (let i = 0; i < n * 2; i++) { const ang = (i * Math.PI) / n; const rad = i % 2 ? rr * 0.78 : rr; pts.push([Math.cos(ang - 0.15) * rad, Math.sin(ang - 0.15) * rad], [Math.cos(ang + 0.15) * rad, Math.sin(ang + 0.15) * rad]); } P.poly(ctx, pts, c, INK, L(r) * 0.6); P.circle(ctx, 0, 0, rr * 0.3, "#20152e"); ctx.restore(); }; g(-r * 0.3, r * 0.15, r * 0.65, 8, t * 1.4, "#ffc93c"); g(r * 0.55, -r * 0.45, r * 0.42, 6, -t * 2.2 + 0.3, "#9aa5b1"); } },
  chip: { label: "Chip", subjects: ["ai"], names: ["chip", "computer", "processor", "τσιπ", "υπολογιστής"],
    draw(ctx, t, r) { for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { P.line(ctx, [[(-0.45 + i * 0.3) * r, s * r * 0.6], [(-0.45 + i * 0.3) * r, s * r * 0.95]], "#c9a227", r * 0.08); P.line(ctx, [[s * r * 0.6, (-0.45 + i * 0.3) * r], [s * r * 0.95, (-0.45 + i * 0.3) * r]], "#c9a227", r * 0.08); } P.rrect(ctx, -r * 0.65, -r * 0.65, r * 1.3, r * 1.3, r * 0.15, "#2a2a33", INK, L(r)); const p = (t * 1.5) % 1; ctx.save(); ctx.globalAlpha = 1 - p; P.rrect(ctx, -r * 0.35 - p * r * 0.2, -r * 0.35 - p * r * 0.2, r * 0.7 + p * r * 0.4, r * 0.7 + p * r * 0.4, r * 0.1, null, "#5be3b5", r * 0.06); ctx.restore(); P.text(ctx, "AI", 0, r * 0.03, r * 0.5, "#5be3b5"); } },
  sparkle: { label: "Sparkles", subjects: ["ai", "everyday", "tropes"], names: ["sparkle", "sparkles", "magic", "new", "λάμψη", "νέο"],
    draw(ctx, t, r) { for (const [x, y, s, o] of [[0, 0, 1, 0], [-r * 0.6, -r * 0.55, 0.45, 1], [r * 0.6, r * 0.5, 0.4, 2]]) { const k = 0.7 + 0.3 * Math.sin(t * 6 + o * 2); P.star(ctx, x, y, r * 0.75 * s * k, 4, 0.3, 0, "#fff3a0", INK, L(r) * 0.5); } } },
  bolt: { label: "Lightning", subjects: ["ai", "everyday"], names: ["lightning", "fast", "power", "energy", "κεραυνός", "γρήγορα"],
    draw(ctx, t, r) { const f = Math.floor(t * 12) % 7 === 0 ? 0.5 : 1; ctx.globalAlpha *= f; P.poly(ctx, [[r * 0.15, -r], [-r * 0.55, r * 0.1], [-r * 0.05, r * 0.1], [-r * 0.2, r], [r * 0.55, -r * 0.15], [r * 0.05, -r * 0.15]], "#ffd400", INK, L(r)); } },
  cloud: { label: "Cloud", subjects: ["ai"], names: ["cloud", "online", "internet", "σύννεφο", "ίντερνετ"],
    draw(ctx, t, r) { ctx.translate(Math.sin(t * 1.5) * r * 0.08, 0); for (const [x, y, rr] of [[-r * 0.45, r * 0.1, r * 0.45], [0, -r * 0.2, r * 0.55], [r * 0.45, r * 0.1, r * 0.45]]) P.circle(ctx, x, y, rr, "#ffffff", INK, L(r)); P.rrect(ctx, -r * 0.85, r * 0.05, r * 1.7, r * 0.5, r * 0.25, "#ffffff"); P.line(ctx, [[-r * 0.85, r * 0.55], [r * 0.85, r * 0.55]], INK, L(r)); const p = (t % 1); P.poly(ctx, [[0, r * 0.75 - p * r * 0.5], [-r * 0.15, r * 0.55 - p * r * 0.5], [r * 0.15, r * 0.55 - p * r * 0.5]], "#3a6fb0"); } },
  code: { label: "Code", subjects: ["ai"], names: ["code", "program", "κώδικας", "πρόγραμμα"],
    draw(ctx, t, r) { P.rrect(ctx, -r, -r * 0.75, r * 2, r * 1.5, r * 0.2, "#1d2333", INK, L(r)); P.text(ctx, "</>", 0, -r * 0.05, r * 0.8, "#5be3b5"); if (Math.floor(t * 2) % 2) P.rrect(ctx, r * 0.55, r * 0.25, r * 0.15, r * 0.25, 0, "#5be3b5"); } },
  wand: { label: "Magic wand", subjects: ["ai", "dnd", "tropes"], names: ["wand", "spell", "magic wand", "ραβδί", "ξόρκι"],
    draw(ctx, t, r) { ctx.rotate(-0.7 + Math.sin(t * 4) * 0.25); P.rrect(ctx, -r * 0.08, -r * 0.4, r * 0.16, r * 1.3, r * 0.06, "#2a1840", INK, L(r) * 0.6); P.rrect(ctx, -r * 0.08, -r * 0.4, r * 0.16, r * 0.25, 0, "#ffffff"); ctx.rotate(0.7); P.sparkles(ctx, t * 2, r * 0.55, "#ffe14d", 5); P.star(ctx, 0, -r * 0.55, r * 0.3, 5, 0.45, t, "#ffe14d", INK, L(r) * 0.5); } },

  // tropes
  spotlight: { label: "Spotlight", subjects: ["tropes", "everyday"], names: ["spotlight", "chosen one", "hero", "you", "προβολέας", "ήρωας"],
    draw(ctx, t, r) { ctx.save(); ctx.globalAlpha *= 0.45 + 0.15 * Math.sin(t * 3); P.poly(ctx, [[-r * 0.15, -r], [r * 0.15, -r], [r * 0.85, r], [-r * 0.85, r]], "#fff3a0"); ctx.restore(); P.rrect(ctx, -r * 0.3, -r * 1.1, r * 0.6, r * 0.3, r * 0.08, "#2a2a33", INK, L(r)); P.star(ctx, 0, r * 0.4, r * 0.3, 5, 0.45, 0, "#ffd400", INK, L(r) * 0.6); } },
  villain: { label: "Evil plan", subjects: ["tropes"], names: ["villain", "evil", "plan", "mwahaha", "κακός", "σχέδιο"],
    draw(ctx, t, r) { P.circle(ctx, 0, 0, r, "#6b3fa0", INK, L(r)); const tw = Math.sin(t * 6) * 0.15; P.line(ctx, [[-r * 0.55, -r * 0.3], [-r * 0.15, -r * 0.15 + tw * r]], INK, r * 0.1); P.line(ctx, [[r * 0.55, -r * 0.3], [r * 0.15, -r * 0.15 + tw * r]], INK, r * 0.1); ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.5, 0.3, Math.PI - 0.3); ctx.strokeStyle = INK; ctx.lineWidth = r * 0.1; ctx.stroke(); P.line(ctx, [[-r * 0.25, r * 0.38], [-r * 0.5, r * 0.15]], INK, r * 0.06); P.line(ctx, [[r * 0.25, r * 0.38], [r * 0.5, r * 0.15]], INK, r * 0.06); } },
  plot: { label: "Plot twist", subjects: ["tropes"], names: ["plot twist", "twist", "surprise", "ανατροπή"],
    draw(ctx, t, r) { ctx.rotate(t * 3); for (let i = 0; i < 2; i++) { ctx.rotate(Math.PI); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0.2, Math.PI - 0.4); ctx.strokeStyle = "#ff48b0"; ctx.lineWidth = r * 0.22; ctx.lineCap = "round"; ctx.stroke(); P.poly(ctx, [[-r * 0.85, -r * 0.05], [-r * 0.45, -r * 0.15], [-r * 0.7, r * 0.25]], "#ff48b0"); } } },
};
export const ICON_IDS = Object.keys(ICONS);

/** The icon a few words ask for ("red flag", "κόκκινη σημαία"), or null. Longest name wins. */
export function findIcon(words) {
  const w = String(words).toLowerCase().trim();
  let best = null, len = 0;
  for (const [id, ic] of Object.entries(ICONS)) for (const n of [id, ...ic.names]) {
    if ((w === n || w.startsWith(n + " ") || w.endsWith(" " + n) || w.includes(" " + n + " ")) && n.length > len) { best = id; len = n.length; }
  }
  return best;
}

const EMOJI = /\p{Extended_Pictographic}/u;
export const isEmoji = (s) => EMOJI.test(String(s));

/**
 * One pop at its moment. pop: { icon?: id, emoji?: "🎉", startMs, endMs };
 * (x, y) where it floats, size its diameter in px, ms the frame's time.
 * Pops in with an overshoot (0.35 s), floats and lives, fades out (0.3 s).
 */
export function drawPop(ctx, pop, x, y, size, ms) {
  const t = (ms - pop.startMs) / 1000, left = (pop.endMs - ms) / 1000;
  if (t < 0 || left < 0) return;
  const k = Math.min(1, t / 0.35);
  const sc = k < 1 ? Math.max(0, back(k)) : 1;
  const alpha = Math.min(1, left / 0.3, t / 0.1);
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y - Math.sin(t * 2.2) * r * 0.08 - (1 - ease(k)) * r * 0.4);
  ctx.globalAlpha *= alpha;
  ctx.scale(sc, sc);
  // a soft badge behind, so a pop reads on any background
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = r * 0.35; ctx.shadowOffsetY = r * 0.08;
  P.circle(ctx, 0, 0, r * 1.18, "rgba(255,255,255,0.92)");
  ctx.restore();
  if (pop.icon && ICONS[pop.icon]) {
    ctx.save(); ICONS[pop.icon].draw(ctx, t, r * 0.82, k); ctx.restore();
  } else if (pop.emoji) {
    ctx.rotate(Math.sin(t * 4) * 0.1);
    ctx.font = `${Math.round(r * 1.5)}px "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(pop.emoji, 0, r * 0.08);
  }
  ctx.restore();
}
