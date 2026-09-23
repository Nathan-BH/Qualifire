"""Read-only check of the rider's motion in a gates-saving render (cycle 17, item B).
Usage: python3 check_rider_motion.py <render.mp4>
Decodes every frame (1920x1080, 30 fps), finds the blue rider dot (#2F7DE1 fill) as the
blob nearest the previous position, prints its centre at the five E5 pulse frames and the
four mid-leg frames plus the px/frame speed there (central difference over +/-3 frames),
and writes <basename>.cent.npy (frame, x, y, area) next to this script.
Needs: ffmpeg on PATH, numpy, opencv (python3 -c "import cv2")."""
import sys, os, subprocess, numpy as np, cv2
mp4 = sys.argv[1]; W, H, FPS = 1920, 1080, 30
raw = subprocess.run(["ffmpeg","-v","error","-i",mp4,"-f","rawvideo","-pix_fmt","rgb24","-"],check=True,stdout=subprocess.PIPE).stdout
n = len(raw)//(W*H*3); fr = np.frombuffer(raw,dtype=np.uint8).reshape(n,H,W,3)
print("frames", n, "(expect 369 = 12.3 s x 30)")
cent = np.full((n,3), np.nan); prev = None
for i in range(n):
    f = fr[i].astype(np.int16); r,g,b = f[...,0],f[...,1],f[...,2]
    m = ((b>60)&(b>r+40)&(b>g+20)).astype(np.uint8); m[985:,:] = 0    # blue-ish, caption band excluded
    k, lab, st, cen = cv2.connectedComponentsWithStats(m, 8)
    cands = [(j, st[j,cv2.CC_STAT_AREA], cen[j]) for j in range(1,k) if 120 <= st[j,cv2.CC_STAT_AREA] <= 800
             and 0.6 <= st[j,cv2.CC_STAT_WIDTH]/max(1,st[j,cv2.CC_STAT_HEIGHT]) <= 1.7]
    if not cands: continue
    if prev is not None: cands.sort(key=lambda c: np.hypot(c[2][0]-prev[0], c[2][1]-prev[1]))
    else: cands.sort(key=lambda c: -c[1])
    j, area, c = cands[0]; cent[i] = (c[0], c[1], area); prev = c
def sp(t, w=3):
    i = int(round(t*FPS)); a, b = max(0,i-w), min(n-1,i+w)
    return np.hypot(cent[b,0]-cent[a,0], cent[b,1]-cent[a,1])/(b-a)
def row(t):
    i = int(round(t*FPS)); print("  t=%6.3f frame %3d  centre (%7.1f, %7.1f)  area %4.0f  speed %.2f px/frame" % (t, i, cent[i,0], cent[i,1], cent[i,2], sp(t)))
print("pulses (start, gate1, gate2, gate3, finish):"); [row(t) for t in (3.80, 5.81, 7.65, 9.51, 11.38)]
print("mid-legs:"); [row(t) for t in (4.805, 6.73, 8.58, 10.445)]
vp = [sp(t) for t in (3.80, 5.81, 7.65, 9.51, 11.38)]; vm = [sp(t) for t in (4.805, 6.73, 8.58, 10.445)]
print("max speed at a pulse %.2f  <  min speed at a mid-leg %.2f  ->  %s" % (max(vp), min(vm), "INVERTED (slow at gates, fast between): PASS" if max(vp) < min(vm) else "NOT inverted: FAIL"))
vis = np.nonzero(~np.isnan(cent[:,0]))[0]; print("rider tracked on %d frames, first %d last %d" % (len(vis), vis[0], vis[-1]))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.path.basename(mp4)+".cent.npy"); np.save(out, cent); print("wrote", out)
