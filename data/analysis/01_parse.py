#!/usr/bin/env python3
"""Qualifire B-19 step 1: parse GPX for the 3 tracks -> cached npz.
Regex parsing (1 Hz trkpt with lat/lon/ele/time). Race Engineer, cycle 003."""
import re, csv, os, numpy as np
from datetime import datetime, timezone

DATA = "/sessions/tender-clever-ride/mnt/Qualifire/data"
OUT  = os.path.join(DATA, "analysis", "cache")

TRACKS = {"Morning": ("home2work", "main"), "EveningA": ("work2home", "A"), "EveningB": ("work2home", "B")}

pt_re = re.compile(
    r'<trkpt lat="([-\d.]+)" lon="([-\d.]+)">.*?<ele>([-\d.]+)</ele>.*?<time>([^<]+)</time>',
    re.S)

def parse_gpx(path):
    with open(path) as f:
        txt = f.read()
    lats, lons, eles, ts = [], [], [], []
    for m in pt_re.finditer(txt):
        lats.append(float(m.group(1))); lons.append(float(m.group(2)))
        eles.append(float(m.group(3)))
        t = m.group(4).replace("Z", "+00:00")
        ts.append(datetime.fromisoformat(t).timestamp())
    return np.array(ts), np.array(lats), np.array(lons), np.array(eles)

def main():
    index = {}
    with open(os.path.join(DATA, "activity-index.csv"), newline="") as f:
        for row in csv.DictReader(f):
            index.setdefault((row["route"], row["variant"].strip()), []).append(row["filename"])
    for track, key in TRACKS.items():
        files = sorted(index.get(key, []))
        print(f"{track}: {len(files)} rides")
        for fn in files:
            t, la, lo, el = parse_gpx(os.path.join(DATA, "activities", fn))
            np.savez_compressed(os.path.join(OUT, fn.replace(".gpx", ".npz")),
                                t=t, lat=la, lon=lo, ele=el, track=track)
    print("done")

if __name__ == "__main__":
    main()
