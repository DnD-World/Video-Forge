// Turn the cut-layer artwork into a puppet this app can draw.
//
//   node tools/make-rig-puppet.mjs "../lms/visemes" tsika kaiti serifis
//
// The art from lms/visemes is a base portrait plus layers anchored by absolute
// x/y/w/h in `placement.json`. The app's puppets are anchored to a named head
// box, in units of that box. Those are the same thing said two ways, so this
// converts rather than re-derives: NO anchor is guessed or nudged, because the
// cut coordinates are already exact.
//
//   head = { cx: 0.5, cy: 0.5, w: 1 }  and  sourceHeadWidth = the base's width
//
// makes the "head box" the whole image, so a layer's offset is simply its
// centre in image coordinates minus the middle. One line of arithmetic, no
// per-character tuning, and nothing to get wrong.
//
// THE MAGENTA HAS TO GO. The art is drawn on flat #FF00FF so the layers could
// be cut; a video needs it transparent. Keying is done here, once, rather than
// in the renderer every frame — and with a despill pass, because a feathered
// edge over magenta leaves a pink halo that is invisible on a magenta
// background and glaring on a park.
//
// WHAT IS TRANSPARENT ON PURPOSE. The base already has closed lips, open eyes
// and no eyebrows raised, so the resting mouth, the open lid and the resting
// brow are all "draw nothing". They are real entries pointing at a 1px
// transparent file, because the renderer needs a layer to fade to and from.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

const SRC = process.argv[2] ?? '../lms/visemes';
const CHARS = process.argv.slice(3).filter((a) => !a.startsWith('--'));
if (!CHARS.length) { console.error('usage: make-rig-puppet.mjs <visemes dir> <char> [char…]'); process.exit(1); }

const OUT_ROOT = 'puppet';
// --wide makes a second, zoomed-out version beside the close one: as much of
// the portrait as fits in the frame, so clothes show — Καίτη's shirt, Σερίφης'
// uniform, Τσίκα's bow. Asked for the 2xx series (16 Sep 2026). Written to its
// own folder and file name, so the close-up puppets the 1xx series uses are
// never touched.
const WIDE = process.argv.includes('--wide');
const ART = WIDE ? 'rig-wide' : 'rig';

/** Magenta out, pink fringe out. Returns the same PNG, edited. */
function keyMagenta(png) {
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // Flat background: strongly magenta and bright. Cheap and exact, because
    // the background really is one colour.
    if (r > 180 && b > 180 && g < 90) { d[i + 3] = 0; continue; }
    // Despill: anywhere red and blue both run ahead of green, the excess is
    // background bleeding into an edge. Pull them back to green's level and
    // take the alpha down by how much had to be removed.
    //
    // BUT PINK IS A REAL COLOUR HERE — Τσίκα's bow and Καίτη's shirt — and the
    // plain "r and b are both above g" test eats it. The tell is symmetry:
    // magenta contamination lifts red and blue by the SAME amount, while pink
    // is much redder than it is blue. So a pixel is only treated as spill when
    // red and blue are close to each other, which the shirt never is.
    const spill = Math.min(r, b) - g;
    if (spill > 12 && Math.abs(r - b) < spill * 1.5 + 8 && d[i + 3] > 0) {
      const keep = Math.max(0, 1 - spill / 120);
      d[i] = Math.round(g + (r - g) * keep);
      d[i + 2] = Math.round(g + (b - g) * keep);
      d[i + 3] = Math.round(d[i + 3] * keep);
    }
  }
  return png;
}

