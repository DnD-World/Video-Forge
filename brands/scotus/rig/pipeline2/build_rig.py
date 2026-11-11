import re,json,base64,cv2,numpy as np
from scipy import ndimage as ndi
meta=json.load(open('hi_meta.json')); seam=json.load(open('seam.json'))
F=json.load(open('../face.json'))
def body(p):
    s=open(p).read(); return re.sub(r'^.*?<svg[^>]*>|</svg>\s*$','',s,flags=re.S)
def b64(img): 
    ok,buf=cv2.imencode('.png',img); return 'data:image/png;base64,'+base64.b64encode(buf).decode()
def crop_img(name,pad=1):
    im=cv2.imread(f'L_{name}.png',cv2.IMREAD_UNCHANGED); ys,xs=np.where(im[...,3]>0)
    x0,x1,y0,y1=xs.min()-pad,xs.max()+pad+1,ys.min()-pad,ys.max()+pad+1
    return b64(im[y0:y1,x0:x1]),int(x0),int(y0),int(x1-x0),int(y1-y0)
# eyes
HEAD=cv2.imread('L_head.png',cv2.IMREAD_UNCHANGED)[...,:3]
def patchimg(s,eb):
    ys,xs=np.where(ndi.binary_dilation(eb,iterations=3)); x0,x1,y0,y1=xs.min()-6,xs.max()+7,ys.min()-6,ys.max()+7
    valid=((~np.load('holes.npy'))&np.load('m_head.npy'))[y0:y1,x0:x1].astype(np.float32)
    h=HEAD[y0:y1,x0:x1].astype(np.float32)*valid[...,None]
    num=cv2.GaussianBlur(h,(0,0),7); den=cv2.GaussianBlur(valid,(0,0),7)[...,None]+1e-4
    ring=(ndi.binary_dilation(eb,iterations=9)&~ndi.binary_dilation(eb,iterations=4)&np.load('m_head.npy'))
    Lr=cv2.cvtColor(cv2.imread('../ref.png'),cv2.COLOR_BGR2GRAY); ring&=(Lr>186)
    med=np.median(cv2.imread('../ref.png')[ring],axis=0)
    PCm=med[::-1].astype(int); PC[s]=[int(v) for v in PCm]; c=np.zeros((2,2,3),np.uint8); return (b64(c),int(x0),int(y0),int(x1-x0),int(y1-y0))
