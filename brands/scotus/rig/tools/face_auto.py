"""First-guess face file from face points + colours: python tools/face_auto.py <name>

Writes faces/<name>.json (refuses to overwrite one that is marked "checked").
Every number here was calibrated against Sotomayor's hand-measured file:
the margins are fractions of her eye width, mouth width and chin distance,
so they scale with each face.
"""
import json, os, sys
import cv2, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1]
out = os.path.join(ROOT, "faces", f"{name}.json")
if os.path.exists(out) and json.load(open(out)).get("checked"):
    sys.exit(f"{out} is marked checked; edit it by hand")
ref = cv2.imread(os.path.join(ROOT, "..", "portraits", f"{name}.png"))
H, W = ref.shape[:2]
P = np.array(json.load(open(os.path.join(ROOT, "work", "lm", f"{name}.json")))["pts"])
p = lambda i: P[i]
L = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY).astype(float)
rgb = cv2.cvtColor(ref, cv2.COLOR_BGR2RGB).astype(int)
R_, G_, B_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
r1 = lambda v: round(float(v), 1)
ri = lambda v: int(round(float(v)))

# frame: rows/cols that are mostly navy
# frame: the inside edge of the beige border, found from each side along several lines
def edge(lines):
    out = []
    for line in lines:
        dark = np.where(line < 110)[0]
        out.append(dark[0] if len(dark) else 0)
    return int(np.median(out))
