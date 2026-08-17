"""Pre-rendered route assets — the "fake it" map (Nathan, 2026-08-16).

For each ratified route: a PNG of the route line + its gates, and a JSON with
the Web-Mercator transform that maps lat/lon to a pixel in that PNG. The app
draws the PNG with <Image> and puts the rider's dot on top with a positioned
<View> — no map library, no tile server, no network on the bike, and no native
module, so this ships over Fast Refresh instead of needing a build.

The MapLibre option stays open: the app-side contract is just
projectToPixel(asset, lat, lon), so a real map can replace the Image later
without touching the ride screen's logic.

Run: python3 data/analysis/08_build_route_assets.py
"""
import csv, json, math, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
J = lambda *p: os.path.join(ROOT, *p)
OUT = J('app', 'assets', 'routes')
os.makedirs(OUT, exist_ok=True)

W, H, PAD = 900, 1400, 60          # portrait, sized for a phone crop
LINE, GATE, BG = (255, 212, 0), (255, 255, 255), (16, 16, 20)

# ---------------------------------------------------------------- basemap ---
# D-031 (2026-08-17): a REAL map goes under the route. `<route>-base.png` is a
# raw crop of Esri World Street Map tiles, captured once at zoom 15 by
# demos/basemap-capture.html and aligned pixel-exactly to the transform below.
# It is an INPUT to this script, never an output: all styling happens here, so
# this file stays the canonical renderer and the crop stays re-capturable.
#
# NOT openstreetmap.org: their tile usage policy forbids scripted fetching and
# they block it, returning an "Access blocked" placeholder with HTTP 200 -- the
# first run produced three PNGs of that message and a missing-tile check that
# passed. The capture page now rejects byte-identical tiles for exactly this.
# Attribution ("Esri, HERE, Garmin, (c) OpenStreetMap contributors") is required
# and is drawn by the app, not baked in: a moving window would crop it away.
#
# Art Director's ruling: full-colour OSM is approved as *substrate*, not as
# image. Untouched, OSM paints motorways pink-red and forest bright green --
# the basemap would ship fake tier colours. Desaturation is the firewall.
# The AD's numbers were written for raw OSM carto, which paints motorways
# pink-red and woodland bright green. Esri World Street Map is already a muted
# cartography, so the same treatment washed it to paper -- and "colours, forest
# and everything" was the whole point of the request. Backed off to the least
# desaturation that still keeps every basemap fill clearly outside the tier
# palette, checked by eye against a rendered frame (Nathan, 2026-08-17).
BASE_SAT, BASE_BRIGHT, BASE_CONTRAST = 0.80, 1.02, 0.94
BASE_WASH, BASE_WASH_A = (250, 247, 238), 0.08   # #FAF7EE at 8%
# Light-ground palette (AD): the casing, not the hue, buys contrast.
CASING = (20, 18, 12)              # #14120C
LINE_LIGHT = (245, 197, 66)        # #F5C542, the app's own F1 yellow
GATE_FILL = (232, 228, 218)        # unscored gate; the app paints tiers on top
LANDMARK_LIGHT = (92, 88, 80)      # landmark radius rings, muted on light ground
# Screen dp -> asset px: routeMapView draws the asset at ~0.54x on the live box.
DP = 1 / 0.54
# Pillow renders wide polylines with no antialiasing and bulges a filled ellipse
# at every vertex, which on a 163-vertex GPS trace reads as a serrated edge.
# Drawing the whole overlay at 2x and downscaling is the cheap fix.
SS = 2
import os as _os, time as _time
# Context ("ghost rides") under the route: 624 of Nathan's own traces, used as a
# stand-in road network when there was no street data offline. With a real
# basemap the Designer ruled them OUT -- real streets already answer "where are
# the roads", so a second grey network on top is a mis-registered duplicate.
# Kept as a fallback for any route with no captured crop, and for NOBASE=1.
CONTEXT, CONTEXT_RIDES = (58, 58, 66), (0 if _os.environ.get('QUICK') else 400)
CONTEXT_STRIDE = 12                # every 12th point: shape survives, cost does not
CONTEXT_PAD = 0.02                 # deg (~1.5 km) of slack around the route bbox
LANDMARK = (150, 150, 160)
R_EARTH = 6378137.0                # metres; matches app/src/ui/routeMapMath.ts
MARGIN = 120                       # px of off-canvas slack kept when clipping
_T0 = _time.time()

# Web Mercator (the same projection tiles use, so a real basemap can slot in later)
def merc(lat, lon):
    x = math.radians(lon)
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return x, y

