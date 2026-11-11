import cv2,numpy as np,vtracer,os,json
S=4
K={'eyeballL':2,'eyeballR':2,'irisL':4,'irisR':4,'lidL':2,'lidR':2,'browL':3,'browR':3,'mouthU':6,'mouthL':6,'seam':3,'chinS':3}
meta={}
for n,k in K.items():
    im=cv2.imread(f'L_{n}.png',cv2.IMREAD_UNCHANGED); a=im[...,3]
    ys,xs=np.where(a>0); x0,x1,y0,y1=xs.min()-3,xs.max()+4,ys.min()-3,ys.max()+4
    c=im[y0:y1,x0:x1].copy(); m=(c[...,3]>0)
    er=2 if n.startswith('eyeball') else 1
    core=cv2.erode(m.astype(np.uint8),np.ones((3,3),np.uint8),iterations=er)>0
    if n.startswith('eyeball'): m=cv2.dilate(m.astype(np.uint8),np.ones((3,3),np.uint8),iterations=2)>0
    bgr=c[...,:3].copy()
    if core.sum()>30: bgr=cv2.inpaint(bgr,(~core).astype(np.uint8)*255,3,cv2.INPAINT_TELEA)
    big=cv2.resize(bgr,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    big=cv2.GaussianBlur(big,(0,0),S*0.35)
    mf=cv2.GaussianBlur(cv2.resize(m.astype(np.float32),None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC),(0,0),S*0.6)
    ma=mf>0.5
    coremask=ma
    if n in ('mouthU','mouthL','seam','chinS'):
        coremask=cv2.erode(ma.astype(np.uint8),np.ones((3,3),np.uint8),iterations=2*S//2)>0
        if coremask.sum()<50: coremask=ma
    px=big[coremask].astype(np.float32)
    crit=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,30,0.5)
    _,lab,cen=cv2.kmeans(px,k,None,crit,4,cv2.KMEANS_PP_CENTERS)
    allpx=big[ma].astype(np.float32)
    dd=((allpx[:,None,:]-cen[None,:,:])**2).sum(-1); lab=dd.argmin(1)
    L=np.zeros(big.shape[:2],np.uint8); L[ma]=lab.ravel()
    # smooth label regions: per-label blurred votes
    votes=np.stack([cv2.GaussianBlur((L==i).astype(np.float32)*ma,(0,0),S*0.9) for i in range(k)],-1)
    L2=votes.argmax(-1).astype(np.uint8)
    q=cen.astype(np.uint8)[L2]
    cv2.imwrite(f'hi_{n}.png',np.dstack([q,(ma*255).astype(np.uint8)]))
    vtracer.convert_image_to_svg_py(f'hi_{n}.png',f'sv/H_{n}.svg',colormode='color',hierarchical='stacked',mode='spline',filter_speckle=12,color_precision=8,layer_difference=2,corner_threshold=80,length_threshold=10,splice_threshold=55,path_precision=2)
    meta[n]=(int(x0),int(y0)); print(n,os.path.getsize(f'sv/H_{n}.svg'))
json.dump(meta,open('hi_meta.json','w'))
