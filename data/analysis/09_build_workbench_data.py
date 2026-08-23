#!/usr/bin/env python3
"""Qualifire WP-C (cycle 024): data builder for the route workbench browser page
(demos/workbench.html). Absorbs B-31 (gate-eyeball upgrade: perpendicular gate
lines at true half-width, crossing-point clouds, the 50 m arming window, sigma_s
+ median-speed/stop-fraction labels, a Google Maps link per gate) and feeds
B-42's promotion mechanism (the page's Save file is the new front door to
app/tests/build_track_ref.ts).

Reads:
  app/assets/routes/routes.json          - all 19 ratified routes (display path + gates)
  app/src/store/catalog.seed.json        - landmarks, ways, routes, gateSets (authoritative chainage)
  app/tests/fixtures/refs.json           - the engine's true reference lines (4 tracks only)
  data/analysis/gates_proposal.csv       - per-gate speed/stop stats (3 original tracks only)
  data/analysis/cache/*.npz              - ~125 cached archive rides (3 original tracks only)

Writes:
  demos/workbench-data.js  -  window.WORKBENCH_DATA = {...}; (see WP-C brief schema)

Run: python3 data/analysis/09_build_workbench_data.py
"""
import os, csv, json, glob, math, datetime
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
J = lambda *p: os.path.join(ROOT, *p)
AN = J('data', 'analysis')
CACHE = os.path.join(AN, 'cache')

# ---------------------------------------------------------------------------
# copied from data/analysis/02_analysis.py (cycle 003); 02's paths point at a
# dead session mount (/sessions/tender-clever-ride/..., its line 7), so it is
# not imported here — only the three helpers actually needed are copied.
# Resampling is not needed: refs.json already carries a uniform 5 m-resampled
# reference line, and the other 15 routes' chainage is built directly off the
# already-decimated routes.json path (no re-gridding required).

def to_xy(lat, lon, lat0, lon0):
    return ((lon - lon0) * np.cos(np.radians(lat0)) * 111320.0,
             (lat - lat0) * 110540.0)

def project_ride(x, y, rx, ry, ch, live=False):
    """Windowed chainage projection (D-011). live=True: forward-only window,
    hold position when no in-corridor match. Returns s[], xtd[]."""
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
        if dist[j] <= 40.0:
            s[i], xtd[i] = cand_s, dist[j]
            sp = max(sp, cand_s) if live else cand_s
            lost = 0
        else:
            s[i], xtd[i] = sp, dist[j]
            lost += 1
            if lost >= 5 and not live:
                d2 = (rx - x[i]) ** 2 + (ry - y[i]) ** 2
                k = int(np.argmin(d2))
                if np.sqrt(d2[k]) <= 40.0:
                    sp = ch[k]; s[i], xtd[i] = sp, np.sqrt(d2[k]); lost = 0
    return s, xtd

def cross_time(t, s, g):
    """first upward crossing of chainage g, interpolated"""
    above = s >= g
    if above[0]: return t[0] if s[0] - g < 20 else None
    idx = np.where(~above[:-1] & above[1:])[0]
    if len(idx) == 0: return None
    i = idx[0]
    f = (g - s[i]) / max(s[i + 1] - s[i], 1e-9)
    return float(t[i] + f * (t[i + 1] - t[i]))

# ---------------------------------------------------------------------------
# engine constants the page must draw honestly (do not invent new ones)
CORRIDOR_M = 40.0     # app/core/src/projection.ts line 12
ARM_WITHIN_M = 50.0   # app/core/src/live.ts line 48 (D-016(b))

# sigma_s (sig_clean, seconds) per sector S1..S4 — data/analysis/03_output.txt.
# Embedded literally per WP-C brief sec 2 (values already extracted there;
# 03_output.txt is a print-log, not a machine-readable table, so it is not
# parsed here). Only these 3 original tracks have measured sector noise.
SIGMA_S = {
    'Morning':  [6.44, 3.83, 5.32, 7.07],
    'EveningA': [10.04, 5.04, 4.18, 6.21],
    'EveningB': [6.47, 5.40, 4.72, 4.90],
}
GATE_NAMES = ['START', 'G1', 'G2', 'G3', 'FINISH']

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def interp_xy(ch, rx, ry, target):
    return float(np.interp(target, ch, rx)), float(np.interp(target, ch, ry))

