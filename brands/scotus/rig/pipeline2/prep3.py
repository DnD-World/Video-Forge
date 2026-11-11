import cv2, numpy as np
from scipy import ndimage as ndi
ref=cv2.imread('../ref.png'); sm=cv2.imread('../tr/smooth.png')
H,W=ref.shape[:2]
import json as _j; F=_j.load(open('../face.json'))
rgb=cv2.cvtColor(sm,cv2.COLOR_BGR2RGB).astype(int)
rr=cv2.cvtColor(ref,cv2.COLOR_BGR2RGB).astype(int)
def lum(a): return 0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
L=lum(rr)  # use raw (not smoothed) for fine eye detail
R,G,B=rr[...,0],rr[...,1],rr[...,2]
yy,xx=np.mgrid[0:H,0:W]
def box(x0,y0,x1,y1):
    m=np.zeros((H,W),bool); m[y0:y1,x0:x1]=True; return m
E={}
T=F.get('eye_thr',{})
for side in 'LR':
    bb=F['eyes'][side]['box']; ic=F['eyes'][side]['ic']; irad=F['eyes'][side]['r']
    b=box(*bb)
    dist=np.hypot(xx-ic[0],yy-ic[1])
    pr=irad*0.645
    liner=(L<T.get('liner',32))&b&(dist>pr)
    sclera=(L>T.get('sclera',196))&((R-B)<T.get('sclera_rb',46))&b
    if F.get('eye_rule')=='legacy':
        iris=(L<100)&b&(L>=32)
        pupil=(L<T.get('liner',32))&b&(dist<=pr)
        hl=(L>235)&b&(dist<irad)
        eyeball=(sclera|iris|pupil|hl)
        eyeball=ndi.binary_closing(eyeball,iterations=1)
        lab,n=ndi.label(eyeball)
        k=lab[int(ic[1]),int(ic[0])]
        eyeball=(lab==k)
        eyeball=ndi.binary_fill_holes(eyeball)
        # lid art: dark things in bbox not part of eyeball
        low=(L<172)&b&~eyeball&ndi.binary_dilation(eyeball,iterations=7)&(yy>ic[1]+3)
        lid=((L<T.get('lid',78))&b&~eyeball)|low
        lid=ndi.binary_dilation(lid,iterations=1)&b&~eyeball
    else:
        RB=R-B
        skinish=b&(L>T.get('lid',78)+25)&(dist>irad*1.3)
        sRB=np.median(RB[skinish]); sL=np.median(L[skinish])
        # eye whites: bright and grey, or (on darker or warm faces) clearly brighter and less red than the skin
        sclera=sclera|(b&(L>sL+30)&(RB<sRB*0.8))
        notskin=(RB<0.6*sRB)|(L<sL-45)
        iris=(dist<=irad)&b&~sclera&notskin
        pupil=(L<T.get('liner',32))&b&(dist<=pr)
        hl=(L>215)&b&(dist<irad)&((R-B)<46)
        cand=(sclera|iris|pupil|hl)
        lab,n=ndi.label(ndi.binary_closing(cand,iterations=1))
        k=lab[int(round(ic[1])),int(round(ic[0]))]
        if k==0:
            dd=np.where(lab>0,dist,1e9); k=lab.flat[np.argmin(dd)]
        eyeball=lab==k
        # whites cut off by a lash line still belong to the eye
        for _ in range(2):
            lab2,n2=ndi.label(cand&~eyeball)
            near=np.unique(lab2[ndi.binary_dilation(eyeball,iterations=3)&(lab2>0)])
            for q in near:
                comp=lab2==q
                if comp.sum()>=4 and sclera[comp].mean()>.5: eyeball|=comp
        eyeball=ndi.binary_fill_holes(ndi.binary_closing(eyeball,iterations=1))&b
        # lids: only dark lines that touch the edge of the eye, never creases or wrinkles above
        ys_,xs_=np.where(eyeball); top=np.full(W,np.nan); bot=np.full(W,np.nan)
        for x in range(xs_.min(),xs_.max()+1):
            c=ys_[xs_==x]
            if len(c): top[x]=c.min(); bot[x]=c.max()
        dark=(L<T.get('lid',78))&b&~eyeball
        rimU=ndi.binary_dilation(eyeball,iterations=3)&~eyeball&(yy<ic[1])
        labd,nd=ndi.label(dark)
        keep=np.unique(labd[rimU&(labd>0)])
        up=np.isin(labd,keep[keep>0])&ndi.binary_dilation(eyeball,iterations=int(T.get('lid_reach',9)))
        rimL=ndi.binary_dilation(eyeball,iterations=4)&~eyeball&(yy>=ic[1])
        lo=rimL&(L<sL-35)
        lid=ndi.binary_dilation(up|lo,iterations=1)&b&~eyeball
    E[side]=dict(eyeball=eyeball,lid=lid,iris=(iris|pupil|hl)&eyeball)
    print(side,eyeball.sum(),lid.sum())
np.save('eyes.npy',E,allow_pickle=True)
vis=ref.copy()
for s in 'LR':
    vis[E[s]['eyeball']]=(vis[E[s]['eyeball']]*0.4+np.array([0,255,0])*0.6).astype(np.uint8)
    vis[E[s]['lid']]=(vis[E[s]['lid']]*0.4+np.array([0,0,255])*0.6).astype(np.uint8)
v=cv2.resize(vis[380:440,310:560],None,fx=4,fy=4,interpolation=cv2.INTER_NEAREST); cv2.imwrite('dbg_eyes.png',v)
