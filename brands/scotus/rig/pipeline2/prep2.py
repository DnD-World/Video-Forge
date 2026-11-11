import cv2, numpy as np
from scipy import ndimage as ndi
ref=cv2.imread('../ref.png'); sm=cv2.imread('../tr/smooth.png')
H,W=ref.shape[:2]
import json as _j; F=_j.load(open('../face.json'))
rgb=cv2.cvtColor(sm,cv2.COLOR_BGR2RGB).astype(int)
R,G,B=rgb[...,0],rgb[...,1],rgb[...,2]
luma=(0.299*R+0.587*G+0.114*B)
yy,xx=np.mgrid[0:H,0:W]
def poly(pts):
    m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],1); return m.astype(bool)
fx0,fy0,fx1,fy1=F['frame']
inner=np.zeros((H,W),bool); inner[fy0:fy1,fx0:fx1]=True
navy=np.array(F['navy']); d=np.sqrt(((rgb-navy)**2).sum(-1))
navylike=(d<28)&((B-R)>14)&inner
lab,n=ndi.label(navylike)
bl=set(np.unique(lab[fy0:fy0+6,:]))|set(np.unique(lab[fy1-6:fy1,:]))|set(np.unique(lab[:,fx0:fx0+6]))|set(np.unique(lab[:,fx1-6:fx1])); bl.discard(0)
bg=ndi.binary_opening(np.isin(lab,list(bl)),iterations=1)
fig=inner&~bg
# collar
collar=poly(F['collar_poly'])&((R-B)<46)&(luma>F.get('collar_luma',150))&fig
collar=ndi.binary_closing(collar,iterations=2)
# skin
S=F['skin']
if S['mode']=='rb':
    skin=(((R-B)>S['rb_hi'])&(R>S['r_min'])&fig&(yy<S['split_y']))|(((R-B)>S['rb_lo'])&(R>S['r_min'])&fig&(yy>=S['split_y']))
else:
    labi=cv2.cvtColor(sm,cv2.COLOR_BGR2LAB).astype(float); ref_lab=np.array(S['lab'],float)
    dch=np.hypot(labi[...,1]-ref_lab[1],labi[...,2]-ref_lab[2]); dl=labi[...,0]-ref_lab[0]
    skin=(dch<S['tol_ab'])&(dl>-S['tol_dark'])&(dl<S['tol_light'])&fig&(yy<S['split_y'])
skin&=~collar
skin=ndi.binary_closing(skin,iterations=2)
lab,n=ndi.label(skin); sz=ndi.sum(skin,lab,range(1,n+1)); skin=lab==(1+int(np.argmax(sz)))
skin=ndi.binary_fill_holes(skin)
# earrings (pale, non-black) near the ears
head=skin
for e_ in F['ears']: head|=poly(e_)&(luma>70)&fig&~((B-R)>14)
head=ndi.binary_closing(head,iterations=1)
# hair zone
HZ=poly(F['hair_poly'])
hair=fig&HZ&~ndi.binary_dilation(head,iterations=1)
hair&=~collar
# robe
robe=fig&~(head&(yy<F['robe_head_y']))&~collar&~(hair&(yy<F['hair_cut_y']))
np.save('m_bg.npy',bg);np.save('m_fig.npy',fig);np.save('m_collar.npy',collar);np.save('m_head.npy',head);np.save('m_hair.npy',hair);np.save('m_robe.npy',robe)
vis=np.zeros((H,W,3),np.uint8)
vis[robe]=(80,80,255);vis[hair]=(255,200,0);vis[head]=(0,255,0);vis[collar]=(255,255,255);vis[bg]=(60,0,0)
cv2.imwrite('dbg2.png',vis)
print({k:int(v.sum()) for k,v in dict(bg=bg,hair=hair,head=head,robe=robe,collar=collar).items()})
