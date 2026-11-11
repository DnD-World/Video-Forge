import cv2, numpy as np
from scipy import ndimage as ndi
ref=cv2.imread('../ref.png'); H,W=ref.shape[:2]
sm=cv2.imread('../tr/smooth.png')
M={k:np.load(f'm_{k}.npy') for k in ('bg','fig','collar','head','hair','robe')}
E=np.load('eyes.npy',allow_pickle=True).item()
def box_(x0,y0,x1,y1):
    m=np.zeros(ref.shape[:2],bool); m[y0:y1,x0:x1]=True; return m
yy,xx=np.mgrid[0:H,0:W]
def poly(p):
    m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(p,np.int32)],1); return m.astype(bool)
dil=lambda m,i=1: ndi.binary_dilation(m,iterations=i)
# hole regions in head: eyes(eyeball+lid), brows, mouth
brL=poly([(318,366),(410,366),(410,390),(318,390)]); brR=poly([(455,346),(536,346),(536,386),(455,386)])
mouth=poly([(385,560),(500,560),(500,640),(385,640)])
R,G,B=[ref[...,i].astype(int) for i in (2,1,0)]
# dark/red art inside brow/mouth boxes = anything notably different from skin: use head-skin colour distance after median skin
skin_med=cv2.medianBlur(ref,21)
d=np.abs(ref.astype(int)-skin_med.astype(int)).sum(-1)
Lb=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY).astype(int)
browcol=(Lb>38)&(Lb<108)&((R-B)>14)
art_brow=np.zeros_like(browcol)
for bx,seed in (((312,345,418,395),(370,372)),((450,338,548,392),(500,362))):
    bb=box_(*bx)&browcol&~dil(E['L']['eyeball']|E['L']['lid']|E['R']['eyeball']|E['R']['lid'],2)
    bb=ndi.binary_opening(bb,iterations=1); bb=ndi.binary_closing(bb,iterations=2)
    lb,nb=ndi.label(bb)
    if nb:
        sz=ndi.sum(bb,lb,range(1,nb+1)); art_brow|=lb==(1+int(np.argmax(sz)))
art_brow=ndi.binary_fill_holes(art_brow)
M['head']=M['head']|art_brow
M['head']=ndi.binary_fill_holes(M['head'])
brL=box_(300,330,430,400); brR=box_(440,330,560,400)
lip0=np.load('lippoly.npy'); Lg0=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY)
lip=ndi.binary_fill_holes(ndi.binary_closing((Lg0<160)&ndi.binary_dilation(lip0,iterations=2),iterations=1)); 
lab,nn=ndi.label(lip); lip=lab==(1+np.argmax(ndi.sum(lip,lab,range(1,nn+1))));
art_mouth=lip&M['head']
Lc=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY)
chin=(Lc<172)&box_(393,562,492,585)&M['head']&~lip
chin=ndi.binary_opening(chin,iterations=1); lc,nc=ndi.label(chin); 
if nc: chin=lc==(1+np.argmax(ndi.sum(chin,lc,range(1,nc+1))))
chin=ndi.binary_closing(chin,iterations=2)&~lip
holes=dil(E['L']['eyeball']|E['L']['lid']|E['R']['eyeball']|E['R']['lid']|art_brow,1)&M['head']|ndi.binary_dilation(dil(E['L']['eyeball']|E['L']['lid']|E['R']['eyeball']|E['R']['lid'],2)&M['head'])|ndi.binary_dilation(lip&M['head'],iterations=1)|ndi.binary_dilation(chin,iterations=1)
cv2.imwrite('dbg_holes.png',cv2.resize(np.where(holes[...,None],np.array([0,0,255],np.uint8),ref)[330:660,300:570],None,fx=3,fy=3,interpolation=cv2.INTER_NEAREST))
np.save('holes.npy',holes)
import sys; sys.path.insert(0,'.'); from fill import pushpull
holes2=ndi.binary_dilation(holes,iterations=1)&M['head']
valid=(~holes2)&M['head']
# outside head: let fill see only head skin -> mark non-head as invalid but keep them unchanged
skin_in=pushpull(ref,valid|~ndi.binary_dilation(M['head'],iterations=3))
skin_in[~M['head']]=ref[~M['head']]
np.save('holes2.npy',holes2)
def save(name,img,mask):
    a=np.dstack([img,(mask*255).astype(np.uint8)]); cv2.imwrite(name,a)
