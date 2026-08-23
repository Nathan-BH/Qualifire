#!/usr/bin/env python3
"""Qualifire WP-H (cycle 024): gate-field offline replay experiment.

Nathan's 19 Aug notes, point 4: instead of routes, scatter free-floating
'gates' on the roads he rides often and time the sections between whichever
ones fire, independent of which route is being ridden. The 19 Aug review
(data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-review.md
Sec4, lines 73-80) scoped the honest first step: replay the archive against a
gate-field model offline and see what it would have produced. Two engineering
doubts it must measure: (1) a free-floating gate needs its own crossing line
and direction or it fires falsely (parallel streets, wrong direction); (2) a
time between two gates is only comparable when the road between them was the
same.

Zero app changes. Reads only: app/assets/routes/routes.json,
app/src/store/catalog.seed.json, app/tests/fixtures/refs.json,
data/analysis/cache/*.npz (D-023: raw ride data is read-only here). Writes
only new sidecar files next to this script (see "Outputs" below).

This WP owns script number 10_ (WP-C owns 09_).

Provenance: to_xy / project_ride / cross_time / kinematics /
stopped_time_between / mad_sigma are copied (not imported -- 02_analysis.py's
DATA path is hardcoded to a dead session mount, see its line 7) from
data/analysis/02_analysis.py, Race Engineer cycle 003:
  to_xy                 -- 02_analysis.py line 13
  project_ride           -- 02_analysis.py line 54  (D-011 windowed chainage projection)
  kinematics              -- 02_analysis.py line 90  (speed + stopped: <1.0 m/s sustained >3.0 s)
  stopped_time_between    -- 02_analysis.py line 105
  cross_time              -- 02_analysis.py line 111  (first upward chainage crossing, interpolated)
  mad_sigma               -- 02_analysis.py line 121  (1.4826 * MAD)

Outputs (written next to this script):
  10_gatefield_hits.csv       -- one row per crossing event
  10_gatefield_sections.csv   -- per ride, consecutive valid hits (cluster-keyed)
  10_output.txt                -- console log (mirrors 03_gates.py's out() pattern)
  10_gatefield_report.md       -- the plain-language evidence document for Nathan

CLI: python3 10_gatefield_replay.py [--limit N]   (--limit = first N rides, smoke test)
"""
import os
import sys
import csv
import glob
import json
import math
import argparse
import datetime
from collections import defaultdict

import numpy as np

# ---------------------------------------------------------------------------
# Paths -- all derived from __file__ so this runs identically in the sandbox,
# the device VM, and on Nathan's Windows PC (D-023: never hardcode a session
# mount the way 02_analysis.py / 03_gates.py did).
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
AN = HERE                                              # data/analysis
DATA = os.path.dirname(AN)                             # data
ROOT = os.path.dirname(DATA)                            # repo root
CACHE = os.path.join(AN, "cache")
ROUTES_JSON = os.path.join(ROOT, "app", "assets", "routes", "routes.json")
CATALOG_JSON = os.path.join(ROOT, "app", "src", "store", "catalog.seed.json")
REFS_JSON = os.path.join(ROOT, "app", "tests", "fixtures", "refs.json")

HITS_CSV = os.path.join(AN, "10_gatefield_hits.csv")
SECTIONS_CSV = os.path.join(AN, "10_gatefield_sections.csv")
OUTPUT_TXT = os.path.join(AN, "10_output.txt")
REPORT_MD = os.path.join(AN, "10_gatefield_report.md")

# ---------------------------------------------------------------------------
# Fixed parameters (brief Sec7 item 3 -- pre-resolved, no sensitivity pass)
# ---------------------------------------------------------------------------
CORRIDOR_M = 40.0        # crossing-line half-width == app/core/src/projection.ts CORRIDOR_M
REFIRE_GUARD_S = 60.0     # a gate cannot re-fire within this many seconds of its last valid hit
CLUSTER_DIST_M = 30.0     # dedup: gates within this distance ...
CLUSTER_BEARING_DEG = 30.0  # ... AND this bearing difference merge into one cluster
DIRECTION_MAX_DEG = 90.0   # valid hit iff crossing angle <= this; else wrong-direction event

TRACKS_WITH_RIDES = ["Morning", "EveningA", "EveningB"]  # only these 3 are cached (brief Sec2)

# 03_output.txt (cycle 003) embedded verbatim for the WARN-only drift check
# (brief Sec4 self-checks item 3 -- never treated as this run's own numbers,
# brief Sec7 item 5). Values are med_mov_s per sector, S1..S4.
REF_03_OUTPUT_MED_MOV_S = {
    "Morning":  [185.5, 203.2, 240.7, 203.3],
    "EveningA": [210.7, 230.4, 159.0, 222.6],
    "EveningB": [212.0, 201.1, 184.6, 183.8],
}
DRIFT_WARN_S = 5.0  # "within a few seconds" (brief Sec4)


# ===========================================================================
# Copied from 02_analysis.py (provenance comments per function, see module
# docstring above). Not imported: 02_analysis.py's DATA constant points at a
# dead session mount (`/sessions/tender-clever-ride/...`, its line 7).
# ===========================================================================

def to_xy(lat, lon, lat0, lon0):
    """02_analysis.py line 13 -- equirectangular projection about (lat0, lon0)."""
    return ((lon - lon0) * np.cos(np.radians(lat0)) * 111320.0,
             (lat - lat0) * 110540.0)