_TRACK_CACHE = {}
def track(fn, stride=2):
    """Parsed points for one GPX, memoised. The context layer asks for the same
    rides on all three routes; re-reading 240 KB of XML each time is what made
    this take minutes."""
    key = (fn, stride)
    if key not in _TRACK_CACHE:
        txt = open(J('data', 'activities', fn), encoding='utf-8').read()
        pts = re.findall(r'<trkpt lat="([-\d.]+)" lon="([-\d.]+)"', txt)
        _TRACK_CACHE[key] = [(float(a), float(b)) for a, b in pts[::stride]]
    return _TRACK_CACHE[key]

# reference ride per route: the medoid rides the engine already uses
INDEX = list(csv.DictReader(open(J('data', 'activity-index.csv'))))
def pick(route, variant):
    rows = [r for r in INDEX if r['route'] == route and r['variant'].strip() == variant]
    rows.sort(key=lambda r: r['local_start'])
    return rows[-1]['filename']            # most recent = current road layout

ROUTES = {'Morning': pick('home2work', 'main'),
          'EveningA': pick('work2home', 'A'),
          'EveningB': pick('work2home', 'B')}

LANDMARKS = json.load(open(J('data', 'analysis', 'landmarks_v1.json')))['landmarks']


def context_files(pts, exclude):
    """Which archived rides to draw under THIS route.

    Relevance beats recency: a ride round the Ardennes projects millions of
    pixels off-canvas and tells the rider nothing, while a local errand adds a
    street he recognises. The index already carries start/end lat/lon, so the
    filter is a bbox test on those -- no GPX is opened to decide.

    Of the survivors we take an even spread across the archive rather than the
    newest 60, so the background mixes commutes with the local pottering that
    covers the side streets.
    """
    lats = [p[0] for p in pts]
    lons = [p[1] for p in pts]
    la0, la1 = min(lats) - CONTEXT_PAD, max(lats) + CONTEXT_PAD
    lo0, lo1 = min(lons) - CONTEXT_PAD, max(lons) + CONTEXT_PAD

    def near(r):
        for k in (('start_lat', 'start_lon'), ('end_lat', 'end_lon')):
            try:
                la, lo = float(r[k[0]]), float(r[k[1]])
            except (ValueError, KeyError, TypeError):
                continue
            if la0 < la < la1 and lo0 < lo < lo1:
                return True
        return False

    rows = [r for r in INDEX if r['filename'] != exclude and near(r)]
    rows.sort(key=lambda r: r['local_start'], reverse=True)
    if len(rows) > CONTEXT_RIDES:                     # even spread, not newest-N
        step = len(rows) / CONTEXT_RIDES
        rows = [rows[int(i * step)] for i in range(CONTEXT_RIDES)]
    out = []
    for r in rows:
        try:
            out.append(track(r['filename'], stride=CONTEXT_STRIDE))
        except Exception:
            pass
    return out


def _clip(p, q, xmin, ymin, xmax, ymax):
    """Liang-Barsky: the visible part of segment p->q, or None."""
    (x0, y0), (x1, y1) = p, q
    dx, dy = x1 - x0, y1 - y0
    t0, t1 = 0.0, 1.0
    for num, den in ((-dx, x0 - xmin), (dx, xmax - x0),
                     (-dy, y0 - ymin), (dy, ymax - y0)):
        if num == 0:
            if den < 0:
                return None
        else:
            t = den / num
            if num < 0:
                if t > t1:
                    return None
                t0 = max(t0, t)
            else:
                if t < t0:
                    return None
                t1 = min(t1, t)
    return ((x0 + t0 * dx, y0 + t0 * dy), (x0 + t1 * dx, y0 + t1 * dy))


def draw_clipped(d, px, fill, width):
    """Draw a polyline, keeping only what lands near the canvas.

    Pillow will happily accept a vertex 40 million pixels away and then spend
    real time rasterising toward it -- clipping first is the difference between
    seconds and minutes.
    """
    xmin, ymin, xmax, ymax = -MARGIN, -MARGIN, W + MARGIN, H + MARGIN
    if all(xmin < x < xmax and ymin < y < ymax for x, y in px):
        if len(px) > 1:                                # fast path: fully inside
            d.line(px, fill=fill, width=width, joint='curve')
        return
    run = []
    for a, b in zip(px, px[1:]):
        seg = _clip(a, b, xmin, ymin, xmax, ymax)
        if seg is None:
            if len(run) > 1:
                d.line(run, fill=fill, width=width)
            run = []
        elif run and run[-1] == seg[0]:
            run.append(seg[1])
        else:
            if len(run) > 1:
                d.line(run, fill=fill, width=width)
            run = [seg[0], seg[1]]
    if len(run) > 1:
        d.line(run, fill=fill, width=width)

