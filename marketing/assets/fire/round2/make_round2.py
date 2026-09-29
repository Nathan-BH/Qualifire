#!/usr/bin/env python3
"""Round 2: the smallest (core) flame is the BACKGROUND, so open it to the ground.
Imports the round-1 geometry/palette (make_fire.py). Run: python3 make_round2.py [outdir]"""
import sys, os
OUT = sys.argv[1] if len(sys.argv) > 1 else "out2"
sys.argv = [sys.argv[0], "out_tmp"]
import make_fire as mf
import numpy as np
os.makedirs(OUT, exist_ok=True)
K = mf.K
BX, BY = mf.cv(mf.START)

def base(m):
    return mf.fill(mf.path_d(1.0), m["ink"]) + mf.fill(mf.path_d(0.74), m["yel"])

def core_shifted(d):
    return lambda m: base(m) + mf.fill(mf.path_d(0.42, dy=d * K), m["bg"])

def stretched(d):
    """core tip stays where it was, base drops d units: uniform scale about a lowered anchor."""
    ay = 382 + d
    sc = (ay - (382 - 0.42 * 370)) / (ay - 12)
    return lambda m: base(m) + mf.fill(mf.path_d(sc, a=(200, ay)), m["bg"])

DESIGNS = [
    ("01-lowered-20", core_shifted(20)),
    ("02-lowered-34", core_shifted(34)),
    ("03-lowered-48", core_shifted(48)),
    ("04-stretched-34", stretched(34)),
    ("05-stretched-52", stretched(52)),
]

if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    from PIL import Image
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 800, "height": 800}, device_scale_factor=2)
        for slug, fn in DESIGNS:
            for mode, m in mf.MODES.items():
                s = mf.svg(fn(m), m); base_ = os.path.join(OUT, "%s_%s" % (slug, mode))
                open(base_ + ".svg", "w").write(s)
                pg.set_content('<body style="margin:0">%s</body>' % s)
                pg.screenshot(path=base_ + ".png", clip=dict(x=0, y=0, width=800, height=800))
        b.close()
    cell = 400; n = len(DESIGNS)
    # include the round-1 pick (02-layered-fill) as reference in column 0
    sheet = Image.new("RGB", (cell * (n + 1), cell * 2), "#000")
    ref = os.environ.get("REF", "")
    for j, mode in enumerate(["night", "day"]):
        if ref:
            sheet.paste(Image.open(os.path.join(ref, "02-layered-fill_%s.png" % mode)).convert("RGB").resize((cell, cell), Image.LANCZOS), (0, j * cell))
        for i, (slug, _) in enumerate(DESIGNS):
            sheet.paste(Image.open(os.path.join(OUT, "%s_%s.png" % (slug, mode))).convert("RGB").resize((cell, cell), Image.LANCZOS), ((i + 1) * cell, j * cell))
    sheet.save(os.path.join(OUT, "00-contact-sheet_round1-pick-then-round2.png"))
    print("ok")
