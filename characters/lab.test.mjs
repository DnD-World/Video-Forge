// The 2D lab (characters/lab): every move and every two-person scene gives
// finite drawings, feet never go through the floor, and THE MODESTY CHECK:
// in calm, breeze and gusty wind no hem ever rises past HEM_LIFT_MAX.
//   node --test characters/lab.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCard, drawCharacter } from "./core/index.mjs";
import { lookById } from "./core/looks.mjs";
import { RecordingCtx } from "./core/record.mjs";
import { Actor, buildFor } from "./lab/actor.mjs";
import { restPose } from "./lab/body.mjs";
import { HEM_LIFT_MAX, HEM_SWAY_MAX } from "./lab/physics.mjs";
import * as MV from "./lab/moves.mjs";
import * as PR from "./lab/pair.mjs";
import CAST from "../brands/redflag/cast.mjs";
import { cardFor } from "./core/character.mjs";

const cardOf = (id) => {
  const p = CAST.people.find((x) => x.id === id);
  // drawn flat (form 0), as these checks were written before the cast had the 3D settings in its files
  return { card: { ...cardFor(p), form: 0, formDetail: false, formLimbs: 1 }, look: lookById(p.look) };
};
const draw = (a, F) => {
  const rc = new RecordingCtx(600, 600);
  drawCharacter(rc, a.card, { look: a.look, S: 400, x: 300, y: 550, mirror: a.mirror, state: a.drawState(F) });
  return rc;
};

test("every lab move draws finite frames with the feet on or above the floor", () => {
  const { card, look } = cardOf("chloe");
  for (const b of [MV.wave, MV.sitStand, MV.jump, MV.kick, MV.dance, MV.faint, MV.windStand]) {
    const a = new Actor({ card, look, move: buildFor(card, look, b) });
    for (let t = 0; t < a.move.len; t += 50) {
      const F = a.solve(a.poseAt(t), t);
      a.simulate(F, t, null, null);
      assert.equal(draw(a, F).bad, 0, `${b.name} at ${t} ms`);
      // within 0.4% of the height: under a pixel at video size
      for (const f of F.feet()) if (!F.rot) assert.ok(f[1] <= 0.004, `${b.name} at ${t} ms: a foot below the floor (${f[1]})`);
    }
  }
});

test("modesty: in any wind, and jumping, no hem rises past the limit", () => {
  for (const who of ["chloe", "margo", "amber"]) {
    const { card, look } = cardOf(who);
    for (const wind of [{ strength: 0 }, { strength: 0.55, gusty: 0.4 }, { strength: 1.25, gusty: 1 }, { strength: 2.5, gusty: 1, dir: -1 }]) {
      for (const b of [MV.windStand, MV.jump, MV.dance]) {
        const a = new Actor({ card, look, move: buildFor(card, look, b) });
        let worst = 0;
        for (let t = 0; t < Math.min(a.move.len, 6000); t += 33) {
          const F = a.solve(a.poseAt(t), t);
          a.simulate(F, t, wind, null);
          draw(a, F);
          worst = Math.max(worst, a.loose.readLift());
        }
        assert.ok(worst <= HEM_LIFT_MAX + 1e-9, `${who} ${b.name} wind ${wind.strength}: hem rose ${worst}`);
      }
    }
  }
});

