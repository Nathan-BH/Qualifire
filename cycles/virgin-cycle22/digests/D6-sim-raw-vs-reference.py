import re,math,datetime as dt,numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
s=open("/mnt/user-data/uploads/Qualifire/data/activities/TEST in virgin-app rides/qualifire-20261004-0906.gpx").read()
P=[]
for m in re.finditer(r'<trkpt lat="([^"]+)" lon="([^"]+)">(.*?)</trkpt>',s,re.S):
    t=re.search(r'<time>(.*?)</time>',m.group(3)).group(1)
    P.append((float(m.group(1)),float(m.group(2)),dt.datetime.fromisoformat(t.replace('Z','+00:00')).timestamp()))
lat0,lon0=P[0][0],P[0][1]
X=np.array([(p[1]-lon0)*111320*math.cos(math.radians(lat0)) for p in P]);Y=np.array([(p[0]-lat0)*110574 for p in P]);T=np.array([p[2] for p in P])
# stationary collapse: runs staying within 15 m of run's first fix, duration>20 s -> centroid
cx,cy,ct=[],[],[];i=0;n=len(X)
while i<n:
    j=i
    while j+1<n and math.hypot(X[j+1]-X[i],Y[j+1]-Y[i])<=15: j+=1
    if T[j]-T[i]>20: cx.append(X[i:j+1].mean());cy.append(Y[i:j+1].mean());ct.append(T[i]);i=j+1
    else: cx.append(X[i]);cy.append(Y[i]);ct.append(T[i]);i+=1
cx,cy=np.array(cx),np.array(cy)
print('after collapse',len(cx),'of',n)
k=5;ker=np.ones(k)/k
sx=np.convolve(cx,ker,'same');sy=np.convolve(cy,ker,'same')
sx[:k]=cx[:k];sy[:k]=cy[:k];sx[-k:]=cx[-k:];sy[-k:]=cy[-k:]
d=np.hypot(np.diff(sx),np.diff(sy));cum=np.concatenate([[0],np.cumsum(d)])
g=np.arange(0,cum[-1],5.0);rx=np.interp(g,cum,sx);ry=np.interp(g,cum,sy)
# deviation of ref from raw polyline (nearest raw point, then segment)
def dist_to_poly(px,py,qx,qy):
    out=[]
    for a,b in zip(px,py):
        ax,ay,bx,by=qx[:-1],qy[:-1],qx[1:],qy[1:]
        dx,dy=bx-ax,by-ay;L=dx*dx+dy*dy+1e-9
        tt=np.clip(((a-ax)*dx+(b-ay)*dy)/L,0,1)
        out.append(np.min(np.hypot(a-(ax+tt*dx),b-(ay+tt*dy))))
    return np.array(out)
dev=dist_to_poly(rx,ry,X,Y)
print('ref pts',len(rx),'dev m: median',round(np.median(dev),1),'p95',round(np.percentile(dev,95),1),'max',round(dev.max(),1))
msk=(rx>2500)&(rx<2950)&(ry>4280)&(ry<4520)
print('roundabout area dev: median',round(np.median(dev[msk]),1),'max',round(dev[msk].max(),1))
fig,ax=plt.subplots(1,2,figsize=(15,7))
for a,(x0,x1,y0,y1,t) in zip(ax,[(2580,2960,4290,4480,'roundabout zoom'),(1380,1560,2560,2760,'stop + bend zoom')]):
    a.plot(X,Y,'-',color='#f5c542',lw=3,label='raw fixes (yellow trail)');a.plot(rx,ry,'-',color='k',lw=1,label='simulated reference (smoothed+5 m resample)')
    a.set_xlim(x0,x1);a.set_ylim(y0,y1);a.set_aspect('equal');a.set_title(t);a.legend(fontsize=7)
plt.savefig('/tmp/sim.png',dpi=70)
