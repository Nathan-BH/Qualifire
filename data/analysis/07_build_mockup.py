"""Rebuilds demos/mockup.html — the four-tab app simulation.

Reads real data (a real Morning ride, the ratified landmarks, the ghost seed,
the curated way maps) and emits ONE self-contained page. Rerun after the seed
or the landmark set changes:  python3 data/analysis/07_build_mockup.py
"""
import json, csv, math, re, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
J = lambda *p: os.path.join(ROOT, *p)

seeds = json.load(open(J('app', 'src', 'store', 'results.seed.json')))
landmarks = json.load(open(J('data', 'analysis', 'landmarks_v1.json')))['landmarks']
LABEL = {'home': 'home', 'work': 'work', 'puttestraat': 'family home',
         'station': 'Leuven station', 'fosh': 'fosh', 'church': 'church'}

# ---- the simulated ride: a mid-pack kept Morning ride -----------------------
M = sorted([r for r in seeds if r['routeId'] == 'Morning' and r['lap']['movingS'] is not None],
           key=lambda r: r['lap']['movingS'])
sim = M[len(M) // 2]
sim_file = sim['rideId'].replace('seed:', '') + '.gpx'

def track(fn, stride=3):
    txt = open(J('data', 'activities', fn), encoding='utf-8').read()
    pts = re.findall(r'<trkpt lat="([-\d.]+)" lon="([-\d.]+)">\s*(?:<ele>[-\d.]+</ele>\s*)?<time>([^<]+)</time>', txt)
    out = []
    import datetime as dt
    t0 = None
    for a, b, c in pts[::stride]:
        t = dt.datetime.strptime(c[:19], '%Y-%m-%dT%H:%M:%S')
        t0 = t0 or t
        out.append([round(float(a), 5), round(float(b), 5), int((t - t0).total_seconds())])
    return out

sim_track = track(sim_file)

# gate crossing times = cumulative sector raw times (sector 1 starts at the START gate)
gate_ts, acc = [0], 0
for s in sim['sectors']:
    acc += s['rawS']
    gate_ts.append(round(acc, 1))
# offset: the ride begins before the START gate — approximate with the first
# ~160 m of the trace (D-016 gates start 162 m in) so the dot moves before S1.
def m(a, b):
    return math.hypot((a[0]-b[0])*111320, (a[1]-b[1])*111320*math.cos(math.radians(50.87)))
run, start_offset = 0, 0
for i in range(1, len(sim_track)):
    run += m(sim_track[i-1], sim_track[i])
    if run >= 162:
        start_offset = sim_track[i][2]
        break

# gate positions for the simulated track (D-016 measured, gates_proposal.csv)
sim_gates = [{'name': r['gate'], 'lat': float(r['lat']), 'lon': float(r['lon']),
              'chainageM': float(r['chainage_m'])}
             for r in csv.DictReader(open(J('data', 'analysis', 'gates_proposal.csv')))
             if r['track'] == 'Morning']

towers = {}
for rid in ('Morning', 'EveningA', 'EveningB'):
    rows = [{'id': r['rideId'].replace('seed:', '')[:13], 'movingS': round(r['lap']['movingS'], 1),
             'q': r['lap']['quality'],
             'sectors': [round(s['movingS'], 1) if s['movingS'] is not None else None
                         for s in r['sectors']]}
            for r in seeds if r['routeId'] == rid and r['lap']['movingS'] is not None]
    towers[rid] = sorted(rows, key=lambda x: x['movingS'])

# ---- ways for the routes tab (counts from the curated record) ---------------
cur = json.load(open(J('data', 'analysis', 'ride_curation.json')))['ways']
ways = []
for way, rides in cur.items():
    keep = [r for r in rides if r['status'] == 'keep']
    if not keep or '--' not in way:
        continue
    a, b = way.split('--')
    ways.append({'id': way, 'ai': a, 'bi': b, 'a': LABEL.get(a, a), 'b': LABEL.get(b, b),
                 'n': len(keep),
                 'routes': ['Morning'] if way == 'home--work' else
                           (['Evening A', 'Evening B'] if way == 'home--work' else [])})
ways.sort(key=lambda w: -w['n'])
# home↔work is the one way with a ratified route split (D-015) + ride 7's mirror
for w in ways:
    if w['id'] == 'home--work':
        w['routes'] = ['Morning', 'Evening A', 'Evening B']

# the Rides tab: recent recordings, newest first
rides = sorted(seeds, key=lambda r: r['startedAtMs'], reverse=True)[:8]
RIDES = [{'id': r['rideId'].replace('seed:', ''), 'ms': r['startedAtMs'], 'route': r['routeId'],
          'lapS': round(r['lap']['movingS'], 1) if r['lap']['movingS'] is not None else None,
          'q': r['lap']['quality'], 'n': len(r['sectors'])} for r in rides]

DATA = {
    'sim': {'file': sim_file, 'track': sim_track, 'gateTs': gate_ts, 'startOffset': start_offset,
            'sectors': [round(s['rawS'], 1) for s in sim['sectors']], 'lapS': round(sim['lap']['movingS'], 1),
            'gates': sim_gates},
    'towers': towers,
    'landmarks': [{'id': l['id'], 'label': LABEL[l['id']], 'lat': l['lat'], 'lon': l['lon'],
                   'radiusM': l['radiusM'], 'dormant': l['id'] == 'puttestraat'} for l in landmarks],
    'ways': ways,
    'rides': RIDES,
}

html = open(J('data', 'analysis', 'mockup_template.html'), encoding='utf-8').read()
open(J('demos', 'mockup.html'), 'w', encoding='utf-8').write(
    html.replace('/*__DATA__*/null', json.dumps(DATA)))
print(f"mockup.html rebuilt · sim ride {sim_file} ({len(sim_track)} pts, lap {DATA['sim']['lapS']}s) · "
      f"ghosts {[len(v) for v in towers.values()]} · ways {len(ways)}")