test("two-person scenes solve and their hands reach their contacts", () => {
  const sets = [[PR.handshake, "chloe", "lucas"], [PR.hug, "chloe", "margo"], [PR.headPat, "chloe", "young_amber"], [PR.playCatch, "amber", "lucas"]];
  for (const [b, x, y] of sets) {
    const cs = [cardOf(x), cardOf(y)];
    // as on the lab page: the child drawn at 80% (the cast sheet makes kids nearly adult height)
    if (y === "young_amber") cs[1].card = { ...cs[1].card, height: cs[1].card.height * 0.8, headSize: (cs[1].card.headSize ?? 1) * 0.8 };
    const probe = b(...cs.map((c) => restPose(c.card, c.look, 0)));
    const sc = b(...cs.map((c, i) => restPose(c.card, c.look, probe.actors[i].move.view)));
    const actors = sc.actors.map((s, i) => new Actor({ ...cs[i], x: s.x, mirror: s.mirror, move: s.move, seed: i }));
    for (let t = 0; t < sc.len; t += 100) {
      let F = actors.map((a) => a.solve(a.poseAt(t), t));
      const ball = sc.ball?.(t, (i, tt) => actors[i].solve(actors[i].poseAt(tt), tt));
      const contacts = sc.contacts?.(t, F, ball) ?? [];
      F = F.map((f, i) => actors[i].withContacts(f, contacts.filter((c) => c.actor === i)));
      F.forEach((f, i) => assert.equal(draw(actors[i], f).bad, 0, `${sc.id} at ${t}`));
      // a fully weighted contact within reach: the hand ends up on it
      for (const c of contacts.filter((c) => c.w === 1)) {
        const h = F[c.actor].hand(c.hand), d = Math.hypot(h[0] - c.at[0], h[1] - c.at[1]);
        assert.ok(d < 0.06, `${sc.id} at ${t} ms: ${c.hand} hand ${d.toFixed(3)} from its contact`);
      }
    }
  }
});

test("modesty: in the two-person scenes a dress never swings off the hips (sideways cap)", () => {
  for (const [b, x, y] of [[PR.handshake, "chloe", "lucas"], [PR.hug, "chloe", "margo"]]) {
    const cs = [cardOf(x), cardOf(y)];
    const probe = b(...cs.map((c) => restPose(c.card, c.look, 0)));
    const sc = b(...cs.map((c, i) => restPose(c.card, c.look, probe.actors[i].move.view)));
    const actors = sc.actors.map((s, i) => new Actor({ ...cs[i], x: s.x, mirror: s.mirror, move: s.move, seed: i }));
    let worst = 0;
    for (let t = 0; t < sc.len; t += 33) {
      const F = actors.map((a) => a.solve(a.poseAt(t), t));
      F.forEach((f, i) => { actors[i].simulate(f, t, null, null); draw(actors[i], f); worst = Math.max(worst, actors[i].loose.readSway()); });
    }
    assert.ok(worst <= HEM_SWAY_MAX + 1e-9 && HEM_SWAY_MAX <= 0.025, `${sc.id}: a hem swung ${worst.toFixed(3)} sideways`);
  }
});

test("clay details draw finite frames for every Red Flag look in the lab", () => {
  for (const who of ["chloe", "lucas", "amber", "margo"]) {
    const { card, look } = cardOf(who);
    const a = new Actor({ card: { ...card, form: 0.5, formDetail: true }, look, move: buildFor(card, look, MV.wave) });
    for (let t = 0; t < a.move.len; t += 200) {
      const F = a.solve(a.poseAt(t), t);
      assert.equal(draw(a, F).bad, 0, `${who} clay at ${t} ms`);
    }
  }
});

// Code review, 5 Nov 2026: the everyday follow-through hem (followAt, no physics) kept the
// modesty cap too. A huge sideways push may widen the dress by at most HEM_SWAY_MAX.
test("the follow-through hem keeps the same modesty cap as the physics hem", async () => {
  const { capHem } = await import("./core/follow.mjs");
  for (const [dx, dy] of [[5, -5], [-5, 5], [0.001, -0.001]]) {
    const [cx, cy] = capHem(dx, dy);
    assert.ok(Math.abs(cx) <= HEM_SWAY_MAX && cy >= -HEM_LIFT_MAX);
  }
  const { card } = normalizeCard({ name: "Hem", wear: [{ id: "dress" }] });
  const look = lookById("sticker"), S = 500;
  const box = (hem) => {
    const rc = new RecordingCtx(800, 800);
    drawCharacter(rc, card, { look, S, x: 400, y: 760, state: { t: 0, view: 0, follow: hem ? { hair: [0, 0], hem, ear: 0, tilt: {} } : undefined } });
    return rc.box;
  };
  const still = box(null);
  for (const push of [[10, 0], [-10, 0]]) {
    const b = box(push);
    const grew = Math.max(still.x0 - b.x0, b.x1 - still.x1);
    assert.ok(grew <= HEM_SWAY_MAX * S + 1, `the hem swung ${(grew / S).toFixed(3)} of the body height sideways`);
  }
});
