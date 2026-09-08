#!/usr/bin/env python3
"""
Canonical source of design/canonical/*.svg.

Nathan's hand-edits live in design/edited/ and are mirrored back into THIS
script (his edited file is the truth until mirrored). Re-run:
    python3 design/make_screens.py [--repo-root PATH]

History: cycle 024/WP-J's re-emit pass (2026-08-24) drew the RECORD (four
phases), RIDES and RESULT screens once that cycle's WP-A/WP-B/WP-E had
landed. virgin-cycle5 D0 (2026-09-08) was a mechanical repair only — no
drawing changes — after WP-3 (2026-09-06) swapped the route/way vocabulary
app-wide and the asset manifest moved from app/assets/routes/routes.json to
app/assets/ways/ways.json. D1 added the RESULTS tab; D2 re-transcribed
ROUTES/RECORD/result->ride_detail. D3 (2026-09-08, optional per the brief)
added catalog_detail, gate_adjust, and a SETTINGS -> SPORTS section. See
cycles/virgin-cycle5/BRIEF-design-folder-plan.md for the full work list.

WP-B's free-ride "new" start/end option is UNRATIFIED (no agreed layout) and
is deliberately not drawn anywhere in this file — every RECORD screen below
depicts a normal known-route ride only. See design/README.md.

Implemented (13 screens x day/night = 26 files):
    routes, settings, demo, record_setup, record_armed, record_running,
    record_finished, rides, ride_detail, results, results_detail,
    catalog_detail, gate_adjust

Current source files this script reads/mirrors (re-grep before editing —
the tree moves fast):
    app/assets/ways/ways.json       — the "Morning" way's map/gate asset
    app/src/ui/theme.ts             — THEMES/COLORS token source of truth
    app/src/ui/wayMapView.tsx       — CASING const + map/gate-tick styling
    app/src/ui/chips.tsx            — tier chip colours (chipColors, PURPLE_INK)
    app/src/ui/settings.tsx         — the '#fff' switch-knob literal + SportsSection
    app/src/store/defaultWay.ts     — wayLabel()/wayVariantLabel(), mirrored
                                       below as way_label()/way_variant_label()
    app/src/store/catalog.seed.json — routes (parent) / ways (child) fixture,
                                       incl. gateSets (real chainageM per way)
    app/App.tsx                     — tab bar order + labels
    app/src/ui/RoutesScreen.tsx     — ROUTES screen section headings
    app/src/ui/RecordScreen.tsx     — RECORD screen phases
    app/src/ui/RidesScreen.tsx      — RIDES screen row layout
    app/src/ui/CatalogDetailScreen.tsx / catalogDetailModel.ts — catalog_detail
    app/src/ui/GateAdjustScreen.tsx / gateAdjustCard.tsx / gateAdjustModel.ts
                                     — gate_adjust (gate_name/fmt_chainage/
                                       fmt_pct below mirror gateAdjustModel.ts)
RideDetailScreen.tsx (WP-H) is what build_ride_detail() mirrors; ResultScreen.tsx
no longer exists.

Requirements satisfied here (brief WP-J-svg-tab-recompositions.md §5):
 - stdlib only, Python 3.
 - one function per screen taking a `theme` dict; THEMES{} transcribed from
   app/src/ui/theme.ts (source of truth — re-transcribe, never fork).
 - reads app/assets/ways/ways.json for the map polyline; --repo-root
   overrides the relative path so this runs in the sandbox and on Nathan's
   machine alike.
 - deterministic output (stable dict/list ordering, fixed-precision floats).
 - self-validates before writing (ALL files validated before ANY are written,
   so a late failure never leaves partial output on disk): id+label on every
   element, ids unique per file, nesting <=3 (layer -> group -> leaf), no
   <image>, every colour cross-checked against the hex literals actually
   present in theme.ts/chips.tsx/settings.tsx/wayMapView.tsx
   (load_allowed_colors) — not just against this script's own THEMES/COLORS
   transcription, which couldn't catch a typo in itself. Exits non-zero
   listing violations.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

# --------------------------------------------------------------------------
# canvas / namespaces
# --------------------------------------------------------------------------

VB_W, VB_H = 390, 844
SVG_NS = "http://www.w3.org/2000/svg"
INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"
ET.register_namespace("", SVG_NS)
ET.register_namespace("inkscape", INKSCAPE_NS)

FONT = "Inter, 'Segoe UI', system-ui, sans-serif"

# --------------------------------------------------------------------------
# THEMES — transcribed from app/src/ui/theme.ts (2026-08-22 read of the file
# staged at execution time). theme.ts is canonical: if it changes, re-run
# this transcription by hand — never fork a second copy of these values.
# --------------------------------------------------------------------------

COLORS = {
    "ink": "#F4F2EC",
    "inkDim": "#9a978f",
    "grey": "#6f6e6a",       # NO-DATA only
    "purple": "#A667F0",
    "purpleInk": "#120521",  # chips.tsx PURPLE_INK — text on a filled purple chip
    "green": "#3ED598",
    "neutral": "#F5C542",
    "amber": "#E8A33D",      # warnings / STOP — never red (D-013)
    "riderBlue": "#2F7DE1",  # theme.ts colors.riderBlue — WP-E rider dot; never a tier colour, never red
    "raceBgNight": "#0A0A0A",
    "raceCardNight": "#141414",
    "raceBorderNight": "#232323",
    "white": "#FFFFFF",
    # wayMapView.tsx's CASING const (2026-08-24 hotfix) — the black outline
    # under both the route line and gate ticks on the real map now. Lives in
    # wayMapView.tsx, not theme.ts, so load_allowed_colors() below also
    # scans that file for its cross-check to accept this literal.
    "casing": "#14120C",
}

THEMES = {
    "day": {
        "bg": "#FAF7EE", "card": "#FFFFFF", "cardBorder": "#E0D9C4",
        "text": "#201F24", "textDim": "#8A8577", "text2": "#6D6759",
        "accent": COLORS["neutral"], "accentText": "#B98A0A", "onAccent": "#17171b",
        "raceBg": "#FFFFFF", "raceCard": "#F5F1E6", "raceBorder": "#E4DECB",
    },
    "night": {
        "bg": "#17171b", "card": "#212127", "cardBorder": "#41414c",
        "text": COLORS["ink"], "textDim": COLORS["inkDim"], "text2": "#b5b3ac",
        "accent": COLORS["neutral"], "accentText": COLORS["neutral"], "onAccent": "#17171b",
        "raceBg": COLORS["raceBgNight"], "raceCard": COLORS["raceCardNight"],
        "raceBorder": COLORS["raceBorderNight"],
    },
}

TABS = ["RECORD", "RIDES", "ROUTES", "RESULTS", "SETTINGS", "DEMO"]

# D1/D2 (virgin-cycle5, 2026-09-08): D1 added results/results_detail; D2.3
# renamed result -> ride_detail (ResultScreen.tsx is gone — WP-H) and
# re-transcribed it against RideDetailScreen.tsx. D3 (2026-09-08, optional
# per the brief) added catalog_detail and gate_adjust.
IMPLEMENTED = [
    "routes", "settings", "demo",
    "record_setup", "record_armed", "record_running", "record_finished",
    "rides", "ride_detail",
    "results", "results_detail",
    "catalog_detail", "gate_adjust",
]
DEFERRED: list[str] = []


def _normalize_hex(v: str) -> str:
    v = v.strip().lower()
    if not v.startswith("#"):
        return v
    h = v[1:]
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return "#" + h


_HEX_RE = re.compile(r"#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])|#[0-9A-Fa-f]{3}(?![0-9A-Fa-f])")


def load_allowed_colors(repo_root: str) -> set[str]:
    """Independent cross-check (not the script's own THEMES/COLORS transcription):
    every hex literal actually written in app/src/ui/theme.ts, chips.tsx and
    settings.tsx (the '#fff' switch-knob literal lives there). A colour used in
    this script that isn't in THIS set is either a typo in the transcription
    above or something invented — either way the validator must catch it, which
    checking against our own THEMES dict never could."""
    found: set[str] = {"none", "transparent"}
    for rel in (
        "app/src/ui/theme.ts", "app/src/ui/chips.tsx", "app/src/ui/settings.tsx",
        # WP-J re-emit pass: the way/gate map rendering this pass draws now
        # follows wayMapView.tsx's own CASING const (2026-08-24 hotfix, file
        # renamed from routeMapView.tsx in WP-3), so that file is a
        # legitimate additional colour source-of-truth here.
        "app/src/ui/wayMapView.tsx",
    ):
        p = os.path.join(repo_root, rel)
        if not os.path.exists(p):
            # D0 (virgin-cycle5): this used to `continue` on a missing file,
            # which is exactly what let this allow-list rot unnoticed when
            # routeMapView.tsx was renamed to wayMapView.tsx — every
            # map-bearing screen's colours then silently failed the
            # validator's cross-check instead of failing loudly here. A
            # missing source-of-truth file is a script bug, not something to
            # skip past.
            raise FileNotFoundError(
                f"load_allowed_colors: expected colour source file missing: {p} "
                "(a source file was renamed/moved — update the list above)"
            )
        with open(p, "r", encoding="utf-8") as f:
            text = f.read()
        for m in _HEX_RE.finditer(text):
            found.add(_normalize_hex(m.group(0)))
    return found


# --------------------------------------------------------------------------
# tiny deterministic SVG builder — every element gets id == inkscape:label,
# generated here, never hand-typed at a call site.
# --------------------------------------------------------------------------

def fmt(n) -> str:
    if isinstance(n, int):
        return str(n)
    r = round(float(n), 2)
    if r == int(r):
        return str(int(r))
    return ("%.2f" % r).rstrip("0").rstrip(".")


def E(tag: str, id_: str, attrs: dict | None = None, text: str | None = None) -> ET.Element:
    e = ET.Element(tag)
    e.set("id", id_)
    e.set(f"{{{INKSCAPE_NS}}}label", id_)
    if attrs:
        for k, v in attrs.items():
            e.set(k, v if isinstance(v, str) else fmt(v))
    if text is not None:
        e.text = text
    return e


def sub(parent: ET.Element, tag: str, id_: str, attrs: dict | None = None, text: str | None = None) -> ET.Element:
    e = E(tag, id_, attrs, text)
    parent.append(e)
    return e


def new_svg() -> ET.Element:
    root = ET.Element("svg")
    root.set("xmlns", SVG_NS)
    root.set("viewBox", f"0 0 {VB_W} {VB_H}")
    root.set("width", str(VB_W))
    root.set("height", str(VB_H))
    return root


def layer(root: ET.Element, id_: str) -> ET.Element:
    g = sub(root, "g", id_, {})
    g.set(f"{{{INKSCAPE_NS}}}groupmode", "layer")
    return g


def group(parent: ET.Element, id_: str, attrs: dict | None = None) -> ET.Element:
    return sub(parent, "g", id_, attrs)


def rect(parent, id_, x, y, w, h, fill=None, stroke=None, sw=None, rx=None, opacity=None, dash=None):
    a = {"x": fmt(x), "y": fmt(y), "width": fmt(w), "height": fmt(h)}
    if fill is not None:
        a["fill"] = fill
    if stroke is not None:
        a["stroke"] = stroke
    if sw is not None:
        a["stroke-width"] = fmt(sw)
    if rx is not None:
        a["rx"] = fmt(rx)
    if opacity is not None:
        a["opacity"] = fmt(opacity)
    if dash is not None:
        a["stroke-dasharray"] = dash
    return sub(parent, "rect", id_, a)


def circle(parent, id_, cx, cy, r, fill=None, stroke=None, sw=None):
    a = {"cx": fmt(cx), "cy": fmt(cy), "r": fmt(r)}
    if fill is not None:
        a["fill"] = fill
    if stroke is not None:
        a["stroke"] = stroke
    if sw is not None:
        a["stroke-width"] = fmt(sw)
    return sub(parent, "circle", id_, a)


def line(parent, id_, x1, y1, x2, y2, stroke, sw=1, dash=None, cap="round", opacity=None):
    a = {
        "x1": fmt(x1), "y1": fmt(y1), "x2": fmt(x2), "y2": fmt(y2),
        "stroke": stroke, "stroke-width": fmt(sw), "stroke-linecap": cap,
    }
    if dash is not None:
        a["stroke-dasharray"] = dash
    if opacity is not None:
        a["opacity"] = fmt(opacity)
    return sub(parent, "line", id_, a)


def path(parent, id_, d, stroke=None, sw=None, fill="none", dash=None, cap="round", join="round"):
    a = {"d": d, "fill": fill}
    if stroke is not None:
        a["stroke"] = stroke
    if sw is not None:
        a["stroke-width"] = fmt(sw)
    if dash is not None:
        a["stroke-dasharray"] = dash
    a["stroke-linecap"] = cap
    a["stroke-linejoin"] = join
    return sub(parent, "path", id_, a)


def text_el(parent, id_, x, y, s, size, weight="400", color="#000", anchor="start",
            letter_spacing=None, upper=False, tabular=False):
    a = {
        "x": fmt(x), "y": fmt(y), "font-family": FONT, "font-size": fmt(size),
        "font-weight": str(weight), "fill": color, "text-anchor": anchor,
    }
    if letter_spacing is not None:
        a["letter-spacing"] = fmt(letter_spacing)
    if upper:
        a["style"] = "text-transform:uppercase"
    if tabular:
        a.setdefault("style", "")
        a["style"] = (a["style"] + ";" if a["style"] else "") + "font-variant-numeric:tabular-nums"
    return sub(parent, "text", id_, a, text=s)


def wrap_text(s: str, max_px: float, size: float) -> list[str]:
    """Greedy word-wrap using a fixed average-glyph-width estimate (no font
    metrics available at generation time) — good enough to keep body copy
    inside its card at this canvas's fixed font sizes."""
    avg = size * 0.56
    max_chars = max(6, int(max_px / avg))
    words = s.split(" ")
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = (cur + " " + w).strip()
        if len(trial) <= max_chars or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def text_block(parent, id_prefix, x, y, s, size, max_px, weight="400", color="#000",
                anchor="start", line_h=None, letter_spacing=None, upper=False,
                tabular=False) -> float:
    """Wraps `s` to fit max_px and draws each line as its own labelled leaf
    (id_prefix, or id_prefix_l1/_l2/... when more than one line). Returns the
    total height consumed so callers can advance their y-cursor.
    letter_spacing/upper/tabular default to text_el's own defaults (None/
    False/False), so every pass-1 call site (which never passed them) is
    unaffected by their addition here — added in the re-emit pass so a
    status-line-style uppercase+letterspaced string can WRAP instead of
    running off either edge of the canvas the way a bare text_el would."""
    lines = wrap_text(s, max_px, size)
    lh = line_h or size * 1.3
    multi = len(lines) > 1
    for i, ln in enumerate(lines):
        this_id = f"{id_prefix}_l{i+1}" if multi else id_prefix
        text_el(parent, this_id, x, y + i * lh, ln, size, weight=weight, color=color, anchor=anchor,
                letter_spacing=letter_spacing, upper=upper, tabular=tabular)
    return len(lines) * lh


# --------------------------------------------------------------------------
# way asset loading + schematic projection
# --------------------------------------------------------------------------

def load_way_asset(repo_root: str, way_id: str = "Morning") -> dict:
    p = os.path.join(repo_root, "app", "assets", "ways", "ways.json")
    with open(p, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    return manifest["ways"][way_id]


# Frozen "now" for the RoutesScreen.tsx dormant check (`activeUntilMs < now`),
# so canonical/ stays byte-identical across runs (real Date.now() would not).
# ~2026-08-22T12:00:00Z. None of the catalog's current offerAtStart:true rows
# carry a non-null activeUntilMs, so this constant has no effect on today's
# data — it only matters if a future landmark combines the two.
FROZEN_NOW_MS = 1787479200000


def load_catalog(repo_root: str) -> dict:
    p = os.path.join(repo_root, "app", "src", "store", "catalog.seed.json")
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def landmark_dormant(l: dict) -> bool:
    """RoutesScreen.tsx's own rule, verbatim: not offered at START, OR its
    active window has already ended."""
    if not l.get("offerAtStart", False):
        return True
    until = l.get("activeUntilMs")
    return until is not None and until < FROZEN_NOW_MS


def make_projector(asset: dict, x: float, y: float, w: float, h: float, pad: float = 10.0):
    """Equirectangular projection (cos-latitude corrected) of the asset's real
    ridden path, scaled to fit inside the given rect. y is flipped so north is
    up. Returns proj(lat, lon) -> (x, y)."""
    pts = asset["path"]
    lats = [p_[0] for p_ in pts]
    lons = [p_[1] for p_ in pts]
    lat0 = sum(lats) / len(lats)
    coslat = math.cos(math.radians(lat0))
    xs = [lon * coslat for lon in lons]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(lats), max(lats)
    spanx = (maxx - minx) or 1e-9
    spany = (maxy - miny) or 1e-9
    availw = w - 2 * pad
    availh = h - 2 * pad
    scale = min(availw / spanx, availh / spany)
    outw, outh = spanx * scale, spany * scale
    offx = x + pad + (availw - outw) / 2
    offy = y + pad + (availh - outh) / 2

    def proj(lat, lon):
        px = (lon * coslat - minx) * scale + offx
        py = (maxy - lat) * scale + offy
        return px, py

    return proj


def route_path_d(proj, pts, upto_idx: int | None = None) -> str:
    seq = pts if upto_idx is None else pts[: upto_idx + 1]
    if not seq:
        return ""
    d = []
    for i, (lat, lon) in enumerate(seq):
        px, py = proj(lat, lon)
        d.append(f"{'M' if i == 0 else 'L'}{fmt(px)} {fmt(py)}")
    return " ".join(d)


def gate_tick_endpoints(proj, pts, gate_idx: int, length: float = 13.0):
    i0 = max(0, gate_idx - 2)
    i1 = min(len(pts) - 1, gate_idx + 2)
    x0, y0 = proj(*pts[i0])
    x1, y1 = proj(*pts[i1])
    dx, dy = x1 - x0, y1 - y0
    norm = math.hypot(dx, dy) or 1.0
    dx, dy = dx / norm, dy / norm
    perp_x, perp_y = -dy, dx
    cx, cy = proj(*pts[gate_idx])
    return (cx - perp_x * length / 2, cy - perp_y * length / 2,
            cx + perp_x * length / 2, cy + perp_y * length / 2)


def draw_map(parent, id_prefix, t, asset, rect_xywh, gate_tiers, rider_at=None,
             rider_ahead_dotted=False, label_note=True, ground_fill=None, ground_border=None,
             rider_fill=None, rider_stroke=None, rider_off_route=False,
             route_casing=False, gate_casing=False, placeholder_size=0, sector_colours=None):
    """Schematic map, one <g> under `parent` (parent is already a layer or a
    group — this itself counts as ONE nesting level, so callers must add it
    directly under a layer, never under another group).
    gate_tiers: list[str|None] parallel to asset['gates'] — a colour hex or
    None (unscored -> dim theme-neutral tick).
    rider_at: None, or a gate name ('START'..'FINISH') or a float 0..1
    fraction of the ridden path length to place the rider dot at.
    ground_fill/ground_border: default to the PADDOCK card/cardBorder tokens
    (browse surfaces: Routes/Settings/Demo); record_finished passes the RACE
    raceCard/raceBorder tokens instead — wayMapView's frame always sits on
    t.race.bg, never the paddock card colour (theme.ts's two-mode rule).
    rider_fill/rider_stroke: default to the pass-1 convention (ink fill on
    the ground colour, "so it never reads as a scored tier"), used unchanged
    by routes/demo. The RECORD screens (re-emit pass) pass
    COLORS['riderBlue'] instead — wayMapView.tsx's real WP-E rider-dot
    colour, on-route solid riderBlue/white. rider_off_route=True mirrors its
    inverted convention (white fill, colour stroke) when rider_fill is given.
    route_casing/gate_casing (WP-J re-emit fix pass, 2026-08-24): default
    False so pass-1 callers (routes/settings/demo — frozen, never touched by
    this pass) render byte-identically to before. The RECORD screens pass
    True for both, matching wayMapView.tsx's same-day hotfix: a black
    CASING outline under the route line and under every gate tick, so the
    line/ticks read as one continuous solid design language instead of a
    bare colour stroke. gate_casing also changes the unscored-tick colour
    from t['textDim'] (the near-invisible grey the hotfix removed) to a
    thinner/dimmer t['accent'] (yellow), and draws a scored tick at full
    width/opacity in its earned tier colour — so a genuinely-scored ordinary/
    yellow-tier gate still reads visibly bolder than an unscored one (the
    same D-013/D-030 distinction the app's own hotfix makes; see
    wayMapView.tsx's gate-ticks layer comment).
    placeholder_size: the schematic-map disclaimer rect's side length in px.
    Default 0 (pass-1's original zero-size leaf, unchanged). The RECORD
    screens pass a small nonzero value so the element is actually selectable
    in Inkscape instead of a 0×0 rect nothing can click on.
    sector_colours (D2.2, virgin-cycle5, WP-K sector-coloured trail): list
    parallel to gate_tiers/asset['gates'] — index i is the colour of the
    SECTOR ENDING at gate i (the stretch of line between gate i-1 and gate
    i); index 0 (START) is always ignored, same contract as
    wayMapView.tsx's own `sectorColours` prop (sectorTrailModel.ts). None
    (default) draws no spans — every pre-D2.2 caller (routes/demo/record_
    setup/record_armed) is therefore byte-identical to before. When given,
    drawn as one coloured path per earned sector, width 5 (between the
    casing's 6 and the base core's 4, mirroring the app's casing(7)/
    core(4)/span(6) ordering at this schematic's own thinner scale), AFTER
    the route line and BEFORE the gate ticks — the same stacking order as
    wayMapView.tsx's route -> trail -> sector-spans -> gate-ticks sources,
    so an earned span outranks the base line and a gate tick still draws on
    top of everything. This REPLACES tick-colouring, it does not supplement
    it (WP-K, 2026-09-04): callers passing sector_colours also pass an
    all-None gate_tiers.
    """
    x, y, w, h = rect_xywh
    gfill = ground_fill or t["card"]
    gborder = ground_border or t["cardBorder"]
    m = group(parent, id_prefix, {})
    rect(m, f"{id_prefix}_ground", x, y, w, h, fill=gfill, stroke=gborder, sw=1, rx=16)
    # a few dim schematic street strokes — decorative context only, never
    # claimed as real streets beyond the ridden line itself.
    for i in range(3):
        sx = x + w * (0.18 + i * 0.32)
        line(m, f"{id_prefix}_street_{i+1}", sx, y + 6, sx + w * 0.1, y + h - 6, gborder, 2)

    pts = asset["path"]
    proj = make_projector(asset, x, y, w, h)
    gate_idx = asset["gateIdx"]  # indices into pts for G1..G3 (START=0, FINISH=len-1 implied)
    full_idx = [0] + list(gate_idx) + [len(pts) - 1]

    # route line: solid throughout by default; when a rider position is given
    # and rider_ahead_dotted, solid BEHIND the rider and dotted AHEAD (running
    # / finished honesty convention, brief §2).
    if rider_at is not None and rider_ahead_dotted:
        rider_idx = _rider_index(rider_at, full_idx, len(pts))
        path(m, f"{id_prefix}_route_line_done", route_path_d(proj, pts, rider_idx),
             stroke=t["accent"], sw=3)
        if rider_idx < len(pts) - 1:
            d_ahead = route_path_d(proj, pts[rider_idx:], None)
            path(m, f"{id_prefix}_route_line_ahead", d_ahead, stroke=t["accent"], sw=3, dash="2,4")
    else:
        d = route_path_d(proj, pts)
        if route_casing:
            path(m, f"{id_prefix}_route_line_casing", d, stroke=COLORS["casing"], sw=6)
            path(m, f"{id_prefix}_route_line", d, stroke=t["accent"], sw=4)
        else:
            path(m, f"{id_prefix}_route_line", d, stroke=t["accent"], sw=3)

    # D2.2 (virgin-cycle5, WP-K sector-coloured trail): one earned-colour
    # span per sector, painted over the base route line — see this
    # function's own docstring for the stacking-order rationale.
    if sector_colours:
        for i in range(1, len(full_idx)):
            col = sector_colours[i] if i < len(sector_colours) else None
            if not col:
                continue
            seg_pts = pts[full_idx[i - 1]:full_idx[i] + 1]
            path(m, f"{id_prefix}_sector_span_{i}", route_path_d(proj, seg_pts), stroke=col, sw=5)

    # gate ticks: thin perpendicular line, dim theme-neutral when unscored,
    # tier-coloured once scored (WP-E's target rendering — brief §2).
    names = [g["name"] for g in asset["gates"]]
    for i, name in enumerate(names):
        gi = full_idx[i]
        x1, y1, x2, y2 = gate_tick_endpoints(proj, pts, gi)
        tier_col = gate_tiers[i] if i < len(gate_tiers) else None
        if gate_casing:
            line(m, f"{id_prefix}_gate_tick_{i+1}_casing", x1, y1, x2, y2, COLORS["casing"], 5)
            core_col = tier_col if tier_col else t["accent"]
            line(m, f"{id_prefix}_gate_tick_{i+1}", x1, y1, x2, y2, core_col,
                 3 if tier_col else 2, opacity=1 if tier_col else 0.6)
        else:
            col = tier_col if tier_col else t["textDim"]
            line(m, f"{id_prefix}_gate_tick_{i+1}", x1, y1, x2, y2, col, 3 if tier_col else 2)

    # rider dot: distinct colour from gates (WP-E) — drawn as ink so it never
    # reads as a scored tier the way a gate colour would.
    if rider_at is not None:
        rider_idx = _rider_index(rider_at, full_idx, len(pts))
        rx_, ry_ = proj(*pts[rider_idx])
        base_fill = rider_fill if rider_fill is not None else t["text"]
        base_stroke = rider_stroke if rider_stroke is not None else gfill
        if rider_off_route and rider_fill is not None:
            fill_c, stroke_c = COLORS["white"], base_fill
        else:
            fill_c, stroke_c = base_fill, base_stroke
        circle(m, f"{id_prefix}_rider_dot", rx_, ry_, 5.5, fill=fill_c, stroke=stroke_c, sw=2)

    if label_note:
        # labelled so Nathan knows this rect is schematic, not a real basemap
        # render — a leaf (never a group: it must not add a nesting level),
        # comment-free, its label alone documents it. placeholder_size>0
        # (RECORD screens) keeps it big enough to actually select in
        # Inkscape; 0 (pass-1's original, unchanged) stays a 0×0 no-op.
        # fill="none" only when placeholder_size>0 (RECORD screens): at
        # placeholder_size==0 (pass-1, unchanged) an unset fill was invisible
        # simply because the rect had no area to paint — adding the
        # attribute unconditionally here once broke pass-1's byte-identical
        # output for no visual reason (0×0 paints nothing regardless of
        # fill). At placeholder_size>0 leaving fill unset would paint SVG's
        # default black fill as a visible speck in the map's corner — this
        # is where "none" actually matters.
        note_attrs = {"x": fmt(x), "y": fmt(y), "width": fmt(placeholder_size), "height": fmt(placeholder_size)}
        if placeholder_size:
            note_attrs["fill"] = "none"
        sub(m, "rect", f"{id_prefix}_placeholder_note", note_attrs)
    return m


def _rider_index(rider_at, full_idx, path_len):
    names = ["START", "G1", "G2", "G3", "FINISH"]
    if isinstance(rider_at, str):
        i = names.index(rider_at)
        return full_idx[i]
    frac = max(0.0, min(1.0, float(rider_at)))
    return min(path_len - 1, int(round(frac * (path_len - 1))))


def draw_tabbar(root_svg, t, active: str):
    """App-faithful: App.tsx's bar is a horizontally-SCROLLING row (its own
    comment: "Six tabs do not fit at a readable size, so the bar scrolls
    sideways rather than wrapping or shrinking the text") — real cell width
    (minWidth 92, no extra flex space in an unbounded ScrollView content) and
    real type (13px, weight 700, letterSpacing 2), scrolled just far enough
    to bring the active tab fully into view, clipped to the 390-wide
    viewport exactly as the phone screen would clip it.
    """
    TAB_W = 92
    FONT_SIZE = 13
    n = len(TABS)
    total_w = TAB_W * n
    active_i = TABS.index(active)
    active_left = TAB_W * active_i
    active_right = active_left + TAB_W
    offset = 0.0
    if total_w > VB_W:
        offset = max(0.0, active_right - VB_W)
        offset = min(offset, total_w - VB_W)

    tb = layer(root_svg, "tabbar")
    y0 = VB_H - 54
    rect(tb, "tabbar_bg", 0, y0, VB_W, 54, fill=t["bg"])
    line(tb, "tabbar_top_border", 0, y0, VB_W, y0, t["cardBorder"], 1)

    # Clip strictly to the visible 390x54 strip — the app never shows a tab
    # spilling past the screen edge, it scrolls it out of view instead.
    defs = root_svg.find("defs")
    if defs is None:
        defs = ET.SubElement(root_svg, "defs")
        root_svg.remove(defs)
        root_svg.insert(0, defs)
    clip = ET.SubElement(defs, "clipPath")
    clip.set("id", "tabbar_viewport_clip")
    clip_rect = ET.SubElement(clip, "rect")
    clip_rect.set("x", fmt(0))
    clip_rect.set("y", fmt(y0))
    clip_rect.set("width", fmt(VB_W))
    clip_rect.set("height", fmt(54))
    tb.set("clip-path", "url(#tabbar_viewport_clip)")

    for i, name in enumerate(TABS):
        cell_x = TAB_W * i - offset
        cx = cell_x + TAB_W / 2
        is_active = name == active
        if is_active:
            line(tb, f"tabbar_{name.lower()}_active_bar", cell_x + 4, y0 + 2,
                 cell_x + TAB_W - 4, y0 + 2, t["accent"], 3)
        text_el(
            tb, f"tabbar_{name.lower()}_label", cx, y0 + 34, name, FONT_SIZE, weight="700",
            color=t["text"] if is_active else t["textDim"], anchor="middle",
            letter_spacing=2, upper=True,
        )
    return tb


def draw_theme_pill(parent, t, mode_name: str):
    label = "☾ night" if mode_name == "day" else "☀ day"
    g = group(parent, "content_theme_pill", {})
    rect(g, "content_theme_pill_bg", VB_W - 96, 14, 80, 28, fill="none",
         stroke=t["cardBorder"], sw=1, rx=14)
    text_el(g, "content_theme_pill_label", VB_W - 56, 32, label, 12, color=t["textDim"], anchor="middle")
    return g


# --------------------------------------------------------------------------
# re-emit-pass helpers (record_setup/armed/running/finished, rides, result) —
# added 2026-08-24 alongside the six builders below. Kept separate from the
# pass-1 helpers above rather than folded into draw_map/draw_tabbar etc, so
# that no pass-1 call site's behaviour (and therefore no pass-1 canonical
# byte) changes just because these were added.
# --------------------------------------------------------------------------

WAY_DISPLAY_ID = {
    "Morning": "HomeWorkDry",
    "MorningB": "HomeWorkWet",
    "EveningA": "WorkHomeDry",
    "EveningB": "WorkHomeWet",
    "StationHomePreferred": "StationHomeDry",
    "WorkStationA": "WorkStationAlt",
    "WorkStationB": "WorkStationStd",
}


def way_label(way_id: str) -> str:
    """Mirrors store/defaultWay.ts's wayLabel() exactly: the ruled
    display-name overlay (Nathan 2026-08-26) first, then split-on-capitals:
    'Morning' -> 'Home Work Dry', 'WorkChurchA' -> 'Work Church A'
    (no overlay entry, derived unchanged)."""
    return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", WAY_DISPLAY_ID.get(way_id, way_id))


def way_variant_label(way_id: str, route: dict) -> str:
    """Mirrors store/defaultWay.ts's wayVariantLabel() exactly (2-arg case —
    no specs, not a user-minted id; every fixture way in this script is a
    seeded one with no specs, so the specs/isUserMintedWayId branches added
    to the real function never fire against this script's data and are not
    reproduced here): display id (overlay applied) minus the route's
    capitalized landmark-id pair, split on capitals — 'Morning' on
    home>work -> 'Dry', 'StationWorkStd' -> 'Std'; falls back to
    way_label() for any off-convention id."""
    display = WAY_DISPLAY_ID.get(way_id, way_id)
    prefix = route["startLandmarkId"].capitalize() + route["endLandmarkId"].capitalize()
    if display.startswith(prefix) and len(display) > len(prefix):
        return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", display[len(prefix):])
    return way_label(way_id)


def chip_palette(tier: str, t: dict) -> tuple[str, str, str]:
    """Mirrors chips.tsx's chipColors() exactly — (bg, border, text). Note
    the PURPLE_INK text is only legible against the matching bg=colors.purple
    FILL (as LiveBigChip/LiveLapChip/StripSlot always pair it) — see
    chip_text_for_bare_text() below for the one real place the app itself
    reuses this same text colour WITHOUT that fill."""
    if tier == "purple":
        return (COLORS["purple"], COLORS["purple"], COLORS["purpleInk"])
    if tier == "green":
        return ("none", COLORS["green"], COLORS["green"])
    if tier == "neutral":
        return ("none", "none", t["accentText"])
    if tier == "yellow":
        return ("none", "none", COLORS["neutral"])
    if tier == "est":
        return ("none", COLORS["grey"], COLORS["grey"])
    return ("none", "none", COLORS["grey"])


def tier_line_colour(tier: str) -> str | None:
    """Mirrors tierColour.ts's tierLineColour() exactly — the colour a tier
    paints on a MAP LINE (sector-coloured trail), deliberately NOT
    chip_palette(tier, t)[2]: purple's chip text is PURPLE_INK (near-black,
    legible only against a filled purple chip background), which would
    paint a purple sector's line almost black — tierLineColour.ts's own
    documented 2026-09-02 DEMO-tab bug class. Used by D2.2's sector-span
    drawing (draw_map's sector_colours) and by ride_detail's map."""
    if tier == "purple":
        return COLORS["purple"]
    if tier == "green":
        return COLORS["green"]
    if tier == "yellow":
        return COLORS["neutral"]
    return None


# --------------------------------------------------------------------------
# D3 (virgin-cycle5, 2026-09-08): catalog_detail / gate_adjust helpers —
# mirror catalogDetailModel.ts's fmtLengthM() and gateAdjustModel.ts's
# gateName()/fmtChainage()/fmtPct() exactly (Python names snake_cased to
# match this file's own convention, e.g. way_label() for wayLabel()).
# --------------------------------------------------------------------------

def fmt_length_m(m: float) -> str:
    """Mirrors catalogDetailModel.ts's fmtLengthM(): '5.8 km' / '850 m'."""
    if m < 1000:
        return f"{round(m)} m"
    return f"{m / 1000:.1f} km"


def gate_name(index: int, n_gates: int) -> str:
    """Mirrors gateAdjustModel.ts's gateName() exactly."""
    if index == 0:
        return "START"
    if index == n_gates - 1:
        return "FINISH"
    return f"G{index}"


def fmt_chainage(m: float) -> str:
    """Mirrors gateAdjustModel.ts's fmtChainage() exactly:
    '1842' -> '1 842 m' (thousands grouped on a plain space)."""
    v = str(round(m))
    parts: list[str] = []
    while len(v) > 3:
        parts.insert(0, v[-3:])
        v = v[:-3]
    parts.insert(0, v)
    return " ".join(parts) + " m"


def fmt_pct(chainage_m: float, ref_length_m: float) -> str:
    """Mirrors gateAdjustModel.ts's fmtPct() exactly."""
    if ref_length_m <= 0:
        return "— %"
    return f"{(chainage_m / ref_length_m) * 100:.1f} %"


def way_path_length_m(asset: dict) -> float:
    """[ASSUMPTION] (D3, virgin-cycle5): the real app's refLengthM comes from
    a runtime reference line (live/refs.ts) this offline tooling cannot
    read. A haversine sum over the SAME schematic path ways.json already
    carries (asset['path'] — the very points make_projector()/draw_map()
    already draw) is the closest approximation available, not the real
    GPX-precision figure. Used only by catalog_detail's 'length' fact and
    gate_adjust's %-of-way readout."""
    pts = asset["path"]
    total = 0.0
    for i in range(1, len(pts)):
        total += _haversine_m(pts[i - 1], pts[i])
    return total


def _haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(x))


def draw_strip_slot(parent, id_prefix, x, y, w, h, t, tier, label, time=None, current=False):
    """Mirrors chips.tsx's <StripSlot>: border is t.accent when current,
    else t.raceBorder when empty (tier 'none'), else the tier's own border;
    label colour is t.textDim when empty (current counts as empty — the real
    component keys off tier alone), else the tier's chip text colour."""
    bg, border, text = chip_palette(tier, t)
    empty = tier == "none"
    border_col = t["accent"] if current else (t["raceBorder"] if empty else border)
    label_col = t["textDim"] if empty else text
    rect(parent, f"{id_prefix}_bg", x, y, w, h, fill=bg, stroke=border_col, sw=2, rx=10)
    text_el(parent, f"{id_prefix}_label", x + w / 2, y + h * 0.42, label, 13, weight="700",
            color=label_col, anchor="middle")
    if time:
        text_el(parent, f"{id_prefix}_time", x + w / 2, y + h * 0.76, time, 13, weight="700",
                color=text, anchor="middle", tabular=True)


def measure_pill_w(label: str) -> float:
    return max(34.0, 6.3 * len(label) + 22.0)


def draw_pill_row(parent, id_prefix, t, x, y, max_w, items):
    """items: list of (label, active). Lays pills left to right, wrapping to
    a new line when the next pill would cross max_w — mirrors RN's
    pillRow (flexDirection row, flexWrap wrap, gap 6). Returns the total
    height consumed so callers can advance their y-cursor. Each pill is a
    group appended directly to `parent` (must itself be a layer, same
    constraint as draw_map — see its docstring)."""
    gap = 6
    pill_h = 24
    cx, cy = x, y
    for i, (label, active) in enumerate(items):
        w = measure_pill_w(label)
        if cx != x and cx + w > x + max_w:
            cx = x
            cy += pill_h + gap
        pid = f"{id_prefix}_pill_{i + 1}"
        g = group(parent, pid, {})
        rect(g, f"{pid}_bg", cx, cy, w, pill_h, fill="none",
             stroke=t["accent"] if active else t["cardBorder"], sw=1, rx=12)
        text_el(g, f"{pid}_label", cx + w / 2, cy + pill_h - 7, label, 11.5,
                color=t["accentText"] if active else t["textDim"], anchor="middle")
        cx += w + gap
    return (cy - y) + pill_h


# --------------------------------------------------------------------------
# D1 (virgin-cycle5, 2026-09-08): RESULTS tab helpers — a faithful Python
# mirror of resultsPlotModel.ts's buildPlotModel() (never a hand-sketched
# scatter), plus colourModel.fmt()/towerModel.towerDate() re-transcribed so
# the RESULTS screens' placeholder times/dates print in the app's own
# formats. Kept in its own block, separate from the pass-1/re-emit-pass
# helpers above, since nothing before D1 needs a time-series plot.
# --------------------------------------------------------------------------

def fmt_time(s: float, decimals: int = 0) -> str:
    """Mirrors colourModel.ts's fmt() exactly: round BEFORE splitting
    minutes (rounding after produces "9:60"-style overflow)."""
    if decimals == 1:
        whole = math.floor(s * 10) / 10
    else:
        whole = float(round(s))
    m = math.floor(whole / 60)
    rest = whole - m * 60
    sec = ("%.1f" % rest) if decimals == 1 else str(int(round(rest)))
    pad = "0" if rest < 10 else ""
    return f"{int(m)}:{pad}{sec}"


_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_DAY_MS = 86_400_000


def _dt_ms(y: int, mo: int, d: int, h: int = 12) -> float:
    """A fixture ride's timestamp, ms since epoch, UTC noon (the hour is
    arbitrary — only relative spacing/weekday matter for these placeholder
    rides, never a real one — README rule)."""
    return datetime(y, mo, d, h, tzinfo=timezone.utc).timestamp() * 1000.0


def tower_date(ms: float) -> str:
    """Mirrors towerModel.ts's towerDate() exactly: 'Tue 05 Aug'. getDay()
    (JS, Sun=0) <-> Python's weekday() (Mon=0) via (weekday()+1) % 7."""
    d = datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
    dow = (d.weekday() + 1) % 7
    return f"{_WEEKDAYS[dow]} {d.day:02d} {_MONTHS[d.month - 1]}"


# ------------------------------------------------ resultsPlotModel.ts mirror

PLOT_N = 9  # colourModel.ts's WINDOW_PREV (WINDOW_N=10 minus the judged ride)
PAD_L, PAD_R = 12.0, 12.0
PLOT_H = 220.0
GUTTER_W = 44.0
MIN_SPAN_S = 30.0
MIN_SPAN_FRAC = 0.05
PAD_FRAC = 0.10
TICK_STEPS_S = [5, 10, 15, 20, 30, 60, 120, 300, 600, 900]
MAX_Y_TICKS = 5
MAX_X_TICKS = 6
WEEKLY_TICKS_UNDER_DAYS = 45
LABEL_COLLISION_PX = 12.0
POINT_R = 4.0
FASTEST_R = 5.0


def _mean(values: list[float]) -> float:
    return sum(values) / len(values)


def _median(values: list[float]) -> float:
    s = sorted(values)
    n = len(s)
    mid = n // 2
    return (s[mid - 1] + s[mid]) / 2 if n % 2 == 0 else s[mid]


def fit_domain(times: list[float]) -> tuple[float, float, float]:
    """Mirrors fitDomain(): the window's own range widened to include the
    mean, floored to a minimum span, then padded 10% each side."""
    mean_s = _mean(times)
    with_mean = times + [mean_s]
    lo, hi = min(with_mean), max(with_mean)
    span = hi - lo
    min_span = max(MIN_SPAN_S, MIN_SPAN_FRAC * _median(times))
    if span < min_span:
        mid = (lo + hi) / 2
        lo, hi = mid - min_span / 2, mid + min_span / 2
        span = min_span
    pad = PAD_FRAC * span
    return lo - pad, hi + pad, mean_s


def tone_for(times: list[float], mean_s: float) -> list[str]:
    """Mirrors toneFor(): 'fastest' = the minimum (ties: oldest/first
    occurrence); else faster/slower than the window's own mean."""
    min_t = min(times)
    fastest_idx = times.index(min_t)
    return ["fastest" if i == fastest_idx else ("faster" if t < mean_s else "slower")
            for i, t in enumerate(times)]


def _x_at(ms: float, t_oldest: float, t_newest: float, plot_w: float) -> float:
    denom = t_newest - t_oldest
    if denom == 0:
        return plot_w - PAD_R
    return PAD_L + ((ms - t_oldest) / denom) * (plot_w - PAD_L - PAD_R)


def _y_at(time_s: float, y_min: float, y_max: float) -> float:
    return ((time_s - y_min) / (y_max - y_min)) * PLOT_H


def _tick_count_for_step(y_min: float, y_max: float, step: float) -> int:
    first = math.ceil(y_min / step) * step
    count = 0
    v = first
    while v <= y_max + 1e-9:
        count += 1
        v += step
    return count


def build_y_ticks(y_min: float, y_max: float, mean_y: float) -> list[tuple[float, str | None]]:
    step = TICK_STEPS_S[-1]
    for cand in TICK_STEPS_S:
        if _tick_count_for_step(y_min, y_max, cand) <= MAX_Y_TICKS:
            step = cand
            break
    first = math.ceil(y_min / step) * step
    ticks: list[tuple[float, str | None]] = []
    v = first
    while v <= y_max + 1e-9:
        at = _y_at(v, y_min, y_max)
        label = None if abs(at - mean_y) <= LABEL_COLLISION_PX else fmt_time(v)
        ticks.append((at, label))
        v += step
    return ticks


def _add_months(y: int, mo: int, n: int) -> tuple[int, int]:
    idx = (mo - 1) + n
    return y + idx // 12, idx % 12 + 1


def _month_boundaries_in_range(from_ms: float, to_ms: float) -> list[float]:
    start = datetime.fromtimestamp(from_ms / 1000.0, tz=timezone.utc)
    y, mo = start.year, start.month
    d_ms = datetime(y, mo, 1, tzinfo=timezone.utc).timestamp() * 1000.0
    if d_ms < from_ms:
        y, mo = _add_months(y, mo, 1)
        d_ms = datetime(y, mo, 1, tzinfo=timezone.utc).timestamp() * 1000.0
    out: list[float] = []
    while d_ms <= to_ms:
        out.append(d_ms)
        y, mo = _add_months(y, mo, 1)
        d_ms = datetime(y, mo, 1, tzinfo=timezone.utc).timestamp() * 1000.0
    return out


def _mondays_in_range(from_ms: float, to_ms: float) -> list[float]:
    start = datetime.fromtimestamp(from_ms / 1000.0, tz=timezone.utc)
    d = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    dow = (d.weekday() + 1) % 7  # JS getDay() equivalent, Sun=0
    d = d + timedelta(days=(1 - dow + 7) % 7)
    out: list[float] = []
    while d.timestamp() * 1000.0 <= to_ms:
        ms = d.timestamp() * 1000.0
        if ms >= from_ms:
            out.append(ms)
        d = d + timedelta(days=7)
    return out


def _keep_every_nth(arr: list[float], n: int) -> list[float]:
    """Keeps every n-th element counting BACK from the newest — the newest
    candidate always survives (mirrors keepEveryNth())."""
    out: list[float] = []
    i = len(arr) - 1
    while i >= 0:
        out.insert(0, arr[i])
        i -= n
    return out


def _month_label(ms: float, is_first: bool) -> str:
    d = datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
    mon = _MONTHS[d.month - 1]
    with_year = is_first or d.month == 1
    return f"{mon} {str(d.year)[-2:]}" if with_year else mon


def _monday_label(ms: float) -> str:
    d = datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
    return f"{d.day:02d} {_MONTHS[d.month - 1]}"


def build_x_ticks(t_oldest: float, t_newest: float, plot_w: float) -> list[tuple[float, str]]:
    span_days = (t_newest - t_oldest) / _DAY_MS
    weekly = span_days < WEEKLY_TICKS_UNDER_DAYS
    candidates = (_mondays_in_range(t_oldest, t_newest) if weekly
                  else _month_boundaries_in_range(t_oldest, t_newest))
    if not candidates:
        return [(_x_at(t_oldest, t_oldest, t_newest, plot_w), tower_date(t_oldest)),
                (_x_at(t_newest, t_oldest, t_newest, plot_w), tower_date(t_newest))]
    if len(candidates) > MAX_X_TICKS:
        candidates = _keep_every_nth(candidates, math.ceil(len(candidates) / MAX_X_TICKS))
    return [(_x_at(ms, t_oldest, t_newest, plot_w),
              _monday_label(ms) if weekly else _month_label(ms, i == 0))
            for i, ms in enumerate(candidates)]


def build_plot_model(rides: list[tuple[float, float]], plot_w: float) -> dict:
    """`rides`: (startedAtMs, timeS) ascending, already the plotWindow (the
    last <=PLOT_N ranked rides — see plotWindow() in resultsPlotModel.ts,
    mirrored by the caller choosing the fixture's own window). Mirrors
    buildPlotModel() field-for-field so every pixel on results_detail's
    scatterplot comes from this projection, never a hand-placed dot."""
    window_n = len(rides)
    if window_n == 0:
        return {"points": [], "plot_w": plot_w, "plot_h": PLOT_H, "y_min": 0.0, "y_max": 0.0,
                "mean_s": None, "mean_y": None, "y_ticks": [], "x_ticks": [], "window_n": 0,
                "empty": "no-ranked"}
    times = [r[1] for r in rides]
    y_min, y_max, mean_s = fit_domain(times)
    tones = tone_for(times, mean_s)
    t_oldest, t_newest = rides[0][0], rides[-1][0]
    points = [
        {"ms": ms, "time_s": ts, "x": _x_at(ms, t_oldest, t_newest, plot_w),
         "y": _y_at(ts, y_min, y_max), "tone": tone}
        for (ms, ts), tone in zip(rides, tones)
    ]
    mean_y = _y_at(mean_s, y_min, y_max)
    return {
        "points": points, "plot_w": plot_w, "plot_h": PLOT_H, "y_min": y_min, "y_max": y_max,
        "mean_s": mean_s, "mean_y": mean_y,
        "y_ticks": build_y_ticks(y_min, y_max, mean_y),
        "x_ticks": build_x_ticks(t_oldest, t_newest, plot_w),
        "window_n": window_n, "empty": "none",
    }


def tone_colour(tone: str) -> str:
    """Mirrors resultsPlot.tsx's toneColour(): fastest=purple,
    faster=green, else YELLOW_TIER (tierColour.ts: colors.neutral)."""
    if tone == "fastest":
        return COLORS["purple"]
    if tone == "faster":
        return COLORS["green"]
    return COLORS["neutral"]


# --------------------------------------------------------------------------
# screen builders — one function per screen, implemented this pass
# --------------------------------------------------------------------------

def build_routes(theme_name: str, repo_root: str) -> ET.Element:
    """D2.1 (virgin-cycle5, re-transcribed 2026-09-08): RoutesScreen.tsx read
    fresh — post-WP-K (tap-only, no expanded row) and post-WP-3 (route/way
    vocabulary). Sport badge -> YOUR PLACES (every landmark, shared across
    sports, dormant AND/OR "not used by this sport" flagged) -> ROUTES (one
    plain card per catalog route, tap-only — no map, no gate count, no
    delete button ever renders here; that content now lives on
    CatalogDetailScreen, D3, out of scope here).

    [ASSUMPTION] catalog.seed.json carries no sport of its own (see the D1
    RESULTS-tab helpers' own note above) — FIXTURE_SPORT_LABEL stands in for
    activeSportId()/sportLabel, and every one of its 13 routes is treated as
    belonging to that one fixture sport, so `usedLandmarkIds` (and therefore
    which landmark reads "not used by <sport>") comes out exactly as it
    would for a real single-sport install: every landmark except
    "family home (Puttestraat)" is referenced by at least one route.

    [ASSUMPTION] draws every one of the catalog's 13 routes, unfiltered/
    unsorted — RoutesScreen.tsx's own `.map()` over CATALOG.routes takes no
    subset either. The drawn canvas therefore runs taller than the nominal
    390x844 phone frame (same as a real ScrollView scrolling further) —
    intentional, not a layout bug; Inkscape's canvas shows the overflow
    fine. The tab bar (drawn last, fixed position) is unaffected."""
    t = THEMES[theme_name]
    catalog = load_catalog(repo_root)
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 20.0
    # Q5: bare sport-name badge, same convention as RIDES/RESULTS.
    text_el(content, "content_sport_badge", 16, y, FIXTURE_SPORT_LABEL.upper(), 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 24

    text_el(content, "content_places_heading", 16, y, "YOUR PLACES", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16

    # Real catalog data (app/src/store/catalog.seed.json) — all 6 landmarks,
    # in catalog order, labels rendered verbatim (RoutesScreen.tsx: `{l.label}`,
    # never re-cased). dormant + notUsedHere both computed by
    # RoutesScreen.tsx's own rules; every row (including the last) carries a
    # bottom divider — the real st.row style always sets borderBottomWidth,
    # with no last-child exception.
    used_landmark_ids = set()
    for r in catalog["routes"]:
        used_landmark_ids.add(r["startLandmarkId"])
        used_landmark_ids.add(r["endLandmarkId"])

    card_top = y
    ry = y + 24
    landmarks = catalog["landmarks"]
    for i, l in enumerate(landmarks):
        dormant = landmark_dormant(l)
        not_used_here = l["id"] not in used_landmark_ids
        label_txt = l["label"]
        if dormant:
            label_txt += "  · dormant"
        if not_used_here:
            label_txt += f"  · not used by {FIXTURE_SPORT_LABEL}"
        sub_txt = f"{l['lat']:.5f}, {l['lon']:.5f} · {l['radiusM']} m"
        text_el(content, f"content_places_row_{i+1}_label", 30, ry, label_txt, 14,
                color=t["textDim"] if dormant else t["text"])
        text_el(content, f"content_places_row_{i+1}_sub", 30, ry + 16, sub_txt, 11.5, color=t["textDim"])
        text_el(content, f"content_places_row_{i+1}_chev", VB_W - 30, ry + 4, "›", 14,
                color=t["textDim"], anchor="middle")
        line(content, f"content_places_row_{i+1}_divider", 30, ry + 24, VB_W - 30, ry + 24,
             t["cardBorder"], 1)
        ry += 38
    card_h = (ry + 8) - card_top
    content.insert(0, E("rect", "content_places_card_bg", {
        "x": fmt(16), "y": fmt(card_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    y = card_top + card_h + 24

    text_el(content, "content_routes_heading", 16, y, "ROUTES", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16

    # WP-K: tap-only — a plain bordered card per route (st.card: borderWidth
    # 1, no left accent bar — that's RIDES/RESULTS' own row style, not this
    # screen's), "{from} -> {to}" + "{N} way(s)[ - asks which one at
    # START]", chevron. No map, no gate count, no delete affordance.
    for i, r in enumerate(catalog["routes"]):
        from_l = next(l for l in landmarks if l["id"] == r["startLandmarkId"])
        to_l = next(l for l in landmarks if l["id"] == r["endLandmarkId"])
        way_count = sum(1 for w in catalog["ways"] if w["routeId"] == r["id"])
        rid = f"content_route_{i + 1}"
        row_top = y
        row_h = 60.0
        g = group(content, rid, {})
        rect(g, f"{rid}_bg", 16, row_top, VB_W - 32, row_h, fill="none", stroke=t["cardBorder"],
             sw=1, rx=16)
        text_el(g, f"{rid}_label", 29, row_top + 24, f"{from_l['label']} → {to_l['label']}", 15,
                color=t["text"])
        sub_txt = f"{way_count} way" + ("" if way_count == 1 else "s")
        if way_count > 1:
            sub_txt += " · asks which one at START"
        text_el(g, f"{rid}_sub", 29, row_top + 42, sub_txt, 11.5, color=t["textDim"])
        text_el(g, f"{rid}_chev", VB_W - 29, row_top + 30, "›", 14, color=t["textDim"], anchor="middle")
        y += row_h + 10

    draw_tabbar(svg, t, "ROUTES")
    return svg


def build_settings(theme_name: str, repo_root: str) -> ET.Element:
    t = THEMES[theme_name]
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")

    def section(y, heading_id, heading_txt, rows, card_id):
        text_el(content, heading_id, 16, y, heading_txt, 12, weight="700",
                color=t["textDim"], letter_spacing=2, upper=True)
        y += 16
        card_top = y
        ry = y + 30
        for i, (label_txt, hint_txt, control_spec) in enumerate(rows):
            draw_fn, control_w = control_spec
            control_x = VB_W - 30 - control_w
            text_el(content, f"{card_id}_row_{i+1}_label", 30, ry, label_txt, 14, color=t["text"])
            n_hint_lines = 0
            if hint_txt:
                hint_max_px = control_x - 30 - 10
                lines = wrap_text(hint_txt, hint_max_px, 10.5)
                n_hint_lines = len(lines)
                for j, ln in enumerate(lines):
                    hid = f"{card_id}_row_{i+1}_hint" + (f"_l{j+1}" if n_hint_lines > 1 else "")
                    text_el(content, hid, 30, ry + 15 + j * 12, ln, 10.5, color=t["textDim"])
            draw_fn(content, f"{card_id}_row_{i+1}", ry - 8, control_x)
            row_h = 30 + (14 if n_hint_lines else 0) + (12 * max(0, n_hint_lines - 1)) + 16
            if i < len(rows) - 1:
                div_y = ry + row_h - 16
                line(content, f"{card_id}_row_{i+1}_divider", 30, div_y, VB_W - 30, div_y, t["cardBorder"], 1)
            ry += row_h
        card_h = ry - card_top + 8
        # Card background must render BEHIND the rows already appended above,
        # so it is built as a standalone element and inserted at the front of
        # the layer rather than appended (SVG paints in document order).
        content.insert(0, E("rect", f"{card_id}_bg", {
            "x": fmt(16), "y": fmt(card_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
            "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
        }))
        return card_top + card_h

    def seg2(labels, active_i):
        w_each_list = [max(34, 6.3 * len(lb) + 20) for lb in labels]
        total_w = sum(w_each_list)

        def draw(parent, id_, top, gx):
            g = group(parent, f"{id_}_seg", {})
            rect(g, f"{id_}_seg_bg", gx, top, total_w, 26, fill="none",
                 stroke=t["cardBorder"], sw=1, rx=9)
            cx = gx
            for i, lb in enumerate(labels):
                w_i = w_each_list[i]
                on = i == active_i
                if on:
                    rect(g, f"{id_}_seg_{i+1}_on_bg", cx, top, w_i, 26, fill=t["accent"], rx=9)
                text_el(g, f"{id_}_seg_{i+1}_label", cx + w_i / 2, top + 17, lb, 10.5,
                        color=t["onAccent"] if on else t["textDim"], anchor="middle")
                cx += w_i
        return (draw, total_w)

    def switch(on: bool):
        def draw(parent, id_, top, gx):
            g = group(parent, f"{id_}_switch", {})
            rect(g, f"{id_}_switch_track", gx, top + 3, 44, 25, fill=t["accent"] if on else t["cardBorder"], rx=25)
            circle(g, f"{id_}_switch_knob", gx + (25 if on else 12), top + 15.5, 9.5,
                   fill=COLORS["white"] if on else t["textDim"])
        return (draw, 44)

    y = 20
    y = section(y, "content_appearance_heading", "APPEARANCE",
                [("Theme", "the race surface follows it",
                  seg2(["night", "day"], 1 if theme_name == "day" else 0))],
                "content_appearance_card")
    y += 24
    y = section(y, "content_bike_heading", "ON THE BIKE",
                [
                    ("Red lights",
                     "auto-pause is measured; a button is yours to press but makes stopped "
                     "time self-reported (§18, unsettled)",
                     seg2(["auto", "button", "off"], 0)),
                    ("Live map", "moving dot on the route while riding", switch(True)),
                    ("Earcons", "one buzz + tier sound at each gate (D-019)", switch(True)),
                ], "content_bike_card")
    y += 24
    y = section(y, "content_start_heading", "STARTING A RIDE",
                [("Start place", "detect where you are, or pick it yourself (§21)",
                  seg2(["detect", "choose"], 0))],
                "content_start_card")
    y += 24
    y = section(y, "content_scoring_heading", "SCORING",
                [("Timing tower", "rank today against the ghost set", switch(True))],
                "content_scoring_card")
    y += 24

    # D3 (virgin-cycle5, 2026-09-08): SETTINGS -> SPORTS, settings.tsx:317-520
    # (SportsSection) read fresh — not already drawn (confirmed: this file's
    # pre-D3 build_settings() had no SPORTS section at all). Real order is
    # APPEARANCE / ON THE BIKE / STARTING A RIDE / SCORING / SPORTS / DATA
    # (settings.tsx:586); DATA is out of scope (not drawn before D3 either).
    # Active-sport row reuses this function's own `seg2`/`switch` row shape;
    # the sport list + add-sport input have no `section()`-row equivalent
    # (label + right-aligned usage text, and a text input) so they are drawn
    # directly into the same card.
    # [ASSUMPTION] two fixture sports, matching FIXTURE_SPORT_LABEL
    # ("Cycling") used by ROUTES/RIDES/RESULTS and the second fixture sport
    # ("Running") build_record_setup's D2.2 sport-pill row already invented —
    # reused here so every screen's fixture sports agree with each other.
    # Usage counts (13 routes/6 rides for Cycling, 0/0 for Running) are
    # invented placeholders — catalog.seed.json carries no per-sport split
    # (same [ASSUMPTION] build_routes() already documents for FIXTURE_SPORT_LABEL).
    sports_fixture = [("Cycling", 13, 6), ("Running", 0, 0)]

    text_el(content, "content_sports_heading", 16, y, "SPORTS", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16
    card_top = y
    ry = y + 24

    seg_draw, seg_w = seg2([sp for sp, _, _ in sports_fixture], 0)
    control_x = VB_W - 30 - seg_w
    hint_txt = "Everything on RECORD, ROUTES and RIDES is scoped to this one."
    text_el(content, "content_sports_active_label", 30, ry, "Active sport", 14, color=t["text"])
    hint_lines = wrap_text(hint_txt, control_x - 30 - 10, 10.5)
    for j, ln in enumerate(hint_lines):
        hid = "content_sports_active_hint" + (f"_l{j+1}" if len(hint_lines) > 1 else "")
        text_el(content, hid, 30, ry + 15 + j * 12, ln, 10.5, color=t["textDim"])
    seg_draw(content, "content_sports_active", ry - 8, control_x)
    row_h = 30 + 14 + 12 * max(0, len(hint_lines) - 1) + 16
    line(content, "content_sports_active_divider", 30, ry + row_h - 16, VB_W - 30, ry + row_h - 16,
         t["cardBorder"], 1)
    ry += row_h

    # One collapsed row per sport (label + "N routes · M rides"); the real
    # screen's tap-to-expand rename/delete UI is not drawn — a static mockup
    # shows the closed state, same discipline as RoutesScreen's rows.
    for i, (sp_label, n_routes, n_rides) in enumerate(sports_fixture):
        usage = f"{n_routes} route{'' if n_routes == 1 else 's'} · {n_rides} ride{'' if n_rides == 1 else 's'}"
        text_el(content, f"content_sports_row_{i+1}_label", 30, ry + 18, sp_label, 14, color=t["text"])
        text_el(content, f"content_sports_row_{i+1}_usage", VB_W - 30, ry + 18, usage, 11.5,
                color=t["textDim"], anchor="end")
        line(content, f"content_sports_row_{i+1}_divider", 30, ry + 32, VB_W - 30, ry + 32,
             t["cardBorder"], 1)
        ry += 40

    # add-sport input (SPORT_LABEL_PLACEHOLDER, store/sports.ts:26) + button
    rect(content, "content_sports_add_input_bg", 30, ry, VB_W - 60, 30, fill=t["bg"],
         stroke=t["cardBorder"], sw=1, rx=8)
    text_el(content, "content_sports_add_input_placeholder", 38, ry + 19,
            "e.g. Bike, Run, Walk, E-bike, Fast walk", 10.5, color=t["textDim"])
    ry += 30 + 10
    add_btn_w = 76.0
    rect(content, "content_sports_add_btn_bg", 30, ry, add_btn_w, 24, fill="none",
         stroke=t["cardBorder"], sw=1, rx=9)
    text_el(content, "content_sports_add_btn_label", 30 + add_btn_w / 2, ry + 16, "add sport", 11.5,
            color=t["text"], anchor="middle", letter_spacing=1)
    ry += 24 + 16

    # Row: "Sport picker on RECORD" — only at >=2 sports (settings.tsx:503's
    # own guard), same seg2/switch row shape as every other section() row.
    if len(sports_fixture) >= 2:
        toggle_draw, toggle_w = switch(True)
        toggle_x = VB_W - 30 - toggle_w
        toggle_hint = "Show the sport row on RECORD. Off: switch sports here instead."
        text_el(content, "content_sports_toggle_label", 30, ry, "Sport picker on RECORD", 14, color=t["text"])
        toggle_hint_lines = wrap_text(toggle_hint, toggle_x - 30 - 10, 10.5)
        for j, ln in enumerate(toggle_hint_lines):
            hid = "content_sports_toggle_hint" + (f"_l{j+1}" if len(toggle_hint_lines) > 1 else "")
            text_el(content, hid, 30, ry + 15 + j * 12, ln, 10.5, color=t["textDim"])
        toggle_draw(content, "content_sports_toggle", ry - 8, toggle_x)
        ry += 30 + 14 + 12 * max(0, len(toggle_hint_lines) - 1) + 8

    card_h = ry - card_top + 8
    content.insert(0, E("rect", "content_sports_card_bg", {
        "x": fmt(16), "y": fmt(card_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    y = card_h + card_top + 20

    text_el(content, "content_footer_note", 16, y,
            "Saved on the phone and restored on launch. A corrupt file falls back", 10.5, color=t["textDim"])
    text_el(content, "content_footer_note_2", 16, y + 13,
            "to these defaults rather than blocking the app.", 10.5, color=t["textDim"])

    draw_tabbar(svg, t, "SETTINGS")
    return svg


def build_demo(theme_name: str, repo_root: str) -> ET.Element:
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 20
    text_el(content, "content_heading", 16, y, "DEMO RIDE", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 18
    used = text_block(content, "content_sub", 16, y,
                       "A real archived Home Work Dry lap replayed at 25x. Buzz at every gate, tier "
                       "colours as they are earned, the live map moving. Nothing is recorded.",
                       11.5, VB_W - 32, color=t["textDim"])
    y += used + 20

    map_h = 220
    # mid-ride: dot partway along, S2 crossed (green), S1 crossed (purple PB),
    # gates ahead (S3/S4) uncoloured — the honesty rule applies even here.
    draw_map(content, "content_map", t, asset, (16, y, VB_W - 32, map_h),
             gate_tiers=[None, COLORS["purple"], COLORS["green"], None, None],
             rider_at=0.42, rider_ahead_dotted=True, label_note=True)
    y += map_h + 16

    # LiveSectorPane, mid-ride: context "S3", clock ticking, strip S1 purple,
    # S2 green, S3 current (accent border, empty), S4 empty.
    text_el(content, "content_pane_context", VB_W / 2, y, "S3", 13, weight="700",
            color=t["textDim"], anchor="middle", letter_spacing=2)
    y += 14
    text_el(content, "content_pane_clock", VB_W / 2, y + 46, "6:42.1", 60, weight="800",
            color=t["text"], anchor="middle", tabular=True)
    y += 70

    strip = group(content, "content_pane_strip", {})
    slot_w, slot_h, gap = 62, 50, 9
    total_w = slot_w * 4 + gap * 3
    sx0 = (VB_W - total_w) / 2
    # StripSlot's empty/untraversed border is t.race.border specifically
    # (chips.tsx), not the paddock t.cardBorder, even on a screen (Demo) that
    # otherwise follows the paddock theme.
    slot_defs = [
        ("S1", COLORS["purple"], "3:02", True),
        ("S2", COLORS["green"], "3:27", False),
        ("S3", t["accent"], None, False),
        ("S4", t["raceBorder"], None, False),
    ]
    for i, (lbl, col, tval, filled) in enumerate(slot_defs):
        sx = sx0 + i * (slot_w + gap)
        rect(strip, f"content_pane_strip_slot_{i+1}_bg", sx, y, slot_w, slot_h,
             fill=col if filled else "none", stroke=col, sw=2, rx=10)
        rows_col = t["onAccent"] if filled else (t["text"] if i == 2 else t["textDim"])
        text_el(strip, f"content_pane_strip_slot_{i+1}_label", sx + slot_w / 2, y + 20, lbl, 12,
                weight="700", color=rows_col, anchor="middle")
        if tval:
            text_el(strip, f"content_pane_strip_slot_{i+1}_time", sx + slot_w / 2, y + 36, tval, 12,
                    weight="700", color=rows_col, anchor="middle", tabular=True)
    y += slot_h + 28

    btn = group(content, "content_run_button", {})
    rect(btn, "content_run_button_bg", 16, y, VB_W - 32, 50, fill=t["accent"], rx=10)
    text_el(btn, "content_run_button_label", VB_W / 2, y + 32, "RUN DEMO RIDE", 15, weight="800",
            color=t["onAccent"], anchor="middle", letter_spacing=2.5)
    y += 66
    text_el(content, "content_note", 16, y,
            "Sounds are not wired yet — gates buzz only.", 10.5, color=t["textDim"])

    draw_tabbar(svg, t, "DEMO")
    return svg


# --------------------------------------------------------------------------
# screen builders — re-emit pass (2026-08-24): RecordScreen.tsx's three-phase
# flow (setup/armed/running, 'ending' is a transient animation-only phase and
# is not drawn), plus RidesScreen.tsx and ResultScreen.tsx (both WP-A3). All
# read fresh off the staged files at execution time — see module docstring.
#
# WP-B's "new" free-ride start/end pill is DELIBERATELY OMITTED everywhere
# below (unratified layout) — every RECORD screen depicts a normal
# known-route ride: detected/picked FROM and TO are always real catalog
# landmarks, never NEW_ID.
# --------------------------------------------------------------------------

def build_record_setup(theme_name: str, repo_root: str) -> ET.Element:
    """RecordScreen.tsx's default ('setup') phase — tab bar visible (only
    armed/running/ending report fullscreen; recordFlow.ts's isFullscreen()).
    settings defaults: startMode 'auto' (detected start), liveMap true."""
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    catalog = load_catalog(repo_root)
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    draw_theme_pill(content, t, theme_name)

    cx = VB_W / 2
    y = 58.0
    # Logo mark (RecordScreen.tsx logoWrap/logoRing/logoSlash): ink ring,
    # yellow gate-slash crossing it — simplified here to a stroked circle
    # plus a short heavy diagonal, not the exact brand bbox math.
    circle(content, "content_logo_ring", cx, y + 37, 33, fill="none", stroke=t["text"], sw=7)
    line(content, "content_logo_slash", cx - 16, y + 21, cx + 16, y + 53, t["accent"], 8)
    y += 84
    text_el(content, "content_app_title", cx, y, "QUALIFIRE", 19, weight="800", color=t["text"],
            anchor="middle", letter_spacing=5, upper=True)
    y += 24

    landmarks = catalog["landmarks"]
    startable = [l for l in landmarks if l.get("offerAtStart")]
    # settings.startMode defaults to 'auto': the DETECTED landmark wins FROM.
    # 'home' is catalog-first among startable — a plausible, honestly-typical
    # detected start, not a claim about a specific real ride.
    detected = startable[0]
    from_id = detected["id"]
    to_id = "work"

    map_h = 160.0
    draw_map(content, "content_map", t, asset, (20, y, VB_W - 40, map_h),
             gate_tiers=[None] * 5, rider_at="START", rider_ahead_dotted=False,
             rider_fill=COLORS["riderBlue"], label_note=True,
             route_casing=True, gate_casing=True, placeholder_size=4)
    y += map_h + 18

    # D2.2 (virgin-cycle5, 2026-09-08): RecordScreen.tsx:1264-1273's sport-pill
    # row (Q3/WP-1) — setup phase only (armed/running are their own
    # fullscreen builders below and never draw it), shown only with 2+
    # sports AND settings.showSportPillOnRecord on (store/sports.ts's
    # showSportPillRow()). [ASSUMPTION] two fixture sports, matching
    # FIXTURE_SPORT_LABEL used by results/routes so every screen's sport
    # badge agrees; the toggle default is assumed on (same "show the
    # feature" convention as liveMap/redLight elsewhere in this file).
    fixture_sports = [FIXTURE_SPORT_LABEL, "Running"]
    if len(fixture_sports) >= 2:
        text_el(content, "content_flow_sport_label", 20, y, "SPORT", 11, weight="600",
                color=t["textDim"], letter_spacing=2)
        y += 16
        sport_items = [(sp, sp == FIXTURE_SPORT_LABEL) for sp in fixture_sports]
        y += draw_pill_row(content, "content_sport", t, 20, y, VB_W - 40, sport_items) + 10

    text_el(content, "content_flow_from_label", 20, y, "DETECTED START", 11, weight="600",
            color=t["textDim"], letter_spacing=2)
    y += 16
    from_items = [(l["label"] + (" ✓" if l["id"] == from_id else ""), l["id"] == from_id)
                  for l in startable]
    y += draw_pill_row(content, "content_from", t, 20, y, VB_W - 40, from_items) + 10

    text_el(content, "content_flow_to_label", 20, y, "GOING TO", 11, weight="600",
            color=t["textDim"], letter_spacing=2)
    y += 16
    to_candidates = [l for l in startable if l["id"] != from_id]
    to_items = [(l["label"], l["id"] == to_id) for l in to_candidates]
    y += draw_pill_row(content, "content_to", t, 20, y, VB_W - 40, to_items) + 10

    # D0 (virgin-cycle5): catalog.seed.json's shape swapped under WP-3 —
    # "routes" is now the parent (from->to, startLandmarkId/endLandmarkId,
    # wayIds), "ways" the child (routeId FK) — the reverse of what this block
    # assumed pre-swap. Fixed to read the current schema; this was a hard
    # KeyError crash before the fix, not merely a stale label.
    route = next(r for r in catalog["routes"]
                 if r["startLandmarkId"] == from_id and r["endLandmarkId"] == to_id)
    route_ways = [w for w in catalog["ways"] if w["routeId"] == route["id"]]
    # §8a default: Morning is the only SEEDED (ghost-bearing) way on this
    # route — the real defaultWayFor() picks it on ghost count, same result.
    picked_way_id = "Morning" if any(w["id"] == "Morning" for w in route_ways) else route_ways[0]["id"]
    if len(route_ways) > 1:
        # RecordScreen.tsx's current label here is "WHICH WAY TODAY?" (was
        # "WHICH ROUTE TODAY?" pre-WP-3) — fixed as a label-string-only
        # change per the brief's D0.4 (RoutesScreen exception); the sport
        # pill row/spec-pick UI RecordScreen.tsx has grown since is a D2.2
        # layout change, not reproduced here.
        text_el(content, "content_flow_way_label", 20, y, "WHICH WAY TODAY?", 11, weight="600",
                color=t["textDim"], letter_spacing=2)
        y += 16
        way_items = [(way_variant_label(w["id"], route), w["id"] == picked_way_id) for w in route_ways]
        # WP-J fix pass (2026-08-24): +8 left the hint's first-line ascender
        # colliding with the pill row's bottom edge — widened to +16.
        y += draw_pill_row(content, "content_way", t, 20, y, VB_W - 40, way_items) + 16
        y += text_block(content, "content_way_hint", cx, y,
                         "the pick is intent — ride a different road and the ride scores as the "
                         "road you actually took (§8a)", 12.5, VB_W - 40, color=t["text2"],
                         anchor="middle") + 8

    ghost_n = 6  # placeholder shape of data (README convention) — not a real count
    y += text_block(content, "content_ghost_line", cx, y,
                     f"{ghost_n} rides found — you are racing {ghost_n} ghosts", 14,
                     VB_W - 40, color=t["text2"], anchor="middle") + 8
    text_el(content, "content_ready_line", cx, y, "Ready to record.", 14, color=t["text2"],
            anchor="middle")
    y += 30

    btn_h = 100.0
    btn = group(content, "content_record_button", {})
    rect(btn, "content_record_button_bg", 20, y, VB_W - 40, btn_h, fill=t["accent"], rx=20)
    text_el(btn, "content_record_button_label", cx, y + 46, "● RECORD", 30, weight="800",
            color=t["onAccent"], anchor="middle", letter_spacing=3)
    text_el(btn, "content_record_button_sub", cx, y + 68, "arms the ride · nothing starts yet", 11,
            color=t["onAccent"], anchor="middle")

    draw_tabbar(svg, t, "RECORD")
    return svg


def build_record_armed(theme_name: str, repo_root: str) -> ET.Element:
    """RecordScreen.tsx's 'armed' phase (WP-A2): route picked, location
    shown, nothing started — fullscreen (no tab bar, recordFlow.isFullscreen).
    Route line is drawn solid, casing + yellow core, full stop — matching
    wayMapView.tsx's 2026-08-24 hotfix (the whole route used to read
    dotted-ahead at 'prestart' via routeSplitFeatures; that split was pulled
    back out on-device after it rendered as broken oversized dash blobs, see
    the wayMapView.tsx file header)."""
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["raceBg"])

    content = layer(svg, "content")
    # WP-J fix pass (2026-08-24), second cut: wrap_text's avg-glyph-width
    # estimate (0.56*size) undershoots badly for uppercase+letter-spaced
    # bold text — widening the box to VB_W-40 (the first cut) forced this
    # onto one line by the ESTIMATE, but the real rendered line overflowed
    # past the canvas's right edge in an actual PNG render (letter-spacing
    # and a bold uppercase face are both wider than the estimate accounts
    # for). Rather than keep guessing at a width threshold, this is drawn as
    # two explicit, individually-short lines — each comfortably inside the
    # canvas at real font metrics — instead of trusting wrap_text's estimate
    # on this heavily-styled string. Matches text_block's own _l1/_l2 naming
    # convention for a multi-line block.
    track_lh = 12 * 1.3
    text_el(content, "content_track_line_l1", VB_W / 2, 30, "home → work · Dry", 12,
            weight="600", color=t["textDim"], anchor="middle", letter_spacing=1.2, upper=True)
    text_el(content, "content_track_line_l2", VB_W / 2, 30 + track_lh, "ready — not started", 12,
            weight="600", color=t["textDim"], anchor="middle", letter_spacing=1.2, upper=True)
    track_h = 2 * track_lh

    # WP-J fix pass (2026-08-24): 560.0 left 78px of dead space below the
    # cancel bar — record_running/finished (the other two fullscreen
    # recording states) land within a few px of App.tsx's own
    # NAV_BAR_MIN_PAD (12). 626.0 gives this screen the same ~12px floor.
    map_y, map_h = 24.0 + track_h, 626.0 - track_h
    draw_map(content, "content_map", t, asset, (12, map_y, VB_W - 24, map_h),
             gate_tiers=[None] * 5, rider_at="START", rider_ahead_dotted=False,
             rider_fill=COLORS["riderBlue"], label_note=True,
             ground_fill=t["raceCard"], ground_border=t["raceBorder"],
             route_casing=True, gate_casing=True, placeholder_size=4)
    y = map_y + map_h + 14

    btn_h = 118.0
    btn = group(content, "content_start_button", {})
    rect(btn, "content_start_button_bg", 12, y, VB_W - 24, btn_h, fill=t["accent"], rx=20)
    text_el(btn, "content_start_button_label", VB_W / 2, y + 58, "START", 34, weight="800",
            color=t["onAccent"], anchor="middle", letter_spacing=4)
    text_el(btn, "content_start_button_sub", VB_W / 2, y + 82, "the clock runs from here", 11,
            color=t["onAccent"], anchor="middle")
    y += btn_h + 10

    cancel = group(content, "content_cancel_bar", {})
    rect(cancel, "content_cancel_bar_bg", 12, y, VB_W - 24, 40, fill="none",
         stroke=COLORS["amber"], sw=1, rx=10)
    text_el(cancel, "content_cancel_bar_label", VB_W / 2, y + 25, "‹ cancel — back to setup", 12,
            weight="700", color=COLORS["amber"], anchor="middle", letter_spacing=1)

    return svg


def build_record_running(theme_name: str, repo_root: str) -> ET.Element:
    """RecordScreen.tsx's 'running' phase, mid-ride (WP-A2's full-height race
    column: map ≈ top half, LiveSectorPane, rotating status, PAUSE — no tab
    bar). One sector done: S1 purple, S2 in progress (ticking clock owns the
    big slot, per liveView.tsx — never tier-coloured while ticking), S3/S4
    not yet reached. settings.redLight defaults to 'auto', so the manual
    red-light button is not shown (§18).

    D2.2 (virgin-cycle5, re-transcribed 2026-09-08): RecordScreen.tsx now
    passes `gateColours={undefined}` on this map (WP-E, d7e925b) — ticks no
    longer recolour by tier at all, every gate draws the same dim unscored
    style gate_tiers=[None]*5 already produces with gate_casing=True. The
    sector-coloured TRAIL (WP-K, sectorTrailModel.ts's liveSectorColours())
    carries the verdict instead — the span between gates, not the gate
    itself ("they are gates" — Nathan)."""
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["raceBg"])

    content = layer(svg, "content")

    # Bottom-up fixed-block budget so the column reaches the bottom edge the
    # way raceColumn's flex:1 map + fixed-height siblings do in the app —
    # see the comment on the matching build_record_finished for the same
    # technique. GAP1 = map -> pane; STRIP_GAP/STATUS_GAP/PAUSE_GAP are the
    # gaps after the strip, after the status line, and before the pause bar.
    TOP_PAD, GAP1 = 8.0, 14.0
    CONTEXT_H, CLOCK_H = 20.0, 92.0
    STRIP_H, STRIP_GAP = 54.0, 18.0
    # BOTTOM_PAD 12.0 (was 10.0, WP-J fix pass 2026-08-24): matches App.tsx's
    # own NAV_BAR_MIN_PAD floor and record_finished's matching constant below.
    STATUS_GAP, PAUSE_GAP, PAUSE_H, BOTTOM_PAD = 26.0, 10.0, 56.0, 12.0
    fixed_total = GAP1 + CONTEXT_H + CLOCK_H + STRIP_H + STRIP_GAP + STATUS_GAP + PAUSE_GAP + PAUSE_H + BOTTOM_PAD
    map_h = VB_H - TOP_PAD - fixed_total

    # Route line solid, casing + yellow core, full stop — wayMapView.tsx's
    # 2026-08-24 hotfix (see build_record_armed's docstring for why the
    # earlier dotted-ahead split was pulled back out; rider_ahead_dotted is
    # therefore False here too, not just at prestart).
    draw_map(content, "content_map", t, asset, (12, TOP_PAD, VB_W - 24, map_h),
             gate_tiers=[None] * 5,
             sector_colours=[None, tier_line_colour("purple"), None, None, None],
             rider_at=0.28, rider_ahead_dotted=False,
             rider_fill=COLORS["riderBlue"], label_note=True,
             ground_fill=t["raceCard"], ground_border=t["raceBorder"],
             route_casing=True, gate_casing=True, placeholder_size=4)
    y = TOP_PAD + map_h + GAP1

    text_el(content, "content_pane_context", VB_W / 2, y + 13, "S2", 13, weight="700",
            color=t["textDim"], anchor="middle", letter_spacing=2)
    y += CONTEXT_H
    text_el(content, "content_pane_clock", VB_W / 2, y + 58, "4:15.7", 76, weight="800",
            color=t["text"], anchor="middle", tabular=True)
    y += CLOCK_H

    strip = group(content, "content_pane_strip", {})
    slot_w, gap = 76.0, 8.0
    total_w = slot_w * 4 + gap * 3
    sx0 = (VB_W - total_w) / 2
    slot_defs = [
        ("S1", "purple", "3:02", False),
        ("S2", "none", None, True),
        ("S3", "none", None, False),
        ("S4", "none", None, False),
    ]
    for i, (lbl, tier, tval, current) in enumerate(slot_defs):
        sx = sx0 + i * (slot_w + gap)
        draw_strip_slot(strip, f"content_pane_strip_slot_{i+1}", sx, y, slot_w, STRIP_H, t,
                         tier, lbl, tval, current)
    y += STRIP_H + STRIP_GAP

    text_el(content, "content_status_line", VB_W / 2, y + 12, way_label("Morning").upper() + " · ROUTE LOCKED", 12,
            weight="600", color=t["textDim"], anchor="middle", letter_spacing=1.5, upper=True)
    y += STATUS_GAP + PAUSE_GAP

    pause = group(content, "content_pause_bar", {})
    rect(pause, "content_pause_bar_bg", 12, y, VB_W - 24, PAUSE_H, fill=t["raceCard"],
         stroke=COLORS["amber"], sw=2, rx=10)
    text_el(pause, "content_pause_bar_label", VB_W / 2, y + 24, "PAUSE", 17, weight="800",
            color=COLORS["amber"], anchor="middle", letter_spacing=3)
    text_el(pause, "content_pause_bar_sub", VB_W / 2, y + 42, "recording continues · resume or end",
            10.5, color=t["textDim"], anchor="middle", letter_spacing=1)

    return svg


def build_record_finished(theme_name: str, repo_root: str) -> ET.Element:
    """The moment a ride ends, BEFORE END is pressed — still RecordScreen's
    'running' phase (recordFlow.ts), but the live engine has reached
    st.phase==='finished': the LAP result takes the big slot terminally
    (liveView.tsx) and the map unlocks (liveState 'finished' releases
    wayMapView back to browse framing). Route line + gate ticks: solid
    casing + core, matching wayMapView.tsx's 2026-08-24 hotfix (see
    build_record_armed's docstring). All 4 sectors now scored.
    WP-J fix pass (2026-08-24): the prior pass omitted the P-position chip,
    reading live/towerSource.ts's stale header comment ("B-28 UNBUILT") at
    face value. The function body right below that comment is actually
    labelled "B-28 BUILT (cycle 008)" and computes a real position —
    liveView.tsx's lapRow renders <LiveLapChip flex:1/> beside <PosChip/>
    whenever vm.posChip is non-null, which it is here (a clean Morning lap
    against real seeded ghost history). Drawn below accordingly, plus the
    (here-blank, matching st.phase==='finished' → contextLabel='') context
    line liveView.tsx always reserves above the big slot.

    D2.2 (virgin-cycle5, re-transcribed 2026-09-08): gate ticks no longer
    carry the tier verdict (WP-E, gateColours={undefined}) — every tick
    draws the same dim unscored style. The sector-coloured TRAIL
    (sectorTrailModel.ts's storedSectorColours(), same shape as the live
    map's) now shows all 4 earned sectors as coloured spans instead."""
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["raceBg"])

    content = layer(svg, "content")

    TOP_PAD, GAP1 = 8.0, 16.0
    CONTEXT_H = 20.0
    LAP_H = 96.0
    STRIP_H, STRIP_GAP = 54.0, 18.0
    # BOTTOM_PAD 12.0 (was 10.0, WP-J fix pass 2026-08-24): matches App.tsx's
    # own NAV_BAR_MIN_PAD floor and record_running's matching constant above.
    STATUS_GAP, PAUSE_GAP, PAUSE_H, BOTTOM_PAD = 26.0, 10.0, 56.0, 12.0
    fixed_total = (GAP1 + CONTEXT_H + LAP_H + STRIP_GAP + STRIP_H + STRIP_GAP
                   + STATUS_GAP + PAUSE_GAP + PAUSE_H + BOTTOM_PAD)
    map_h = VB_H - TOP_PAD - fixed_total

    draw_map(content, "content_map", t, asset, (12, TOP_PAD, VB_W - 24, map_h),
             gate_tiers=[None] * 5,
             sector_colours=[None, tier_line_colour("purple"), tier_line_colour("green"),
                             tier_line_colour("yellow"), tier_line_colour("green")],
             rider_at="FINISH", rider_ahead_dotted=False,
             rider_fill=COLORS["riderBlue"], label_note=True,
             ground_fill=t["raceCard"], ground_border=t["raceBorder"],
             route_casing=True, gate_casing=True, placeholder_size=4)
    y = TOP_PAD + map_h + GAP1

    # liveView.tsx's LiveSectorPane always reserves this line above the big
    # slot (`{vm.contextLabel || ' '}`); at st.phase==='finished' the real
    # value is '' (the LAP result carries its own label) — kept structurally
    # present but visually blank, same convention as record_running's
    # non-blank "S2" version of this same element.
    text_el(content, "content_pane_context", VB_W / 2, y + 13, " ", 13, weight="700",
            color=t["textDim"], anchor="middle", letter_spacing=2)
    y += CONTEXT_H

    # lapRow (liveView.tsx): LAP chip flex:1 + a static PosChip beside it —
    # ROW_GAP/POS_W chosen so the two plus the 12px canvas margins sum to
    # VB_W exactly (12 + LAP_W + ROW_GAP + POS_W + 12 == 390).
    ROW_GAP, POS_W = 12.0, 104.0
    LAP_W = (VB_W - 24) - POS_W - ROW_GAP

    lap_bg, lap_border, lap_text = chip_palette("green", t)
    lap = group(content, "content_lap_chip", {})
    rect(lap, "content_lap_chip_bg", 12, y, LAP_W, LAP_H, fill=lap_bg, stroke=lap_border,
         sw=2, rx=16)
    text_el(lap, "content_lap_chip_label", 30, y + 34, "LAP", 22, weight="800", color=lap_text,
            letter_spacing=2)
    text_el(lap, "content_lap_chip_time", 12 + LAP_W / 2, y + 68, "14:31.2", 34, weight="800",
            color=lap_text, anchor="middle", tabular=True)
    # D-021: no lap reference yet on this track, so the real delta is always
    # '' for a non-estimated lap (liveView.tsx's viewModelFromEngine) — kept
    # as an empty leaf for structural parity with LiveLapChip's own delta
    # Text, not filled with an invented value.
    text_el(lap, "content_lap_chip_delta", 12 + LAP_W - 18, y + 34, "", 16, weight="700",
            color=lap_text, anchor="end", tabular=True)

    pos = group(content, "content_pos_chip", {})
    pos_x = 12 + LAP_W + ROW_GAP
    rect(pos, "content_pos_chip_bg", pos_x, y, POS_W, LAP_H, fill=t["raceCard"],
         stroke=t["raceBorder"], sw=2, rx=10)
    text_el(pos, "content_pos_chip_label", pos_x + POS_W / 2, y + LAP_H / 2 + 8, "P3 of 9", 22,
            weight="800", color=t["text"], anchor="middle", letter_spacing=1, tabular=True)
    y += LAP_H + STRIP_GAP

    strip = group(content, "content_strip", {})
    slot_w, gap = 76.0, 8.0
    total_w = slot_w * 4 + gap * 3
    sx0 = (VB_W - total_w) / 2
    slot_defs = [
        ("S1", "purple", "3:02"),
        ("S2", "green", "3:38"),
        ("S3", "yellow", "3:51"),
        ("S4", "green", "3:20"),
    ]
    for i, (lbl, tier, tval) in enumerate(slot_defs):
        sx = sx0 + i * (slot_w + gap)
        draw_strip_slot(strip, f"content_strip_slot_{i+1}", sx, y, slot_w, STRIP_H, t,
                         tier, lbl, tval, False)
    y += STRIP_H + STRIP_GAP

    text_el(content, "content_status_line", VB_W / 2, y + 12, way_label("Morning").upper() + " · ROUTE LOCKED", 12,
            weight="600", color=t["textDim"], anchor="middle", letter_spacing=1.5, upper=True)
    y += STATUS_GAP + PAUSE_GAP

    pause = group(content, "content_pause_bar", {})
    rect(pause, "content_pause_bar_bg", 12, y, VB_W - 24, PAUSE_H, fill=t["raceCard"],
         stroke=COLORS["amber"], sw=2, rx=10)
    text_el(pause, "content_pause_bar_label", VB_W / 2, y + 24, "PAUSE", 17, weight="800",
            color=COLORS["amber"], anchor="middle", letter_spacing=3)
    text_el(pause, "content_pause_bar_sub", VB_W / 2, y + 42, "recording continues · resume or end",
            10.5, color=t["textDim"], anchor="middle", letter_spacing=1)

    return svg


def build_rides(theme_name: str, repo_root: str) -> ET.Element:
    """RidesScreen.tsx (WP-A3): header + expandable ride rows (route name,
    date · lap · quality, P{pos}/{of} rank, chevron). One row drawn expanded
    with its sector splits + Export GPX+/Delete. Sector row colours mirror
    RidesScreen.tsx's OWN rule exactly — `chipColors(sec.tier, t).text`
    applied as bare text with no chip fill behind it. For tier 'purple' that
    is PURPLE_INK (#120521), a colour chips.tsx designed to sit ON a filled
    purple background (see LiveBigChip/StripSlot) — here there is no fill,
    so a purple-tier sector's row reads legibly in daylight (dark ink on a
    white card) but is very low-contrast in night mode (dark ink on a
    near-black card). Reproduced faithfully rather than silently corrected;
    flagged in the handoff summary as worth a second look."""
    t = THEMES[theme_name]
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 24.0
    text_el(content, "content_title", 16, y, "RIDES", 24, weight="800", color=t["text"],
            letter_spacing=2, upper=True)
    refresh_w = 74.0
    refresh = group(content, "content_refresh_button", {})
    rect(refresh, "content_refresh_button_bg", VB_W - 16 - refresh_w, y - 20, refresh_w, 26,
         fill="none", stroke=t["cardBorder"], sw=1, rx=10)
    text_el(refresh, "content_refresh_button_label", VB_W - 16 - refresh_w / 2, y - 3, "Refresh",
            12, color=t["text2"], anchor="middle")
    y += 26

    # Placeholder sample rows (README convention: plausible shape of data,
    # never a real ride) — one route ride expanded, one collapsed, one with
    # no matched route (RidesScreen.tsx's "no route — recorded only" branch).
    # Dates: rideHistoryModel.ts's dateTimeLabel() format ('Tue 05 Aug ·
    # 08:31', WP-J fix pass 2026-08-24 — was a bare ISO-ish "2026-08-22
    # 07:41" that didn't match the real screen).
    rows = [
        {"route": "Home Work Dry", "date": "Sat 22 Aug · 07:41", "lap": "14:02.5", "quality": None,
         "rank": "P3/10", "expanded": True},
        {"route": "Work Home Dry", "date": "Fri 21 Aug · 18:04", "lap": "15:11.9", "quality": None,
         "rank": "P1/8", "expanded": False},
        {"route": None, "date": "Wed 19 Aug · 12:30", "lap": None, "quality": None,
         "rank": None, "expanded": False},
    ]
    sectors = [
        (1, "purple", "3:02.1", "avg 3:15"),
        (2, "green", "3:28.4", "avg 3:41"),
        (3, "yellow", "3:51.0", "avg 3:44"),
        (4, "green", "3:20.2", "avg 3:33"),
    ]
    for ri, row in enumerate(rows):
        rid = f"content_row_{ri + 1}"
        row_top = y
        card = group(content, rid, {})
        head_h = 60.0
        title_txt = row["route"] or "no route — recorded only"
        sub_bits = [row["date"]]
        if row["route"]:
            sub_bits.append(row["lap"])
        else:
            sub_bits.append("no lap")
        if row["quality"]:
            sub_bits.append(row["quality"])
        sub_txt = " · ".join(sub_bits)
        # WP-J fix pass (2026-08-24): RidesScreen.tsx's row has
        # borderLeftWidth:3 + paddingHorizontal:14 → content starts 17px
        # inside the card's left edge (16 + 17 = 33). Text at bare x=16 sat
        # under/behind the accent bar and read as clipped ("ho route..."
        # instead of "no route...") — shifted the row's text to x=33; the
        # accent bar and card background stay at x=16 (unchanged, they're
        # meant to reach the card edge).
        text_el(card, f"{rid}_title", 33, row_top + 26, title_txt, 16, weight="800", color=t["text"])
        text_el(card, f"{rid}_sub", 33, row_top + 44, sub_txt, 12, color=t["text2"])
        text_el(card, f"{rid}_rank", VB_W - 38, row_top + 26, row["rank"] or "–", 14, weight="700",
                color=t["textDim"], anchor="end", tabular=True)
        text_el(card, f"{rid}_chev", VB_W - 16, row_top + 27, "▾" if row["expanded"] else "›", 14,
                color=t["textDim"], anchor="middle")
        body_bottom = row_top + head_h
        if row["expanded"]:
            sy = body_bottom + 8
            line(card, f"{rid}_divider", 16, sy, VB_W - 16, sy, t["cardBorder"], 1)
            sy += 14
            for si, tier, tval, avgl in sectors:
                col = chip_palette(tier, t)[2]
                text_el(card, f"{rid}_sec_{si}_label", 33, sy, f"S{si}", 13, weight="700", color=col)
                text_el(card, f"{rid}_sec_{si}_time", 82, sy, tval, 13, color=col, tabular=True)
                text_el(card, f"{rid}_sec_{si}_avg", VB_W - 16, sy, avgl, 11.5, color=t["textDim"],
                        anchor="end", tabular=True)
                sy += 20
            sy += 4
            exp_w, del_w, pill_h = 108.0, 76.0, 32.0
            rect(card, f"{rid}_export_bg", 16, sy, exp_w, pill_h, fill=t["accent"], rx=10)
            text_el(card, f"{rid}_export_label", 16 + exp_w / 2, sy + 21, "Export GPX+", 12,
                    weight="700", color=t["onAccent"], anchor="middle")
            rect(card, f"{rid}_delete_bg", 16 + exp_w + 8, sy, del_w, pill_h, fill="none",
                 stroke=t["cardBorder"], sw=1, rx=10)
            text_el(card, f"{rid}_delete_label", 16 + exp_w + 8 + del_w / 2, sy + 21, "Delete", 12,
                    weight="700", color=t["textDim"], anchor="middle")
            body_bottom = sy + pill_h + 12
        card_h = body_bottom - row_top
        card.insert(0, E("rect", f"{rid}_bg", {
            "x": fmt(16), "y": fmt(row_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
            "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
        }))
        card.insert(1, E("rect", f"{rid}_accent", {
            "x": fmt(16), "y": fmt(row_top), "width": fmt(3), "height": fmt(card_h),
            "fill": t["accent"],
        }))
        y = row_top + card_h + 10

    draw_tabbar(svg, t, "RIDES")
    return svg


# --------------------------------------------------------------------------
# D1 (virgin-cycle5, 2026-09-08): RESULTS tab — an entire tab shipped (WP-2,
# 2026-09-06) with zero design representation until now. Two new screens:
# the way-list (ResultsScreen.tsx) and the per-way detail (Results
# DetailScreen.tsx, whose scatterplot mirrors resultsPlotModel.ts/
# resultsPlot.tsx via the build_plot_model() helper above). Both read fresh
# off ResultsScreen.tsx/ResultsDetailScreen.tsx at execution time, not off
# this comment — re-grep before editing.
#
# [ASSUMPTION] catalog.seed.json carries no sport of its own (sports are a
# separate runtime store — store/sportStore.ts — seeded empty in a virgin
# install); RESULTS/RIDES/ROUTES all draw a bare sport-name badge line
# (WP-1) that has no fixture value to read here. FIXTURE_SPORT_LABEL below
# invents one plausible single-sport label ("Cycling") for every screen in
# this file that draws that badge (this pass: results/results_detail; D2.1:
# routes), so the mockups agree with each other rather than each guessing
# separately.
#
# [ASSUMPTION] Fixture ways/numbers reuse the RIDES mockup's own placeholder
# ways per the brief's D1.1 ("so the two screens tell one story"): "Home
# Work Dry" (Morning) and "Work Home Dry" (EveningA), plus a third seeded
# way ("Home Church") with zero rides so the list's "N more ways with no
# rides yet" footer has something honest to count. The detail screen's
# scatterplot/board fixture (RESULTS_DETAIL_RIDES below) is a fabricated but
# internally-consistent 10-ride history on "Home Work Dry" — every date,
# time, tone and rank is computed by this file's own
# build_plot_model()/tower ranking mirror from that one ride list, never
# hand-placed, so the drawing is a faithful projection of SOME data even
# though the data itself is invented (README rule: never a real ride
# result).
# --------------------------------------------------------------------------

FIXTURE_SPORT_LABEL = "Cycling"

# (startedAtMs, scoredS) ascending, ten rides on "Home Work Dry" — the oldest
# (2026-07-25) falls outside the scatterplot's PLOT_N=9 window (plotWindow()
# keeps only the last 9 ranked rides) but still counts in the RESULTS list's
# "10 rides" and the detail board's "ALL 10 RIDES".
RESULTS_DETAIL_RIDES = [
    (_dt_ms(2026, 7, 25), 863.0),
    (_dt_ms(2026, 7, 29), 855.0),
    (_dt_ms(2026, 8, 1), 849.0),
    (_dt_ms(2026, 8, 5), 842.0),
    (_dt_ms(2026, 8, 8), 861.0),
    (_dt_ms(2026, 8, 12), 838.0),  # all-time best (PB)
    (_dt_ms(2026, 8, 15), 852.0),
    (_dt_ms(2026, 8, 19), 846.0),
    (_dt_ms(2026, 8, 22), 858.0),
    (_dt_ms(2026, 9, 1), 844.0),  # most recent
]
RESULTS_DETAIL_BEST_S = min(t for _, t in RESULTS_DETAIL_RIDES)


def draw_results_row(parent, id_prefix, t, x, y, w, label, rides_n, best_label, last_label):
    """One ResultsScreen.tsx row: card (left accent bar, same shape as
    RidesScreen.tsx's own row — brief D1.1), title + 'best X · last Y' sub,
    ride count + chevron on the right. Returns the row height."""
    pad_h, pad_v = 14.0, 12.0
    title_h, sub_gap = 17.0 * 1.15, 4.0
    row_h = pad_v * 2 + title_h + sub_gap + 14.0 * 1.15
    g = group(parent, id_prefix, {})
    rect(g, f"{id_prefix}_bg", x, y, w, row_h, fill=t["card"], stroke=t["cardBorder"], sw=1, rx=16)
    rect(g, f"{id_prefix}_accent", x, y, 3, row_h, fill=t["accent"])
    tx = x + pad_h + 3
    text_el(g, f"{id_prefix}_title", tx, y + pad_v + 12, label, 17, weight="800", color=t["text"])
    sub_txt = (f"best {best_label} · " if best_label is not None else "") + f"last {last_label}"
    text_el(g, f"{id_prefix}_sub", tx, y + pad_v + 12 + sub_gap + 14, sub_txt, 14, color=t["text2"],
            tabular=True)
    rides_txt = f"{rides_n} ride" + ("" if rides_n == 1 else "s")
    text_el(g, f"{id_prefix}_rides", x + w - 16 - 14, y + pad_v + 12, rides_txt, 15, weight="700",
            color=t["textDim"], anchor="end", tabular=True)
    text_el(g, f"{id_prefix}_chev", x + w - 16, y + pad_v + 12, "›", 16, color=t["textDim"],
            anchor="middle")
    return row_h


def build_results(theme_name: str, repo_root: str) -> ET.Element:
    """ResultsScreen.tsx (WP-2 Phase A, §3.8): the way-list — sport badge,
    header RESULTS, one row per way with >=1 stored result (most-ridden
    first, ties by most-recent-ride then label — resultsListModel.ts's
    buildResultsList()), a footer counting ways with zero rides. Tab bar
    visible; RESULTS sits 4th of 6 (App.tsx) so draw_tabbar's own offset
    math already keeps it in view with no special-casing needed here."""
    t = THEMES[theme_name]
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 24.0
    text_el(content, "content_title", 16, y, "RESULTS", 26, weight="800", color=t["text"],
            letter_spacing=2, upper=True)
    y += 34
    # Q5/WP-1: bare sport-name badge, same convention as ROUTES/RIDES.
    text_el(content, "content_sport_badge", 16, y, FIXTURE_SPORT_LABEL.upper(), 14, color=t["text2"],
            tabular=True)
    y += 26

    rows = [
        ("Morning", 10, RESULTS_DETAIL_BEST_S, tower_date(RESULTS_DETAIL_RIDES[-1][0])),
        ("EveningA", 6, 903.4, tower_date(_dt_ms(2026, 8, 21))),
    ]
    unridden_ways = 1  # "Home Church" — seeded, zero stored results

    for i, (way_id, rides_n, best_s, last_label) in enumerate(rows):
        row_h = draw_results_row(
            content, f"content_row_{i + 1}", t, 16, y, VB_W - 32,
            way_label(way_id), rides_n, fmt_time(best_s), last_label,
        )
        y += row_h + 10

    text_el(content, "content_footer", VB_W / 2, y + 8,
            f"{unridden_ways} more way with no rides yet — see ROUTES", 13, color=t["textDim"],
            anchor="middle")

    draw_tabbar(svg, t, "RESULTS")
    return svg


def build_results_detail(theme_name: str, repo_root: str) -> ET.Element:
    """ResultsDetailScreen.tsx (WP-2 §3.10): one way's history — top bar
    (‹ BACK / RESULTS / ride count), way name, LAST N RIDES (windowCaption)
    + hint + the scatterplot (resultsPlotModel.ts's buildPlotModel(), mirrored
    faithfully by build_plot_model() above — same fixture rides the RESULTS
    list's first row uses, so the two screens agree), ALL N RIDES · fastest
    first (the unbounded all-time board — store/results.ts's tower(), sorted
    fastest-first, NOT chronological), BACK TO RESULTS. No map (Nathan, Q2 —
    ResultsDetailScreen.tsx imports no WayMapView). Default/unselected state:
    no board row has the accent bar, the plot's caption reads 'tap a point
    for that ride' — a selected-point state is not drawn (same 'do not draw
    every UI state' convention as record_setup's collapsed way-picker)."""
    t = THEMES[theme_name]
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 24.0
    text_el(content, "content_back", 16, y, "‹ BACK", 14, weight="700", color=t["textDim"])
    text_el(content, "content_top_title", VB_W / 2, y, "RESULTS", 15, weight="800", color=t["text"],
            anchor="middle", letter_spacing=2, upper=True)
    total_rides = len(RESULTS_DETAIL_RIDES)
    text_el(content, "content_top_count", VB_W - 16, y, f"{total_rides} rides", 12, color=t["textDim"],
            anchor="end")
    y += 26

    text_el(content, "content_way_name", 16, y, way_label("Morning"), 22, weight="800", color=t["text"])
    y += 30

    window = RESULTS_DETAIL_RIDES[-PLOT_N:]
    text_el(content, "content_window_heading", 16, y, f"LAST {len(window)} RIDES", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 18
    y += text_block(content, "content_window_hint", 16, y,
                     "purple = fastest of these · green / yellow = faster / slower than their average",
                     12, VB_W - 32, color=t["textDim"]) + 8

    # ---- scatterplot (resultsPlot.tsx's frame: border card, paddingTop 12,
    # paddingHorizontal 8; y-axis gutter (GUTTER_W) + plot area, x-axis strip,
    # caption row) ----
    frame_x, frame_w = 16.0, VB_W - 32.0
    frame_top = y
    plot_w = frame_w - 16.0 - GUTTER_W
    model = build_plot_model(window, plot_w)
    gutter_x = frame_x + 8.0
    plot_x = gutter_x + GUTTER_W
    plot_top = frame_top + 12.0

    plot = group(content, "content_plot", {})
    for i, (at, label) in enumerate(model["y_ticks"]):
        if label is not None:
            text_el(plot, f"content_plot_ytick_{i + 1}", gutter_x + GUTTER_W - 4, plot_top + at + 3,
                    label, 10, color=t["textDim"], anchor="end")
    if model["mean_y"] is not None:
        text_el(plot, "content_plot_avg_label", gutter_x + GUTTER_W - 4, plot_top + model["mean_y"] + 3,
                f"avg {fmt_time(model['mean_s'])}", 10, weight="600", color=t["textDim"], anchor="end")
        line(plot, "content_plot_avg_line", plot_x, plot_top + model["mean_y"], plot_x + plot_w,
             plot_top + model["mean_y"], t["textDim"], 2, dash="2,4")
    for i, p in enumerate(model["points"]):
        r = FASTEST_R if p["tone"] == "fastest" else POINT_R
        circle(plot, f"content_plot_point_{i + 1}", plot_x + p["x"], plot_top + p["y"], r,
               fill=tone_colour(p["tone"]))
    x_axis_y = plot_top + PLOT_H + 14.0
    for i, (at, label) in enumerate(model["x_ticks"]):
        text_el(plot, f"content_plot_xtick_{i + 1}", plot_x + at, x_axis_y, label, 10,
                color=t["textDim"], anchor="middle")
    frame_bottom_pre_caption = x_axis_y + 6.0
    plot.insert(0, E("rect", "content_plot_frame_bg", {
        "x": fmt(frame_x), "y": fmt(frame_top), "width": fmt(frame_w),
        "height": fmt(frame_bottom_pre_caption - frame_top + 46.0),
        "fill": "none", "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    cap_y = frame_bottom_pre_caption + 10.0
    line(plot, "content_plot_caption_divider", frame_x + 8, cap_y - 8, frame_x + frame_w - 8, cap_y - 8,
         t["cardBorder"], 1)
    text_el(plot, "content_plot_caption", frame_x + 8, cap_y + 10, "tap a point for that ride", 12.5,
            color=t["textDim"])
    y = frame_top + (frame_bottom_pre_caption - frame_top + 46.0) + 16

    # ---- ALL-time board (resultsListModel.ts's buildHistoryBoard(): tower()
    # sorted fastest-first, PB = the first row equalling the all-time best) ----
    board_rows = sorted(RESULTS_DETAIL_RIDES, key=lambda r: r[1])
    text_el(content, "content_board_heading", 16, y, f"ALL {len(board_rows)} RIDES · fastest first",
            12, weight="700", color=t["textDim"], letter_spacing=2, upper=True)
    y += 20
    pb_assigned = False
    for i, (ms, ts) in enumerate(board_rows):
        pos = i + 1
        gap_label = "—" if pos == 1 else f"+{round(ts - board_rows[0][1])}s"
        is_pb = (not pb_assigned) and ts == RESULTS_DETAIL_BEST_S
        if is_pb:
            pb_assigned = True
        row = group(content, f"content_board_row_{pos}", {})
        text_el(row, f"content_board_row_{pos}_pos", 16, y + 13, f"P{pos}", 13, weight="700",
                color=t["textDim"], tabular=True)
        text_el(row, f"content_board_row_{pos}_date", 52, y + 13, tower_date(ms), 13, color=t["textDim"])
        if is_pb:
            circle(row, f"content_board_row_{pos}_pbdot", VB_W - 108, y + 9, 3, fill=COLORS["purple"])
        text_el(row, f"content_board_row_{pos}_time", VB_W - 96, y + 13, fmt_time(ts), 14, color=t["text"],
                anchor="end", tabular=True)
        text_el(row, f"content_board_row_{pos}_gap", VB_W - 16, y + 13, gap_label, 12, color=t["textDim"],
                anchor="end", tabular=True)
        y += 30
        if i < len(board_rows) - 1:
            line(content, f"content_board_row_{pos}_divider", 16, y - 12, VB_W - 16, y - 12,
                 t["cardBorder"], 1)

    y += 12
    btn_w, btn_h = 190.0, 40.0
    btn = group(content, "content_back_button", {})
    rect(btn, "content_back_button_bg", (VB_W - btn_w) / 2, y, btn_w, btn_h, fill=t["accent"], rx=10)
    text_el(btn, "content_back_button_label", VB_W / 2, y + 25, "BACK TO RESULTS", 12.5, weight="800",
            color=t["onAccent"], anchor="middle", letter_spacing=1)

    return svg


def ride_detail_tier_colour(tier: str, t: dict) -> str:
    """Mirrors RideDetailScreen.tsx's own LOCAL tierColour(tier,t) helper
    verbatim — a fourth mapping in this file, deliberately distinct from
    chip_palette()'s chipColors()-text mirror (build_rides' sector rows) and
    from tier_line_colour()'s tierLineColour() mirror (map lines/spans):
    'neutral' reads as t.accentText and the fallback (est/no-lap) as
    t.textDim, neither of which the other two mirrors return."""
    if tier == "purple":
        return COLORS["purple"]
    if tier == "green":
        return COLORS["green"]
    if tier == "yellow":
        return COLORS["neutral"]
    if tier == "neutral":
        return t["accentText"]
    return t["textDim"]


def build_ride_detail(theme_name: str, repo_root: str) -> ET.Element:
    """D2.3 (virgin-cycle5, 2026-09-08): ResultScreen.tsx is gone (WP-H) —
    its per-ride board now lives inside RideDetailScreen.tsx, read fresh.
    Full-screen, `‹ BACK`, no tab bar, opened right after STOP (source
    'post-stop' -> primaryLabel 'RECORD ANOTHER'). Layout: top bar -> card
    (way name, headline GATED lap coloured by the screen's OWN local
    tierColour() — ride_detail_tier_colour() below, a THIRD distinct colour
    mapping in this file, deliberately not chip_palette() or
    tier_line_colour() — rank line, the ridden trace on a browse map with
    the same sector-coloured spans D2.2 gave the live map, SECTORS split
    table, ON THIS WAY personal bests) -> ACTIONS (Export GPX+ / Delete /
    Ignore in ranking / Make this the reference of this way) -> RECORD
    ANOTHER.

    [ASSUMPTION] Continues the SAME fixture ride build_record_finished.svg
    depicts (way "Morning"/Home Work Dry, LAP 14:31.2, green tier, P3 of 9,
    sectors S1 purple/S2 green/S3 yellow/S4 green) — this is genuinely the
    screen a rider lands on right after that recording, so the two mockups
    tell one continuous story. [ASSUMPTION] the "Make this the reference of
    this way" action is drawn even though rideDetailModel.ts's real
    promoteTarget gate requires a USER-owned route (seed routes like
    "Morning" never qualify) — included anyway because the brief's D2.3
    explicitly lists it among the four actions to draw; treat this one
    button as illustrating an available STATE of the screen, not this
    specific fixture ride's actual eligibility."""
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 24.0
    text_el(content, "content_back", 16, y, "‹ BACK", 14, weight="700", color=t["textDim"])
    text_el(content, "content_top_title", VB_W / 2, y, "RIDE", 15, weight="800", color=t["text"],
            anchor="middle", letter_spacing=2, upper=True)
    # dateTimeLabel() format ('Tue 05 Aug · 08:31') — same ride as
    # build_record_finished/build_rides' "Sat 22 Aug · 07:41" row.
    date_time_label = f"{tower_date(_dt_ms(2026, 8, 22))} · 07:41"
    text_el(content, "content_top_date", VB_W - 16, y, date_time_label, 12, color=t["textDim"],
            anchor="end")
    y += 26

    card_top = y
    cx = VB_W / 2
    cy = card_top + 20
    text_el(content, "content_way_name", cx, cy, way_label("Morning"), 13, color=t["textDim"],
            anchor="middle")
    cy += 30
    lap_tier = "green"
    text_el(content, "content_lap_big", cx, cy, "14:31.2", 34, weight="800",
            color=ride_detail_tier_colour(lap_tier, t), anchor="middle", tabular=True)
    cy += 22
    text_el(content, "content_rank_line", cx, cy, "P3 of 9 on this way", 12.5, color=t["textDim"],
            anchor="middle")
    cy += 20

    map_x, map_w, map_h = 29.0, VB_W - 32.0 - 26.0, 220.0
    ride_sector_colours = [None, tier_line_colour("purple"), tier_line_colour("green"),
                            tier_line_colour("yellow"), tier_line_colour("green")]
    draw_map(content, "content_map", t, asset, (map_x, cy, map_w, map_h),
             gate_tiers=[None] * 5, sector_colours=ride_sector_colours,
             rider_at=None, label_note=True, route_casing=True, gate_casing=True,
             placeholder_size=4)
    cy += map_h + 16

    text_el(content, "content_sectors_heading", 29, cy, "SECTORS", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    cy += 18
    sectors = [
        (1, "purple", "3:02.1", "avg 3:15"),
        (2, "green", "3:28.4", "avg 3:41"),
        (3, "yellow", "3:51.0", "avg 3:44"),
        (4, "green", "3:20.2", "avg 3:33"),
    ]
    for si, tier, tval, avgl in sectors:
        col = chip_palette(tier, t)[2]
        text_el(content, f"content_sector_{si}_label", 29, cy, f"S{si}", 13, weight="700", color=col)
        text_el(content, f"content_sector_{si}_time", 95, cy, tval, 13, color=col, anchor="end",
                tabular=True)
        text_el(content, f"content_sector_{si}_avg", VB_W - 29, cy, avgl, 12, color=t["textDim"],
                anchor="end", tabular=True)
        cy += 20
    cy += 6

    text_el(content, "content_onthisway_heading", 29, cy, "ON THIS WAY", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    cy += 18
    # PbDetail (rideHistoryModel.ts's buildPbDetail()) — rankingPoolFor()'s
    # pool, this ride at P3 (matches the rank line above and
    # build_record_finished's P3-of-9 posChip: one continuous fixture).
    ranking = [
        ("P1", "Tue 12 Aug", "13:58", ""),
        ("P2", "Fri 15 Aug", "14:11", "+13s"),
        ("P3", "today", "14:31", "+33s"),
        ("P4", "Wed 06 Aug", "14:38", "+40s"),
        ("P5", "Sat 02 Aug", "14:44", "+46s"),
        ("P6", "Tue 29 Jul", "14:50", "+52s"),
        ("P7", "Fri 25 Jul", "14:55", "+57s"),
        ("P8", "Mon 21 Jul", "15:01", "+63s"),
        ("P9", "Thu 17 Jul", "15:08", "+70s"),
    ]
    text_el(content, "content_pb_ranking_hint", 29, cy, f"last {len(ranking)} on this way", 11.5,
            color=t["textDim"])
    cy += 18
    for pos, date, tval, gap in ranking:
        today = date == "today"
        suf = pos.lower()
        text_el(content, f"content_pb_rank_{suf}_pos", 29, cy, pos, 13, weight="700", color=t["text"])
        text_el(content, f"content_pb_rank_{suf}_date", 74, cy, date, 13,
                color=t["accentText"] if today else t["textDim"])
        text_el(content, f"content_pb_rank_{suf}_time", VB_W - 95, cy, tval, 13, color=t["text"],
                anchor="end", tabular=True)
        text_el(content, f"content_pb_rank_{suf}_gap", VB_W - 29, cy, gap, 13, color=t["textDim"],
                anchor="end", tabular=True)
        cy += 20
    cy += 8

    pb_sectors = [("S1", "3:00.4"), ("S2", "3:18.9"), ("S3", "3:34.2"), ("S4", "3:04.6")]
    text_el(content, "content_pb_sectors_hint", 29, cy, "personal best sectors", 11.5,
            color=t["textDim"])
    cy += 18
    for lbl, tval in pb_sectors:
        suf = lbl.lower()
        text_el(content, f"content_pb_sec_{suf}_label", 29, cy, lbl, 13, weight="700", color=t["text"])
        text_el(content, f"content_pb_sec_{suf}_time", VB_W - 29, cy, tval, 13, color=t["text"],
                anchor="end", tabular=True)
        cy += 20
    cy += 6

    card_h = cy - card_top + 6
    content.insert(0, E("rect", "content_card_bg", {
        "x": fmt(16), "y": fmt(card_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    y = card_top + card_h + 16

    text_el(content, "content_actions_heading", 16, y, "ACTIONS", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 18

    def draw_action_btn(id_, x, label, w, filled):
        g = group(content, id_, {})
        if filled:
            rect(g, f"{id_}_bg", x, y, w, 32, fill=t["accent"], rx=8)
            text_el(g, f"{id_}_label", x + w / 2, y + 21, label, 13, weight="700",
                    color=t["onAccent"], anchor="middle")
        else:
            rect(g, f"{id_}_bg", x, y, w, 32, fill="none", stroke=t["cardBorder"], sw=1, rx=8)
            text_el(g, f"{id_}_label", x + w / 2, y + 21, label, 13, weight="700",
                    color=t["textDim"], anchor="middle")
        return w

    gap = 8.0
    x = 16.0
    x += draw_action_btn("content_export_btn", x, "Export GPX+", 108.0, True) + gap
    x += draw_action_btn("content_delete_btn", x, "Delete", 76.0, False) + gap
    draw_action_btn("content_ignore_btn", x, "Ignore in ranking", 150.0, False)
    y += 32 + 10

    draw_action_btn("content_promote_btn", 16, "Make this the reference of this way", 262.0, False)
    y += 32 + 20

    btn_w, btn_h = 190.0, 44.0
    btn = group(content, "content_primary_button", {})
    rect(btn, "content_primary_button_bg", (VB_W - btn_w) / 2, y, btn_w, btn_h, fill=t["accent"], rx=10)
    text_el(btn, "content_primary_button_label", VB_W / 2, y + 27, "RECORD ANOTHER", 12.5,
            weight="800", color=t["onAccent"], anchor="middle", letter_spacing=1)

    return svg


# --------------------------------------------------------------------------
# D3 (virgin-cycle5, 2026-09-08, optional per the brief) — the remaining
# full-screen surfaces: catalog_detail (CatalogDetailScreen.tsx) and
# gate_adjust (GateAdjustScreen.tsx + gateAdjustCard.tsx). Both read fresh
# off the staged files at execution time, same discipline as every builder
# above.
# --------------------------------------------------------------------------

def build_catalog_detail(theme_name: str, repo_root: str) -> ET.Element:
    """Mirrors CatalogDetailScreen.tsx (WP-K): the ROUTES-tab full-screen
    detail, mount-swapped over the active tab, full-screen, `‹ BACK`, no tab
    bar. Two request kinds exist (`place` / `route`); per the brief's D3
    table this draws the WAY variant, i.e. `request.kind === 'route'` ->
    RouteBody -> one WaySection — "the map + real gate-set facts + 'edit
    gates' entry", not a place. This is also where RoutesScreen.tsx's old
    expanded-card content now lives (WP-K absorbed it here, D2.1 removed it
    from ROUTES).

    Fixture: the SAME "Morning" way/'home>work' route every other screen in
    this file uses (continuity — the design's one running example). Real
    gate-set facts come straight from catalog.seed.json's gateSets entry for
    "Morning" (chainageM [162, 1312, 2662, 4212, 5487], v1, no origin) — the
    only realistic gate numbers available; this is what D2.1's own note says
    replaced the old hardcoded "4 sectors · START ~160 m in" caption.
    [ASSUMPTION] refLengthM (the real app derives it from a runtime
    reference line — live/refs.ts — which this offline tooling cannot read)
    is approximated via way_path_length_m()'s haversine sum over ways.json's
    own schematic path; see that function's own docstring.

    [ASSUMPTION] "Morning" is seed-owned (isSeedOwned), so the real model's
    `gateEditable` (r.deletable && a resolvable draft) and `r.deletable`
    would BOTH be false for this exact fixture — no "edit gates" button, no
    "delete way"/"delete route" would render for real. "edit gates" is drawn
    anyway to illustrate the entry point this D3 mockup exists to show (same
    tradeoff build_ride_detail() already makes for its "Make this the
    reference of this way" button, for the identical reason: a fixture way
    that is honestly ineligible for an action the brief still wants drawn).
    Delete affordances are honestly omitted instead (a seed route has none),
    with a one-line note in ACTIONS saying why. referenceRide/
    referenceUnscored are both genuinely null/false for "Morning" (the seed
    way carries no referenceRideId) — so, unlike the illustrative edit-gates
    button, the reference-ride row is simply not drawn, matching the real
    model exactly.

    ridesOnFile/rankedCount ("9"/"9") continue build_ride_detail()'s own
    fixture ("P3 of 9 on this way") — [ASSUMPTION], the same one continuous
    story that screen's own docstring documents."""
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    catalog = load_catalog(repo_root)
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 24.0
    text_el(content, "content_back", 16, y, "‹ BACK", 14, weight="700", color=t["textDim"])
    text_el(content, "content_top_title", VB_W / 2, y, "ROUTE", 15, weight="800", color=t["text"],
            anchor="middle", letter_spacing=2, upper=True)
    text_el(content, "content_top_caption", VB_W - 16, y, "shipped", 12, color=t["textDim"],
            anchor="end")
    y += 26

    route = next(r for r in catalog["routes"] if r["id"] == "home>work")
    landmarks = catalog["landmarks"]
    from_l = next(l for l in landmarks if l["id"] == route["startLandmarkId"])
    to_l = next(l for l in landmarks if l["id"] == route["endLandmarkId"])
    ways_for_route = [w for w in catalog["ways"] if w["routeId"] == route["id"]]

    card_top = y
    cy = card_top + 20
    text_el(content, "content_route_label", 29, cy, f"{from_l['label']} → {to_l['label']}", 18,
            weight="800", color=t["text"])
    cy += 20
    way_count_txt = f"{len(ways_for_route)} way" + ("" if len(ways_for_route) == 1 else "s")
    if len(ways_for_route) > 1:
        way_count_txt += " · asks which one at START"
    text_el(content, "content_route_sub", 29, cy, way_count_txt, 12.5, color=t["textDim"])
    cy += 22
    text_el(content, "content_route_from_label", 29, cy, f"from: {from_l['label']}", 13, color=t["text"])
    text_el(content, "content_route_from_chev", VB_W - 29, cy, "›", 13, color=t["textDim"], anchor="middle")
    cy += 20
    text_el(content, "content_route_to_label", 29, cy, f"to: {to_l['label']}", 13, color=t["text"])
    text_el(content, "content_route_to_chev", VB_W - 29, cy, "›", 13, color=t["textDim"], anchor="middle")
    cy += 14
    card_h = cy - card_top + 8
    content.insert(0, E("rect", "content_route_card_bg", {
        "x": fmt(16), "y": fmt(card_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    y = card_top + card_h + 20

    variant_label = way_variant_label("Morning", route)
    text_el(content, "content_way_heading", 16, y, f"WAY · {variant_label}", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16

    map_h = 260.0
    draw_map(content, "content_way_map", t, asset, (16.0, y, VB_W - 32.0, map_h),
             gate_tiers=[None] * 5, rider_at=None, label_note=True,
             route_casing=True, gate_casing=True, placeholder_size=4)
    y += map_h + 14

    gate_set = next(g for g in catalog["gateSets"] if g["wayId"] == "Morning")
    chainage = gate_set["chainageM"]
    n_gates = len(chainage)
    length_m = way_path_length_m(asset)
    facts: list[tuple[str, str]] = [
        ("length", fmt_length_m(length_m)),
        ("gates", f"{n_gates} · v{gate_set['version']}"),
    ]
    for i, m in enumerate(chainage):
        facts.append((gate_name(i, n_gates), fmt_chainage(m)))
    facts.append(("rides on file", "9"))
    facts.append(("ranked", "9"))
    for i, (label_txt, value_txt) in enumerate(facts):
        text_el(content, f"content_fact_{i+1}_label", 16, y, label_txt, 13, color=t["textDim"])
        text_el(content, f"content_fact_{i+1}_value", VB_W - 16, y, value_txt, 13, color=t["text"],
                anchor="end", tabular=True)
        y += 20
    y += 10

    edit_btn_w = 110.0
    edit_btn = group(content, "content_edit_gates_btn", {})
    rect(edit_btn, "content_edit_gates_btn_bg", 16, y, edit_btn_w, 32, fill="none",
         stroke=t["cardBorder"], sw=1, rx=8)
    text_el(edit_btn, "content_edit_gates_btn_label", 16 + edit_btn_w / 2, y + 21, "edit gates", 12.5,
            weight="700", color=t["textDim"], anchor="middle")
    y += 32 + 24

    text_el(content, "content_actions_heading", 16, y, "ACTIONS", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 18
    text_el(content, "content_actions_note", 16, y, "no delete — this way and route are shipped", 11.5,
            color=t["textDim"])
    y += 30

    btn_w, btn_h = 190.0, 44.0
    btn = group(content, "content_primary_button", {})
    rect(btn, "content_primary_button_bg", (VB_W - btn_w) / 2, y, btn_w, btn_h, fill=t["accent"], rx=10)
    text_el(btn, "content_primary_button_label", VB_W / 2, y + 27, "BACK TO ROUTES", 12.5,
            weight="800", color=t["onAccent"], anchor="middle", letter_spacing=1)

    return svg


def build_gate_adjust(theme_name: str, repo_root: str) -> ET.Element:
    """Mirrors GateAdjustScreen.tsx + gateAdjustCard.tsx (WP-J extended
    scope): the full-screen "proper openmap render" gate editor — Nathan's
    own framing, cited in GateAdjustScreen.tsx's own file header. Full-
    screen, `‹ BACK`, `EDIT GATES` title, no tab bar; one card: title
    "Sector gates — <way label>", subtitle, the embedded map with a
    tap-then-nudge UI (chip row -> selected-gate readout -> nudge pad),
    SAVE/KEEP GATES.

    Fixture: "Morning" again (continuity), gate G2 selected and nudged +1%
    (largeM) from its real catalog.seed.json chainage — the state that best
    demonstrates "tap a gate, then nudge it" (an untouched screen would show
    nothing to nudge). dirty=True, so the primary button reads SAVE GATES
    and the discard link is shown, matching gateAdjustCard.tsx's own dirty
    branch. mapHeight uses the real component's documented floor (280, "half
    the window, floor = the inline default") rather than inventing a window
    height for a static canvas.

    The selected gate's tick is drawn bolder + riderBlue on top of
    draw_map()'s own tick, mirroring wayMapView.tsx's own real rule exactly
    ("the selected gate draws bolder/blue on this rung too" — colors.
    riderBlue, thicker) rather than inventing a new selection convention.
    [ASSUMPTION] refLengthM/chainage same haversine approximation as
    catalog_detail (way_path_length_m()) — see that function's docstring."""
    t = THEMES[theme_name]
    asset = load_way_asset(repo_root, "Morning")
    catalog = load_catalog(repo_root)
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 24.0
    text_el(content, "content_back", 16, y, "‹ BACK", 14, weight="700", color=t["textDim"])
    text_el(content, "content_top_title", VB_W / 2, y, "EDIT GATES", 15, weight="800", color=t["text"],
            anchor="middle", letter_spacing=2, upper=True)
    y += 30

    gate_set = next(g for g in catalog["gateSets"] if g["wayId"] == "Morning")
    chainage = list(gate_set["chainageM"])
    n = len(chainage)
    ref_length_m = way_path_length_m(asset)
    selected_i = 2  # G2 — mid-way, clear of START/FINISH's own end-of-list chip
    large_m = 0.01 * ref_length_m  # NUDGE_LARGE_PCT (gateAdjustModel.ts)
    chainage[selected_i] = min(chainage[selected_i] + large_m,
                                chainage[selected_i + 1] - 50)  # MIN_GATE_GAP_M

    card_top = y
    cy = card_top + 22
    title_txt = f"Sector gates — {way_label('Morning')}"
    used = text_block(content, "content_card_title", 32, cy, title_txt, 16, VB_W - 64,
                       weight="700", color=t["text"])
    cy += used + 6
    subtitle = ("Tap a gate on the map or below to nudge it — start and finish too. Saving moved "
                "gates resets this way's history: past results are re-timed from their recordings "
                "against the new gates, old times and ranks do not survive.")
    used = text_block(content, "content_card_subtitle", 32, cy, subtitle, 12.5, VB_W - 64,
                       color=t["textDim"])
    cy += used + 12

    map_x, map_w, map_h = 32.0, VB_W - 64.0, 280.0
    draw_map(content, "content_map", t, asset, (map_x, cy, map_w, map_h),
             gate_tiers=[None] * n, rider_at=None, label_note=True,
             route_casing=True, gate_casing=True, placeholder_size=4)
    # Selected gate's tick redrawn bolder + riderBlue on top, matching
    # wayMapView.tsx's own real selected-gate rule exactly (see docstring).
    pts = asset["path"]
    proj = make_projector(asset, map_x, cy, map_w, map_h)
    full_idx = [0] + list(asset["gateIdx"]) + [len(pts) - 1]
    gi = full_idx[selected_i]
    tx1, ty1, tx2, ty2 = gate_tick_endpoints(proj, pts, gi)
    line(content, "content_map_selected_gate", tx1, ty1, tx2, ty2, COLORS["riderBlue"], 5)
    cy += map_h + 16

    chip_gap = 6.0
    chip_w = (map_w - chip_gap * (n - 1)) / n
    for i in range(n):
        cx = map_x + i * (chip_w + chip_gap)
        sel = i == selected_i
        chip = group(content, f"content_chip_{i+1}", {})
        rect(chip, f"content_chip_{i+1}_bg", cx, cy, chip_w, 32, fill=t["accent"] if sel else "none",
             stroke=t["cardBorder"], sw=1, rx=9)
        text_el(chip, f"content_chip_{i+1}_label", cx + chip_w / 2, cy + 20, gate_name(i, n), 11,
                weight="700", color=t["onAccent"] if sel else t["text"], anchor="middle",
                letter_spacing=0.5)
    cy += 32 + 16

    readout = f"{gate_name(selected_i, n)} · {fmt_chainage(chainage[selected_i])} · " \
              f"{fmt_pct(chainage[selected_i], ref_length_m)}"
    text_el(content, "content_readout", VB_W / 2, cy, readout, 16, weight="700", color=t["text"],
            anchor="middle", tabular=True)
    cy += 18

    pad_items = [("−1%", 1.25), ("−0.1%", 0.75), ("+0.1%", 0.75), ("+1%", 1.25)]
    total_flex = sum(fl for _, fl in pad_items)
    pad_w_unit = (map_w - chip_gap * (len(pad_items) - 1)) / total_flex
    px = map_x
    for i, (lbl, fl) in enumerate(pad_items):
        w_i = pad_w_unit * fl
        big = fl > 1
        pad = group(content, f"content_pad_{i+1}", {})
        rect(pad, f"content_pad_{i+1}_bg", px, cy, w_i, 40 if big else 32, fill="none",
             stroke=t["cardBorder"], sw=1, rx=9)
        text_el(pad, f"content_pad_{i+1}_label", px + w_i / 2, cy + (26 if big else 21), lbl,
                17 if big else 13, weight="800" if big else "700", color=t["text"], anchor="middle")
        px += w_i + chip_gap
    cy += 40 + 18

    save_w, save_h = map_w, 44.0
    save_btn = group(content, "content_save_btn", {})
    rect(save_btn, "content_save_btn_bg", map_x, cy, save_w, save_h, fill=t["accent"], rx=10)
    text_el(save_btn, "content_save_btn_label", VB_W / 2, cy + 28, "SAVE GATES", 15, weight="700",
            color=t["onAccent"], anchor="middle", letter_spacing=1)
    cy += save_h + 12

    text_el(content, "content_discard_label", VB_W / 2, cy,
            "discard nudges — keep the current gates", 13, color=t["textDim"], anchor="middle")
    cy += 20

    card_h = cy - card_top + 12
    content.insert(0, E("rect", "content_card_bg", {
        "x": fmt(16), "y": fmt(card_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))

    return svg


BUILDERS = {
    "routes": build_routes,
    "settings": build_settings,
    "demo": build_demo,
    "record_setup": build_record_setup,
    "record_armed": build_record_armed,
    "record_running": build_record_running,
    "record_finished": build_record_finished,
    "rides": build_rides,
    "ride_detail": build_ride_detail,
    "results": build_results,
    "results_detail": build_results_detail,
    "catalog_detail": build_catalog_detail,
    "gate_adjust": build_gate_adjust,
}


# --------------------------------------------------------------------------
# validator
# --------------------------------------------------------------------------

def _local(tag: str) -> str:
    return tag.split("}")[-1]


def validate(svg_root: ET.Element, filename: str, allowed_colors: set[str]) -> list[str]:
    errors: list[str] = []
    seen_ids: set[str] = set()

    def walk(elem: ET.Element, g_depth: int):
        tag = _local(elem.tag)
        if tag == "defs":
            # defs/clipPath internals are exempt from the labelling scheme
            # (brief: "never rename into defs/clipPath internals") — they
            # aren't drawable content in the semantic-layer sense.
            return
        if tag == "image":
            errors.append(f"{filename}: <image> element forbidden (id={elem.get('id')})")
        if tag != "svg":
            id_ = elem.get("id")
            label = elem.get(f"{{{INKSCAPE_NS}}}label")
            if not id_:
                errors.append(f"{filename}: element <{tag}> missing id")
            if not label:
                errors.append(f"{filename}: element id={id_} missing inkscape:label")
            elif id_ != label:
                errors.append(f"{filename}: id/label mismatch on {id_} vs {label}")
            if id_:
                if id_ in seen_ids:
                    errors.append(f"{filename}: duplicate id {id_}")
                seen_ids.add(id_)
            for attr in ("fill", "stroke"):
                v = elem.get(attr)
                if v is None:
                    continue
                v_check = _normalize_hex(v) if v.startswith("#") else v
                if v_check not in allowed_colors:
                    errors.append(
                        f"{filename}: {attr}={v} on id={id_} not found in theme.ts/chips.tsx/settings.tsx"
                    )
        next_depth = g_depth + 1 if tag == "g" else g_depth
        if tag == "g" and g_depth > 1:
            errors.append(f"{filename}: nesting too deep at id={elem.get('id')} (layer->group->leaf max)")
        if tag != "g" and g_depth > 2:
            errors.append(f"{filename}: leaf nested too deep at id={elem.get('id')}")
        for child in list(elem):
            walk(child, next_depth)

    walk(svg_root, 0)
    return errors


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def serialize(svg_root: ET.Element) -> str:
    ET.indent(svg_root, space="  ")
    body = ET.tostring(svg_root, encoding="unicode")
    return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + body + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=os.path.normpath(os.path.join(os.path.dirname(__file__), "..")))
    args = ap.parse_args()

    out_dir = os.path.join(os.path.dirname(__file__), "canonical")
    allowed_colors = load_allowed_colors(args.repo_root)

    # Build + validate EVERYTHING first; only write to disk once every file
    # has passed, so a late failure never leaves a partial canonical/ behind.
    all_errors: list[str] = []
    to_write: list[tuple[str, str]] = []  # (fname, serialized content)
    for screen in IMPLEMENTED:
        for theme_name in ("day", "night"):
            svg_root = BUILDERS[screen](theme_name, args.repo_root)
            fname = f"{screen}_{theme_name}.svg"
            errs = validate(svg_root, fname, allowed_colors)
            if errs:
                all_errors.extend(errs)
                continue
            to_write.append((fname, serialize(svg_root)))

    if all_errors:
        print("VALIDATION FAILED:", file=sys.stderr)
        for e in all_errors:
            print("  " + e, file=sys.stderr)
        return 1

    os.makedirs(out_dir, exist_ok=True)
    written: list[str] = []
    for fname, content in to_write:
        out_path = os.path.join(out_dir, fname)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        written.append(fname)

    print(f"Wrote {len(written)} SVGs to {out_dir}:")
    for w in written:
        print("  " + w)
    if DEFERRED:
        print(f"\nDeferred to the WP-J re-emit pass (after WP-A/WP-E land): {', '.join(DEFERRED)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
