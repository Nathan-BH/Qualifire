#!/usr/bin/env python3
"""Qualifire flame explorations -- palette-only (night/day theme tokens from app/src/ui/theme.ts).
Emits SVG + PNG per design & mode, plus contact sheets. Run: python3 make_fire.py [outdir]
"""
import sys, os, math
import numpy as np

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)

# ---- palette (all from theme.ts) -------------------------------------------
YEL = "#F5C542"
MODES = {
    "night": dict(bg="#17171b", ink="#F4F2EC", yel=YEL, dim="#9a978f", soft="#41414c", gold=YEL, beige="#b5b3ac"),
    "day":   dict(bg="#FAF7EE", ink="#201F24", yel=YEL, dim="#8A8577", soft="#E0D9C4", gold="#B98A0A", beige="#E0D9C4"),
}

# ---- flame silhouette (400-unit box, y down): list of cubic segments -------
START = (200, 382)
SEGS = [
    ((118, 382), (78, 322), (84, 255)),
    ((88, 205), (120, 172), (134, 92)),     # up to small left tip
    ((150, 132), (164, 154), (172, 176)),   # back down to notch
    ((166, 112), (196, 66), (210, 12)),     # up to main tip
    ((236, 74), (302, 134), (316, 232)),
    ((324, 322), (272, 382), (200, 382)),
]
K = 1.5
TX, TY = 400 - 204 * K, 400 - 197 * K
ANCHOR = (200, 382)


def cv(p, s=1.0, a=ANCHOR, dx=0, dy=0, k=K, tx=None, ty=None):
    tx = TX if tx is None else tx
    ty = TY if ty is None else ty
    x = a[0] + s * (p[0] - a[0])
    y = a[1] + s * (p[1] - a[1])
    return (k * x + tx + dx, k * y + ty + dy)


def path_d(s=1.0, a=ANCHOR, close=True, **kw):
    f = lambda p: "%.2f %.2f" % cv(p, s, a, **kw)
    d = "M" + f(START)
    for c1, c2, e in SEGS:
        d += " C" + f(c1) + " " + f(c2) + " " + f(e)
    return d + (" Z" if close else "")


def sample_poly(n=60, **kw):
    pts = []
    p0 = np.array(cv(START, **kw))
    for c1, c2, e in SEGS:
        P = [p0, np.array(cv(c1, **kw)), np.array(cv(c2, **kw)), np.array(cv(e, **kw))]
        for t in np.linspace(0, 1, n, endpoint=False):
            pts.append((1 - t) ** 3 * P[0] + 3 * (1 - t) ** 2 * t * P[1] + 3 * (1 - t) * t ** 2 * P[2] + t ** 3 * P[3])
        p0 = P[3]
    return np.array(pts)


def intervals(poly, axis, val):
    """Intersections of the polygon with a line (axis=1: horizontal y=val -> xs; axis=0: vertical x=val -> ys)."""
    a, b = (0, 1) if axis == 1 else (1, 0)   # a = coord we scan along, b = fixed-coordinate index
    xs = []
    n = len(poly)
    for i in range(n):
        p, q = poly[i], poly[(i + 1) % n]
        v1, v2 = p[b], q[b]
        if (v1 - val) * (v2 - val) < 0:
            t = (val - v1) / (v2 - v1)
            xs.append(p[a] + t * (q[a] - p[a]))
    xs.sort()
    return [(xs[i], xs[i + 1]) for i in range(0, len(xs) - 1, 2)]


def svg(body, m, size=800):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">'
            '<rect width="%d" height="%d" fill="%s"/>%s</svg>' % (size, size, size, size, size, size, m["bg"], body))


def stroke(d, col, w, extra=""):
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" %s/>' % (d, col, w, extra)


def fill(d, col):
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="0" stroke-linejoin="round"/>' % (d, col, col)


# ---- designs ---------------------------------------------------------------
def d01_nested(m):
    """Concentric flame outlines, round caps like the Q ring."""
    cols = [m["ink"], m["yel"], m["ink"], m["yel"]]
    scales = [1.0, 0.72, 0.47, 0.24]
    return "".join(stroke(path_d(s), c, 16 if s > 0.3 else 14) for s, c in zip(scales, cols))


def d02_layered(m):
    """Three solid layers: ink outer, yellow mid, ground-coloured core."""
    return fill(path_d(1.0), m["ink"]) + fill(path_d(0.74), m["yel"]) + fill(path_d(0.42), m["bg"])


def d03_bars(m):
    """Vertical bars side by side; their tops trace the flame edge."""
    poly = sample_poly()
    out = []
    t = 20
    xs = np.arange(160, 641, 32)
    cx = 400
    for x in xs:
        segs = intervals(poly, 0, x)
        for y0, y1 in segs:
            y0 += t / 2 + 8
            y1 -= t / 2 + 8
            if y1 - y0 < 4:
                continue
            dist = abs(x - (cx + 4))
            col = m["yel"] if dist < 60 else (m["ink"] if dist < 140 else m["dim"])
            out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%d" stroke-linecap="round"/>' % (x, y0, x, y1, col, t))
    return "".join(out)


