import cv2,numpy as np,json
from scipy import ndimage as ndi
ref=cv2.imread('../ref.png'); H,W=ref.shape[:2]
E=np.load('eyes.npy',allow_pickle=True).item()
head=np.load('m_head.npy')
import json as _j; F=_j.load(open('../face.json'))
out={}
def rgba(img,mask,feather=0):
    a=mask.astype(np.float32)
    if feather: a=np.maximum(a,cv2.GaussianBlur(a,(0,0),feather)*1.0); a=np.clip(a,0,1)
    return np.dstack([img,(a*255).astype(np.uint8)])
for s in 'LR':
    eb=E[s]['eyeball']; lid=E[s]['lid']; ir=E[s]['iris']
    e_=F['eyes'][s]; IC=(e_['ic'][0],e_['ic'][1],e_['rc'])
    yy_,xx_=np.mgrid[0:H,0:W]
    ir=ndi.binary_fill_holes(ndi.binary_closing(ir,iterations=2))&eb&(np.hypot(xx_-IC[0],yy_-IC[1])<=IC[2])
    Lg=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY)
    ir|=eb&(np.hypot(xx_-IC[0],yy_-IC[1])<=IC[2]-1.5)&(Lg<150)
    ys,xs=np.where(eb); cy=ys.mean()
    # per-column top/bottom of eyeball
    top=np.full(W,np.nan); bot=np.full(W,np.nan)
    for x in range(xs.min(),xs.max()+1):
        c=np.where(eb[:,x])[0]
        if len(c): top[x]=c.min(); bot[x]=c.max()
    # split lid into upper/lower
    yy,xx=np.mgrid[0:H,0:W]
    mid=np.where(np.isnan(top),cy,(top+bot)/2)[None,:].repeat(H,0)
    lidd=ndi.binary_dilation(lid,iterations=1)&~eb
    up=lidd&(yy<mid); lo=lidd&(yy>=mid)
    # keep wing (outer liner) connected to upper
    lab,n=ndi.label(lidd); 
    # images: original pixels; upper lid gets 2px original-skin margin feathered
    upm=ndi.binary_dilation(up,iterations=2)&~eb
    lom=ndi.binary_dilation(lo,iterations=2)&~eb&~up
    ebm=ndi.binary_dilation(eb,iterations=1)
    scl=ref.copy()
    irr=ndi.binary_dilation(ir,iterations=3)&eb
    # sclera fill under iris: row-wise interpolate from sclera colour
    sc_px=ref[eb&~irr]; med=np.median(sc_px,axis=0)
    from fill import pushpull
    scl=pushpull(ref,eb&~irr&(cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY)>150))
    scl2=ref.copy(); scl2[irr]=scl[irr]; scl=scl2
    Lg2=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY).astype(int); bgr=ref.astype(int)
    pale=(Lg2>195)&(np.abs(bgr[...,2]-bgr[...,0])<45)
    upm=(ndi.binary_dilation(up,iterations=1)|(upm&(Lg2<165)))&~eb&~(pale&~up)
    palenear=pale&ndi.binary_dilation(eb,iterations=3)&~eb
    lom&=~palenear; upm&=~palenear
    ebm=ebm|ndi.binary_dilation(palenear,iterations=1)&~ndi.binary_dilation(up,iterations=0)&~lo
    cs,_=cv2.findContours(ebm.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    info_clip='M'+'Z M'.join(' L'.join(f'{x},{y}' for x,y in c[:,0,:]) for c in cs)+'Z'
    def crop(img,m,name,feather=0):
        yy0,xx0=np.where(m); x0,x1,y0,y1=xx0.min()-3,xx0.max()+4,yy0.min()-3,yy0.max()+4
        a=rgba(img,m,feather)[y0:y1,x0:x1]; cv2.imwrite(f'E_{name}{s}.png',a); return [int(x0),int(y0),int(x1-x0),int(y1-y0)]
    info={'clip':info_clip}
    info['sclera']=crop(scl,ebm,'sclera')
    info['iris']=crop(ref,ndi.binary_dilation(ir,iterations=1)&eb,'iris')
    info['up']=crop(ref,upm,'up')
    info['lo']=crop(ref,lom,'lo')
    # curves: upper lid bottom edge (= eyeball top), lower edge (= eyeball bottom)
    xr=np.arange(int(xs.min()),int(xs.max())+1)
    info['xr']=[int(xr[0]),int(xr[-1])]
    info['topc']=[float(top[x]) for x in xr]; info['botc']=[float(bot[x]) for x in xr]
    xc=int(round(ir.nonzero()[1].mean())); info['xc']=xc
    info['D']=float(bot[xc]-top[xc]); info['yb']=float(top[xc])
    uy,ux=np.where(up); info['upx']=[int(ux.min()),int(ux.max())]
    out[s]=info; print(s,info['D'],info['yb'],info['upx'])
json.dump(out,open('eyes2.json','w'))
