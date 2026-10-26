// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHistory, record, undo, redo, canUndo, canRedo, clear, isTypingTarget, shortcutFor } from "../../src/lib/project/history.ts";
import { addRecent, removeRecent, cleanRecent, ago, nameOf, RECENT_MAX } from "../../src/lib/project/recentProjects.ts";

test("undo goes back one step and redo comes forward again", () => {
  let h = createHistory("a");
  h = record(h, "b", 1000);
  h = record(h, "c", 5000);
  assert.equal(h.present, "c");
  h = undo(h); assert.equal(h.present, "b");
  h = undo(h); assert.equal(h.present, "a");
  assert.equal(canUndo(h), false);
  h = redo(h); assert.equal(h.present, "b");
  h = redo(h); assert.equal(h.present, "c");
  assert.equal(canRedo(h), false);
});

test("quick changes in a row are one step", () => {
  let h = createHistory(0);
  h = record(h, 1, 1000);
  for (let i = 2; i <= 30; i++) h = record(h, i, 1000 + i * 20); // a slider drag
  assert.equal(h.present, 30);
  h = undo(h);
  assert.equal(h.present, 0);
  assert.equal(canUndo(h), false);
});

test("a pause starts a new step", () => {
  let h = createHistory(0);
  h = record(h, 1, 1000);
  h = record(h, 2, 1200);   // same step as 1
  h = record(h, 3, 3000);   // new step
  h = undo(h);
  assert.equal(h.present, 2);
  h = undo(h);
  assert.equal(h.present, 0);
});

test("only 100 steps are kept", () => {
  let h = createHistory(0);
  for (let i = 1; i <= 250; i++) h = record(h, i, i * 10_000);
  assert.equal(h.past.length, 100);
  let n = 0;
  while (canUndo(h)) { h = undo(h); n++; }
  assert.equal(n, 100);
  assert.equal(h.present, 150);
});

test("a new change after undo drops the redo steps", () => {
  let h = createHistory("a");
  h = record(h, "b", 1000);
  h = record(h, "c", 9000);
  h = undo(h);
  h = record(h, "d", 20000);
  assert.equal(canRedo(h), false);
  assert.equal(undo(h).present, "b");
});

test("recording the state we are already in does nothing", () => {
  const h = createHistory("a");
  assert.equal(record(h, "a", 5), h);
});

test("an edit right after undo is its own step, not glued to the undone one", () => {
  let h = createHistory(0);
  h = record(h, 1, 1000);
  h = record(h, 2, 9000);
  h = undo(h);              // back at 1
  h = record(h, 5, 9100);   // within 500 ms of the undo
  h = undo(h);
  assert.equal(h.present, 1);
});

test("clear forgets everything", () => {
  let h = createHistory(0);
  h = record(h, 1, 1000);
  h = clear(9);
  assert.equal(canUndo(h), false);
  assert.equal(h.present, 9);
});

test("shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z; plain keys and Alt combos are left alone", () => {
  assert.equal(shortcutFor({ key: "z", ctrlKey: true }), "undo");
  assert.equal(shortcutFor({ key: "Z", ctrlKey: true, shiftKey: true }), "redo");
  assert.equal(shortcutFor({ key: "y", ctrlKey: true }), "redo");
  assert.equal(shortcutFor({ key: "z", metaKey: true }), "undo");
  assert.equal(shortcutFor({ key: "z" }), null);
  assert.equal(shortcutFor({ key: "z", ctrlKey: true, altKey: true }), null);
  assert.equal(shortcutFor({ key: "a", ctrlKey: true }), null);
});

test("undo is left to text fields, but sliders and buttons do not keep it", () => {
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "text" }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "number" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "range" }), false);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(isTypingTarget({ tagName: "BUTTON" }), false);
  assert.equal(isTypingTarget(null), false);
});

test("recent list: newest first, no duplicates, capped at 10", () => {
  let l = [];
  l = addRecent(l, "C:\\p\\a.byokproj.json", 1);
  l = addRecent(l, "C:\\p\\b.byokproj.json", 2);
  l = addRecent(l, "c:/p/A.byokproj.json", 3); // same file, other spelling
  assert.deepEqual(l.map((r) => r.name), ["A", "b"]);
  for (let i = 0; i < 20; i++) l = addRecent(l, `C:\\p\\x${i}.json`, 10 + i);
  assert.equal(l.length, RECENT_MAX);
  assert.equal(l[0].name, "x19");
});

test("recent list: remove, clean, names and relative time", () => {
  let l = addRecent([], "C:\\p\\dog.byokproj.json", 100);
  assert.deepEqual(removeRecent(l, "c:/p/dog.byokproj.json"), []);
  assert.deepEqual(cleanRecent([{ path: "x.json", openedAt: 5 }, { nope: 1 }, null, "s"]).map((r) => r.name), ["x"]);
  assert.deepEqual(cleanRecent("junk"), []);
  assert.equal(nameOf("/a/b/Lesson 1.byokproj.json"), "Lesson 1");
  const H = 3600_000;
  assert.equal(ago(0, 10_000), "just now");
  assert.equal(ago(0, 5 * 60_000), "5 minutes ago");
  assert.equal(ago(0, 3 * H), "3 hours ago");
  assert.equal(ago(0, 24 * H), "yesterday");
  assert.equal(ago(0, 5 * 24 * H), "5 days ago");
});
