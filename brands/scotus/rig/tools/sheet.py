"""Check sheet for one rig: layer map, original vs rest, and three poses.
python tools/sheet.py <name>   (after tools/shot.mjs made work/<name>-0..3.png)"""
import sys, cv2, numpy as np, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
n = sys.argv[1]; W = os.path.join(ROOT, "work")
ref = cv2.imread(os.path.join(ROOT, "..", "portraits", f"{n}.png"))
shots = [cv2.imread(os.path.join(W, f"{n}-{i}.png")) for i in range(4)]
print(n, "rest diff", round(float(np.abs(shots[0].astype(int) - ref).mean()), 2))
d = cv2.imread(os.path.join(W, n, "lay", "dbg2.png"))
ov = cv2.resize(cv2.addWeighted(ref, 0.55, d, 0.45, 0), (300, 400))
x0, y0 = int(os.environ.get("CX", 250)), int(os.environ.get("CY", 300))
crop = lambda im: im[y0:y0 + 400, x0:x0 + 400]
lab = lambda im, t: cv2.putText(im.copy(), t, (8, 24), cv2.FONT_HERSHEY_SIMPLEX, .7, (255, 255, 255), 2)
top = np.hstack([lab(ov, "layers"), lab(crop(ref), "original"), lab(crop(shots[0]), "rig rest"), np.zeros((400, 100, 3), np.uint8)])
bot = np.hstack([lab(crop(shots[1]), "AA"), lab(crop(shots[2]), "OO + blink"), lab(crop(shots[3]), "EE + half blink")])
cv2.imwrite(os.path.join(W, f"{n}_sheet.jpg"), np.vstack([top, bot]), [cv2.IMWRITE_JPEG_QUALITY, 90])