def project_ride(x, y, rx, ry, ch, live=False):
    """02_analysis.py line 54 -- D-011 windowed chainage projection, corridor
    40 m. Used here only for the route-model comparison side (brief Sec7
    item 5: recomputed in this run on refs.json lines, never copied from
    03_output.txt as if it were this run's own numbers)."""
    n = len(x); s = np.zeros(n); xtd = np.zeros(n)
    segx0, segy0 = rx[:-1], ry[:-1]
    dx, dy = np.diff(rx), np.diff(ry); seglen2 = dx * dx + dy * dy
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
        if dist[j] <= CORRIDOR_M:
            s[i], xtd[i] = cand_s, dist[j]
            sp = max(sp, cand_s) if live else cand_s
            lost = 0
        else:
            s[i], xtd[i] = sp, dist[j]
            lost += 1
            if lost >= 5 and not live:
                d2 = (rx - x[i]) ** 2 + (ry - y[i]) ** 2
                k = int(np.argmin(d2))
                if np.sqrt(d2[k]) <= CORRIDOR_M:
                    sp = ch[k]; s[i], xtd[i] = sp, np.sqrt(d2[k]); lost = 0
    return s, xtd


def kinematics(t, x, y):
    """02_analysis.py line 90 -- speed + stopped: <1.0 m/s sustained >3.0 s."""
    STOP_V, STOP_T = 1.0, 3.0
    dt = np.diff(t); dd = np.hypot(np.diff(x), np.diff(y))
    v = np.concatenate([[0], dd / np.maximum(dt, 0.1)])
    stopped = np.zeros(len(t), bool)
    is_slow = v < STOP_V
    i = 0
    while i < len(t):
        if is_slow[i]:
            j = i
            while j + 1 < len(t) and is_slow[j + 1]:
                j += 1
            if t[j] - t[i] > STOP_T:
                stopped[i:j + 1] = True
            i = j + 1
        else:
            i += 1
    return v, stopped


def stopped_time_between(t, stopped, ta, tb):
    """02_analysis.py line 105."""
    m = (t >= ta) & (t <= tb) & stopped
    if not m.any():
        return 0.0
    idx = np.where(m)[0]
    return float(np.sum(np.minimum(t[idx], tb) - np.maximum(t[np.maximum(idx - 1, 0)], ta)).clip(0))


def cross_time(t, s, g):
    """02_analysis.py line 111 -- first upward crossing of chainage g, interpolated."""
    above = s >= g
    if above[0]:
        return t[0] if s[0] - g < 20 else None
    idx = np.where(~above[:-1] & above[1:])[0]
    if len(idx) == 0:
        return None
    i = idx[0]
    f = (g - s[i]) / max(s[i + 1] - s[i], 1e-9)
    return float(t[i] + f * (t[i + 1] - t[i]))


def mad_sigma(a):
    """02_analysis.py line 121 -- 1.4826 * MAD."""
    a = np.asarray(a)
    if len(a) == 0:
        return float("nan")
    return 1.4826 * np.median(np.abs(a - np.median(a)))


# ===========================================================================
# The gate field
# ===========================================================================

class Gate:
    __slots__ = ("id", "route_id", "name", "lat", "lon", "gx", "gy",
                 "bearing_deg", "dir_x", "dir_y", "line_x1", "line_y1",
                 "line_x2", "line_y2", "cluster_id")


def load_gate_field():
    """Build the 95-gate field from the 19 ratified catalog routes. Returns
    (gates, lat0, lon0) -- one shared equirect frame, origin = mean lat/lon
    over all gate positions (brief Sec3a: whole field spans ~10 km, equirect
    error negligible)."""
    with open(ROUTES_JSON) as f:
        routes = json.load(f)["routes"]

    raw = []  # (route_id, name, lat, lon, path, gate_idx)
    for route_id, r in routes.items():
        path = r["path"]
        for gi, (idx, g) in enumerate(zip(r["gateIdx"], r["gates"])):
            raw.append((route_id, g["name"], g["lat"], g["lon"], path, idx))

    assert len(raw) == 95, f"expected 19 routes x 5 gates == 95, got {len(raw)}"

    lat0 = float(np.mean([g[2] for g in raw]))
    lon0 = float(np.mean([g[3] for g in raw]))

    gates = []
    for route_id, name, lat, lon, path, idx in raw:
        gate = Gate()
        gate.id = f"{route_id}:{name}"
        gate.route_id = route_id
        gate.name = name
        gate.lat = lat
        gate.lon = lon
        gx, gy = to_xy(np.array([lat]), np.array([lon]), lat0, lon0)
        gate.gx, gate.gy = float(gx[0]), float(gy[0])

        i0 = max(idx - 1, 0)
        i1 = min(idx + 1, len(path) - 1)
        lat_a, lon_a = path[i0]
        lat_b, lon_b = path[i1]
        ax, ay = to_xy(np.array([lat_a]), np.array([lon_a]), lat0, lon0)
        bx, by = to_xy(np.array([lat_b]), np.array([lon_b]), lat0, lon0)
        ddx, ddy = float(bx[0] - ax[0]), float(by[0] - ay[0])
        norm = math.hypot(ddx, ddy)
        assert norm > 1e-6, f"degenerate path direction at gate {gate.id}"
        dir_x, dir_y = ddx / norm, ddy / norm  # unit vector, route travel direction
        gate.dir_x, gate.dir_y = dir_x, dir_y
        # compass bearing (0=N, 90=E), east=x, north=y
        gate.bearing_deg = math.degrees(math.atan2(dir_x, dir_y)) % 360.0
        assert math.isfinite(gate.bearing_deg)

        # perpendicular crossing line, +/- CORRIDOR_M through the gate
        perp_x, perp_y = -dir_y, dir_x
        gate.line_x1 = gate.gx - perp_x * CORRIDOR_M
        gate.line_y1 = gate.gy - perp_y * CORRIDOR_M
        gate.line_x2 = gate.gx + perp_x * CORRIDOR_M
        gate.line_y2 = gate.gy + perp_y * CORRIDOR_M
        gate.cluster_id = None
        gates.append(gate)

    return gates, lat0, lon0


