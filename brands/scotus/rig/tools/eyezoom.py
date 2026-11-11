"""Eye close-up: original, eye masks (green ball, red lids), closed, half-closed. python tools/eyezoom.py <name>"""
import sys, os, json, cv2, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); n = sys.argv[1]; W = os.path.join(ROOT, "work")
f = json.load(open(os.path.join(ROOT, "faces", f"{n}.json")))
ref = cv2.imread(os.path.join(ROOT, "..", "portraits", f"{n}.png"))
eb = np.load(os.path.join(W, n, "lay", "eyes.npy"), allow_pickle=True).item()
vis = ref.copy()
for s in "LR": vis[eb[s]["eyeball"]] = (0, 255, 0); vis[eb[s]["lid"]] = (0, 0, 255)
bx = [f["eyes"]["L"]["box"], f["eyes"]["R"]["box"]]
x0, x1 = min(b[0] for b in bx) - 15, max(b[2] for b in bx) + 15; y0 = min(b[1] for b in bx) - 20; y1 = y0 + 75
ims = [ref, vis, cv2.imread(os.path.join(W, f"{n}-2.png")), cv2.imread(os.path.join(W, f"{n}-3.png"))]
cv2.imwrite(os.path.join(W, f"{n}_eyes.png"), np.vstack([cv2.resize(i[y0:y1, x0:x1], None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST) for i in ims]))
