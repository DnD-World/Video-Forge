// Run: npm test. Subtitle pages from lesson 101.1's real lines (26 Oct 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCues } from "../../src/lib/subtitles/wordTiming.ts";

const seg = (text, startMs = 0, endMs = 8000) => ({ speakerId: "k", speakerLabel: "Kaiti", startMs, endMs, text });
const pages = (text, max = 42) => buildCues([seg(text)], max).map((c) => c.words.map((w) => w.text).join(" "));

test("a new sentence starts a new page", () => {
  const p = pages("Δεν είναι ενοχή. Είναι καθαρός φόβος απέναντι στην απειλητική γλώσσα του σώματός σου.");
  assert.equal(p[0], "Δεν είναι ενοχή.");
  assert.ok(p[1].startsWith("Είναι καθαρός"), p.join(" | "));
});

test("no page ends on a little word like 'το' or 'να'", () => {
  for (const text of [
    "Χαμηλώνει το κεφάλι, γλείφει τα χείλη της και στρέφει αλλού το βλέμμα.",
    "Μα Σερίφη μου, αποκλείεται να κάνω τόσο μεγάλο λάθος!",
    "Γιατί όταν γυρνάς σπίτι και βρίσκεις την παντόφλα σου μασουλημένη, η σκυλίτσα σου σε κοιτάει με αυτό το απίστευτο βλέμμα απόλυτης ενοχής;",
  ]) {
    for (const page of pages(text)) {
      const last = page.split(" ").pop().replace(/[^\p{L}]/gu, "");
      assert.ok(!/^(το|τα|να|και|την|η|με|σε|σου)$/.test(last), `"${page}" ends on "${last}"`);
      assert.ok(page.length <= 42, `"${page}" is too long`);
    }
  }
});

test("pages are even, not a long one and a scrap", () => {
  const p = pages("Χαμηλώνει το κεφάλι, γλείφει τα χείλη της και στρέφει αλλού το βλέμμα.");
  assert.equal(p.length, 2);
  assert.ok(Math.abs(p[0].length - p[1].length) < 20, p.join(" | "));
});

test("short gaps between pages are bridged; mouth timing keeps one cue per line", () => {
  const cues = buildCues([seg("Πρώτη πρόταση εδώ.", 0, 1000), seg("Δεύτερη πρόταση εκεί.", 1300, 2500)], 42);
  assert.equal(cues[0].endMs, cues[1].startMs);
  const whole = buildCues([seg("Δεν είναι ενοχή. Είναι καθαρός φόβος απέναντι στην απειλητική γλώσσα.")], Number.MAX_SAFE_INTEGER);
  assert.equal(whole.length, 1);
});
