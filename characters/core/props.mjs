// ---------------------------------------------------------------------------
// Props: objects a character holds (motion library, 27 Oct 2026).
//
// Each prop has the names a script may use for it ("[drinks from the mug]",
// "[gives the box to Maria]"), a size in body heights, where it is held (its
// grip point), whether it stays upright on screen or follows the forearm, and
// a drawing made of the same pen and paint as the characters, so it takes
// each look's lines, shading and print effects. Default colours are strong on
// purpose: a white cup vanishes against a white shirt. `open` (0–1) opens what can
// open: a box's lid, a book.
// ---------------------------------------------------------------------------

/**
 * names: words in a script tag; size: body heights; hold: "fist" (the hand
 * closes round a handle, in front, the object beside it), "under" (the
 * object rests on an open hand, drawn over it) or "seat" (it stands on the
 * floor under the hips, behind the body: a chair); upright: stays level on
 * screen (a cup) instead of following the forearm (a sword); colors: defaults.
 */
export const PROPS = {
  cup: { label: "Cup", names: ["cup", "mug", "coffee", "tea", "κούπα", "φλιτζάνι", "καφέ"], size: 0.1, hold: "fist", upright: true, colors: ["#e0574f", "#5a3420"] },
  phone: { label: "Phone", names: ["phone", "mobile", "τηλέφωνο", "κινητό"], size: 0.06, hold: "under", upright: true, colors: ["#20242c", "#7fd3ff"] },
  book: { label: "Book", names: ["book", "notebook", "βιβλίο", "τετράδιο"], size: 0.07, hold: "under", upright: true, colors: ["#a8322b", "#f4efe2"] },
  box: { label: "Box", names: ["box", "parcel", "package", "κουτί", "δέμα"], size: 0.15, hold: "under", upright: true, colors: ["#c99a5b", "#8a6236"] },
  gift: { label: "Gift", names: ["gift", "present", "δώρο"], size: 0.14, hold: "under", upright: true, colors: ["#d4405c", "#f2d24b"] },
  ball: { label: "Ball", names: ["ball", "μπάλα"], size: 0.07, hold: "under", upright: true, colors: ["#f2f2f2", "#d4405c"] },
  flowers: { label: "Flowers", names: ["flowers", "flower", "bouquet", "λουλούδια", "λουλούδι"], size: 0.13, hold: "fist", upright: true, colors: ["#3f8f4a", "#e85d8a", "#f2c84b"] },
  sword: { label: "Sword", names: ["sword", "blade", "σπαθί"], size: 0.34, hold: "fist", upright: false, colors: ["#c9d1d9", "#7a5230"] },
  chair: { label: "Chair", names: ["chair", "stool", "seat", "καρέκλα", "σκαμπό"], size: 0.27, hold: "seat", upright: true, colors: ["#8a5a36", "#6b4429"] },
  leash: { label: "Lead", names: ["leash", "lead", "λουρί"], size: 0.22, hold: "fist", upright: true, colors: ["#d4405c"] },
};
export const PROP_IDS = Object.keys(PROPS);

/** id → the names a script tag may use (for readMoveTag). */
export const PROP_NAMES = Object.fromEntries(Object.entries(PROPS).map(([id, p]) => [id, p.names]));

/**
 * Draw a prop held at a skeleton arm's hand. Coordinates: px, in the figure's
 * own (possibly mirrored) frame, like the hand itself.
 */
