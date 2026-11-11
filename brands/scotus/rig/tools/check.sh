#!/bin/bash
# auto-measure (unless checked), build, shoot four poses and make the check sheet for each name given
cd "$(dirname "$0")/.."
for n in "$@"; do
  .venv/Scripts/python tools/face_auto.py $n >/dev/null 2>&1
  .venv/Scripts/python tools/build.py $n | grep -v "^built" || exit 1
  (cd ../../.. && node brands/scotus/rig/tools/shot.mjs brands/scotus/rig/build/${n}_rig.html brands/scotus/rig/work/$n.png "v=rest&k=0|v=AA&k=0|v=OO&k=1|v=EE&k=0.5" >/dev/null) || exit 1
  .venv/Scripts/python tools/sheet.py $n
done