def d04_open(m):
    """Nested open contours (gap at the base) -- monoline, like the Q with its gap."""
    cols = [m["ink"], m["yel"], m["ink"], m["yel"]]
    scales = [1.0, 0.73, 0.48, 0.25]
    out = []
    for s, c in zip(scales, cols):
        d = path_d(s, close=False)
        out.append('<path d="%s" pathLength="1" fill="none" stroke="%s" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round" '
                   'stroke-dasharray="0.84 0.16" stroke-dashoffset="-0.08"/>' % (d, c, 16))
    return "".join(out)


def d05_q(m):
    """Flame inside the Q ring (logo geometry from qualifire_logo_5_monogram_only.svg)."""
    cx, cy = 393.24, 393.24
    ring = '<circle cx="%.2f" cy="%.2f" r="118" fill="none" stroke="%s" stroke-width="30"/>' % (cx, cy, m["ink"])
    tail = '<line x1="428.6" y1="428.6" x2="524.76" y2="524.76" stroke="%s" stroke-width="30" stroke-linecap="round"/>' % m["yel"]
    k = 0.42
    # place flame: centre of its box near (cx-8, cy-6)
    tx = (cx - 14) - 204 * k
    ty = (cy - 10) - 197 * k
    kw = dict(k=k, tx=tx, ty=ty)
    fl = (stroke(path_d(1.0, **kw), m["ink"], 10) + stroke(path_d(0.5, **kw), m["ink"], 10))
    return ring + tail + fl


def d06_lines(m):
    """Horizontal timing lines whose lengths form a flame; ink at base -> yellow at tip."""
    poly = sample_poly()
    out = []
    t = 14
    ys = np.arange(TY + 12 * K + 6, TY + 382 * K - 10, 24)
    ymin, ymax = ys.min(), ys.max()
    for y in ys:
        for x0, x1 in intervals(poly, 1, y):
            x0 += t / 2 + 8
            x1 -= t / 2 + 8
            if x1 - x0 < 4:
                continue
            f = (y - ymin) / (ymax - ymin)   # 0 top -> 1 base
            col = m["yel"] if f < 0.55 else (m["ink"] if f < 0.9 else m["dim"])
            out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%d" stroke-linecap="round"/>' % (x0, y, x1, y, col, t))
    return "".join(out)


DESIGNS = [
    ("01-nested-outlines", "Nested outlines", d01_nested),
    ("02-layered-fill", "Layered fill", d02_layered),
    ("03-vertical-bars", "Vertical bars", d03_bars),
    ("04-open-contours", "Open contours", d04_open),
    ("05-flame-in-Q", "Flame in the Q", d05_q),
    ("06-timing-lines", "Timing lines", d06_lines),
]

if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    from PIL import Image, ImageDraw, ImageFont
    files = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 800, "height": 800}, device_scale_factor=2)
        for slug, name, fn in DESIGNS:
            for mode, m in MODES.items():
                s = svg(fn(m), m)
                base = os.path.join(OUT, "%s_%s" % (slug, mode))
                open(base + ".svg", "w").write(s)
                pg.set_content('<html><body style="margin:0">%s</body></html>' % s)
                pg.screenshot(path=base + ".png", clip=dict(x=0, y=0, width=800, height=800))
                files.append((slug, mode, base + ".png"))
        b.close()
    # contact sheet
    cell = 400
    n = len(DESIGNS)
    sheet = Image.new("RGB", (cell * n, cell * 2), "#000")
    for i, (slug, name, _) in enumerate(DESIGNS):
        for j, mode in enumerate(["night", "day"]):
            im = Image.open(os.path.join(OUT, "%s_%s.png" % (slug, mode))).convert("RGB").resize((cell, cell), Image.LANCZOS)
            sheet.paste(im, (i * cell, j * cell))
    sheet.save(os.path.join(OUT, "00-contact-sheet.png"))
    # small-size legibility strip (icon sizes)
    sizes = [96, 48, 32]
    strip = Image.new("RGB", (n * 2 * 130, 110 * 2 + 20), "#888")
    x = 10
    for mode, bgc in [("night", None), ("day", None)]:
        pass
    y = 10
    for mode in ["night", "day"]:
        x = 10
        for slug, _, _ in DESIGNS:
            im = Image.open(os.path.join(OUT, "%s_%s.png" % (slug, mode))).convert("RGB")
            for sz in sizes:
                strip.paste(im.resize((sz, sz), Image.LANCZOS), (x, y + (96 - sz)))
                x += sz + 6
            x += 14
        y += 110
    strip = strip.crop((0, 0, min(strip.width, x + 10), strip.height))
    strip.save(os.path.join(OUT, "00-small-sizes.png"))
    print("done", len(files))
