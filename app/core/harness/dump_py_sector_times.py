#!/usr/bin/env python3
"""Parity reference dump: per-ride gate-crossing + sector times from the
validated Python pipeline (data/analysis/02_analysis.py functions + the
approved gates in data/analysis/gates_proposal.csv).

Usage:  python3 dump_py_sector_times.py [analysis-dir] [out-csv]
Defaults: analysis-dir = ../../../data/analysis relative to this file,
          out-csv = /tmp/parity/py_sector_times.csv
Requires: numpy, and the GPX cache built by 01_parse.py (analysis/cache/*.npz).
Read-only on data/ (calls the module's pure functions, never analyse()).
Mobile Developer, cycle 004."""
import importlib.util, os, sys, csv, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AN = sys.argv[1] if len(sys.argv) > 1 else os.path.normpath(os.path.join(HERE, "..", "..", "..", "data", "analysis"))
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/parity/py_sector_times.csv"

spec = importlib.util.spec_from_file_location("an", os.path.join(AN, "02_analysis.py"))
an = importlib.util.module_from_spec(spec); spec.loader.exec_module(an)

def gates_for(track):
    with open(os.path.join(AN, "gates_proposal.csv")) as f:
        return [float(r["chainage_m"]) for r in csv.DictReader(f) if r["track"] == track]

rows = []
for track in an.TRACKS:
    rides = an.load_track(track)
    lat0 = np.mean([r["lat"].mean() for r in rides]); lon0 = np.mean([r["lon"].mean() for r in rides])
    mi = an.medoid(rides, lat0, lon0)
    rx, ry, ch = an.build_ref(rides[mi], lat0, lon0)
    print(f"{track}: {len(rides)} rides, ref={rides[mi]['name']} Lref={ch[-1]:.3f}")
    gates = gates_for(track)
    for r in rides:
        x, y = an.to_xy(r["lat"], r["lon"], lat0, lon0)
        s, xtd = an.project_ride(x, y, rx, ry, ch)
        v, stopped = an.kinematics(r["t"], x, y)
        cross = [an.cross_time(r["t"], s, g) for g in gates]
        for k in range(len(gates) - 1):
            ta, tb = cross[k], cross[k + 1]
            if ta is None or tb is None or tb <= ta:
                rows.append([track, r["name"], k + 1, "", "", "", "", "", "excluded_nocross"]); continue
            m = (r["t"] >= ta) & (r["t"] <= tb)
            if (xtd[m] > an.CORRIDOR).any():
                rows.append([track, r["name"], k + 1, f"{ta:.6f}", f"{tb:.6f}", "", "", "", "excluded_offroute"]); continue
            st = an.stopped_time_between(r["t"], stopped, ta, tb)
            raw = tb - ta
            rows.append([track, r["name"], k + 1, f"{ta:.6f}", f"{tb:.6f}",
                         f"{raw:.6f}", f"{st:.6f}", f"{raw-st:.6f}",
                         "interrupted" if st >= 1.0 else "clean"])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", newline="") as f:
    w = csv.writer(f); w.writerow(["track","ride","sector","t_a","t_b","raw_s","stopped_s","moving_s","flag"])
    w.writerows(rows)
print(f"wrote {len(rows)} rows -> {OUT}")
