#!/usr/bin/env python3
"""
Recolour the yellow gate-stroke of the launcher icon PNGs in place
(app/assets/icon.png, app/assets/adaptive-icon.png -- the two app.json wires).

The icon is three flat colours -- ground BG, ink ring INK, yellow gate YEL --
plus anti-aliased edges, and the yellow stroke crosses the ring, so an edge
pixel may blend yellow with EITHER ground or ink. Each pixel is therefore
decomposed by least squares as a barycentric blend of the three:
    p  = BG + wI*(INK - BG) + wY*(OLD - BG)
and only the yellow weight is re-pointed:
    p' = p + wY*(NEW - OLD)
Ground/ring pixels (wY = 0) stay byte-identical, pure yellow maps exactly to
NEW, edge pixels keep their exact coverage. The max residual of the 3-colour
fit is printed per file; above 16/255 the image is not the flat design this
assumes -> the script refuses. (A genuine 3-colour icon fits to < 7; a re-fit
of the RECOLOURED file lands ~12.5 because the new yellow has R=255, so the
54 yellow/ink edge pixels that overshot R cannot go higher -- invisible, but
it is why the guard is 16 and not 8. A gradient or a different design gives
residuals in the tens to hundreds.)

Run (any python3 with Pillow + numpy; the Cowork VM has both):
    python3 scripts/recolour-icon.py                # recolour in place
    python3 scripts/recolour-icon.py --check        # fit + report only, writes nothing
    python3 scripts/recolour-icon.py --old F5C542 --new FFDE6D   # explicit (these are the defaults)
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "app" / "assets"
FILES = [ASSETS / "icon.png", ASSETS / "adaptive-icon.png"]
BG = "17171B"    # ground (app.json adaptiveIcon.backgroundColor)
INK = "F4F2EC"   # ring (theme.ts colors.ink)
MAX_RESIDUAL = 16.0


def rgb(hexstr: str) -> np.ndarray:
    h = hexstr.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def hexof(v) -> str:
    return "#%02X%02X%02X" % tuple(int(x) for x in v)


def recolour(path: Path, old: np.ndarray, new: np.ndarray, write: bool) -> None:
    img = Image.open(path)
    if img.mode != "RGB":
        sys.exit(f"{path.name}: expected mode RGB, got {img.mode} -- stop and look")
    im = np.asarray(img, dtype=float)
    h, w, _ = im.shape
    bg, ink = rgb(BG), rgb(INK)
    basis = np.stack([ink - bg, old - bg], axis=1)            # 3x2
    weights = (im.reshape(-1, 3) - bg) @ np.linalg.pinv(basis).T   # Nx2 -> (wI, wY)
    fit = weights @ basis.T
    residual = np.linalg.norm((im.reshape(-1, 3) - bg) - fit, axis=1)
    w_y = np.clip(weights[:, 1], 0.0, 1.0)
    out = np.clip(im.reshape(-1, 3) + w_y[:, None] * (new - old), 0, 255)
    out = out.round().astype(np.uint8).reshape(h, w, 3)

    pure_old = int(np.all(im.reshape(-1, 3) == old, axis=1).sum())
    pure_new = int(np.all(out.reshape(-1, 3) == new.astype(np.uint8), axis=1).sum())
    ys, xs = np.where(np.all(im == old, axis=2))
    cx, cy = int(xs.mean()), int(ys.mean())
    print(f"== {path.name} {w}x{h}  max residual {residual.max():.2f}/255  "
          f"pure {hexof(old)} px: {pure_old} -> pure {hexof(new)} px: {pure_new}")
    for (x, y) in [(cx, cy), (0, 0), (w // 2, h // 2)]:
        print(f"   ({x},{y}) {hexof(im[y, x])} -> {hexof(out[y, x])}")
    if residual.max() > MAX_RESIDUAL:
        sys.exit(f"{path.name}: residual {residual.max():.2f} > {MAX_RESIDUAL} -- not a flat 3-colour image, refusing")
    if write:
        Image.fromarray(out, "RGB").save(path, optimize=True)
        print(f"   written {path}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--old", default="F5C542", help="current yellow hex (default F5C542)")
    ap.add_argument("--new", default="FFDE6D", help="target yellow hex (default FFDE6D)")
    ap.add_argument("--check", action="store_true", help="report only, write nothing")
    a = ap.parse_args()
    for f in FILES:
        if not f.exists():
            sys.exit(f"missing {f}")
        recolour(f, rgb(a.old), rgb(a.new), write=not a.check)


if __name__ == "__main__":
    main()
