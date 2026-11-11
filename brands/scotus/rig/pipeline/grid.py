import sys
from PIL import Image, ImageDraw, ImageFont
def gridcrop(box, scale, step, out, src='ref.png'):
    im=Image.open(src).convert('RGB')
    c=im.crop(box).resize(((box[2]-box[0])*scale,(box[3]-box[1])*scale),Image.LANCZOS)
    d=ImageDraw.Draw(c)
    f=ImageFont.load_default()
    x0=(box[0]//step+1)*step
    for x in range(x0,box[2],step):
        X=(x-box[0])*scale; d.line([(X,0),(X,c.size[1])],fill=(255,0,255) if x%100==0 else (0,255,255),width=1); d.text((X+2,2),str(x),fill=(255,255,0),font=f)
    y0=(box[1]//step+1)*step
    for y in range(y0,box[3],step):
        Y=(y-box[1])*scale; d.line([(0,Y),(c.size[0],Y)],fill=(255,0,255) if y%100==0 else (0,255,255),width=1); d.text((2,Y+2),str(y),fill=(255,255,0),font=f)
    c.save(out)
if __name__=='__main__':
    b=tuple(map(int,sys.argv[1:5])); gridcrop(b,int(sys.argv[5]),int(sys.argv[6]),sys.argv[7], sys.argv[8] if len(sys.argv)>8 else 'ref.png')
