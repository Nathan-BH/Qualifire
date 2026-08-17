"""Way maps (IDEAS §20/§21) — one Leaflet page per landmark PAIR, showing the
real GPX tracks Nathan has ridden between his six ratified landmarks.

Reproducible: reads data/activity-index.csv + data/analysis/landmarks_v1.json,
parses the selected GPX files, writes demos/ways/*.html + index.html.
Run:  python3 data/analysis/04_way_maps.py
"""
import csv, json, math, re, os, datetime as dt
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
IDX = os.path.join(ROOT, 'data', 'activity-index.csv')
ACT = os.path.join(ROOT, 'data', 'activities')
OUT = os.path.join(ROOT, 'demos', 'ways')
LM = json.load(open(os.path.join(ROOT, 'data', 'analysis', 'landmarks_v1.json')))['landmarks']

MAX_RIDES = 12          # per pair; the big commutes are sampled evenly over time
STRIDE = 3              # keep every Nth trackpoint (~3 s at 1 Hz)
LABEL = {'home': 'home', 'work': 'work', 'puttestraat': 'family home (Puttestraat)',
         'station': 'Leuven station', 'fosh': 'fosh', 'church': 'church'}


def metres(a, b):
    dy = (a[0] - b[0]) * 111320
    dx = (a[1] - b[1]) * 111320 * math.cos(math.radians(50.87))
    return math.hypot(dx, dy)


def landmark_of(p):
    best = None
    for l in LM:
        d = metres(p, (l['lat'], l['lon']))
        if d <= l['radiusM'] and (best is None or d < best[1]):
            best = (l['id'], d)
    return best[0] if best else None


def read_track(fn):
    """lat/lon pairs, decimated. Regex is enough — Strava GPX is machine-written."""
    txt = open(os.path.join(ACT, fn), encoding='utf-8').read()
    pts = re.findall(r'<trkpt lat="([-\d.]+)" lon="([-\d.]+)"', txt)
    return [[round(float(a), 5), round(float(b), 5)] for a, b in pts[::STRIDE]]


def sample(rides, n):
    """Evenly spaced over time, always keeping the newest (it is the one whose
    road layout is current) and the oldest (shows whether the way has drifted)."""
    if len(rides) <= n:
        return rides
    step = (len(rides) - 1) / (n - 1)
    return [rides[min(len(rides) - 1, round(i * step))] for i in range(n)]


# Nathan's per-ride verdicts (ride_curation.json). Ignored/dropped rides stay
# ON the page but start hidden and struck through — a curation record you can
# see and reverse, never a silent deletion.
CURATION = {}
_cur = os.path.join(ROOT, 'data', 'analysis', 'ride_curation.json')
if os.path.exists(_cur):
    for w in json.load(open(_cur))['ways'].values():
        for r in w:
            CURATION[r['file']] = (r['status'], r['note'])

rows = list(csv.DictReader(open(IDX)))
pairs = defaultdict(list)
for r in rows:
    a = landmark_of((float(r['start_lat']), float(r['start_lon'])))
    b = landmark_of((float(r['end_lat']), float(r['end_lon'])))
    if not a or not b:
        continue
    pairs[tuple(sorted((a, b)))].append({
        'f': r['filename'], 'from': a, 'to': b, 'when': r['local_start'],
        'min': float(r['duration_min']),
    })

