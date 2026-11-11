"""Build one justice's rig: python tools/build.py <name>

Reads portraits/<name>.png (896x1200) and faces/<name>.json, runs the
pipeline2 scripts in work/<name>/lay, and writes build/<name>_rig.html.
Run from brands/scotus/rig with the project venv (.venv).
"""
import json, os, shutil, subprocess, sys
import cv2, numpy as np, vtracer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1]
face = json.load(open(os.path.join(ROOT, "faces", f"{name}.json")))
W = os.path.join(ROOT, "work", name)
lay = os.path.join(W, "lay")
shutil.rmtree(W, ignore_errors=True)
os.makedirs(os.path.join(lay, "sv"))
os.makedirs(os.path.join(W, "tr"))

src = os.path.join(ROOT, "..", "portraits", f"{name}.png")
ref = cv2.imread(src)
assert ref.shape[:2] == (1200, 896), ref.shape
cv2.imwrite(os.path.join(W, "ref.png"), ref)
# the smoothed copy used only to sort pixels into layers; Sotomayor keeps her original one
own = os.path.join(ROOT, "source", "smooth.png")
smooth = cv2.imread(own) if name == "sotomayor" else cv2.pyrMeanShiftFiltering(ref, 6, 12)
cv2.imwrite(os.path.join(W, "tr", "smooth.png"), smooth)
json.dump(face, open(os.path.join(W, "face.json"), "w"))
if face.get("lip_mask"):
    shutil.copy(os.path.join(ROOT, "faces", face["lip_mask"]), lay)
for f in os.listdir(os.path.join(ROOT, "pipeline2")):
    shutil.copy(os.path.join(ROOT, "pipeline2", f), lay)

def run(script):
    r = subprocess.run([sys.executable, script], cwd=lay, capture_output=True, text=True)
    open(os.path.join(lay, f"log_{script[:-3]}.txt"), "w").write(r.stdout + r.stderr)
    if r.returncode:
        print(r.stdout[-800:], r.stderr[-1500:]); sys.exit(f"FAILED {script}")
    return r.stdout

for s in ("prep2.py", "prep3.py", "prep4.py", "prep_eyes2.py", "prep_mouth2.py", "trace.py", "trace_hi.py"):
    out = run(s)
    if s == "prep4.py": print(name, out.strip().splitlines()[-1])
im = cv2.imread(os.path.join(lay, "L_head.png"), cv2.IMREAD_UNCHANGED)
sm = cv2.bilateralFilter(im[..., :3], 7, 12, 5)
cv2.imwrite(os.path.join(lay, "L_head_s.png"), np.dstack([sm, im[..., 3]]))
vtracer.convert_image_to_svg_py(os.path.join(lay, "L_head_s.png"), os.path.join(lay, "sv", "L_head.svg"), colormode="color",
    hierarchical="stacked", mode="spline", filter_speckle=4, color_precision=8, layer_difference=3, corner_threshold=60,
    length_threshold=4, splice_threshold=45, path_precision=2)
run("build_rig.py")
os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
dst = os.path.join(ROOT, "build", f"{name}_rig.html")
shutil.copy(os.path.join(lay, "rig.html"), dst)
shutil.copy(os.path.join(lay, "portrait.json"), os.path.join(ROOT, "build", f"{name}.portrait.json"))
print("built", dst)
