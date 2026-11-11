import cv2,numpy as np,json
from scipy import ndimage as ndi
ref=cv2.imread('../ref.png').astype(np.float32); H,W=ref.shape[:2]
skin=cv2.imread('L_head.png').astype(np.float32)   # smooth skin under holes
head=np.load('m_head.npy'); holes2=np.load('holes2.npy')
import json as _j; F=_j.load(open('../face.json'))
seam=json.load(open('seam.json')); SX=np.array(seam['x']); SY=np.array(seam['y'])
lip0=np.load('lippoly.npy')
yy,xx=np.mgrid[0:H,0:W]
def matte(region):
    d=np.abs(ref-skin).sum(-1)
    a=np.clip((d-14)/30,0,1)*region
    a=cv2.GaussianBlur(a.astype(np.float32),(0,0),.4)*region
    c=(ref-(1-a[...,None])*skin)/np.maximum(a[...,None],1e-3)
    c=np.clip(c,0,255); c[a<0.02]=0
    return c,a
sline=np.full(W,np.nan); sline[SX]=SY
sl=np.nan_to_num(sline,nan=1e9)[None,:]
# lips: everything in hole region near lip polygon
lipR=holes2&ndi.binary_dilation(lip0,iterations=4)
c,a=matte(lipR)
chm=cv2.imread('L_chinS.png',cv2.IMREAD_UNCHANGED)[...,3]>0
chm=ndi.binary_opening(ndi.binary_closing(chm,iterations=2),iterations=1)
ca=cv2.GaussianBlur(chm.astype(np.float32),(0,0),.6)
ca=np.clip((ca-.15)/.7,0,1)
cc=ref.copy(); med=np.median(ref[chm],axis=0)
inner=ndi.binary_erosion(chm,iterations=1); cc[:]=med
chinR=chm
out={}
def save(name,col,al,m):
    ys,xs=np.where(al*m>0.02); x0,x1,y0,y1=xs.min()-1,xs.max()+2,ys.min()-1,ys.max()+2
    img=np.dstack([col,(al*m*255)]).astype(np.uint8)[y0:y1,x0:x1]
    cv2.imwrite(f'E_{name}.png',img); out[name]=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
up=(yy<sl+0.5); 
save('mU',c,a,up); save('mL',c,a,~up); save('mC',cc,ca,np.ones_like(up))
# lower-lip bottom per column (for chin follow)
ml=(a*(~up))>0.5; bot={}
for x in range(int(SX[0]),int(SX[-1])+1):
    col=np.where(ml[:,x])[0]
    if len(col): bot[x]=float(col.max())
from scipy.ndimage import median_filter, gaussian_filter1d
kx=sorted(bot); bv=np.array([bot[k] for k in kx]); bv=gaussian_filter1d(median_filter(bv,5),1.5)
bot={k:float(v) for k,v in zip(kx,bv)}
out['lipbot']=bot
sk=np.load('holes2.npy')&ndi.binary_dilation(lip0|chinR,iterations=6)
skm=cv2.GaussianBlur(ndi.binary_dilation(sk,iterations=1).astype(np.float32),(0,0),1.0)
save('mS',skin,np.clip(skm*1.3,0,1),np.ones_like(up))
json.dump(out,open('mouth2.json','w'))
# check: composite over skin == ref ?
comp=skin.copy()
for n,al,col,m in (('U',a*up,c,1),('L',a*(~up),c,1),('C',ca,cc,1)):
    comp=comp*(1-al[...,None])+col*al[...,None]
reg=ndi.binary_dilation(lipR|chinR,iterations=2)
print('matte err',np.abs(comp-ref)[reg].mean(), 'lip bbox',out['mU'],out['mL'],out['mC'])

# jaw patch: smooth-filled head pixels below lower lip, compressed when jaw opens
JX0,JX1,JY1=F['jaw']['x0'],F['jaw']['x1'],F['jaw']['y1']
hd=cv2.imread('L_head.png').astype(np.float32)
chh=ndi.binary_dilation(chm,iterations=2)
ringc=ndi.binary_dilation(chm,iterations=7)&~ndi.binary_dilation(chm,iterations=3)&head&~ndi.binary_dilation(lip0,iterations=3)
ringc&=(np.abs(xx-F['mouth']['cx'])>40*F.get('scale',1)); cm=np.median(ref[ringc],axis=0); print('fill',cm)
fl=hd.copy(); fl[chh]=cm
blend=cv2.GaussianBlur(chh.astype(np.float32),(0,0),1.2)[...,None]
hd=hd*(1-blend)+fl*blend
ja=np.zeros((H,W),np.float32)
for x in range(JX0,JX1):
    yt=int(bot.get(x,sline[x] if not np.isnan(sline[x]) else 560))-2
    ja[yt:JY1,x]=1
side=np.clip(np.minimum(xx-JX0,JX1-1-xx)/9.0,0,1); ja*=side*head
ys,xs=np.where(ja>0); x0,y0=xs.min(),ys.min()
img=np.dstack([hd,ja*255]).astype(np.uint8)[y0:JY1,x0:JX1]
cv2.imwrite('E_mJ.png',img); out['mJ']=[int(x0),int(y0),int(JX1-x0),int(JY1-y0)]; out['JY1']=JY1
json.dump(out,open('mouth2.json','w'))