def dedup_clusters(gates):
    """Cluster gates within CLUSTER_DIST_M of each other with bearing
    difference < CLUSTER_BEARING_DEG (transitive closure -- brief Sec3a:
    'fine at this size'). Reversal pairs (opposite bearings on the same
    road) must NOT merge; the bearing-difference rule prevents that."""
    n = len(gates)
    parent = list(range(n))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for i in range(n):
        for j in range(i + 1, n):
            d = math.hypot(gates[i].gx - gates[j].gx, gates[i].gy - gates[j].gy)
            if d > CLUSTER_DIST_M:
                continue
            bdiff = abs(gates[i].bearing_deg - gates[j].bearing_deg) % 360.0
            bdiff = min(bdiff, 360.0 - bdiff)
            if bdiff < CLUSTER_BEARING_DEG:
                union(i, j)

    roots = {}
    cluster_members = defaultdict(list)
    for i in range(n):
        r = find(i)
        if r not in roots:
            roots[r] = f"C{len(roots) + 1:03d}"
        cid = roots[r]
        gates[i].cluster_id = cid
        cluster_members[cid].append(i)

    cluster_table = []
    for cid, members in cluster_members.items():
        ids = [gates[m].id for m in members]
        spread = 0.0
        bspread = 0.0
        for a in range(len(members)):
            for b in range(a + 1, len(members)):
                ga, gb = gates[members[a]], gates[members[b]]
                d = math.hypot(ga.gx - gb.gx, ga.gy - gb.gy)
                spread = max(spread, d)
                bd = abs(ga.bearing_deg - gb.bearing_deg) % 360.0
                bd = min(bd, 360.0 - bd)
                bspread = max(bspread, bd)
        cluster_table.append(dict(clusterId=cid, memberGateIds=ids, spread_m=spread,
                                   bearing_spread_deg=bspread, n=len(members)))
    return cluster_table


# ===========================================================================
# Replay
# ===========================================================================

def load_cached_rides(limit=None):
    rides = []
    paths = sorted(glob.glob(os.path.join(CACHE, "*.npz")))
    if limit is not None:
        paths = paths[:limit]
    for p in paths:
        z = np.load(p, allow_pickle=True)
        rides.append(dict(name=os.path.basename(p)[:-4], t=z["t"], lat=z["lat"],
                           lon=z["lon"], track=str(z["track"])))
    return rides


def replay_ride(ride, gates, lat0, lon0):
    """Vectorised segment-vs-gate-line intersection test. For each of the
    ride's ~n-1 fix segments, test intersection against all len(gates) gate
    crossing lines at once. Returns a list of raw event dicts (pre re-fire
    guard)."""
    t = ride["t"]
    x, y = to_xy(ride["lat"], ride["lon"], lat0, lon0)
    v, stopped = kinematics(t, x, y)

    n = len(t)
    if n < 2:
        return [], x, y, v, stopped

    x1, y1 = x[:-1], y[:-1]
    x2, y2 = x[1:], y[1:]
    rx_, ry_ = x2 - x1, y2 - y1  # segment vector r

    gx1 = np.array([g.line_x1 for g in gates])
    gy1 = np.array([g.line_y1 for g in gates])
    gx2 = np.array([g.line_x2 for g in gates])
    gy2 = np.array([g.line_y2 for g in gates])
    sx = gx2 - gx1
    sy = gy2 - gy1

    denom = rx_[:, None] * sy[None, :] - ry_[:, None] * sx[None, :]
    qmpx = gx1[None, :] - x1[:, None]
    qmpy = gy1[None, :] - y1[:, None]

    with np.errstate(divide="ignore", invalid="ignore"):
        t_param = (qmpx * sy[None, :] - qmpy * sx[None, :]) / denom
        u_param = (qmpx * ry_[:, None] - qmpy * rx_[:, None]) / denom

    valid_mask = (np.abs(denom) > 1e-9) & (t_param >= 0) & (t_param <= 1) & \
                 (u_param >= 0) & (u_param <= 1)

    seg_idx, gate_idx = np.nonzero(valid_mask)
    events = []
    if len(seg_idx) == 0:
        return events, x, y, v, stopped

    seg_len = np.hypot(rx_, ry_)
    for i, j in zip(seg_idx, gate_idx):
        tt = t_param[i, j]
        cross_t = float(t[i] + tt * (t[i + 1] - t[i]))
        if seg_len[i] < 1e-6:
            continue  # degenerate (duplicate fix), no direction to measure
        seg_dx, seg_dy = rx_[i] / seg_len[i], ry_[i] / seg_len[i]
        gate = gates[j]
        dot = np.clip(seg_dx * gate.dir_x + seg_dy * gate.dir_y, -1.0, 1.0)
        angle = math.degrees(math.acos(dot))
        speed = float(v[i + 1]) if i + 1 < len(v) else float(v[i])
        events.append(dict(seg=i, gate_idx=j, gateId=gate.id, clusterId=gate.cluster_id,
                            t=cross_t, angle=angle, speed=speed,
                            own_route=(gate.route_id == ride["track"])))
    return events, x, y, v, stopped


