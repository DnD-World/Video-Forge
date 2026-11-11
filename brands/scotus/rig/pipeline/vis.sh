for v in rest MBP AA E EE OH OO FV TH; do google-chrome --headless=new --no-sandbox --hide-scrollbars --window-size=896,1200 --screenshot=r_$v.png "file://$PWD/rig.html?still=1&freeze=1&v=$v" 2>/dev/null; done
python3 - <<'P'
import cv2,numpy as np
vs=['rest','MBP','AA','E','EE','OH','OO','FV','TH']; cells=[]
for v in vs:
    c=cv2.resize(cv2.imread(f'r_{v}.png')[515:605,375:515],None,fx=2.6,fy=2.6,interpolation=cv2.INTER_CUBIC); cv2.putText(c,v,(5,18),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,255),2); cells.append(c)
o=cv2.resize(cv2.imread('../ref.png')[515:605,375:515],None,fx=2.6,fy=2.6,interpolation=cv2.INTER_CUBIC);cv2.putText(o,'orig',(5,18),0,.6,(255,255,255),2)
cv2.imwrite('vis.png',np.vstack([np.hstack([o]+cells[:3]),np.hstack(cells[3:7]),np.hstack(cells[7:]+[o*0,o*0])]))
P