mid_r = [L[y] for y in range(H // 4, 3 * H // 4, 25)]; mid_c = [L[:, x] for x in range(W // 4, 3 * W // 4, 25)]
frame = [edge(mid_r), edge(mid_c), W - edge([r[::-1] for r in mid_r]), H - edge([c[::-1] for c in mid_c])]
navy = np.median(rgb[frame[1] + 10:frame[1] + 80, frame[0] + 10:frame[0] + 80].reshape(-1, 3), 0).astype(int).tolist()

# skin colour: cheeks and forehead, sampled in Lab
lab = cv2.cvtColor(cv2.pyrMeanShiftFiltering(ref, 6, 12), cv2.COLOR_BGR2LAB).astype(float)
samp = []
for i in (50, 280, 151, 9, 205, 425):
    x, y = ri(p(i)[0]), ri(p(i)[1]); samp.append(lab[y - 4:y + 5, x - 4:x + 5].reshape(-1, 3))
skin_lab = np.median(np.concatenate(samp), 0)

chin = p(152); nose = p(1); lipbot = p(17)
skinL = float(np.median([L[ri(p(i)[1]) - 3:ri(p(i)[1]) + 4, ri(p(i)[0]) - 3:ri(p(i)[0]) + 4].mean() for i in (50, 280, 151)]))
lid_thr = int(np.clip(skinL * 0.55, 50, 105))  # lid lines: well darker than the skin (only lines touching the eye are used)
eyeW = (np.hypot(*(p(133) - p(33))) + np.hypot(*(p(263) - p(362)))) / 2  # Sotomayor 59
s_e = eyeW / 59.0
mouthW = np.hypot(*(p(291) - p(61)))  # Sotomayor 112
scale = mouthW / 112.0

def iris_refine(c, r, box):
    """Iris centre from the white of the eye: x = middle of the gap in the
    white along the eye's middle rows; y = bottom of the iris minus r."""
    x0, y0, x1, y1 = box
    Ls = cv2.GaussianBlur(L, (0, 0), 0.8)
    row = Ls[ri(c[1]) - 2:ri(c[1]) + 3, x0:x1].mean(0)
    white = np.percentile(Ls[y0:y1, x0:x1], 97)
    dark = row < (white - 0.45 * (white - row.min()))
    i = ri(c[0]) - x0
    if not dark[i]:
        cand = np.where(dark)[0]; i = cand[np.argmin(np.abs(cand - i))]
    a = i
    while a > 0 and dark[a - 1]: a -= 1
    b = i
    while b < len(dark) - 1 and dark[b + 1]: b += 1
    cx = x0 + (a + b) / 2 if (b - a) > r * 1.2 and (b - a) < r * 2.6 else c[0]
    col = Ls[y0:y1, ri(cx) - 1:ri(cx) + 2].mean(1)
    ys = np.arange(y0, y1)
    below = (ys > c[1]) & (col > white - 0.35 * (white - col.min()))
    cy = c[1]
    if below.any():
        yb = ys[np.argmax(below)]
        if abs((yb - r) - c[1]) < 6: cy = yb - r
    return [r1(cx), r1(cy)]

eyes = {}
for s, (outer, inner, top, bot, ic, ring) in {
        "L": (33, 133, 159, 145, 468, (469, 470, 471, 472)),
        "R": (263, 362, 386, 374, 473, (474, 475, 476, 477))}.items():
    xo, xi = p(outer)[0], p(inner)[0]
    lo_x, hi_x = (xo - 0.4 * eyeW, xi + 0.25 * eyeW) if s == "L" else (xi - 0.27 * eyeW, xo + 0.29 * eyeW)
    y0 = min(p(top)[1], p(outer)[1], p(inner)[1]) - 0.25 * eyeW
    y1 = max(p(bot)[1], p(outer)[1], p(inner)[1]) + 0.2 * eyeW
    box = [ri(lo_x), ri(y0), ri(hi_x), ri(y1)]
    r = float(np.mean([np.hypot(*(p(k) - p(ic))) for k in ring]))
    rf = iris_refine(p(ic), r, box)  # averaged with the face point: each alone is off by up to 4px
    eyes[s] = {"box": box, "ic": [r1((rf[0] + p(ic)[0]) / 2), r1((rf[1] + p(ic)[1]) / 2)], "r": r1(r * 0.975), "rc": r1(r * 1.18)}

def brow(idx, side):
    q = P[list(idx)]
    x0, x1 = q[:, 0].min(), q[:, 0].max(); y0, y1 = q[:, 1].min(), q[:, 1].max()
    search = [ri(x0 - 8 * s_e), ri(y0 - 12 * s_e), ri(x1 + 6 * s_e), ri(y1 + 16 * s_e)]
    box = [ri(x0 - 20 * s_e), ri(y0 - 28 * s_e), ri(x1 + 18 * s_e), ri(y1 + 28 * s_e)]
    return {"search": search, "box": box}
brows = {"L": brow((70, 63, 105, 66, 107, 46, 53, 52, 65, 55), "L"), "R": brow((336, 296, 334, 293, 300, 276, 283, 282, 295, 285), "R")}
# the two search boxes must not overlap
mid = (p(133)[0] + p(362)[0]) / 2
brows["L"]["box"][2] = min(brows["L"]["box"][2], ri(mid - 2)); brows["R"]["box"][0] = max(brows["R"]["box"][0], ri(mid + 2))

# lips: outer contour, corners pushed out (the drawn lip runs past the face-point corners)
OUT = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
ext = 0.07 * mouthW
lp = [list(p(i)) for i in OUT]
lp[0][0] -= ext; lp[10][0] += ext
lip_poly = [[r1(x), r1(y)] for x, y in lp]
# seam: darkest line between the lips, per column
x0s, x1s = ri(p(61)[0] - ext), ri(p(291)[0] + ext)
yl, yr = p(61)[1], p(291)[1]; ym = (p(13)[1] + p(14)[1]) / 2
kx, ky = [], []
for x in np.linspace(x0s + 1, x1s, 8):
    t = (x - x0s) / max(1, x1s - x0s)
    guess = (1 - t) * yl + t * yr if abs(t - .5) > .3 else ym
    ys = np.arange(ri(guess - 6 * scale), ri(guess + 7 * scale))
    col = cv2.GaussianBlur(L, (0, 0), 1)[ys, ri(x)]
    band = ys[col <= col.min() + 10]
    kx.append(ri(x)); ky.append(r1(band.mean()))
seam = {"x0": x0s, "x1": x1s, "kx": kx, "ky": ky}
seam_c = (x0s + x1s) / 2

chin_box = [ri(p(61)[0] + 8 * scale), ri(lipbot[1] - 10 * scale), ri(p(291)[0] - 5 * scale), ri(lipbot[1] + 13 * scale)]
jaw = {"x0": ri(p(61)[0] - 1), "x1": ri(p(291)[0] + 5), "y1": ri(lipbot[1] + 0.68 * (chin[1] - lipbot[1]))}
pivot = [ri(chin[0]), ri(chin[1] + 0.75 * (chin[1] - nose[1]))]

# layers: hair everything above the chin outside the face, ears from the face edge points
fx0, fy0, fx1, fy1 = frame
hair_cut = ri(chin[1] - 0.31 * (chin[1] - nose[1]))
hair_poly = [[fx0 + 120, fy0 + 30], [fx1 - 90, fy0 + 30], [fx1 - 90, ri(chin[1] - 28)], [ri(chin[0] + 115 * s_e), ri(chin[1] - 28)],
             [ri(chin[0] + 20 * s_e), ri(chin[1] + 30)], [ri(chin[0] - 60 * s_e), ri(chin[1])], [fx0 + 120, ri(chin[1])]]
def ear(i):
    x, y = p(i)
    w = 13 * s_e
    return [[ri(x - w), ri(y + 45 * s_e)], [ri(x + w), ri(y + 45 * s_e)], [ri(x + w), ri(y + 105 * s_e)], [ri(x - w), ri(y + 105 * s_e)]]
collar_poly = [[ri(chin[0] - 150 * s_e), ri(chin[1] + 40)], [ri(chin[0] + 150 * s_e), ri(chin[1] + 40)],
               [ri(chin[0] + 150 * s_e), ri(chin[1] + 260)], [ri(chin[0] - 150 * s_e), ri(chin[1] + 260)]]

face = {
    "_comment": "First guess by tools/face_auto.py from face points. Check with tools/check_page.py, then set checked: true.",
    "name": name.capitalize(), "checked": False, "raster": True, "fills": "local",
    "frame": frame, "navy": navy,
    "skin": {"mode": "lab", "lab": [r1(v) for v in skin_lab], "tol_ab": 14, "tol_dark": 60, "tol_light": 45, "split_y": ri(chin[1] + 200)},
    "collar_poly": collar_poly, "collar_luma": 150,
    "ears": [],  # earrings: add boxes by hand where a justice wears them
    "hair_poly": hair_poly, "hair_cut_y": hair_cut, "robe_head_y": hair_cut + 4,
    "eyes": eyes, "eye_rule": "auto", "eye_thr": {"liner": 40, "sclera": 140, "sclera_rb": 46, "iris_max": 175, "lid": lid_thr},
    "brow_rule": "auto", "brow_dark": 28, "brows": brows,
    "lip_poly": lip_poly, "chin_box": chin_box, "chin_luma": ri(min(172, skinL * 0.86)), "seam_luma": ri(min(125, skinL * 0.62)), "seam": seam, "jaw": jaw,
    "mouth": {"cx": r1(seam_c), "hw": r1((x1s - x0s) / 2)}, "pivot": pivot, "scale": round(float(scale), 3),
}
json.dump(face, open(out, "w"), indent=1)
print("wrote", out, "eyeW", r1(eyeW), "mouthW", r1(mouthW))