E=np.load('eyes.npy',allow_pickle=True).item()
eyes={}
PC={}
for s in 'LR':
    eb=E[s]['eyeball']; ys,xs=np.where(eb)
    cs,_=cv2.findContours(ndi.binary_dilation(eb,iterations=1).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    c=max(cs,key=cv2.contourArea)[:,0,:]; d='M'+' L'.join(f'{x},{y}' for x,y in c)+'Z'
    ir=cv2.imread(f'L_iris{s}.png',cv2.IMREAD_UNCHANGED)[...,3]>0; iy,ix=np.where(ir)
    lid=cv2.imread(f'L_lid{s}.png',cv2.IMREAD_UNCHANGED)[...,3]>0; ly,lx=np.where(lid)
    eyes[s]=dict(clip=d,y0=int(ys.min()),y1=int(ys.max()),x0=int(xs.min()),x1=int(xs.max()),ic=[float(ix.mean()),float(iy.mean())],lidtop=int(ly.min()),lidbot=int(ly.max()),
        lx0=int(lx.min()),lx1=int(lx.max()),
        patch=patchimg(s,eb),
        sclera=crop_img(f'eyeball{s}'),iris=crop_img(f'iris{s}'),lid=crop_img(f'lid{s}'))
# mouth paths
def parse(name):
    x0,y0=meta[name]; s=open(f'sv/H_{name}.svg').read(); out=[]
    for m in re.finditer(r'<path d="([^"]*)" fill="([^"]*)"(?: transform="translate\(([-\d.]+),([-\d.]+)\)")?',s):
        d,fill,tx,ty=m.group(1),m.group(2),float(m.group(3) or 0),float(m.group(4) or 0)
        toks=re.findall(r'[MCZ]|-?[\d.]+(?:e-?\d+)?',d); cmds=[];nums=[]
        for t in toks:
            if t in 'MCZ': cmds.append(t)
            else: nums.append(float(t))
        pts=[];
        for i in range(0,len(nums),2): pts+= [round(x0+(nums[i]+tx)/4,2),round(y0+(nums[i+1]+ty)/4,2)]
        out.append(dict(fill=fill,cmds=''.join(cmds),pts=pts))
    return out

def layer(n):
    if not F.get('raster'): return body(f'sv/L_{n}.svg')
    im=cv2.imread(f'L_{n}.png',cv2.IMREAD_UNCHANGED)
    if im.shape[2]==3: im=np.dstack([im,np.full(im.shape[:2],255,np.uint8)])
    ys,xs=np.where(im[...,3]>0); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    return f'<image href="{b64(im[y0:y1,x0:x1])}" x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}"/>'
head_layers=''.join(f'<g id="{n}">{body(f"sv/L_{n}.svg")}</g>' for n in ('bg','hair','robe','collar','head'))
brows=''.join(f'<g id="{n}" transform="translate({meta[n][0]} {meta[n][1]}) scale(0.25)">{body(f"sv/H_{n}.svg")}</g>' for n in ('browL','browR'))
E2=json.load(open('eyes2.json'))
def eimg(s,n,idattr=''):
    x,y,w,h=E2[s][n]; im=cv2.imread(f'E_{n}{s}.png',cv2.IMREAD_UNCHANGED)
    return f'<image {idattr} href="{b64(im)}" x="{x}" y="{y}" width="{w}" height="{h}"/>'
def eyesvg(s):
    e=eyes[s]
    return f'''<clipPath id="ec{s}"><path d="{E2[s]['clip']}"/></clipPath><clipPath id="bc{s}"><path id="bcp{s}" d="M0 0Z"/></clipPath>
<g id="eye{s}"><g clip-path="url(#ec{s})"><g clip-path="url(#bc{s})">{eimg(s,'sclera')}<g id="iris{s}">{eimg(s,'iris')}</g></g></g>{eimg(s,'lo')}<g id="lid{s}">{eimg(s,'up')}</g></g>'''
if F.get('raster'):
    browsvg=''.join(f'<g id="brow{s}g" transform="translate(0 0)">{layer("brow"+s)}</g>' for s in 'LR')
else:
    browsvg=f"<g id=\"browLg\" transform=\"translate({meta['browL'][0]} {meta['browL'][1]}) scale(0.25)\">{body('sv/H_browL.svg')}</g><g id=\"browRg\" transform=\"translate({meta['browR'][0]} {meta['browR'][1]}) scale(0.25)\">{body('sv/H_browR.svg')}</g>"
svg=f'''<svg id="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 896 1200"><defs>%%MIMG%%<filter id="blur2" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
<g id="bgG">{layer('bg')}</g>
<g id="hairG">{layer('hair')}</g>
<g id="bodyG"><g>{layer('robe')}</g><g>{layer('collar')}</g></g>
<g id="headG"><g>{layer('head')}</g>
<use href="#img_mS"/><g id="jawG"></g><g id="mInt"><path id="mDark" fill="#3a1614"/><path id="mTeeth" fill="#e8dccb"/><path id="mTongue" fill="#8a3a38"/></g>
<g id="chinG"></g><g id="mouthLg"></g><g id="mouthUg"></g>
{eyesvg('L')}{eyesvg('R')}
{browsvg}
</g></svg>'''
M2=json.load(open('mouth2.json'))
mimgs=''.join(f'<image id="img_{n}" href="{b64(cv2.imread(f"E_{n}.png",cv2.IMREAD_UNCHANGED))}" x="{M2[n][0]}" y="{M2[n][1]}" width="{M2[n][2]}" height="{M2[n][3]}"/>' for n in ('mU','mL','mC','mS','mJ'))
data=dict(f=dict(name=F['name'],cx=F['mouth']['cx'],hw=F['mouth']['hw'],pivot=F['pivot'],scale=F.get('scale',1)),m2=M2,seam=seam,e2={s:{k:v for k,v in E2[s].items() if k!='clip'} for s in E2},eyes={s:{k:v for k,v in eyes[s].items() if k in('y0','y1','x0','x1','ic','lidtop','lidbot','lx0','lx1')} for s in 'LR'})
svg=svg.replace('%%MIMG%%',mimgs)
html=open('rig_template.html').read().replace('%%SVG%%',svg).replace('%%DATA%%',json.dumps(data))
open('rig.html','w').write(html); print(len(html)//1024,'KB')
# the Forge's copy: the same drawing and numbers, no page around them (remotion/portrait/)
json.dump(dict(v=1,name=F['name'],w=896,h=1200,svg=svg,data=data),open('portrait.json','w'))
