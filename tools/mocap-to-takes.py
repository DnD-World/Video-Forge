"""Real 3D motion capture -> takes the drawn characters can play (3 Nov 2026).

Ak rejected moves tracked from stock video ("bad, even the ones I kept") and
asked for a ready-made library, CC0 preferred. Two sources:
  CMU Graphics Lab mocap (ASF/AMC): "free for all uses", never resell the data
  Quaternius Universal Animation Library (GLB): CC0

Both are 3D. This script runs the skeleton (forward kinematics), looks at it
from the front (the way the person faces at the start of the clip), and
writes the same 33-point take format the body tracker made
(characters/core/acted.mjs), so takeToMove and the shelf build work unchanged.
The face points (eyes, ears, nose) come from the head bone's own turn.

  python tools/mocap-to-takes.py cmu <dir with .asf/.amc> <ids…>
  python tools/mocap-to-takes.py glb <file.glb> <animation names…>
Writes characters/moves/acted/takes/<id>.json.
"""
import json, math, os, re, struct, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "characters", "moves", "acted", "takes")
FPS = 30

# MediaPipe Pose indices the take format uses
IDX = {"nose": 0, "eyeL": 2, "eyeR": 5, "earL": 7, "earR": 8, "shL": 11, "shR": 12, "elL": 13, "elR": 14,
       "wrL": 15, "wrR": 16, "hipL": 23, "hipR": 24, "knL": 25, "knR": 26, "anL": 27, "anR": 28}