os.makedirs(OUT, exist_ok=True)
# Prune pages from a previous run — a landmark move can retire a whole way,
# and a stale page would still look authoritative.
written = set()
PAGE = """<!doctype html><html><head><meta charset="utf-8">
<title>%(title)s — Qualifire ways</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
 body{margin:0;font:14px/1.45 system-ui,sans-serif;background:#111;color:#eee}
 #map{height:72vh}
 header{padding:10px 14px}h1{font-size:17px;margin:0 0 4px}
 .sub{color:#9aa;font-size:12.5px}
 #list{padding:6px 14px 18px;display:flex;flex-wrap:wrap;gap:6px}
 .r{border:1px solid #444;border-radius:14px;padding:3px 10px 3px 6px;cursor:pointer;font-size:12px}
 .r.off{opacity:.35}
 .n{display:inline-block;min-width:17px;text-align:center;background:#333;color:#fff;
    border-radius:9px;padding:1px 5px;margin-right:7px;font-weight:700;font-size:11.5px}
 .sw{display:inline-block;width:9px;height:9px;border-radius:9px;margin-right:6px}
 .r.out{text-decoration:line-through;border-style:dashed}
 .tag{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:#ffb;opacity:.8;margin-left:5px}
 a{color:#7cf}
</style></head><body>
<header><h1>%(title)s</h1>
<div class="sub">%(sub)s · rides are numbered 1–N below (oldest first); hover a line on the map to see its
number · click a chip to hide/show it · <a href="index.html">all ways</a></div></header>
<div id="map"></div><div id="list"></div>
<script>
const RIDES = %(rides)s, LMS = %(lms)s;
const map = L.map('map');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
  attribution:'&copy; OpenStreetMap'}).addTo(map);
const OUT = r=>r.status==='ignore'||r.status==='drop';
const lines = RIDES.map((r,i)=>L.polyline(r.pts,{color:OUT(r)?'#777':r.col,weight:OUT(r)?2:3.5,
  opacity:OUT(r)?.5:.75, dashArray:OUT(r)?'4,6':null})
  .bindTooltip('#'+(i+1)+' · '+r.when+' · '+r.min+' min'+(r.note?' · '+r.note:''),{sticky:true}));
lines.forEach((ln,i)=>{ if(!OUT(RIDES[i])) ln.addTo(map); });   // ignored start hidden
LMS.forEach(l=>{
  L.circle([l.lat,l.lon],{radius:l.radiusM,color:'#ffd400',weight:1,fillOpacity:.06}).addTo(map);
  L.marker([l.lat,l.lon]).addTo(map).bindTooltip(l.label,{permanent:true,direction:'top'});
});
const shown = lines.filter((_,i)=>!OUT(RIDES[i]));
map.fitBounds(L.featureGroup(shown.length?shown:lines).getBounds().pad(0.08));
const list=document.getElementById('list');
RIDES.forEach((r,i)=>{
  const el=document.createElement('div'); el.className='r'+(OUT(r)?' out off':'');
  el.title=r.note||'';
  el.innerHTML='<span class="n">'+(i+1)+'</span><span class="sw" style="background:'
    +(OUT(r)?'#777':r.col)+'"></span>'+r.when+' · '+r.dir+' · '+r.min+' min'
    +(r.status!=='keep'?' <span class="tag">'+r.status+'</span>':'');
  el.onclick=()=>{ el.classList.toggle('off');
    if(map.hasLayer(lines[i])) map.removeLayer(lines[i]); else lines[i].addTo(map); };
  list.appendChild(el);
});
</script></body></html>
"""

index_rows = []
for (a, b), rides in sorted(pairs.items(), key=lambda kv: -len(kv[1])):
    rides.sort(key=lambda r: r['when'])
    chosen = sample(rides, MAX_RIDES)
    js = []
    for r in chosen:
        pts = read_track(r['f'])
        if len(pts) < 5:
            continue
        forward = (r['from'], r['to']) == (a, b)          # a→b teal, b→a magenta
        st = CURATION.get(r['f'], ('unreviewed', ''))
        js.append({'pts': pts, 'col': '#2ec4b6' if forward else '#ff5da2',
                   'when': r['when'], 'min': round(r['min']),
                   'status': st[0], 'note': st[1],
                   'dir': f"{LABEL[r['from']]} → {LABEL[r['to']]}"})
    if not js:
        continue
    used = {l['id'] for l in LM} & {a, b}
    lms = [{'lat': l['lat'], 'lon': l['lon'], 'radiusM': l['radiusM'], 'label': LABEL[l['id']]}
           for l in LM if l['id'] in used]
    name = f"{a}--{b}.html" if a != b else f"{a}-loops.html"
    n_fwd = sum(1 for r in rides if (r['from'], r['to']) == (a, b))
    title = (f"{LABEL[a]} ↔ {LABEL[b]}" if a != b else f"{LABEL[a]} — loops")
    sub = (f"{len(rides)} rides in the archive ({n_fwd} {LABEL[a]}→{LABEL[b]}, "
           f"{len(rides)-n_fwd} back) · showing {len(js)}, sampled evenly over time")
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(PAGE % {
        'title': title, 'sub': sub, 'rides': json.dumps(js), 'lms': json.dumps(lms)})
    written.add(name)
    index_rows.append((len(rides), title, name, n_fwd, len(rides) - n_fwd,
                       rides[0]['when'][:7], rides[-1]['when'][:7], len(js)))

