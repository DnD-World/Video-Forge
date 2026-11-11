import cv2,numpy as np
def pushpull(img,valid,iters=200):
    """smooth membrane fill of ~valid pixels from valid ones"""
    img=img.astype(np.float32); w=valid.astype(np.float32)
    levels=[(img*w[...,None],w)]
    while min(levels[-1][1].shape)>4:
        c,ww=levels[-1]
        c2=cv2.pyrDown(c); w2=cv2.pyrDown(ww); levels.append((c2,w2))
    col=levels[-1][0]/np.maximum(levels[-1][1],1e-6)[...,None]
    for c,ww in reversed(levels[:-1]):
        up=cv2.pyrUp(col,dstsize=(ww.shape[1],ww.shape[0]))
        a=np.clip(ww*4,0,1)[...,None]
        col=(c/np.maximum(ww,1e-6)[...,None])*a+up*(1-a)
    out=img.copy(); h=~valid
    out[h]=col[h]
    # Laplace relax for smoothness, boundary fixed
    k=np.array([[0,.25,0],[.25,0,.25],[0,.25,0]],np.float32)
    for _ in range(iters):
        sm=cv2.filter2D(out,-1,k,borderType=cv2.BORDER_REFLECT)
        out[h]=sm[h]
    return np.clip(out,0,255).astype(np.uint8)
