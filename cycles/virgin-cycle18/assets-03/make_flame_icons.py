"""
Qualifire - virgin-cycle18 brief 03: notification flame icons, generated from
marketing/assets/qualifire_flame_layered_night.svg (the three nested flame paths).

  small icon  (status bar + shade header): WHITE silhouette on transparent, core cut out as a
              transparent hole. Android paints the small icon as a flat mask, so colour is
              irrelevant and only alpha matters. -> res/drawable-*/notification_icon.png
  large icon  (shade, coloured): the full layered night flame on the night background,
              256x256.                              -> res/drawable-nodpi/qualifire_flame_large.png

Run:  python3 make_flame_icons.py   (needs Pillow; writes ./res/...)
"""
import os, re
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = os.path.join(HERE, "..", "..", "..", "marketing", "assets", "qualifire_flame_layered_night.svg")
src = open(SVG, encoding="utf-8").read()
paths = re.findall(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})"', src)
assert len(paths) == 3, f"expected 3 flame paths, found {len(paths)}"
(outer_d, outer_c), (mid_d, mid_c), (core_d, core_c) = paths

def flatten(d, steps=48):
    """absolute M / C / Z only (that is all the flame uses) -> list of (x, y)"""
    t = re.findall(r"[MCZ]|-?\d+\.?\d*", d)
    pts, i, cur = [], 0, None
    while i < len(t):
        if t[i] == "M":
            cur = (float(t[i + 1]), float(t[i + 2])); pts.append(cur); i += 3
        elif t[i] == "C":
            i += 1
            while i < len(t) and t[i] not in "MCZ":
                p1 = (float(t[i]), float(t[i + 1])); p2 = (float(t[i + 2]), float(t[i + 3]))
                p3 = (float(t[i + 4]), float(t[i + 5])); i += 6
                for k in range(1, steps + 1):
                    u = k / steps; v = 1 - u
                    pts.append((v**3*cur[0] + 3*v*v*u*p1[0] + 3*v*u*u*p2[0] + u**3*p3[0],
                                v**3*cur[1] + 3*v*v*u*p1[1] + 3*v*u*u*p2[1] + u**3*p3[1]))
                cur = p3
        else:  # Z
            i += 1
    return pts

O, M, C = flatten(outer_d), flatten(mid_d), flatten(core_d)
xs = [p[0] for p in O]; ys = [p[1] for p in O]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)   # flame bounding box in SVG units
SS = 8                                                 # supersampling

def layer(pts, size, box, fill, canvas):
    """rasterise pts (svg units) into canvas; box=(left, top, scale) maps svg -> px"""
    l, t, s = box
    ImageDraw.Draw(canvas).polygon([((x - l) * s * SS, (y - t) * s * SS) for x, y in pts], fill=fill)

def small(size):
    pad = 0.08 * size
    s = min((size - 2 * pad) / (x1 - x0), (size - 2 * pad) / (y1 - y0))
    left = x0 - ((size / s) - (x1 - x0)) / 2
    top = y0 - ((size / s) - (y1 - y0)) / 2
    big = Image.new("L", (size * SS, size * SS), 0)          # alpha mask
    layer(O, size, (left, top, s), 255, big)
    layer(C, size, (left, top, s), 0, big)                   # core = transparent hole
    a = big.resize((size, size), Image.LANCZOS)
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    img.putalpha(a)
    return img

def large(size=256):
    side = 640.0                                             # svg units shown
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    s = size / side
    left, top = cx - side / 2, cy - side / 2
    big = Image.new("RGB", (size * SS, size * SS), "#17171b")
    for pts, col in ((O, outer_c), (M, mid_c), (C, core_c)):
        layer(pts, size, (left, top, s), col, big)
    return big.resize((size, size), Image.LANCZOS).convert("RGBA")

for folder, px in (("mdpi", 24), ("hdpi", 36), ("xhdpi", 48), ("xxhdpi", 72), ("xxxhdpi", 96)):
    d = os.path.join(HERE, "res", f"drawable-{folder}"); os.makedirs(d, exist_ok=True)
    small(px).save(os.path.join(d, "notification_icon.png"))
d = os.path.join(HERE, "res", "drawable-nodpi"); os.makedirs(d, exist_ok=True)
large().save(os.path.join(d, "qualifire_flame_large.png"))
print("ok")