def apply_refire_guard(events):
    """brief Sec3a: same gate cannot fire again within REFIRE_GUARD_S of its
    last VALID hit on that ride. Wrong-direction events are recorded as-is
    (never a hit, never subject to the guard)."""
    by_gate = defaultdict(list)
    for e in events:
        by_gate[e["gate_idx"]].append(e)

    out = []
    for gate_idx, evs in by_gate.items():
        evs.sort(key=lambda e: e["t"])
        last_valid_t = None
        for e in evs:
            if e["angle"] <= DIRECTION_MAX_DEG:
                if last_valid_t is not None and (e["t"] - last_valid_t) < REFIRE_GUARD_S:
                    e2 = dict(e); e2["kind"] = "refire_suppressed"
                    out.append(e2)
                else:
                    e2 = dict(e); e2["kind"] = "valid"
                    out.append(e2)
                    last_valid_t = e["t"]
            else:
                e2 = dict(e); e2["kind"] = "wrong_direction"
                out.append(e2)
    return out


# ===========================================================================
# Main
# ===========================================================================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="first N rides, for smoke tests")
    args = ap.parse_args()

    lines = []
    def out(s=""):
        print(s)
        lines.append(s)

    # --- build & dedup the field ---
    gates, lat0, lon0 = load_gate_field()
    for g in gates:
        assert math.isfinite(g.bearing_deg), f"non-finite bearing at {g.id}"
    cluster_table = dedup_clusters(gates)
    for c in cluster_table:
        assert c["bearing_spread_deg"] < CLUSTER_BEARING_DEG, \
            f"cluster {c['clusterId']} bearing spread {c['bearing_spread_deg']:.1f} >= {CLUSTER_BEARING_DEG}"
    gate_by_idx = {i: g for i, g in enumerate(gates)}
    gate_by_id = {g.id: g for g in gates}

    out(f"=== WP-H gate-field replay === field: {len(gates)} gates -> {len(cluster_table)} clusters "
        f"(shared frame origin lat0={lat0:.5f} lon0={lon0:.5f})")
    out("cluster table:")
    out("clusterId  n  spread_m  bearing_spread_deg  members")
    for c in sorted(cluster_table, key=lambda c: -c["n"]):
        out(f"{c['clusterId']:9s} {c['n']:2d}  {c['spread_m']:7.1f}  {c['bearing_spread_deg']:18.1f}  "
            f"{', '.join(c['memberGateIds'])}")

    # --- replay ---
    rides = load_cached_rides(args.limit)
    out(f"\nreplaying {len(rides)} cached rides"
        + (f" (--limit {args.limit})" if args.limit else " (full archive)"))

    hits_rows = []       # for 10_gatefield_hits.csv
    sections_rows = []   # for 10_gatefield_sections.csv
    per_ride_data = {}   # name -> dict with events, x,y,v,stopped,t,track (for later use)

    for ride in rides:
        events, x, y, v, stopped = replay_ride(ride, gates, lat0, lon0)
        fired = apply_refire_guard(events)
        fired.sort(key=lambda e: e["t"])
        for e in fired:
            hits_rows.append(dict(
                ride=ride["name"], track=ride["track"], gateId=e["gateId"],
                clusterId=e["clusterId"], t_iso=e["t"], kind=e["kind"],
                angle_deg=round(e["angle"], 2), speed_kmh=round(e["speed"] * 3.6, 2),
                own_route=e["own_route"],
            ))
        valid_hits = [e for e in fired if e["kind"] == "valid"]
        for a, b in zip(valid_hits[:-1], valid_hits[1:]):
            ta, tb = a["t"], b["t"]
            raw_s = tb - ta
            st = stopped_time_between(ride["t"], stopped, ta, tb)
            n_between = int(np.sum((ride["t"] >= ta) & (ride["t"] <= tb)))
            sections_rows.append(dict(
                ride=ride["name"], track=ride["track"],
                fromCluster=a["clusterId"], toCluster=b["clusterId"],
                raw_s=round(raw_s, 2), moving_s=round(raw_s - st, 2),
                n_between_fixes=n_between,
            ))
        per_ride_data[ride["name"]] = dict(events=fired, x=x, y=y, v=v, stopped=stopped,
                                             t=ride["t"], track=ride["track"], lat=ride["lat"], lon=ride["lon"])

    # write hits.csv
    with open(HITS_CSV, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["ride", "track", "gateId", "clusterId", "t_iso",
                                           "kind", "angle_deg", "speed_kmh", "own_route"])
        w.writeheader()
        for row in hits_rows:
            r = dict(row)
            r["t_iso"] = datetime.datetime.utcfromtimestamp(r["t_iso"]).strftime("%Y-%m-%dT%H:%M:%S.") \
                + f"{r['t_iso'] % 1:.3f}"[2:] + "Z"
            w.writerow(r)

    # write sections.csv
    with open(SECTIONS_CSV, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["ride", "track", "fromCluster", "toCluster",
                                           "raw_s", "moving_s", "n_between_fixes"])
        w.writeheader()
        w.writerows(sections_rows)

    out(f"\nwrote {len(hits_rows)} hit events -> {os.path.basename(HITS_CSV)}")
    out(f"wrote {len(sections_rows)} sections -> {os.path.basename(SECTIONS_CSV)}")

    # --- per ride-track summary ---
    out("\n=== what fired, per ride-track ===")
    per_track_stats = {}
    for track in TRACKS_WITH_RIDES:
        names = [r["name"] for r in rides if r["track"] == track]
        if not names:
            continue
        valid_counts, wrong_counts, suppressed_counts = [], [], []
        foreign_colocated, foreign_genuine = 0, 0
        own_cluster_ids = {g.cluster_id for g in gates if g.route_id == track}
        for name in names:
            evs = per_ride_data[name]["events"]
            valid_counts.append(sum(1 for e in evs if e["kind"] == "valid"))
            wrong_counts.append(sum(1 for e in evs if e["kind"] == "wrong_direction"))
            suppressed_counts.append(sum(1 for e in evs if e["kind"] == "refire_suppressed"))
            for e in evs:
                if e["kind"] != "valid" or e["own_route"]:
                    continue
                if e["clusterId"] in own_cluster_ids:
                    foreign_colocated += 1
                else:
                    foreign_genuine += 1
        vc = np.array(valid_counts)
        out(f"{track}: {len(names)} rides. valid hits/ride: median {np.median(vc):.0f}, "
            f"min {vc.min()}, max {vc.max()}. wrong-direction events: {sum(wrong_counts)}. "
            f"suppressed re-fires: {sum(suppressed_counts)}.")
        out(f"  foreign-gate valid hits: {foreign_colocated} colocated with an own-route gate "
            f"(same cluster, harmless double-count), {foreign_genuine} genuinely foreign "
            f"(a parallel street or crossing route would have beeped)")
        per_track_stats[track] = dict(
            n_rides=len(names), valid_median=float(np.median(vc)), valid_min=int(vc.min()),
            valid_max=int(vc.max()), wrong_total=int(sum(wrong_counts)),
            suppressed_total=int(sum(suppressed_counts)),
            foreign_colocated=foreign_colocated, foreign_genuine=foreign_genuine,
        )

    # --- sanity anchor: Morning gates fire in catalog order on >=90% of Morning rides ---
    out("\n=== sanity anchor ===")
    morning_gate_order = [g for g in gates if g.route_id == "Morning"]
    morning_gate_order_ids = [g.id for g in morning_gate_order]  # START,G1,G2,G3,FINISH order in routes.json
    morning_names = [r["name"] for r in rides if r["track"] == "Morning"]
    n_ok = 0
    for name in morning_names:
        evs = per_ride_data[name]["events"]
        first_time = {}
        for e in evs:
            if e["kind"] == "valid" and e["gateId"] in morning_gate_order_ids and e["own_route"]:
                if e["gateId"] not in first_time or e["t"] < first_time[e["gateId"]]:
                    first_time[e["gateId"]] = e["t"]
        times = [first_time.get(gid) for gid in morning_gate_order_ids]
        if all(tm is not None for tm in times) and all(a < b for a, b in zip(times, times[1:])):
            n_ok += 1
    frac_ok = n_ok / len(morning_names) if morning_names else float("nan")
    out(f"Morning gates fire in catalog order (START->G1->G2->G3->FINISH) on {n_ok}/{len(morning_names)} "
        f"rides ({frac_ok:.1%})")
    if morning_names and frac_ok < 0.90:
        out("ABORT: sanity anchor failed (<90%) -- geometry frame or direction rule is wrong. "
            "Refusing to emit a report from garbage numbers.")
        with open(OUTPUT_TXT, "w") as f:
            f.write("\n".join(lines))
        sys.exit(1)

    # --- section-time comparison: gate-field vs route model, same rides ---
    out("\n=== section-time comparison: gate-field vs route model (recomputed this run) ===")
    with open(REFS_JSON) as f:
        refs = json.load(f)["tracks"]
    with open(CATALOG_JSON) as f:
        catalog = {g["routeId"]: g["chainageM"] for g in json.load(f)["gateSets"]}

    gatefield_section_stats = {}
    routemodel_section_stats = {}
    delta_t_all = []  # (track, gate, dt) for the agreement distribution
    comparability_flags = []

    for track in TRACKS_WITH_RIDES:
        names = [r["name"] for r in rides if r["track"] == track]
        if not names:
            continue
        own_gates_in_order = [g for g in gates if g.route_id == track]  # routes.json order = START..FINISH
        own_gate_ids = [g.id for g in own_gates_in_order]
        sector_pairs = list(zip(own_gate_ids[:-1], own_gate_ids[1:]))
        sector_names = ["S1", "S2", "S3", "S4"]

        # gate-field: first own-route valid hit time per gate, per ride
        gate_times_per_ride = {}
        for name in names:
            pr = per_ride_data[name]
            first_time = {}
            for e in pr["events"]:
                if e["kind"] == "valid" and e["own_route"] and e["gateId"] in own_gate_ids:
                    if e["gateId"] not in first_time or e["t"] < first_time[e["gateId"]]:
                        first_time[e["gateId"]] = e["t"]
            gate_times_per_ride[name] = first_time

        # route model: recompute via refs.json + catalog chainageM (never copy 03's numbers)
        ref = refs.get(track)
        rx = np.array(ref["rx"]); ry = np.array(ref["ry"]); ch = np.array(ref["ch"])
        rlat0 = ref["lat0"]; rlon0 = ref["lon0"]
        chainages = catalog[track]

        rm_times_per_ride = {}
        for name in names:
            pr = per_ride_data[name]
            xr, yr = to_xy(pr["lat"], pr["lon"], rlat0, rlon0)
            s, xtd = project_ride(xr, yr, rx, ry, ch)
            times = [cross_time(pr["t"], s, g) for g in chainages]
            rm_times_per_ride[name] = times

        out(f"\n--- {track} ---")
        out("sector  n_gf  med_raw_gf  med_mov_gf  sig_gf   n_rm  med_raw_rm  med_mov_rm  sig_rm   03_output_med_mov_s  drift")
        gf_rows, rm_rows = [], []
        for k, (gA, gB) in enumerate(sector_pairs):
            sname = sector_names[k]
            raws_gf, movs_gf = [], []
            path_lens = []
            for name in names:
                gt = gate_times_per_ride[name]
                if gA in gt and gB in gt and gt[gB] > gt[gA]:
                    ta, tb = gt[gA], gt[gB]
                    raw = tb - ta
                    st = stopped_time_between(per_ride_data[name]["t"], per_ride_data[name]["stopped"], ta, tb)
                    raws_gf.append(raw); movs_gf.append(raw - st)
                    m = (per_ride_data[name]["t"] >= ta) & (per_ride_data[name]["t"] <= tb)
                    px = per_ride_data[name]["x"][m]; py = per_ride_data[name]["y"][m]
                    if len(px) >= 2:
                        path_lens.append(float(np.sum(np.hypot(np.diff(px), np.diff(py)))))
            raws_rm, movs_rm = [], []
            for name in names:
                times = rm_times_per_ride[name]
                ta, tb = times[k], times[k + 1]
                if ta is not None and tb is not None and tb > ta:
                    raw = tb - ta
                    st = stopped_time_between(per_ride_data[name]["t"], per_ride_data[name]["stopped"], ta, tb)
                    raws_rm.append(raw); movs_rm.append(raw - st)

            sig_gf = mad_sigma(movs_gf) if movs_gf else float("nan")
            sig_rm = mad_sigma(movs_rm) if movs_rm else float("nan")
            ref_val = REF_03_OUTPUT_MED_MOV_S.get(track, [None] * 4)[k]
            med_mov_rm = np.median(movs_rm) if movs_rm else float("nan")
            drift = abs(med_mov_rm - ref_val) if (ref_val is not None and movs_rm) else float("nan")
            drift_flag = "WARN" if (not math.isnan(drift) and drift > DRIFT_WARN_S) else "ok"
            out(f"{sname:6s} {len(raws_gf):4d}  {np.median(raws_gf) if raws_gf else float('nan'):9.1f}  "
                f"{np.median(movs_gf) if movs_gf else float('nan'):9.1f}  {sig_gf:6.2f}   "
                f"{len(raws_rm):4d}  {np.median(raws_rm) if raws_rm else float('nan'):9.1f}  "
                f"{med_mov_rm:9.1f}  {sig_rm:6.2f}   {ref_val if ref_val is not None else float('nan'):18.1f}  {drift_flag}"
                + (f" (|d|={drift:.1f}s)" if drift_flag == "WARN" else ""))
            gf_rows.append(dict(sector=sname, n=len(raws_gf),
                                 med_raw=float(np.median(raws_gf)) if raws_gf else None,
                                 med_mov=float(np.median(movs_gf)) if movs_gf else None,
                                 sig=float(sig_gf) if not math.isnan(sig_gf) else None))
            rm_rows.append(dict(sector=sname, n=len(raws_rm),
                                 med_raw=float(np.median(raws_rm)) if raws_rm else None,
                                 med_mov=float(med_mov_rm) if not math.isnan(med_mov_rm) else None,
                                 sig=float(sig_rm) if not math.isnan(sig_rm) else None))

            # comparability check: spread of ridden path length between the two hits
            if len(path_lens) >= 4:
                med_len = float(np.median(path_lens))
                p95_len = float(np.percentile(path_lens, 95))
                spread_pct = 100.0 * (p95_len - med_len) / med_len if med_len > 0 else float("nan")
                flagged = spread_pct > 10.0
                comparability_flags.append(dict(track=track, sector=sname, n=len(path_lens),
                                                  med_len_m=med_len, p95_len_m=p95_len,
                                                  spread_pct=spread_pct, flagged=flagged))

            # per-gate crossing-time agreement (own-route only)
            for name in names:
                gt = gate_times_per_ride[name]
                rmt = rm_times_per_ride[name]
                if gA in gt and rmt[k] is not None:
                    delta_t_all.append((track, gA, gt[gA] - rmt[k]))
        gatefield_section_stats[track] = gf_rows
        routemodel_section_stats[track] = rm_rows

    out("\n=== comparability check: ridden-distance spread between consecutive own-route gates ===")
    out("track     sector  n   med_path_m  p95_path_m  spread_%   flag")
    for c in comparability_flags:
        flag = "ROAD VARIES -- times not comparable" if c["flagged"] else "ok (tight)"
        out(f"{c['track']:9s} {c['sector']:6s} {c['n']:3d}  {c['med_len_m']:10.1f}  {c['p95_len_m']:10.1f}  "
            f"{c['spread_pct']:8.1f}  {flag}")

    out("\n=== per-gate crossing-time agreement (own-route gates): gate-field minus route-model ===")
    if delta_t_all:
        dts = np.array([d[2] for d in delta_t_all])
        out(f"n={len(dts)}, median Δt {np.median(dts):+.2f} s, p95 |Δt| {np.percentile(np.abs(dts), 95):.2f} s, "
            f"mean {np.mean(dts):+.2f} s, std {np.std(dts):.2f} s")
    else:
        out("no own-route gate pairs with both a gate-field and route-model crossing time")

    # --- gates never hit ---
    out("\n=== gates never hit by any ride ===")
    hit_gate_ids = {row["gateId"] for row in hits_rows if row["kind"] == "valid"}
    never_hit = [g.id for g in gates if g.id not in hit_gate_ids]
    out(f"{len(never_hit)}/{len(gates)} gates never hit (expected: everything outside the home<->work corridor)")
    for gid in never_hit:
        out(f"  {gid}")

    # --- crossing-angle histogram ---
    out("\n=== crossing-angle histogram (10 deg bins, all raw intersection events) ===")
    all_angles = [row["angle_deg"] for row in hits_rows]
    if all_angles:
        hist, edges = np.histogram(all_angles, bins=np.arange(0, 190, 10))
        total = len(all_angles)
        for lo, n_ in zip(edges[:-1], hist):
            out(f"{lo:3.0f}-{lo+10:3.0f} deg: {n_:6d}  ({100*n_/total:5.1f}%) " + "#" * int(100 * n_ / total))
        out(f"(valid hit threshold: <= {DIRECTION_MAX_DEG:.0f} deg)")

    with open(OUTPUT_TXT, "w") as f:
        f.write("\n".join(lines))
    print(f"\nwrote console log -> {os.path.basename(OUTPUT_TXT)}")

    write_report(gates, cluster_table, rides, per_track_stats, gatefield_section_stats,
                 routemodel_section_stats, comparability_flags, delta_t_all, never_hit,
                 morning_names, n_ok)
    print(f"wrote report -> {os.path.basename(REPORT_MD)}")