for stale in os.listdir(OUT):
    if stale.endswith('.html') and stale != 'index.html' and stale not in written:
        p = os.path.join(OUT, stale)
        try:
            os.remove(p)
            print(f"  pruned stale page: {stale}")
        except PermissionError:
            # Sandboxed runs cannot delete in the workspace — neutralise the
            # page instead so it can never be mistaken for live data.
            open(p, 'w', encoding='utf-8').write(
                '<!doctype html><meta charset="utf-8"><title>retired</title>'
                '<body style="font:14px system-ui;background:#111;color:#eee;padding:24px">'
                '<h1 style="font-size:17px">This way no longer exists</h1>'
                '<p>A landmark moved and no archived ride matches this pair any more. '
                'Safe to delete.</p><p><a style="color:#7cf" href="index.html">All ways</a></p>')
            print(f"  neutralised stale page (delete blocked): {stale}")

ids = [l['id'] for l in LM]
matrix = {(a, b): sum(1 for r in pairs.get(tuple(sorted((a, b))), [])
                      if (r['from'], r['to']) == (a, b)) for a in ids for b in ids}
mat_html = ['<table><tr><th>from \\ to</th>' + ''.join(f'<th>{LABEL[b]}</th>' for b in ids) + '</tr>']
for a in ids:
    cells = []
    for b in ids:
        n = matrix[(a, b)]
        cells.append(f'<td class="{"z" if not n else ""}">{n or "·"}</td>')
    mat_html.append(f'<tr><th>{LABEL[a]}</th>' + ''.join(cells) + '</tr>')
mat_html.append('</table>')

rows_html = ''.join(
    f'<tr><td><a href="{n}">{t}</a></td><td>{c}</td><td>{f}/{bk}</td>'
    f'<td>{s} → {e}</td><td>{sh}</td></tr>'
    for c, t, n, f, bk, s, e, sh in index_rows)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Qualifire — ways between landmarks</title>
<style>body{{margin:0;padding:20px 24px;font:14px/1.5 system-ui,sans-serif;background:#111;color:#eee}}
h1{{font-size:19px;margin:0 0 2px}} .sub{{color:#9aa;font-size:12.5px;margin-bottom:18px}}
table{{border-collapse:collapse;margin-bottom:26px}} td,th{{border:1px solid #333;padding:5px 10px;text-align:left}}
th{{color:#9aa;font-weight:600}} td.z{{color:#555}} a{{color:#7cf}}</style></head><body>
<h1>Ways between the six ratified landmarks</h1>
<div class="sub">{sum(len(v) for v in pairs.values())} of {len(rows)} archived rides start and end at a landmark.
Rows = start, columns = end. Generated by <code>data/analysis/04_way_maps.py</code>.</div>
{''.join(mat_html)}
<table><tr><th>Way</th><th>Rides</th><th>Each way</th><th>Span</th><th>Shown</th></tr>{rows_html}</table>
</body></html>""")
print(f"wrote {len(index_rows)} pages + index to {OUT}")
for c, t, n, f, b, s, e, sh in index_rows:
    print(f"  {c:4d}  {t:45s} {s}→{e}")