/** Cut a square out of an image, transparent where the square runs off it. */
function cropTo(png, box) {
  const out = new PNG({ width: box.s, height: box.s });
  out.data.fill(0);
  for (let y = 0; y < box.s; y++) {
    const sy = y + box.y;
    if (sy < 0 || sy >= png.height) continue;
    for (let x = 0; x < box.s; x++) {
      const sx = x + box.x;
      if (sx < 0 || sx >= png.width) continue;
      const si = (sy * png.width + sx) * 4, di = (y * box.s + x) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

async function keyed(srcFile, dstFile, box) {
  let png = keyMagenta(PNG.sync.read(await readFile(srcFile)));
  if (box) png = cropTo(png, box);
  await writeFile(dstFile, PNG.sync.write(png));
  return { w: png.width, h: png.height };
}

/** Where the head is, so the disc can be filled by a face instead of a bust.
 *
 *  The art is head, neck and shoulders on a square, and drawn whole inside a
 *  circle a seventh of the frame wide it reads as a small figure far away. So
 *  the puppet is cropped to a head-and-shoulders square before it ever reaches
 *  the app — the layers move with it, by the same numbers, so the rig stays
 *  exact.
 *
 *  MEASURED, NOT TYPED IN. The eyes are already known: `lid_closed` was cut to
 *  cover them, so its box IS the eye line. The head's width is then the drawn
 *  run across that line — ear to ear — and every character's crop follows from
 *  it. Nothing is typed in per character and nothing needs redoing when a
 *  fourth one arrives.
 *
 *  The first version measured the crown instead, and Καίτη's ponytail made her
 *  head half as tall again as it is: her crop came out bigger than the picture.
 *  Hair moves; the distance between the ears does not. */
// Per-character framing, only where the measured rule misreads a face.
// Σερίφης' beard and ears hang BELOW his eye line, so ear-to-ear at the eyes is
// narrow and his crop came out tight enough to fill the whole circle.
const LOOSER = { serifis: 1.3 };
// For --wide only. 1 = the largest square whose bottom sits on the picture's
// bottom edge; below 1 is closer in. Σερίφης is already at 1 — the widest this
// portrait allows without his cut shoulders showing inside the circle.
const WIDE_SCALE = { tsika: 1, kaiti: 1, serifis: 1 };
// Where the eyes sit in the wide frame, as a fraction from the top. Lower eyes
// mean a BIGGER square that still ends on the picture's bottom edge, so the
// character shrinks inside the circle without her cut-off chest showing.
// Τσίκα asked "zoomed out significantly" (16 Sep 2026): 0.42 -> 0.52 is ~40%.
const WIDE_EYE_AT = { tsika: 0.52 };
// Sideways nudge of the wide frame, in source pixels. Σερίφης faces left of
// centre with his uniform off to the right, so centring on his eyes cut the
// uniform; shifting the frame right shows more of it.
const WIDE_SHIFT_X = { serifis: 90 };

function bustBox(basePng, layers, char) {
  const lid = layers.lid_closed ?? layers.lid_half;
  if (!lid) return null;
  const eyeX = Math.round(lid.x + lid.w / 2);
  const eyeY = Math.round(lid.y + lid.h / 2);
  const opaque = (x, y) =>
    x >= 0 && y >= 0 && x < basePng.width && y < basePng.height &&
    basePng.data[(y * basePng.width + x) * 4 + 3] > 40;

  let left = eyeX, right = eyeX;
  while (left > 0 && opaque(left - 1, eyeY)) left--;
  while (right < basePng.width - 1 && opaque(right + 1, eyeY)) right++;
  const headW = right - left;

  // A head and shoulders sits well when the head fills about two thirds of
  // the width and the eyes are a little above the middle — the portrait rule,
  // and it happens to be where a circular frame crops most kindly.
  let s = WIDE
    // As large as the picture allows with the eyes at the same height — the
    // square's bottom edge on the picture's bottom edge, which a circular frame
    // only touches at one point — then scaled per character by eye (Ak, 16 Sep
    // 2026: "less zoom out on Τσίκα, more on Σερίφης").
    ? Math.round(((basePng.height - eyeY) / (1 - (WIDE_EYE_AT[char] ?? 0.42))) * (WIDE_SCALE[char] ?? 1))
    : Math.round(headW * 1.5 * (LOOSER[char] ?? 1));
  // THE SQUARE MUST NOT RUN OFF THE BOTTOM OF THE PICTURE. The art stops at
  // the image's lower edge — the shoulders are simply cut there — and a crop
  // reaching past it drew that straight cut across the inside of the circle,
  // like a bust on a shelf. Shrinking the square until it fits puts the cut
  // outside the circle, where the frame hides it.
  const EYE_AT = WIDE ? (WIDE_EYE_AT[char] ?? 0.42) : 0.42;
  const maxS = Math.floor((basePng.height - eyeY) / (1 - EYE_AT));
  s = Math.min(s, maxS);
  const shift = WIDE ? (WIDE_SHIFT_X[char] ?? 0) : 0;
  return { s, x: Math.round(eyeX - s / 2 + shift), y: Math.round(eyeY - s * EYE_AT) };
}

/** A 1x1 fully transparent PNG — the "draw nothing" layer. */
async function writeEmpty(dstFile) {
  const png = new PNG({ width: 1, height: 1 });
  png.data.fill(0);
  await writeFile(dstFile, PNG.sync.write(png));
}

const MOUTHS = { 1: 'mouth_AH', 2: 'mouth_EE', 3: 'mouth_OH', 4: 'mouth_OO', 6: 'mouth_FV', 7: 'mouth_L', 8: 'mouth_CHSH' };
const BROWS = ['happy', 'serious', 'raised', 'worried', 'confused'];
const LIDS = ['half', 'closed', 'wide'];

for (const char of CHARS) {
  const place = JSON.parse(await readFile(path.join(SRC, 'layers', char, 'placement.json'), 'utf8'));
  const { w: baseW, h: baseH } = place.size;
  const artDir = path.join(OUT_ROOT, ART, char);
  await mkdir(artDir, { recursive: true });

  const baseSrc = path.join(SRC, 'base', place.base);
  const box = bustBox(keyMagenta(PNG.sync.read(await readFile(baseSrc))), place.layers, char);
  const frame = box ? box.s : baseW;
  await keyed(baseSrc, path.join(artDir, 'base.png'), box);
  await writeEmpty(path.join(artDir, 'empty.png'));

  /** placement entry -> a layer in the app's own terms. */
  const layer = (name) => {
    const p = place.layers[name];
    if (!p) return null;
    // The crop moves every layer with it — the same subtraction on both axes —
    // so a part still lands exactly where it was cut from.
    const ox = box ? box.x : 0;
    const oy = box ? box.y : 0;
    return {
      file: `${name}.png`,
      // Centre of the layer, in image widths, measured from the middle.
      x: (p.x - ox + p.w / 2) / frame - 0.5,
      y: (p.y - oy + p.h / 2) / frame - 0.5,
      w: p.w,
      h: p.h,
    };
  };
  const nothing = { file: 'empty.png', x: 0, y: 0, w: 1, h: 1 };

  const used = new Set();
  const mouths = { 0: nothing, 5: nothing };   // NEUTRAL and MBP: the base's own closed mouth
  for (const [id, name] of Object.entries(MOUTHS)) {
    const l = layer(name);
    if (l) { mouths[id] = l; used.add(name); }
    else console.log(`${char}: no ${name}`);
  }
  // A closed smile, used as the resting mouth on a happy line. Not a viseme the
  // text can produce — the performance code asks for it by this id.
  const smile = layer('mouth_SMILE');
  if (smile) { mouths[9] = smile; used.add('mouth_SMILE'); }

  // THE APP'S RESTING BROW IS CALLED "serious" (BROW_REST in facePerformance),
  // a name inherited from the first puppets, whose neutral brow happened to be
  // drawn that way. Here the base portrait already has calm brows, so resting
  // must draw NOTHING — pointing "serious" at the real serious drawing had all
  // three characters scowling through every quiet moment of the first render.
  //
  // So the real drawing is published as "firm", and the old names the app's
  // punctuation rules still ask for are pointed at the nearest face we have.
  const rest = { left: nothing, right: nothing };
  const brows = { rest, serious: rest };
  const PUBLISH = { happy: 'happy', firm: 'serious', raised: 'raised', worried: 'worried', confused: 'confused' };
  for (const [key, art] of Object.entries(PUBLISH)) {
    const l = layer(`brow_${art}`);
    // One drawing covers both brows, so it is the left entry and the right
    // draws nothing — rather than the same image twice, which would paint it
    // over itself.
    if (l) { brows[key] = { left: l, right: nothing }; used.add(`brow_${art}`); }
  }
  // Punctuation asks for these by their old names: "…" is sad, "!" is angry.
  if (brows.worried) brows.sad = brows.worried;
  if (brows.firm) brows.angry = brows.firm;

  const lids = { open: nothing };
  for (const k of LIDS) {
    const l = layer(`lid_${k}`);
    if (l) { lids[k] = l; used.add(`lid_${k}`); }
  }

  for (const name of Object.keys(place.layers)) {
    if (!used.has(name)) { console.log(`${char}: ${name} is in placement.json and unused`); continue; }
    // Layer files are NOT cropped: they are small already and sit at their own
    // coordinates. Only the base is cut, and the offsets above account for it.
    await keyed(path.join(SRC, 'layers', char, `${name}.png`), path.join(artDir, `${name}.png`));
  }

  const puppet = {
    name: char,
    base: 'base.png',
    dir: `${ART}/${char}`,
    // The whole image is the "head box", which is what makes the conversion
    // above a subtraction instead of a fit.
    head: { cx: 0.5, cy: 0.5, w: 1 },
    sourceHeadWidth: frame,
    // FILL THE DISC. The app draws a puppet at 90% of its circle, leaving a
    // margin a full-figure sprite needed. This art is a cropped square whose
    // bottom edge is the shoulders, and at 90% that edge sat INSIDE the circle
    // as a straight line. At exactly the circle's size the square's edges all
    // fall outside the round clip, and the line is gone.
    zoom: 1 / 0.9,
    base_layers: [],
    eyes: { whites: nothing, lids },
    brows,
    mouths,
  };
  const outFile = path.join(OUT_ROOT, `${char}.${WIDE ? 'rig-wide' : 'rig'}.json`);
  await writeFile(outFile, JSON.stringify(puppet, null, 1));
  console.log(`${outFile}  ${Object.keys(place.layers).length} layers, `
    + (box ? `cropped to ${box.s}x${box.s} at (${box.x},${box.y})` : `base ${baseW}x${baseH}`));
}
