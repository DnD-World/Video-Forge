// Reading a sheet: Google Sheets links → their CSV export, and CSV → rows.
// Pure, so tools/lib/sheet.test.mjs runs the real code.

/** The CSV export address for whatever kind of Google Sheets link was pasted. */
export function sheetCsvUrl(url: string): string {
  const u = url.trim();
  const m = /docs\.google\.com\/spreadsheets\/d\/(e\/)?([A-Za-z0-9_-]+)/.exec(u);
  if (!m) return u; // a plain CSV address — used as it is
  const gid = /[#&?]gid=(\d+)/.exec(u)?.[1];
  // "Publish to web" links (/d/e/…) have their own export form.
  if (m[1]) return `https://docs.google.com/spreadsheets/d/e/${m[2]}/pub?output=csv${gid ? `&gid=${gid}` : ""}`;
  return `https://docs.google.com/spreadsheets/d/${m[2]}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}

/** CSV → one object per row, keyed by the lower-cased header. Quotes, commas
 *  and line breaks inside quoted cells are handled — a script cell has them. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === "," || c === ";" || c === "\t") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