def rot(axis, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    if axis == "x": return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == "y": return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def euler(x, y, z):  # ASF/AMC "XYZ": rotate about x, then y, then z
    return rot("z", z) @ rot("y", y) @ rot("x", x)


# ---- CMU ASF/AMC -----------------------------------------------------------------------

def read_asf(path):
    txt = open(path, encoding="latin-1").read()
    bones = {"root": {"name": "root", "dir": np.zeros(3), "len": 0, "axis": np.zeros(3), "dof": ["tx", "ty", "tz", "rx", "ry", "rz"], "kids": []}}
    for blk in re.findall(r"begin(.*?)end", txt.split(":bonedata")[1].split(":hierarchy")[0], re.S):
        name = re.search(r"name\s+(\S+)", blk).group(1)
        d = np.array([float(v) for v in re.search(r"direction\s+(\S+)\s+(\S+)\s+(\S+)", blk).groups()])
        ln = float(re.search(r"length\s+(\S+)", blk).group(1))
        ax = np.array([float(v) for v in re.search(r"axis\s+(\S+)\s+(\S+)\s+(\S+)", blk).groups()])
        dof = re.search(r"dof\s+([^\n]+)", blk)
        bones[name] = {"name": name, "dir": d, "len": ln, "axis": ax, "dof": dof.group(1).split() if dof else [], "kids": []}
    for line in txt.split(":hierarchy")[1].split("end")[0].strip().splitlines()[1:]:
        p = line.split()
        if len(p) > 1:
            for k in p[1:]: bones[p[0]]["kids"].append(k)
    for b in bones.values():
        b["C"] = euler(*b["axis"]); b["Ci"] = np.linalg.inv(b["C"])
    return bones


def read_amc(path):
    frames, cur = [], None
    for line in open(path, encoding="latin-1"):
        line = line.strip()
        if not line or line[0] in "#:": continue
        if re.fullmatch(r"\d+", line):
            cur = {}; frames.append(cur); continue
        p = line.split(); cur[p[0]] = [float(v) for v in p[1:]]
    return frames


def fk_cmu(bones, frame):
    pos, mat = {}, {}
    def go(name, parent_m, parent_p):
        b = bones[name]; vals = frame.get(name, [])
        if name == "root":
            t = np.array(vals[:3]); r = vals[3:6]
            m = b["C"] @ euler(*r) @ b["Ci"]
            pos[name], mat[name] = t, m
        else:
            ang = {"rx": 0.0, "ry": 0.0, "rz": 0.0}
            for k, v in zip(b["dof"], vals): ang[k] = v
            m = parent_m @ b["C"] @ euler(ang["rx"], ang["ry"], ang["rz"]) @ b["Ci"]
            pos[name] = parent_p + b["len"] * (m @ b["dir"]); mat[name] = m
        for k in b["kids"]: go(k, mat[name], pos[name])
    go("root", np.eye(3), np.zeros(3))
    return pos, mat


def cmu_points(bones, frame):
    P, M = fk_cmu(bones, frame)
    pts = {"shL": P["lclavicle"], "shR": P["rclavicle"], "elL": P["lhumerus"], "elR": P["rhumerus"],
           "wrL": P["lradius"], "wrR": P["rradius"], "hipL": P["lhipjoint"], "hipR": P["rhipjoint"],
           "knL": P["lfemur"], "knR": P["rfemur"], "anL": P["ltibia"], "anR": P["rtibia"]}
    return pts, P["upperneck"], P["head"], M["head"]


def cmu_rest(bones):
    """Which way is the person's left, and front, with no rotation (for the face points)."""
    zero = {b: [0.0] * len(bones[b]["dof"]) for b in bones}
    P, _ = fk_cmu(bones, zero)
    left = P["lhipjoint"] - P["rhipjoint"]; left[1] = 0; left /= np.linalg.norm(left)
    fwd = np.cross(left, np.array([0, 1.0, 0]))  # y up: left × up points to the front
    toe = P["ltoes"] - P["ltibia"]
    if np.dot(fwd, toe) < 0: fwd = -fwd
    return left, fwd


# ---- Quaternius GLB ----------------------------------------------------------------------

def read_glb(path):
    b = open(path, "rb").read()
    jl = struct.unpack_from("<I", b, 12)[0]
    gltf = json.loads(b[20:20 + jl])
    bl = struct.unpack_from("<I", b, 20 + jl)[0]
    binc = b[28 + jl:28 + jl + bl]
    def acc(i):
        a = gltf["accessors"][i]; v = gltf["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
        off = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        arr = np.frombuffer(binc, dtype=np.float32, count=a["count"] * n, offset=off)
        return arr.reshape(a["count"], n) if n > 1 else arr
    return gltf, acc


def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def sample(times, vals, t, quat):
    if t <= times[0]: return vals[0]
    if t >= times[-1]: return vals[-1]
    i = int(np.searchsorted(times, t)) - 1
    k = (t - times[i]) / (times[i + 1] - times[i])
    a, b = vals[i], vals[i + 1]
    if quat:
        if np.dot(a, b) < 0: b = -b
        q = a * (1 - k) + b * k; return q / np.linalg.norm(q)
    return a * (1 - k) + b * k


def glb_takes(path, names):
    gltf, acc = read_glb(path)
    nodes = gltf["nodes"]; parent = {}
    for i, n in enumerate(nodes):
        for c in n.get("children", []): parent[c] = i
    byname = {n.get("name"): i for i, n in enumerate(nodes)}
    J = {"shL": "DEF-upper_arm.L", "shR": "DEF-upper_arm.R", "elL": "DEF-forearm.L", "elR": "DEF-forearm.R",
         "wrL": "DEF-hand.L", "wrR": "DEF-hand.R", "hipL": "DEF-thigh.L", "hipR": "DEF-thigh.R",
         "knL": "DEF-shin.L", "knR": "DEF-shin.R", "anL": "DEF-foot.L", "anR": "DEF-foot.R"}
    out = {}
    for anim in gltf["animations"]:
        if anim["name"] not in names: continue
        ch = {}
        for c in anim["channels"]:
            s = anim["samplers"][c["sampler"]]
            ch[(c["target"]["node"], c["target"]["path"])] = (acc(s["input"]), acc(s["output"]))
        dur = max(v[0][-1] for v in ch.values())
        frames = []
        for f in range(int(dur * FPS) + 1):
            t = f / FPS; world = {}
            def wm(i):
                if i in world: return world[i]
                n = nodes[i]
                T = np.array(n.get("translation", [0, 0, 0]), float); R = np.array(n.get("rotation", [0, 0, 0, 1]), float); S = np.array(n.get("scale", [1, 1, 1]), float)
                if (i, "translation") in ch: T = sample(*ch[(i, "translation")], t, False)
                if (i, "rotation") in ch: R = sample(*ch[(i, "rotation")], t, True)
                if (i, "scale") in ch: S = sample(*ch[(i, "scale")], t, False)
                m = np.eye(4); m[:3, :3] = qmat(R) * S; m[:3, 3] = T
                world[i] = (wm(parent[i]) @ m) if i in parent else m
                return world[i]
            pts = {k: wm(byname[v])[:3, 3] for k, v in J.items()}
            hm = wm(byname["DEF-head"]); neck = wm(byname["DEF-neck"])[:3, 3]
            # the head bone runs up the head: its top is one bone length up the bone's own y
            top = hm[:3, 3] + hm[:3, 1] * 0.22 * np.linalg.norm(pts["shL"] - pts["shR"]) / 0.35
            frames.append((pts, hm[:3, 3], top, hm[:3, :3] / np.linalg.norm(hm[:3, 0])))
        out[anim["name"]] = frames
    return out


# ---- to a take ---------------------------------------------------------------------------

def take_from(frames, left0, fwd0, head_rest=None, src=None):
    """frames: [(points, neck, headTop, headRot)] in 3D, y up. Seen from the front at the start."""
    p0 = frames[0][0]
    left = p0["hipL"] - p0["hipR"]; left[1] = 0; left /= np.linalg.norm(left)
    up = np.array([0, 1.0, 0])
    # the zero is where the hips are when STANDING (floor + leg length), not where
    # they are in the first frame: a clip that starts seated must read as seated
    leg = (np.linalg.norm(p0["hipL"] - p0["knL"]) + np.linalg.norm(p0["knL"] - p0["anL"]))
    floor = min(f[0]["anL"][1] for f in frames[:5]) if frames else 0
    floor = min(floor, min(f[0]["anR"][1] for f in frames[:5]))
    mid = (p0["hipL"] + p0["hipR"]) / 2
    c0 = np.array([mid[0], floor + leg, mid[2]])
    torso = np.linalg.norm(((p0["shL"] + p0["shR"]) / 2) - mid)
    tall = max(torso * 3.2, 1e-6)  # about the body's height
    def scr(p):  # 0–1 image coords, y down; the person's left is on screen right (a front view)
        d = p - c0
        return [round(0.5 + float(np.dot(d, left)) / tall, 4), round(0.62 - float(np.dot(d, up)) / tall, 4), 1.0]
    out = []
    for k, (pts, neck, top, hr) in enumerate(frames):
        lm = [[0.5, 0.5, 0.0] for _ in range(33)]
        for n, p in pts.items(): lm[IDX[n]] = scr(p)
        # the face, from the head's own turn and tilt
        hc = neck + (top - neck) * 0.55; hs = np.linalg.norm(top - neck)
        L = hr @ left0; F = hr @ fwd0
        for n, off in {"earL": L * 0.42, "earR": -L * 0.42, "eyeL": L * 0.18 + F * 0.4, "eyeR": -L * 0.18 + F * 0.4, "nose": F * 0.55 - (top - neck) * 0.12}.items():
            lm[IDX[n]] = scr(hc + off * hs)
        out.append({"ms": round(k * 1000 / FPS), "lm": lm})
    # the standing stance the moves are measured from (acted.mjs reference())
    neutral = {"hipX": 0.5, "hipY": 0.62, "floor": round(0.62 + leg / tall, 4), "torso": round(torso / tall, 4)}
    return {"v": 1, "fps": FPS, "aspect": 1, "mirrored": False, "neutral": neutral, "source": src or {}, "frames": out}


def main():
    os.makedirs(OUT, exist_ok=True)
    kind, where, *ids = sys.argv[1:]
    if kind == "cmu":
        for tid in ids:
            subj = tid.split("_")[0]
            bones = read_asf(os.path.join(where, subj + ".asf"))
            left0, fwd0 = cmu_rest(bones)
            amc = read_amc(os.path.join(where, tid + ".amc"))[::4]  # 120 → 30 fps
            frames = [cmu_points(bones, f) for f in amc]
            take = take_from(frames, left0, fwd0, src={"site": "cmu", "trial": tid, "page": "https://mocap.cs.cmu.edu/", "licence": "free for all uses; do not resell the data"})
            json.dump(take, open(os.path.join(OUT, f"cmu-{tid.replace('_', '-')}.json"), "w"))
            print(tid, len(take["frames"]), "frames")
    else:
        takes = glb_takes(where, set(ids))
        # Quaternius characters face +z with their left on +x (glTF)
        for name, frames in takes.items():
            take = take_from(frames, np.array([1.0, 0, 0]), np.array([0, 0, 1.0]), src={"site": "quaternius", "anim": name, "page": "https://quaternius.com/packs/universalanimationlibrary.html", "licence": "CC0"})
            slug = "ual-" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            json.dump(take, open(os.path.join(OUT, slug + ".json"), "w"))
            print(name, len(take["frames"]), "frames")


if __name__ == "__main__":
    main()