export function drawProp(G, arm, prop, { open = 0, colors, palm = 0 } = {}) {
  const P = PROPS[prop];
  if (!P) return;
  const { pen, S, ctx } = G;
  const c = colors ?? P.colors;
  // beside a fist, or resting on the open hand
  const [hx, hy] = [arm.ha[0] * S + (P.hold === "fist" && P.upright ? palm * 0.75 : 0), arm.ha[1] * S + (P.hold === "under" ? -palm * 0.35 : 0)];
  const L = P.size * S;
  const ang = P.upright ? 0 : Math.atan2(arm.ha[1] - arm.el[1], arm.ha[0] - arm.el[0]) - Math.PI / 2;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  const rect = (x0, y0, w, h, r = 0.08) => pen.rpoly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], Math.min(w, h) * r);
  switch (prop) {
    case "cup": {
      // the body beside the fist (the handle is inside it)
      rect(0, -L * 0.75, L * 0.6, L * 0.8, 0.18); G.fill(c[0]);
      pen.ellipse(L * 0.3, -L * 0.75, L * 0.3, L * 0.07); G.fill(c[1], { noShade: true });
      break;
    }
    case "phone":
      rect(-L * 0.28, -L * 0.85, L * 0.56, L, 0.18); G.fill(c[0], { noShade: true });
      rect(-L * 0.22, -L * 0.78, L * 0.44, L * 0.82, 0.06); G.fill(c[1], { noShade: true, feature: true });
      break;
    case "book": {
      const o = Math.min(1, open);
      if (o > 0.05) { // open: two pages fanned
        pen.poly([[0, 0], [-L * 0.75 * o - L * 0.05, -L * 0.1], [-L * 0.7 * o - L * 0.05, -L * 0.85], [0, -L * 0.8]]); G.fill(c[1], { noShade: true });
        pen.poly([[0, 0], [L * 0.75, -L * 0.1], [L * 0.7, -L * 0.85], [0, -L * 0.8]]); G.fill(c[1], { noShade: true });
      } else { rect(-L * 0.35, -L * 0.9, L * 0.7, L, 0.06); G.fill(c[0]); }
      break;
    }
    case "box":
    case "gift": {
      rect(-L * 0.5, -L * 0.85, L, L * 0.85, 0.04); G.fill(c[0]);
      if (prop === "gift") { rect(-L * 0.07, -L * 0.85, L * 0.14, L * 0.85, 0); G.fill(c[1], { noShade: true }); }
      // the lid swings up and back as it opens
      ctx.save();
      ctx.translate(-L * 0.52, -L * 0.85);
      ctx.rotate(-Math.min(1, open) * 1.9);
      rect(0, -L * 0.14, L * 1.04, L * 0.16, 0.1); G.fill(prop === "gift" ? c[0] : c[1]);
      if (prop === "gift") { pen.blob([[L * 0.52, -L * 0.14], [L * 0.32, -L * 0.42], [L * 0.5, -L * 0.2], [L * 0.72, -L * 0.42]]); G.fill(c[1], { noShade: true }); }
      ctx.restore();
      break;
    }
    case "ball":
      pen.circle(0, -L * 0.45, L * 0.5); G.fill(c[0]);
      pen.ellipse(0, -L * 0.45, L * 0.5, L * 0.16, 0.5); G.line(c[1], 0.007);
      break;
    case "flowers":
      for (const [dx, dy, k] of [[-0.25, -0.9, 2], [0.05, -1, 1], [0.3, -0.85, 2], [-0.05, -0.75, 1]]) {
        pen.poly([[0, 0], [dx * L * 0.6, dy * L * 0.6]], false); G.line(c[0], 0.006);
        pen.circle(dx * L * 0.6, dy * L * 0.6, L * 0.13); G.fill(c[k], { noShade: true });
      }
      break;
    case "sword":
      rect(-L * 0.035, -L, L * 0.07, L * 0.82, 0.3); G.fill(c[0]);
      rect(-L * 0.14, -L * 0.2, L * 0.28, L * 0.05, 0.3); G.fill(c[1]);
      rect(-L * 0.03, -L * 0.16, L * 0.06, L * 0.24, 0.3); G.fill(c[1]);
      break;
    case "chair": {
      // drawn from the floor (y = 0 at the hand's origin is moved to the floor by drawSeat)
      const seatY = -L, w = L * 1.15;
      rect(-w / 2, seatY - L * 0.08, w, L * 0.12, 0.2); G.fill(c[0]);
      for (const x of [-w / 2 + L * 0.06, w / 2 - L * 0.14]) { rect(x, seatY + L * 0.02, L * 0.08, L * 0.98, 0.2); G.fill(c[1]); }
      rect(-w / 2 - L * 0.02, seatY - L * 0.95, L * 0.1, L * 0.95, 0.2); G.fill(c[1]); // the back
      break;
    }
    case "leash":
      // hangs from the hand towards the floor in a lazy curve (the dog is the caller's)
      pen.curve([[0, 0], [L * 0.25, L * 0.5], [L * 0.6, L * 0.8]]); G.line(c[0], 0.007);
      break;
  }
  ctx.restore();
}

/** A seat prop (a chair) under the hips, standing on the floor, behind the body. */
export function drawSeat(G, sk, prop, { colors } = {}) {
  const P = PROPS[prop];
  if (!P || P.hold !== "seat") return;
  // hips sit 0.27 above the floor when seated (rig.mjs): the seat's top is there
  if (sk.side > 0.5 || sk.turn > 0.6) {
    drawProp(G, { ha: [sk.legs[0].hip[0] * 0.5 - 0.03, 0], el: [0, 1] }, prop, { colors });
    return;
  }
  // facing the camera: a seat wider than the hips, a leg at each side, the
  // back's two posts and top rail showing round the shoulders
  const { pen, S } = G, c = colors ?? P.colors, L = P.size * S;
  const half = Math.max(sk.hx * 1.9, 0.09) * S, seatY = -L, cx = 0;
  const box = (x0, y0, w, h) => pen.rpoly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], Math.min(w, h) * 0.2);
  for (const x of [cx - half - L * 0.06, cx + half - L * 0.06]) { box(x, seatY - L * 1.05, L * 0.12, L * 1.05); G.fill(c[1]); }
  box(cx - half - L * 0.06, seatY - L * 1.05, half * 2 + L * 0.12, L * 0.12); G.fill(c[1]);
  for (const x of [cx - half + L * 0.02, cx + half - L * 0.1]) { box(x, seatY, L * 0.09, L); G.fill(c[1]); }
  box(cx - half - L * 0.04, seatY - L * 0.06, half * 2 + L * 0.08, L * 0.16); G.fill(c[0]);
}
