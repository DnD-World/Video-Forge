import cv2, numpy as np
from scipy import ndimage as ndi
ref=cv2.imread('../ref.png'); sm=cv2.imread('../tr/smooth.png')
H,W=ref.shape[:2]
rgb=cv2.cvtColor(sm,cv2.COLOR_BGR2RGB).astype(int)
R,G,B=rgb[...,0],rgb[...,1],rgb[...,2]
luma=(0.299*R+0.587*G+0.114*B)
yy,xx=np.mgrid[0:H,0:W]
def poly(pts):
    m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],1); return m.astype(bool)
inner=np.zeros((H,W),bool); inner[24:1176,23:874]=True
navy=np.array([35,48,65]); d=np.sqrt(((rgb-navy)**2).sum(-1))
navylike=(d<28)&((B-R)>14)&inner
lab,n=ndi.label(navylike)
bl=set(np.unique(lab[24:30,:]))|set(np.unique(lab[1170:1176,:]))|set(np.unique(lab[:,23:29]))|set(np.unique(lab[:,868:874])); bl.discard(0)
bg=ndi.binary_opening(np.isin(lab,list(bl)),iterations=1)
fig=inner&~bg
# collar
collar=poly([(398,742),(462,742),(462,832),(398,832)])&((R-B)<46)&(luma>150)&fig
collar=ndi.binary_closing(collar,iterations=2)
# skin
skin=(((R-B)>28)&(R>100)&fig&(yy<700))|(((R-B)>40)&(R>100)&fig&(yy>=700))
skin&=~collar
skin=ndi.binary_closing(skin,iterations=2)
lab,n=ndi.label(skin); sz=ndi.sum(skin,lab,range(1,n+1)); skin=lab==(1+int(np.argmax(sz)))
skin=ndi.binary_fill_holes(skin)
# earrings (pale, non-black) near the ears
earR=poly([(588,492),(611,492),(613,553),(588,553)])&(luma>70)&fig
earL=poly([(305,510),(330,510),(330,558),(305,558)])&(luma>70)&fig
head=skin|earR|earL
head=ndi.binary_closing(head,iterations=1)
# hair zone
HZ=poly([(150,60),(780,60),(780,612),(650,612),(600,606),(560,640),(420,670),(380,640),(330,640),(150,640)])
hair=fig&HZ&~ndi.binary_dilation(head,iterations=1)
hair&=~collar
# robe
robe=fig&~(head&(yy<600))&~collar&~(hair&(yy<596))
np.save('m_bg.npy',bg);np.save('m_fig.npy',fig);np.save('m_collar.npy',collar);np.save('m_head.npy',head);np.save('m_hair.npy',hair);np.save('m_robe.npy',robe)
vis=np.zeros((H,W,3),np.uint8)
vis[robe]=(80,80,255);vis[hair]=(255,200,0);vis[head]=(0,255,0);vis[collar]=(255,255,255);vis[bg]=(60,0,0)
cv2.imwrite('dbg2.png',vis)
print({k:int(v.sum()) for k,v in dict(bg=bg,hair=hair,head=head,robe=robe,collar=collar).items()})
