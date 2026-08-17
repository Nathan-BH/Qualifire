#!/usr/bin/env python3
"""Qualifire B-19: chainage projection (D-011 offline), total-time stats,
noise floor sigma_s vs sector length, speed profile, e-bike cutoff check.
Race Engineer, cycle 003. Stopped := speed < 1.0 m/s sustained > 3.0 s."""
import os, glob, csv, numpy as np

DATA = "/sessions/tender-clever-ride/mnt/Qualifire/data"
AN   = os.path.join(DATA, "analysis"); CACHE = os.path.join(AN, "cache")
TRACKS = ["Morning", "EveningA", "EveningB"]
STOP_V, STOP_T = 1.0, 3.0          # stopped definition
CORRIDOR = 40.0                    # m, off-route beyond this cross-track dist

def to_xy(lat, lon, lat0, lon0):
    return ((lon - lon0) * np.cos(np.radians(lat0)) * 111320.0,
            (lat - lat0) * 110540.0)

def load_track(track):
    rides = []
    for p in sorted(glob.glob(os.path.join(CACHE, "*.npz"))):
        z = np.load(p, allow_pickle=True)
        if str(z["track"]) == track:
            rides.append(dict(name=os.path.basename(p)[:-4], t=z["t"],
                              lat=z["lat"], lon=z["lon"]))
    return rides

def resample(x, y, step):
    d = np.concatenate([[0], np.cumsum(np.hypot(np.diff(x), np.diff(y)))])
    s = np.arange(0, d[-1], step)
    return np.interp(s, d, x), np.interp(s, d, y)

def medoid(rides, lat0, lon0):
    pts = []
    for r in rides:
        x, y = to_xy(r["lat"], r["lon"], lat0, lon0)
        pts.append(np.column_stack(resample(x, y, 25.0)))
    n = len(pts); D = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            a, b = pts[i], pts[j]
            d2 = ((a[:, None, :] - b[None, :, :]) ** 2).sum(-1)
            D[i, j] = D[j, i] = (np.sqrt(d2.min(1)).mean() + np.sqrt(d2.min(0)).mean()) / 2
    return int(np.argmin(D.sum(0)))

def build_ref(r, lat0, lon0):
    x, y = to_xy(r["lat"], r["lon"], lat0, lon0)
    # light smoothing then 5 m resample
    k = 5; ker = np.ones(k) / k
    xs = np.convolve(x, ker, "same"); ys = np.convolve(y, ker, "same")
    xs[:k], ys[:k], xs[-k:], ys[-k:] = x[:k], y[:k], x[-k:], y[-k:]
    rx, ry = resample(xs, ys, 5.0)
    ch = np.concatenate([[0], np.cumsum(np.hypot(np.diff(rx), np.diff(ry)))])
    return rx, ry, ch

def project_ride(x, y, rx, ry, ch, live=False):
    """Windowed chainage projection (D-011). live=True: forward-only window,
    hold position when no in-corridor match. Returns s[], xtd[]."""
    n = len(x); s = np.zeros(n); xtd = np.zeros(n)
    segx0, segy0 = rx[:-1], ry[:-1]
    dx, dy = np.diff(rx), np.diff(ry); seglen2 = dx * dx + dy * dy
    # init: global nearest for first fix
    d2 = (rx - x[0]) ** 2 + (ry - y[0]) ** 2
    sp = ch[int(np.argmin(d2))]
    lost = 0
    for i in range(n):
        lo = np.searchsorted(ch, sp - (0 if live else 60) - (30 if live else 0))
        hi = np.searchsorted(ch, sp + 240)
        lo = max(0, lo - 1); hi = min(len(seglen2), hi)
        if hi <= lo:
            s[i], xtd[i] = sp, 999; continue
        px, py = x[i] - segx0[lo:hi], y[i] - segy0[lo:hi]
        tt = np.clip((px * dx[lo:hi] + py * dy[lo:hi]) / np.maximum(seglen2[lo:hi], 1e-9), 0, 1)
        ddx, ddy = px - tt * dx[lo:hi], py - tt * dy[lo:hi]
        dist = np.hypot(ddx, ddy)
        j = int(np.argmin(dist))
        cand_s = ch[lo + j] + tt[j] * np.sqrt(seglen2[lo + j])
        if dist[j] <= CORRIDOR:
            s[i], xtd[i] = cand_s, dist[j]
            sp = max(sp, cand_s) if live else cand_s
            lost = 0
        else:
            s[i], xtd[i] = sp, dist[j]
            lost += 1
            if lost >= 5 and not live:   # offline re-acquisition after divergence
                d2 = (rx - x[i]) ** 2 + (ry - y[i]) ** 2
                k = int(np.argmin(d2))
                if np.sqrt(d2[k]) <= CORRIDOR:
                    sp = ch[k]; s[i], xtd[i] = sp, np.sqrt(d2[k]); lost = 0
    return s, xtd

