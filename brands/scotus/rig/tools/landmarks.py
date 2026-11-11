"""Face landmarks for one portrait -> JSON (478 MediaPipe points, pixels)."""
import sys, json, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
src, out = sys.argv[1], sys.argv[2]
opt = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=sys.argv[3] if len(sys.argv) > 3 else "models/face_landmarker.task"), num_faces=1)
with vision.FaceLandmarker.create_from_options(opt) as lm:
    img = mp.Image.create_from_file(src)
    r = lm.detect(img)
if not r.face_landmarks: print("NO FACE", src); sys.exit(1)
W, H = img.width, img.height
pts = [[round(p.x * W, 2), round(p.y * H, 2)] for p in r.face_landmarks[0]]
json.dump(dict(w=W, h=H, pts=pts), open(out, "w"))
print(src, len(pts))
