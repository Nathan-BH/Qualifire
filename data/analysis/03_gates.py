#!/usr/bin/env python3
"""Qualifire B-02 first pass: gate placement from speed profile (D-011 constraint:
no gates at junctions/stop lines -> require high median speed + low stop fraction),
per-sector stats, and live-detection simulation (monotonic latch, forward-only).
Race Engineer, cycle 003."""
import importlib.util, os, csv, numpy as np

AN = "/sessions/tender-clever-ride/mnt/Qualifire/data/analysis"
spec = importlib.util.spec_from_file_location("an", os.path.join(AN, "02_analysis.py"))
an = importlib.util.module_from_spec(spec); spec.loader.exec_module(an)

N_SECTORS = 4          # justified in RESULTS.md from noise result
SNAP = 250.0           # snap window +/- m around equal-spacing target
MIN_V, MAX_STOPF = 4.0, 0.08

def profile(track):
    ch, v, sf, n = [], [], [], []
    with open(os.path.join(AN, f"speed_profile_{track}.csv")) as f:
        for row in csv.DictReader(f):
            ch.append(float(row["chainage_m"])); v.append(float(row["median_speed_ms"]))
            sf.append(float(row["stop_frac"])); n.append(int(row["n_rides"]))
    return map(np.array, (ch, v, sf, n))

def place_gates(T):
    ch, v, sf, n = profile(T["track"])
    nr = max(n)
    ok = (v > MIN_V) & (sf <= MAX_STOPF) & (n >= 0.9 * nr)
    # start/finish: first/last chainage >=150m in from ends where 3 consecutive bins are ok
    ok3 = ok & np.roll(ok, 1) & np.roll(ok, -1)
    inner = (ch > 150) & (ch < T["Lref"] - 150)
    cands = ch[ok3 & inner]
    g_start, g_end = cands[0], cands[-1]
    targets = np.linspace(g_start, g_end, N_SECTORS + 1)[1:-1]
    score = v * (1 - 2 * sf)
    gates = [g_start]
    for tg in targets:
        w = ok3 & (np.abs(ch - tg) <= SNAP)
        if not w.any(): w = ok & (np.abs(ch - tg) <= SNAP)
        gates.append(ch[w][int(np.argmax(score[w]))])
    gates.append(g_end)
    return np.array(gates), (ch, v, sf)

def latlon_at(T, g):
    x = np.interp(g, T["ch"], T["rx"]); y = np.interp(g, T["ch"], T["ry"])
    return T["lat0"] + y / 110540.0, T["lon0"] + x / (111320.0 * np.cos(np.radians(T["lat0"])))

def sector_stats(T, gates, out):
    out(f"sector  span_m  len_m  med_mov_s  sig_all  sig_clean  n  interrupted%  offroute-excl")
    for k in range(len(gates) - 1):
        gA, gB = gates[k], gates[k + 1]
        times, clean, nint, nexcl = [], [], 0, 0
        for r in T["R"]:
            ta = an.cross_time(r["t"], r["s"], gA); tb = an.cross_time(r["t"], r["s"], gB)
            if ta is None or tb is None or tb <= ta: nexcl += 1; continue
            m = (r["t"] >= ta) & (r["t"] <= tb)
            if (r["xtd"][m] > an.CORRIDOR).any(): nexcl += 1; continue  # detoured in sector
            st = an.stopped_time_between(r["t"], r["stopped"], ta, tb)
            mt = (tb - ta) - st
            times.append(mt)
            if st < 1.0: clean.append(mt)
            else: nint += 1
        out(f"S{k+1}   {gA:5.0f}-{gB:5.0f}  {gB-gA:5.0f}  {np.median(clean):8.1f}  {an.mad_sigma(times):7.2f}  {an.mad_sigma(clean):8.2f}  {len(times):3d}  {100*nint/max(len(times),1):5.1f}%  {nexcl}")

def detection_sim(T, gates, out):
    """Live D-011: forward-only windowed projection, monotonic latch, gates fire in order."""
    miss_clean, miss_detour, total_gates = 0, 0, 0
    multi_raw = 0
    bad = []
    for r in T["R"]:
        s_live, _ = an.project_ride(r["x"], r["y"], T["rx"], T["ry"], T["ch"], live=True)
        fired = 0
        for g in gates:
            # monotonic latch: s_live is forward-only; first crossing fires, cannot re-fire
            if an.cross_time(r["t"], s_live, g) is not None: fired += 1
            # raw (unlatched, offline s) upward crossings — what the latch prevents
            sr = r["s"]; up = np.sum((sr[:-1] < g) & (sr[1:] >= g))
            if up > 1: multi_raw += 1
        total_gates += len(gates)
        if fired < len(gates):
            detour = (r["xtd"] > an.CORRIDOR).mean() > 0.01
            if detour: miss_detour += len(gates) - fired
            else: miss_clean += len(gates) - fired; bad.append(r["name"][:13])
    out(f"live sim: {total_gates} gate-passages; missed on CLEAN rides: {miss_clean} ({100*miss_clean/total_gates:.1f}%)"
        f"; missed on detour rides: {miss_detour}; raw multi-crossings latch suppressed: {multi_raw}")
    if bad: out(f"  clean rides with misses: {bad}")

def main():
    lines = []
    def out(s): print(s); lines.append(s)
    gw = open(os.path.join(AN, "gates_proposal.csv"), "w", newline="")
    w = csv.writer(gw); w.writerow(["track","gate","chainage_m","lat","lon","median_speed_kmh","stop_frac"])
    for track in an.TRACKS:
        T = an.analyse(track, lambda s: None)
        gates, (ch, v, sf) = place_gates(T)
        out(f"\n=== {track} === ref length {T['Lref']:.0f} m, {N_SECTORS} sectors")
        for k, g in enumerate(gates):
            lat, lon = latlon_at(T, g)
            i = int(np.argmin(np.abs(ch - g)))
            name = "START" if k == 0 else ("FINISH" if k == len(gates) - 1 else f"G{k}")
            out(f"{name:6s} chainage {g:5.0f} m  ({lat:.5f}, {lon:.5f})  v_med {v[i]*3.6:4.1f} km/h  stop_frac {sf[i]:.2f}")
            w.writerow([track, name, f"{g:.0f}", f"{lat:.5f}", f"{lon:.5f}", f"{v[i]*3.6:.1f}", f"{sf[i]:.3f}"])
        sector_stats(T, gates, out)
        detection_sim(T, gates, out)
    gw.close()
    with open(os.path.join(AN, "03_output.txt"), "w") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    main()