gates_by_route = {}
for r in csv.DictReader(open(J('data', 'analysis', 'gates_proposal.csv'))):
    gates_by_route.setdefault(r['track'], []).append(
        {'name': r['gate'], 'lat': float(r['lat']), 'lon': float(r['lon'])})

def nearest_idx(poly, lat, lon):
    best, bi = 1e18, 0
    for i, (a, b) in enumerate(poly):
        d = (a - lat) ** 2 + (b - lon) ** 2
        if d < best:
            best, bi = d, i
    return bi


from PIL import Image, ImageChops, ImageDraw, ImageEnhance

NOBASE = bool(_os.environ.get('NOBASE'))

def basemap(route_id):
    """The treated OSM crop for this route, or None if it was never captured.

    Returns an RGB image already reduced to a substrate: desaturated so no OSM
    fill can be mistaken for a tier colour, then washed toward paper so the
    dark route casing has somewhere to sit.
    """
    if NOBASE:
        return None
    path = J(OUT, f'{route_id}-base.png')
    if not _os.path.exists(path):
        # Deliberately fatal. The crops are build-time inputs only (5.5 MB that
        # Metro would otherwise bundle to the phone for nothing), so they get
        # cleared out of app/assets -- and a missing crop must NOT quietly
        # regenerate the old dark ghost-ride asset over a shipped real map.
        raise SystemExit(
            f'{route_id}-base.png is missing from app/assets/routes/.\n'
            f'  Re-capture: open demos/basemap-capture.html, press the button,\n'
            f'  move the three PNGs into app/assets/routes/, re-run this script,\n'
            f'  then clear them out again.\n'
            f'  To rebuild the pre-basemap look on purpose: NOBASE=1 python3 '
            f'data/analysis/08_build_route_assets.py')
    im = Image.open(path).convert('RGB')
    if im.size != (W, H):
        raise SystemExit(f'{route_id}-base.png is {im.size}, expected {(W, H)} — '
                         f'the crop no longer matches the transform; re-capture it.')
    im = ImageEnhance.Color(im).enhance(BASE_SAT)
    im = ImageEnhance.Brightness(im).enhance(BASE_BRIGHT)
    im = ImageEnhance.Contrast(im).enhance(BASE_CONTRAST)
    return Image.blend(im, Image.new('RGB', (W, H), BASE_WASH), BASE_WASH_A)