cv2.imwrite('L_bg.png',cv2.inpaint(ref,(dil(M['fig'],3)*255).astype(np.uint8),9,cv2.INPAINT_TELEA))
hairfill=ref.copy(); hairfill[M['head']&~M['hair']]=(12,12,12)
save('L_hair.png',hairfill,((M['hair']|M['head'])&(M['hair']|ndi.binary_dilation(M['head'],iterations=3)))|(ndi.binary_dilation(M['hair'],iterations=6)&M['fig']))
rf=ref.copy(); rf[~M['robe']]=(38,37,39)
save('L_robe.png',rf,M['robe']|M['collar']|(ndi.binary_dilation(M['robe'],iterations=4)&M['fig']&~(M['hair']&(yy<596))))
save('L_chinS.png',ref,chin); save('L_collar.png',ref,M['collar'])
save('L_head.png',skin_in,M['head'])
# eye parts
for s in 'LR':
    eb=E[s]['eyeball']; ir=ndi.binary_fill_holes(ndi.binary_closing(E[s]['iris'],iterations=2))&eb
    sc=ref.copy(); sc[ndi.binary_dilation(ir,iterations=2)]=(0,0,0)
    # sclera colour fill: sample bright pixels, inpaint iris area from neighbours
    scl=cv2.inpaint(ref,(ndi.binary_dilation(ir,iterations=2)*255).astype(np.uint8),5,cv2.INPAINT_TELEA)
    Rr,Br=scl[...,2].astype(int),scl[...,0].astype(int)
    bad=eb&((Rr-Br)<34)&~ndi.binary_dilation(ir,iterations=1)
    for _ in range(2): scl=cv2.inpaint(scl,(ndi.binary_dilation(bad,iterations=1)*255).astype(np.uint8),4,cv2.INPAINT_TELEA)
    core=ndi.binary_erosion(eb,iterations=2); ring=ndi.binary_dilation(eb,iterations=1)&~core
    scl=cv2.inpaint(scl,(ring*255).astype(np.uint8),3,cv2.INPAINT_TELEA)
    save(f'L_eyeball{s}.png',scl,ndi.binary_dilation(eb,iterations=1)&~ndi.binary_dilation(ir,iterations=0) if False else eb); save(f'L_iris{s}.png',ref,ir)
    save(f'L_lid{s}.png',ref,E[s]['lid'])
save('L_browL.png',ref,art_brow&brL); save('L_browR.png',ref,art_brow&brR)

import json
sx=np.arange(377,509); sy=np.interp(sx,[378,398,418,443,463,483,498,508],[547.8,546.8,548.1,548.1,548.1,547.1,544.9,544.3])
sline=np.zeros(W); sline[:]=np.nan; sline[sx]=sy
Lg=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY)
below=yy>=(np.nan_to_num(sline[None,:],nan=1e9)+0.5)
seam=(Lg<125)&(np.abs(yy-np.nan_to_num(sline[None,:],nan=1e9))<=4)&ndi.binary_dilation(lip,iterations=2)
ipl=cv2.inpaint(ref,(ndi.binary_dilation(seam,iterations=1)*255).astype(np.uint8),3,cv2.INPAINT_TELEA)
save('L_mouthU.png',ipl,art_mouth&~below); save('L_mouthL.png',ipl,art_mouth&below); save('L_seam.png',ref,seam)
json.dump(dict(x=sx.tolist(),y=sy.round(2).tolist()),open('seam.json','w'))

# rest composite check
comp=cv2.imread('L_bg.png').copy()
def over(name):
    global comp
    im=cv2.imread(name,cv2.IMREAD_UNCHANGED); a=im[...,3:]/255.0
    comp=(comp*(1-a)+im[...,:3]*a).astype(np.uint8)
for n in ['L_hair','L_robe','L_collar','L_head','L_eyeballL','L_eyeballR','L_irisL','L_irisR','L_lidL','L_lidR','L_browL','L_browR','L_mouthU','L_mouthL','L_seam']: over(n+'.png')
cv2.imwrite('comp.png',comp)
print('mean abs diff',np.abs(comp.astype(int)-ref.astype(int)).mean())
