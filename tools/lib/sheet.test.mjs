// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, sheetCsvUrl } from "../../electron/batch/sheet.ts";

test("a normal Google Sheets link becomes its CSV export, keeping the tab", () => {
  assert.equal(
    sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbC_d-9/edit#gid=42"),
    "https://docs.google.com/spreadsheets/d/1AbC_d-9/export?format=csv&gid=42"
  );
  assert.equal(sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbC/edit?usp=sharing"), "https://docs.google.com/spreadsheets/d/1AbC/export?format=csv");
});

test("a 'publish to web' link uses the published export", () => {
  assert.equal(sheetCsvUrl("https://docs.google.com/spreadsheets/d/e/2PACX-x/pubhtml"), "https://docs.google.com/spreadsheets/d/e/2PACX-x/pub?output=csv");
});

test("any other address is used as it is", () => {
  assert.equal(sheetCsvUrl(" https://example.com/a.csv "), "https://example.com/a.csv");
});

test("CSV: quoted cells keep commas, quotes and line breaks; headers are lower-cased", () => {
  const rows = parseCsv('﻿Name,Script\r\n"Lesson 1","Καίτη: Γεια, σας!\nΣερίφης: Λέει ""ναι""."\r\nLesson 2,Καίτη: Ok\n\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Lesson 1");
  assert.equal(rows[0].script, 'Καίτη: Γεια, σας!\nΣερίφης: Λέει "ναι".');
  assert.equal(rows[1].script, "Καίτη: Ok");
});

test("CSV: semicolons (Greek Excel) work too", () => {
  assert.deepEqual(parseCsv("name;script\nA;B: c"), [{ name: "A", script: "B: c" }]);
});
