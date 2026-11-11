#!/bin/bash
# Rebuilds the Sotomayor rig from source. Scripts expect ../ref.png and ../tr/smooth.png relative to the work dir.
set -e
ROOT=$(cd "$(dirname "$0")" && pwd)
W=$ROOT/work; mkdir -p $W/tr $W/lay/sv
cp $ROOT/source/sotomayor_ref.png $W/ref.png
cp $ROOT/source/smooth.png $W/tr/smooth.png
cp $ROOT/pipeline/* $W/lay/
cp $ROOT/pipeline/shotsvg.sh $W/shotsvg.sh
cd $W/lay
python3 prep2.py        # masks: bg/fig/collar/head/hair/robe
python3 prep3.py        # eye masks
python3 prep4.py        # layer PNGs + skin fill under holes
python3 prep_eyes2.py   # eye raster parts (sclera/iris/upper lid/lower lid)
python3 prep_mouth2.py  # mouth raster parts (lips matte, chin shadow, jaw, skin)
python3 trace.py        # vtracer: bg/hair/robe/collar
python3 trace_hi.py     # vtracer: brows
python3 - <<'P'
import cv2,numpy as np,vtracer
im=cv2.imread('L_head.png',cv2.IMREAD_UNCHANGED); s=cv2.bilateralFilter(im[...,:3],7,12,5); cv2.imwrite('L_head_s.png',np.dstack([s,im[...,3]]))
vtracer.convert_image_to_svg_py('L_head_s.png','sv/L_head.svg',colormode='color',hierarchical='stacked',mode='spline',filter_speckle=4,color_precision=8,layer_difference=3,corner_threshold=60,length_threshold=4,splice_threshold=45,path_precision=2)
P
python3 build_rig.py    # -> rig.html
cp rig.html $ROOT/build/sotomayor_rig.html
echo "built: $ROOT/build/sotomayor_rig.html"
