// node --test tools/lib/brand.test.mjs
//
// Brand packs: a computer with no brand.local.json is neutral, one with it
// gets that pack, and nothing a pack names can reach outside brands/.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, activeBrandId, listBrands, loadBrand, setActiveBrand } from "./brand.mjs";

function tmpRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brand-"));
  const pack = path.join(root, "brands", "acme");
  fs.mkdirSync(path.join(pack, "puppet"), { recursive: true });
  fs.writeFileSync(
    path.join(pack, "brand.json"),
    JSON.stringify({
      name: "Acme",
      cast: [{ file: "robin.puppet.json", label: "Robin" }],
      addOutros: { outrosDir: "outros/cut", lessonsSrc: "/somewhere/else" },
    })
  );
  return root;
}

test("no brand.local.json means no brand", () => {
  const root = tmpRoot();
  assert.equal(activeBrandId(root), null);
  assert.equal(loadBrand(undefined, root), null);
});

test("switching a pack on and off", () => {
  const root = tmpRoot();
  setActiveBrand("acme", root);
  assert.equal(activeBrandId(root), "acme");
  const b = loadBrand(undefined, root);
  assert.equal(b.name, "Acme");
  assert.equal(b.puppetDir, path.join(root, "brands", "acme", "puppet"));
  assert.equal(b.addOutros.outrosDir, path.join(root, "brands", "acme", "outros", "cut"));
  assert.equal(b.addOutros.lessonsSrc, path.resolve("/somewhere/else"));
  setActiveBrand(null, root);
  assert.equal(activeBrandId(root), null);
});

test("a name with no pack behind it is refused", () => {
  const root = tmpRoot();
  assert.throws(() => setActiveBrand("nobody", root), /no brand pack/);
  assert.equal(fs.existsSync(path.join(root, "brand.local.json")), false);
});

test("a brand name cannot climb out of brands/", () => {
  const root = tmpRoot();
  fs.writeFileSync(path.join(root, "brand.local.json"), JSON.stringify({ brand: "../etc" }));
  assert.equal(activeBrandId(root), null);
  assert.throws(() => loadBrand("../etc", root), /not a brand name/);
});

test("lists packs by folder", () => {
  assert.deepEqual(listBrands(tmpRoot()), ["acme"]);
});

// The real pack in this repository: every character it names has a puppet.
test("the Skilitsa pack is complete", () => {
  const b = loadBrand("skilitsa", ROOT);
  assert.ok(b.cast.length > 0);
  for (const c of b.cast) {
    assert.ok(fs.existsSync(path.join(b.puppetDir, c.file)), `${c.file} missing from ${b.puppetDir}`);
  }
  assert.ok(fs.existsSync(b.addOutros.outrosDir));
  assert.ok(b.sample?.script?.length > 0);
});

// The app's own folders must not carry a brand's characters again.
test("the neutral puppet folder holds no brand characters", () => {
  const leftovers = fs
    .readdirSync(path.join(ROOT, "puppet"))
    .filter((f) => /^(kaiti|serifis|tsika)\b/.test(f));
  assert.deepEqual(leftovers, []);
});