manifest = {}
for route_id, fn in ROUTES.items():
    pts = track(fn)
    mx = [merc(a, b)[0] for a, b in pts]
    my = [merc(a, b)[1] for a, b in pts]
    x0, x1, y0, y1 = min(mx), max(mx), min(my), max(my)
    # one scale for both axes (no distortion); y flips (mercator up = pixel down)
    scale = min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0))
    offx = PAD + ((W - 2 * PAD) - (x1 - x0) * scale) / 2
    offy = PAD + ((H - 2 * PAD) - (y1 - y0) * scale) / 2

    def to_px(lat, lon):
        x, y = merc(lat, lon)
        return (offx + (x - x0) * scale, offy + (y1 - y) * scale)

    # 1. the ground. Either the real OSM crop, or -- when there is none -- the
    # cycle-009 fallback: a FREQUENCY map of every relevant archived ride, so
    # roads Nathan uses daily come out bright and a one-off detour stays faint.
    # That is what gives the picture a road hierarchy -- a flat grey spaghetti
    # of equal lines reads as noise, not as a map.
    base = basemap(route_id)
    acc = Image.new('L', (W, H), 0)
    ctx = context_files(pts, exclude=fn) if (CONTEXT_RIDES and base is None) else []
    for opts in ctx:
        layer = Image.new('L', (W, H), 0)
        draw_clipped(ImageDraw.Draw(layer), [to_px(a, b) for a, b in opts], 255, 2)
        acc = ImageChops.add(acc, layer.point(lambda v: 26 if v else 0))
    # counts -> grey: log-ish so a daily road is clearly brighter than a rare one
    if base is not None:
        img = base
    else:
        ramp = acc.point(lambda v: 0 if v == 0 else min(120, 34 + int(30 * math.log2(1 + v / 26))))
        img = Image.merge('RGB', (
            ramp.point(lambda v: v + BG[0] if v else BG[0]),
            ramp.point(lambda v: v + BG[1] if v else BG[1]),
            ramp.point(lambda v: int(v * 1.12) + BG[2] if v else BG[2]),
        ))
    d = ImageDraw.Draw(img)

    light = base is not None
    ring = LANDMARK_LIGHT if light else LANDMARK
    if light:
        # everything from here is drawn at SSx into a transparent overlay and
        # downscaled once, so the route edge is antialiased instead of serrated
        ov = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)

    # 2. the landmarks, so the shape is anchored to places he recognises.
    # radiusM is METRES: scale is px per radian of mercator x, so the metres
    # -> px factor is scale / (R * cos(lat)) -- the inverse of the runtime's
    # metresPerPixel(). Multiplying raw metres by scale drew a 108-million-px
    # ellipse and hung the renderer.
    k = SS if light else 1
    for l in LANDMARKS:
        lx, ly = to_px(l['lat'], l['lon'])
        if -50 < lx < W + 50 and -50 < ly < H + 50:
            px_per_m = scale / (R_EARTH * math.cos(math.radians(l['lat'])))
            r = max(6, l['radiusM'] * px_per_m)
            lx, ly, r = lx * k, ly * k, r * k
            d.ellipse([lx - r, ly - r, lx + r, ly + r], outline=ring, width=2 * k if light else 3)

    # 3. the route itself, on top of everything.
    # On the real basemap the yellow is nearly the same VALUE as beige (~0.80 vs
    # ~0.85), so in sunlight the line would dissolve into the map at exactly the
    # glance that matters. The dark casing is what keeps it traceable with the
    # colour removed -- it is load-bearing, not decoration (AD, 2026-08-17).
    poly = [to_px(a, b) for a, b in pts]
    if light:
        sp = [(x * SS, y * SS) for x, y in poly]
        d.line(sp, fill=CASING, width=round(9 * DP) * SS, joint='curve')      # 17 px
        d.line(sp, fill=LINE_LIGHT, width=round(5 * DP) * SS, joint='curve')  #  9 px
    else:
        d.line(poly, fill=LINE, width=7, joint='curve')
    for g in gates_by_route[route_id]:
        px, py = to_px(g['lat'], g['lon'])
        if light:
            px, py = px * SS, py * SS
            r_out, r_in = round(9 * DP) * SS, round(7 * DP) * SS              # 17 / 13
            d.ellipse([px - r_out, py - r_out, px + r_out, py + r_out], fill=CASING)
            d.ellipse([px - r_in, py - r_in, px + r_in, py + r_in], fill=GATE_FILL)
        else:
            d.ellipse([px - 13, py - 13, px + 13, py + 13], fill=BG, outline=GATE, width=4)
    if light:
        flat = ov.resize((W, H), Image.LANCZOS)
        img.paste(flat, (0, 0), flat)
    img.save(J(OUT, f'{route_id}.png'))
    ground = 'OSM basemap' if light else f'{len(ctx)} context rides'
    print(f'  {route_id}: {ground}, {_time.time() - _T0:5.1f}s elapsed')

    manifest[route_id] = {
        'image': f'{route_id}.png', 'w': W, 'h': H,
        # projectToPixel: px = offx + (merc_x(lon) - x0) * scale
        #                 py = offy + (y1 - merc_y(lat)) * scale
        'x0': x0, 'y1': y1, 'scale': scale, 'offx': offx, 'offy': offy,
        # lat/lon kept alongside the pixel so the TS runtime maths can be
        # checked against this renderer — cross-language drift is exactly the
        # kind of thing that silently misplaces a dot.
        'gates': [{'name': g['name'], 'lat': g['lat'], 'lon': g['lon'],
                   **dict(zip(('px', 'py'), to_px(g['lat'], g['lon'])))}
                  for g in gates_by_route[route_id]],
        # The ridden line itself, decimated, plus each gate's index into it.
        # Without this a replay can only walk gate-to-gate in straight lines,
        # which is what the demo did before cycle 009.
        'path': [[round(a, 5), round(b, 5)] for a, b in pts[::3]],
        'gateIdx': [nearest_idx(pts[::3], g['lat'], g['lon']) for g in gates_by_route[route_id]],
        'sourceRide': fn,
    }

bundle = {'schemaVersion': 1, 'projection': 'web-mercator', 'routes': manifest}
json.dump(bundle, open(J(OUT, 'routes.json'), 'w'), indent=1)
# Same data as a plain script, for demos/routemap-preview.html. A file:// page
# cannot fetch() a sibling .json (opaque origin), but it can <script src> this.
# Emitted from the same dict in the same run, so it cannot drift.
with open(J('demos', 'routes-data.js'), 'w') as f:
    f.write('// GENERATED by data/analysis/08_build_route_assets.py — do not edit.\n')
    f.write('window.ROUTES_JSON = ')
    json.dump(bundle, f, indent=1)
    f.write(';\n')
for k, v in manifest.items():
    print(f"{k:9s} {v['image']}  {W}x{H}px  gates {[g['name'] for g in v['gates']]}  from {v['sourceRide'][:13]}")
print(f"wrote {len(manifest)} route assets to app/assets/routes/ "
      f"({len(_TRACK_CACHE)} GPX parsed, {_time.time() - _T0:.1f}s total)")