def xy_to_latlon(x, y, lat0, lon0):
    return (lat0 + y / 110540.0, lon0 + x / (111320.0 * math.cos(math.radians(lat0))))

def r5(v):
    return round(v, 5)

def main():
    routes_json = json.load(open(J('app', 'assets', 'routes', 'routes.json')))['routes']
    catalog = json.load(open(J('app', 'src', 'store', 'catalog.seed.json')))
    refs = json.load(open(J('app', 'tests', 'fixtures', 'refs.json')))['tracks']
    gates_proposal = {}
    with open(os.path.join(AN, 'gates_proposal.csv')) as f:
        for row in csv.DictReader(f):
            gates_proposal[(row['track'], row['gate'])] = row

    landmarks_by_id = {l['id']: l for l in catalog['landmarks']}
    gate_sets = {g['routeId']: g['chainageM'] for g in catalog['gateSets']}
    route_way = {r['id']: r['wayId'] for r in catalog['routes']}
    REF_TRACKS = set(refs.keys())          # Morning, EveningA, EveningB, MorningB
    CACHE_TRACKS = set(SIGMA_S.keys())     # Morning, EveningA, EveningB (cached npz + sigma)

    out_landmarks = [
        {'id': l['id'], 'label': l['label'], 'lat': l['lat'], 'lon': l['lon'], 'radiusM': l['radiusM']}
        for l in catalog['landmarks']
    ]

    # per-track (rx, ry, ch, lat0, lon0) built once, reused for gates + clouds
    line_frame = {}
    for track, t in refs.items():
        line_frame[track] = dict(rx=np.array(t['rx']), ry=np.array(t['ry']), ch=np.array(t['ch']),
                                  lat0=t['lat0'], lon0=t['lon0'])
    for rid, r in routes_json.items():
        if rid in line_frame:
            continue
        path = r['path']
        lat0, lon0 = path[0][0], path[0][1]
        xs, ys = [], []
        for lat, lon in path:
            x, y = to_xy(lat, lon, lat0, lon0)
            xs.append(x); ys.append(y)
        rx, ry = np.array(xs), np.array(ys)
        ch = np.concatenate([[0.0], np.cumsum(np.hypot(np.diff(rx), np.diff(ry)))])
        line_frame[rid] = dict(rx=rx, ry=ry, ch=ch, lat0=lat0, lon0=lon0)

    # cached rides, grouped by track (only the 3 original tracks have any)
    rides_by_track = {t: [] for t in CACHE_TRACKS}
    for p in sorted(glob.glob(os.path.join(CACHE, '*.npz'))):
        z = np.load(p, allow_pickle=True)
        track = str(z['track'])
        if track in rides_by_track:
            rides_by_track[track].append(dict(t=z['t'], lat=z['lat'], lon=z['lon']))

    routes_out = {}
    warn_count = 0
    for rid in sorted(routes_json.keys()):
        fr = line_frame[rid]
        rx, ry, ch, lat0, lon0 = fr['rx'], fr['ry'], fr['ch'], fr['lat0'], fr['lon0']
        is_ref = rid in REF_TRACKS
        if is_ref:
            lengthM = refs[rid]['length']
            lineSource = 'engine reference (app/tests/fixtures/refs.json)'
            line = [[r5(lat0 + y / 110540.0), r5(lon0 + x / (111320.0 * math.cos(math.radians(lat0))))]
                    for x, y in zip(rx, ry)]
        else:
            lengthM = float(ch[-1])
            lineSource = 'display path (app/assets/routes/routes.json)'
            line = [[r5(a), r5(b)] for a, b in routes_json[rid]['path']]
        chainage_out = [round(float(c), 3) for c in ch]

        gates_out = []
        chainages = gate_sets[rid]
        stored_gates = routes_json[rid]['gates']  # cross-check target
        for i, name in enumerate(GATE_NAMES):
            g = chainages[i]
            x, y = interp_xy(ch, rx, ry, g)
            glat, glon = xy_to_latlon(x, y, lat0, lon0)

            # perpendicular at true half-width: bearing from the line points
            # 10 m behind/ahead of the gate (clamped to the line), then +-90 deg
            xA, yA = interp_xy(ch, rx, ry, max(0.0, g - 10))
            xB, yB = interp_xy(ch, rx, ry, min(float(ch[-1]), g + 10))
            ddx, ddy = xB - xA, yB - yA
            norm = math.hypot(ddx, ddy) or 1.0
            ux, uy = ddx / norm, ddy / norm       # unit vector along the route
            px, py = -uy, ux                       # unit vector perpendicular to it
            p1 = xy_to_latlon(x - px * CORRIDOR_M, y - py * CORRIDOR_M, lat0, lon0)
            p2 = xy_to_latlon(x + px * CORRIDOR_M, y + py * CORRIDOR_M, lat0, lon0)

            xE, yE = interp_xy(ch, rx, ry, min(float(ch[-1]), g + ARM_WITHIN_M))
            armEnd = xy_to_latlon(xE, yE, lat0, lon0)

            sigmaS = SIGMA_S[rid][i - 1] if (rid in SIGMA_S and i > 0) else None
            row = gates_proposal.get((rid, name))
            medianSpeedKmh = float(row['median_speed_kmh']) if row else None
            stopFrac = float(row['stop_frac']) if row else None

            cloud = []
            if rid in CACHE_TRACKS:
                for ride in rides_by_track[rid]:
                    rxs, rys = to_xy(ride['lat'], ride['lon'], lat0, lon0)
                    s, _xtd = project_ride(rxs, rys, rx, ry, ch, live=False)
                    tg = cross_time(ride['t'], s, g)
                    if tg is not None:
                        clat = float(np.interp(tg, ride['t'], ride['lat']))
                        clon = float(np.interp(tg, ride['t'], ride['lon']))
                        cloud.append([r5(clat), r5(clon)])

            # cross-check: interpolated gate vs routes.json's own stored gate
            sg = stored_gates[i]
            dist = haversine_m(glat, glon, sg['lat'], sg['lon'])
            if dist > 25.0:
                warn_count += 1
                print(f"WARNING: {rid} {name} interpolated gate is {dist:.1f} m from "
                      f"routes.json's stored gate ({glat:.5f},{glon:.5f}) vs "
                      f"({sg['lat']},{sg['lon']})")

            gates_out.append({
                'name': name,
                'chainageM': g,
                'pct': round(g / lengthM * 100, 1),
                'lat': r5(glat), 'lon': r5(glon),
                'perp': [[r5(p1[0]), r5(p1[1])], [r5(p2[0]), r5(p2[1])]],
                'armEnd': [r5(armEnd[0]), r5(armEnd[1])],
                'sigmaS': sigmaS,
                'medianSpeedKmh': medianSpeedKmh,
                'stopFrac': stopFrac,
                'cloud': cloud,
            })

        routes_out[rid] = {
            'wayId': route_way[rid],
            'sourceRide': routes_json[rid]['sourceRide'],
            'lengthM': round(lengthM, 1),
            'lineSource': lineSource,
            'line': line,
            'chainage': chainage_out,
            'gates': gates_out,
        }

    bundle = {
        'generated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') +
                     f"{datetime.datetime.now(datetime.timezone.utc).microsecond // 1000:03d}Z",
        'corridorM': CORRIDOR_M,
        'armWithinM': ARM_WITHIN_M,
        'landmarks': out_landmarks,
        'routes': routes_out,
    }

    with open(J('demos', 'workbench-data.js'), 'w') as f:
        f.write('// GENERATED by data/analysis/09_build_workbench_data.py — do not edit.\n')
        f.write('window.WORKBENCH_DATA = ')
        json.dump(bundle, f, indent=1)
        f.write(';\n')

    print(f"wrote demos/workbench-data.js — {len(routes_out)} routes, "
          f"{sum(len(r['gates']) for r in routes_out.values())} gates, {warn_count} cross-check warnings")

if __name__ == '__main__':
    main()
