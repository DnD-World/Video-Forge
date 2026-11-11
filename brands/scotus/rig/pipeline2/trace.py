import vtracer, re, glob, os, cv2, numpy as np
os.makedirs('sv',exist_ok=True)
cfg={'bg':dict(filter_speckle=6,color_precision=5,layer_difference=24,corner_threshold=60,length_threshold=6,splice_threshold=45,path_precision=2),
'fine':dict(filter_speckle=0,color_precision=7,layer_difference=8,corner_threshold=60,length_threshold=3,splice_threshold=45,path_precision=2),
'mid':dict(filter_speckle=2,color_precision=6,layer_difference=12,corner_threshold=60,length_threshold=4,splice_threshold=45,path_precision=2)}
pick={'L_head':'skip','L_bg':'bg','L_robe':'mid','L_hair':'mid','L_collar':'fine','L_head':'mid'}
for f in sorted(glob.glob('L_*.png')):
    if f in ('L_head.png','L_head_s.png'): continue
    n=f[:-4]; c=cfg[pick.get(n,'fine')]
    vtracer.convert_image_to_svg_py(f,f'sv/{n}.svg',colormode='color',hierarchical='stacked',mode='spline',**c)
    print(n,os.path.getsize(f'sv/{n}.svg'))
