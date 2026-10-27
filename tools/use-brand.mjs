/**
 * Switch a brand pack on or off for this computer.
 *
 *   npm run brand                  says which is on, and lists the packs
 *   npm run brand -- skilitsa      switches Skilitsa on
 *   npm run brand -- off           back to neutral — no characters, no sample
 *
 * Writes or removes `brand.local.json` beside package.json. That file is
 * git-ignored: it is this computer's choice, not the project's. Restart the
 * app afterwards; it reads the choice once, at start.
 */
import { activeBrandId, listBrands, loadBrand, setActiveBrand } from "./lib/brand.mjs";

const arg = process.argv[2];

try {
  if (!arg) {
    const on = activeBrandId();
    console.log(on ? `Brand pack on: ${loadBrand(on).name} (${on})` : "No brand pack on — the app is neutral.");
    const all = listBrands();
    console.log(all.length ? `Packs here: ${all.join(", ")}` : "No packs in brands/.");
  } else if (arg === "off" || arg === "none") {
    setActiveBrand(null);
    console.log("Brand pack off. Restart the app.");
  } else {
    setActiveBrand(arg);
    console.log(`Brand pack on: ${loadBrand(arg).name}. Restart the app.`);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
