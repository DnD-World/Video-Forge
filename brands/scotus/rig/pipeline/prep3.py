import cv2, numpy as np
from scipy import ndimage as ndi
ref=cv2.imread('../ref.png'); sm=cv2.imread('../tr/smooth.png')
H,W=ref.shape[:2]
rgb=cv2.cvtColor(sm,cv2.COLOR_BGR2RGB).astype(int)
rr=cv2.cvtColor(ref,cv2.COLOR_BGR2RGB).astype(int)
def lum(a): return 0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
L=lum(rr)  # use raw (not smoothed) for fine eye detail
R,G,B=rr[...,0],rr[...,1],rr[...,2]
yy,xx=np.mgrid[0:H,0:W]
def box(x0,y0,x1,y1):
    m=np.zeros((H,W),bool); m[y0:y1,x0:x1]=True; return m
E={}
for side,bb,ic,irad in (('L',(318,388,416,434),(367,411.5),13.2),('R',(456,392,552,434),(503,411),13.0)):
    b=box(*bb)
    dist=np.hypot(xx-ic[0],yy-ic[1])
    liner=(L<32)&b&(dist>8.5)
    sclera=(L>196)&((R-B)<46)&b
    iris=(L<100)&b&(L>=32)
    pupil=(L<32)&b&(dist<=8.5)
    hl=(L>235)&b&(dist<13)
    eyeball=(sclera|iris|pupil|hl)
    eyeball=ndi.binary_closing(eyeball,iterations=1)
    lab,n=ndi.label(eyeball)
    k=lab[int(ic[1]),int(ic[0])]
    eyeball=(lab==k)
    eyeball=ndi.binary_fill_holes(eyeball)
    # lid art: dark things in bbox not part of eyeball
    low=(L<172)&b&~eyeball&ndi.binary_dilation(eyeball,iterations=7)&(yy>ic[1]+3)
    lid=((L<78)&b&~eyeball)|low
    lid=ndi.binary_dilation(lid,iterations=1)&b&~eyeball
    E[side]=dict(eyeball=eyeball,lid=lid,iris=(iris|pupil|hl)&eyeball)
    print(side,eyeball.sum(),lid.sum())
np.save('eyes.npy',E,allow_pickle=True)
vis=ref.copy()
for s in 'LR':
    vis[E[s]['eyeball']]=(vis[E[s]['eyeball']]*0.4+np.array([0,255,0])*0.6).astype(np.uint8)
    vis[E[s]['lid']]=(vis[E[s]['lid']]*0.4+np.array([0,0,255])*0.6).astype(np.uint8)
v=cv2.resize(vis[380:440,310:560],None,fx=4,fy=4,interpolation=cv2.INTER_NEAREST); cv2.imwrite('dbg_eyes.png',v)