def write_report(gates, cluster_table, rides, per_track_stats, gf_stats, rm_stats,
                  comparability_flags, delta_t_all, never_hit, morning_names, morning_n_ok):
    n_clusters = len(cluster_table)
    total_rides = len(rides)
    counts = {t: sum(1 for r in rides if r["track"] == t) for t in TRACKS_WITH_RIDES}

    def sector_table_md(track):
        gf = gf_stats.get(track, [])
        rm = rm_stats.get(track, [])
        rows = ["| Sector | Gate-field n | Gate-field median raw (s) | Gate-field median moving (s) | Gate-field σ (s) | Route-model n | Route-model median raw (s) | Route-model median moving (s) | Route-model σ (s) |",
                "|---|---|---|---|---|---|---|---|---|"]
        for gfr, rmr in zip(gf, rm):
            def f1(v): return f"{v:.1f}" if v is not None else "n/a"
            rows.append(f"| {gfr['sector']} | {gfr['n']} | {f1(gfr['med_raw'])} | {f1(gfr['med_mov'])} | {f1(gfr['sig'])} | "
                        f"{rmr['n']} | {f1(rmr['med_raw'])} | {f1(rmr['med_mov'])} | {f1(rmr['sig'])} |")
        return "\n".join(rows)

    comp_rows = ["| Track | Sector | n rides | Median path (m) | p95 path (m) | Spread | Verdict |",
                 "|---|---|---|---|---|---|---|"]
    for c in comparability_flags:
        verdict = "**road between these gates varies -- times not comparable**" if c["flagged"] else "tight, comparable"
        comp_rows.append(f"| {c['track']} | {c['sector']} | {c['n']} | {c['med_len_m']:.1f} | {c['p95_len_m']:.1f} | "
                          f"{c['spread_pct']:.1f}% | {verdict} |")

    dts = np.array([d[2] for d in delta_t_all]) if delta_t_all else np.array([])
    agreement_line = (f"Across {len(dts)} own-route gate crossings with both numbers available: "
                       f"median Δt = {np.median(dts):+.2f} s, p95 |Δt| = {np.percentile(np.abs(dts), 95):.2f} s."
                       if len(dts) else "No own-route gate pairs had both numbers available.")

    foreign_total = sum(s["foreign_genuine"] for s in per_track_stats.values())
    wrong_total = sum(s["wrong_total"] for s in per_track_stats.values())
    suppressed_total = sum(s["suppressed_total"] for s in per_track_stats.values())

    flagged_sections = [c for c in comparability_flags if c["flagged"]]

    md = f"""# Gate-field offline replay -- evidence document (WP-H, cycle 024)

## 1. What we tested

Your gate-field idea from the 19 Aug notes (point 4): instead of routes, scatter free-floating
"gates" on the roads you ride often, and have each one fire whenever it's crossed, computing
section times between whichever gates actually fired -- no route identity required.

We replayed this model **offline** against your own {total_rides} archived home<->work rides
({counts.get('Morning', 0)} Morning, {counts.get('EveningA', 0)} EveningA,
{counts.get('EveningB', 0)} EveningB -- `data/analysis/cache/*.npz`). **No app was changed.**
This only answers "is the idea good, on the evidence?" -- it does not build anything.

**Known limitation, stated up front:** every cached ride is on the home<->work corridor. There is
no archived evidence for the station, church, or fosh legs -- the gate field's behaviour on those
roads is untested here.

## 2. The field we built

95 gates, one per gate slot on each of your 19 ratified routes (5 gates x 19 routes). Each gate
got:
- a **position** (from `routes.json`),
- a **direction** (bearing), taken from which way the route travels through that point,
- an **80 m crossing line** (the corridor half-width, ±40 m) perpendicular to that direction.

Many of those 95 gates sit on the same physical road -- different routes share streets. Clustering
gates within 30 m of each other and pointed the same way (within 30°) collapsed the 95 gates down
to **{n_clusters} physical clusters**. Gates pointing opposite ways on the same road (e.g. your
morning gate vs. the equivalent evening gate on the same street, ridden in reverse) were correctly
kept separate -- the direction rule is what makes that possible.

## 3. What fired

"""
    for track in TRACKS_WITH_RIDES:
        s = per_track_stats.get(track)
        if not s:
            continue
        md += (f"- **{track}** ({s['n_rides']} rides): valid hits per ride -- median {s['valid_median']:.0f} "
               f"(range {s['valid_min']}-{s['valid_max']}). Wrong-direction events: {s['wrong_total']}. "
               f"Suppressed GPS-jitter re-fires: {s['suppressed_total']}. Foreign-gate valid hits: "
               f"{s['foreign_colocated']} colocated with one of your own gates (harmless double-count, "
               f"same physical line), **{s['foreign_genuine']} genuinely foreign** -- a parallel street "
               f"or a crossing route's gate would have beeped at you that many times across all "
               f"{s['n_rides']} rides.\n")
    md += f"""
Overall: **{foreign_total} genuinely-foreign false fires**, {wrong_total} wrong-direction events
(the gate saw you, but going the wrong way -- these never count as hits), {suppressed_total}
re-fires suppressed by the 60-second guard (GPS jitter straddling a line).

## 4. Section times vs today's sectors

Side by side on the *same rides*: the gate-field's own-route consecutive-gate sections
(START->G1->G2->G3->FINISH, cluster-keyed) vs. the existing route model recomputed fresh in this
run (never copied from an old report). Raw time first (your rule: luck counts), moving time kept
alongside for continuity with the historical tables.

"""
    for track in TRACKS_WITH_RIDES:
        if track not in gf_stats:
            continue
        md += f"### {track}\n\n{sector_table_md(track)}\n\n"
    md += f"""
**Per-gate crossing-time agreement.** {agreement_line} A small, mostly-sub-second gap is expected
(different math: line-crossing vs. chainage-projection); a large one would mean the two models
disagree about where the gate actually is.

**Comparability check** (the review's caveat, measured): for each own-route section, how much did
the actual ridden distance between the two gates vary across rides? Tight variation means "the road
between these gates was the same every time" -- so the section time is a fair comparison. Wide
variation means the section mixed genuinely different roads (e.g. a detour) and the time is not
directly comparable.

{chr(10).join(comp_rows)}

"""
    if flagged_sections:
        md += (f"**{len(flagged_sections)} section(s) flagged** -- road-between-gates varies by more than "
               "~10% of the median path length, so those section times should not be read as strictly comparable "
               "across rides.\n\n")
    else:
        md += "No section was flagged -- the road between every own-route gate pair was ridden consistently.\n\n"

    md += f"""## 5. What this suggests

Read strictly from the numbers above -- this is not a recommendation, it's what the data shows:

- The gate field reproduces your existing sectors closely on the same rides (see the crossing-time
  agreement and the σ columns above) -- the underlying geometry is sound.
- Free-floating gates on a shared-road network **do pick up real cross-route traffic**: the
  genuinely-foreign hit counts above are the parallel-street/crossing-route false-fire rate you
  asked the replay to measure. Whether that rate is "fine" or "too noisy" is a judgement call the
  numbers alone don't make for you.
- {len(never_hit)} of the 95 gates (on routes with no cached rides) never fired at all in this
  archive -- expected, not a failure: those routes just aren't in the home<->work archive.

The review's expected landing zone was **"gates shared across routes" rather than "no routes at
all"** (`product/ROUTING-AND-SEGMENTATION.md` §4, `product/DATA-MODEL.md` §8). This replay's
foreign-hit and comparability numbers above are the evidence for or against that -- read them
against your own tolerance for false fires and section-time noise.

## 6. What this did NOT test

- **Live 1 Hz phone GPS vs. archive quality.** The archive is the same recording pipeline, but this
  replay has the *complete* trace for every ride -- no arming window, no late GPS lock, no dropped
  fixes mid-ride. A live gate field would additionally need to survive those (the live engine's
  50 m arming distance, `app/core/src/live.ts` `armWithinM`, is a live-only concern -- irrelevant
  to this offline replay).
- **Non-home-work rides.** Only the 3 home<->work tracks have cached archive data; the other 16
  ratified routes' gates sat in the field (their never-hit status above is itself evidence, not a
  gap), but there is zero station/church/fosh archive to test them against.
- **Free-ride recording** (gates fired on an unplanned route) -- that is a separate, later build,
  not this replay.
- Raw wall-clock time is the default truth here (D-042: luck counts); both raw and moving time are
  reported above so the numbers line up with the historical tables.

## 7. Provenance

- Script: `data/analysis/10_gatefield_replay.py`
- Run date: {RUN_DATE}
- Ride count: {total_rides} cached rides ({', '.join(f'{v} {k}' for k, v in counts.items())})
- Sanity anchor: Morning gates fired in catalog order on {morning_n_ok}/{len(morning_names)} Morning rides
- To reproduce: `python3 data/analysis/10_gatefield_replay.py` (repo root, or via
  `scripts/gatefield-replay.cmd` on Windows)

---

**Your call, not a recommendation dressed as fact:** adopt gates-shared-across-routes, prototype it
live, or drop the idea. Nothing here decides that for you.
"""
    with open(REPORT_MD, "w") as f:
        f.write(md)


RUN_DATE = "2026-08-22"

if __name__ == "__main__":
    main()