def kinematics(t, x, y):
    dt = np.diff(t); dd = np.hypot(np.diff(x), np.diff(y))
    v = np.concatenate([[0], dd / np.maximum(dt, 0.1)])
    stopped = np.zeros(len(t), bool)
    is_slow = v < STOP_V
    i = 0
    while i < len(t):
        if is_slow[i]:
            j = i
            while j + 1 < len(t) and is_slow[j + 1]: j += 1
            if t[j] - t[i] > STOP_T: stopped[i:j + 1] = True
            i = j + 1
        else: i += 1
    return v, stopped

def stopped_time_between(t, stopped, ta, tb):
    m = (t >= ta) & (t <= tb) & stopped
    if not m.any(): return 0.0
    idx = np.where(m)[0]
    return float(np.sum(np.minimum(t[idx], tb) - np.maximum(t[np.maximum(idx - 1, 0)], ta)).clip(0))

def cross_time(t, s, g):
    """first upward crossing of chainage g, interpolated"""
    above = s >= g
    if above[0]: return t[0] if s[0] - g < 20 else None
    idx = np.where(~above[:-1] & above[1:])[0]
    if len(idx) == 0: return None
    i = idx[0]
    f = (g - s[i]) / max(s[i + 1] - s[i], 1e-9)
    return float(t[i] + f * (t[i + 1] - t[i]))

def mad_sigma(a):
    a = np.asarray(a); return 1.4826 * np.median(np.abs(a - np.median(a)))

