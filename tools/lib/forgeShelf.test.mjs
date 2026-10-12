// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { placeOrder, openOrders, orderPicture, finishOrder, orderResult, savePuppetFile, listPuppets, validateOrder, shelfRoot } from "./forgeShelf.mjs";

const root = () => fs.mkdtempSync(path.join(os.tmpdir(), "forge-shelf-"));
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test("lives in APPDATA\Forge", () => assert.equal(shelfRoot({ APPDATA: "C:\X" }), path.join("C:\X", "Forge")));

test("an order placed by Video Forge is seen by Image Forge, with its pictures", () => {
  const r = root();
  const placed = placeOrder(r, { id: "order-123456", name: "Hoolio", description: "a grey owl librarian", style: "flat", framing: "waist" }, [png, png]);
  assert.equal(placed.ok, true);
  const open = openOrders(r);
  assert.equal(open.length, 1);
  assert.deepEqual(open[0].inspirations, ["insp_0.png", "insp_1.png"]);
  assert.equal(open[0].framing, "waist");
  assert.deepEqual(orderPicture(r, "order-123456", "insp_1.png"), png);
});

test("an answered order is no longer open, and its answer can be read", () => {
  const r = root();
  placeOrder(r, { id: "order-abcdef", description: "x" });
  finishOrder(r, "order-abcdef", { slug: "hoolio" });
  assert.equal(openOrders(r).length, 0);
  assert.equal(orderResult(r, "order-abcdef").slug, "hoolio");
});

test("bad orders and bad names are refused", () => {
  assert.equal(validateOrder({ id: "../x", description: "a" }).ok, false);
  assert.equal(validateOrder({ id: "order-123456", description: "  " }).ok, false);
  assert.equal(validateOrder({ id: "order-123456", description: "a", style: "evil" }).order.style, "pixar");
  const r = root();
  assert.equal(savePuppetFile(r, "../up", "a.png", png).ok, false);
  assert.equal(savePuppetFile(r, "ok", "../a.png", png).ok, false);
  assert.equal(orderPicture(r, "order-123456", "../../secret.png"), null);
});

test("a puppet appears on the shelf only once its rig file is written", () => {
  const r = root();
  savePuppetFile(r, "hoolio", "base.png", png);
  assert.equal(listPuppets(r).length, 0);
  savePuppetFile(r, "hoolio", "hoolio.rig.json", Buffer.from(JSON.stringify({ name: "hoolio", base: "base.png", poses: { wave: {} }, madeBy: { name: "Hoolio" } })));
  const list = listPuppets(r);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Hoolio");
  assert.equal(list[0].framing, "waist");
  assert.ok(list[0].basePath.endsWith(path.join("hoolio", "base.png")));
});