def analyse(track, out):
    rides = load_track(track)
    lat0 = np.mean([r["lat"].mean() for r in rides]); lon0 = np.mean([r["lon"].mean() for r in rides])
    mi = medoid(rides, lat0, lon0)
    rx, ry, ch = build_ref(rides[mi], lat0, lon0)
    Lref = ch[-1]
    out(f"\n=== {track} === {len(rides)} rides, ref = {rides[mi]['name']} (medoid), length {Lref:.0f} m")
    R = []
    for r in rides:
        x, y = to_xy(r["lat"], r["lon"], lat0, lon0)
        s, xtd = project_ride(x, y, rx, ry, ch)
        v, stopped = kinematics(r["t"], x, y)
        raw = r["t"][-1] - r["t"][0]
        mov = raw - stopped_time_between(r["t"], stopped, r["t"][0], r["t"][-1])
        R.append(dict(name=r["name"], t=r["t"], s=s, xtd=xtd, v=v, stopped=stopped,
                      raw=raw, mov=mov, x=x, y=y,
                      off=float((xtd > CORRIDOR).mean())))
    med_off = np.median([r["off"] for r in R])
    on = np.concatenate([r["xtd"][r["xtd"] <= CORRIDOR] for r in R])
    # coverage: fraction of 100 m gate lines (300..Lref-300) crossed by each ride
    gates = np.arange(300, Lref - 300, 100)
    for r in R:
        r["coverage"] = np.mean([cross_time(r["t"], r["s"], g) is not None for g in gates])
    cov = np.array([r["coverage"] for r in R])
    out(f"projection: median off-corridor fix frac {med_off:.1%}, on-route p95 cross-track {np.percentile(on,95):.1f} m, p50 {np.percentile(on,50):.1f} m")
    out(f"coverage: {np.sum(cov>0.95)}/{len(R)} rides cross >95% of trial gates; median coverage {np.median(cov):.0%}; rides <80%: {[r['name'][:13] for r in R if r['coverage']<0.8]}")
    raws = np.array([r["raw"] for r in R]); movs = np.array([r["mov"] for r in R])
    out(f"raw    time: median {np.median(raws)/60:.2f} min, MADsig {mad_sigma(raws):.1f} s, IQR {np.percentile(raws,75)-np.percentile(raws,25):.1f} s")
    out(f"moving time: median {np.median(movs)/60:.2f} min, MADsig {mad_sigma(movs):.1f} s, IQR {np.percentile(movs,75)-np.percentile(movs,25):.1f} s")
    out(f"stopped time: median {np.median(raws-movs):.1f} s, p90 {np.percentile(raws-movs,90):.1f} s, rides with >10s stopped: {np.mean((raws-movs)>10):.0%}")
    # speed profile vs chainage, 25 m bins
    nb = int(Lref // 25)
    prof_med = np.full(nb, np.nan); prof_stopfrac = np.zeros(nb)
    binned = [[] for _ in range(nb)]; stopcnt = np.zeros(nb); ridecnt = np.zeros(nb)
    for r in R:
        b = np.clip((r["s"] // 25).astype(int), 0, nb - 1)
        seen = np.zeros(nb, bool); sstop = np.zeros(nb, bool)
        for i in range(len(b)):
            if r["xtd"][i] <= CORRIDOR:
                binned[b[i]].append(r["v"][i]); seen[b[i]] = True
                if r["stopped"][i]: sstop[b[i]] = True
        ridecnt += seen; stopcnt += sstop
    for i in range(nb):
        if binned[i]: prof_med[i] = np.median(binned[i])
    prof_stopfrac = stopcnt / np.maximum(ridecnt, 1)
    with open(os.path.join(AN, f"speed_profile_{track}.csv"), "w") as f:
        f.write("chainage_m,median_speed_ms,stop_frac,n_rides\n")
        for i in range(nb):
            f.write(f"{i*25+12},{prof_med[i]:.2f},{prof_stopfrac[i]:.3f},{int(ridecnt[i])}\n")
    return dict(track=track, R=R, rx=rx, ry=ry, ch=ch, Lref=Lref, lat0=lat0, lon0=lon0,
                prof_med=prof_med, prof_stopfrac=prof_stopfrac, raws=raws, movs=movs)

def sector_time(r, gA, gB):
    ta = cross_time(r["t"], r["s"], gA); tb = cross_time(r["t"], r["s"], gB)
    if ta is None or tb is None or tb <= ta: return None, None
    raw = tb - ta
    st = stopped_time_between(r["t"], r["stopped"], ta, tb)
    return raw - st, st

def noise_floor(T, out, wr):
    Lref = T["Lref"]
    lengths = [100, 200, 300, 400, 500, 700, 900, 1200, 1500]
    out(f"--- noise floor {T['track']} (trial gates every 100 m, chainage 300..{Lref-300:.0f}) ---")
    out("len_m  med_t_s  sig_all  sig_clean  n_pos  sig/T_clean")
    for L in lengths:
        sig_all, sig_cl, meds, rat = [], [], [], []
        for p in np.arange(300, Lref - 300 - L, 100):
            times, clean = [], []
            for r in T["R"]:
                mt, st = sector_time(r, p, p + L)
                if mt is None: continue
                times.append(mt)
                if st < 1.0: clean.append(mt)
            if len(times) < 10 or len(clean) < 8: continue
            sig_all.append(mad_sigma(times)); sig_cl.append(mad_sigma(clean))
            meds.append(np.median(clean)); rat.append(mad_sigma(clean) / np.median(clean))
        if not meds: continue
        row = (L, np.median(meds), np.median(sig_all), np.median(sig_cl), len(meds),
               np.median(rat))
        out("%5d  %7.1f  %7.2f  %9.2f  %5d  %10.3f" % row)
        wr.writerow([T["track"], L, f"{np.median(meds):.1f}", f"{np.median(sig_all):.2f}",
                     f"{np.median(sig_cl):.2f}", f"{np.percentile(sig_cl,75):.2f}", len(meds),
                     f"{np.median(rat):.4f}"])

def ebike_check(datasets, out):
    out("\n--- e-bike cutoff check (pooled moving fixes, all tracks) ---")
    v = np.concatenate([r["v"][~r["stopped"]] for T in datasets for r in T["R"]])
    v = v[v > 1.0] * 3.6
    hist, edges = np.histogram(v, bins=np.arange(0, 40, 1))
    for lo, n in zip(edges[:-1], hist):
        out(f"{lo:2.0f}-{lo+1:2.0f} km/h: {n/len(v):6.1%} " + "#" * int(200 * n / len(v)))
    out(f"frac of moving time 22-26 km/h: {np.mean((v>=22)&(v<26)):.1%}; >27 km/h: {np.mean(v>27):.1%}")
    out(f"median {np.median(v):.1f} km/h, p75 {np.percentile(v,75):.1f}, p90 {np.percentile(v,90):.1f}, p99 {np.percentile(v,99):.1f}")

def main():
    lines = []
    def out(s): print(s); lines.append(s)
    datasets = []
    fsig = open(os.path.join(AN, "sigma_vs_length.csv"), "w", newline="")
    wr = csv.writer(fsig); wr.writerow(["track","len_m","med_moving_t_s","sig_all_s","sig_clean_s","sig_clean_p75_s","n_pos","sig_over_T"])
    for track in TRACKS:
        T = analyse(track, out)
        datasets.append(T)
        noise_floor(T, out, wr)
    fsig.close()
    ebike_check(datasets, out)
    with open(os.path.join(AN, "02_output.txt"), "w") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    main()
