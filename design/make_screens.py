#!/usr/bin/env python3
"""
Canonical source of design/canonical/*.svg.

Nathan's hand-edits live in design/edited/ and are mirrored back into THIS
script (his edited file is the truth until mirrored). Re-run:
    python3 design/make_screens.py [--repo-root PATH]

Cycle 024 / WP-J, RE-EMIT PASS (2026-08-24): the first pass (2026-08-22)
deliberately deferred RECORD's four states plus RIDES/RESULT because this
cycle's WP-A (RECORD/RIDES/RESULT redesign), WP-B (free-ride groundwork) and
WP-E (live map rendering rewrite) had not landed yet — drawing them then
would have meant redrawing them again a few days later. All three have now
landed, and this pass draws the deferred six (record_setup, record_armed,
record_running, record_finished, rides, result), reading RecordScreen.tsx,
RidesScreen.tsx, ResultScreen.tsx, routeMapView.tsx, App.tsx and theme.ts
FRESH at execution time rather than trusting the original brief's own
(now-stale, pre-WP-A/B/E) description of what those screens show.

WP-B's free-ride "new" start/end option is UNRATIFIED (no agreed layout) and
is deliberately not drawn anywhere in this file — every RECORD screen below
depicts a normal known-route ride only. See design/README.md.

Implemented (9 screens x day/night = 18 files):
    routes, settings, demo                                        (pass 1)
    record_setup, record_armed, record_running, record_finished,
    rides, result                                                 (pass 2)

Requirements satisfied here (brief WP-J-svg-tab-recompositions.md §5):
 - stdlib only, Python 3.
 - one function per screen taking a `theme` dict; THEMES{} transcribed from
   app/src/ui/theme.ts (source of truth — re-transcribe, never fork).
 - reads app/assets/routes/routes.json for the map polyline; --repo-root
   overrides the relative path so this runs in the sandbox and on Nathan's
   machine alike.
 - deterministic output (stable dict/list ordering, fixed-precision floats).
 - self-validates before writing (ALL files validated before ANY are written,
   so a late failure never leaves partial output on disk): id+label on every
   element, ids unique per file, nesting <=3 (layer -> group -> leaf), no
   <image>, every colour cross-checked against the hex literals actually
   present in theme.ts/chips.tsx/settings.tsx (load_allowed_colors) — not
   just against this script's own THEMES/COLORS transcription, which
   couldn't catch a typo in itself. Exits non-zero listing violations.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET

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
    # routeMapView.tsx's CASING const (2026-08-24 hotfix) — the black outline
    # under both the route line and gate ticks on the real map now. Lives in
    # routeMapView.tsx, not theme.ts, so load_allowed_colors() below also
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

TABS = ["RECORD", "RIDES", "ROUTES", "RESULT", "SETTINGS", "DEMO"]

# All 9 screens are implemented as of the re-emit pass (see module docstring).
IMPLEMENTED = [
    "routes", "settings", "demo",
    "record_setup", "record_armed", "record_running", "record_finished",
    "rides", "result",
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
        # WP-J re-emit pass: the route/gate map rendering this pass draws now
        # follows routeMapView.tsx's own CASING const (2026-08-24 hotfix), so
        # that file is a legitimate additional colour source-of-truth here.
        "app/src/ui/routeMapView.tsx",
    ):
        p = os.path.join(repo_root, rel)
        if not os.path.exists(p):
            continue
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
# route asset loading + schematic projection
# --------------------------------------------------------------------------

def load_route_asset(repo_root: str, route_id: str = "Morning") -> dict:
    p = os.path.join(repo_root, "app", "assets", "routes", "routes.json")
    with open(p, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    return manifest["routes"][route_id]


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
             route_casing=False, gate_casing=False, placeholder_size=0):
    """Schematic map, one <g> under `parent` (parent is already a layer or a
    group — this itself counts as ONE nesting level, so callers must add it
    directly under a layer, never under another group).
    gate_tiers: list[str|None] parallel to asset['gates'] — a colour hex or
    None (unscored -> dim theme-neutral tick).
    rider_at: None, or a gate name ('START'..'FINISH') or a float 0..1
    fraction of the ridden path length to place the rider dot at.
    ground_fill/ground_border: default to the PADDOCK card/cardBorder tokens
    (browse surfaces: Routes/Settings/Demo); record_finished passes the RACE
    raceCard/raceBorder tokens instead — routeMapView's frame always sits on
    t.race.bg, never the paddock card colour (theme.ts's two-mode rule).
    rider_fill/rider_stroke: default to the pass-1 convention (ink fill on
    the ground colour, "so it never reads as a scored tier"), used unchanged
    by routes/demo. The RECORD screens (re-emit pass) pass
    COLORS['riderBlue'] instead — routeMapView.tsx's real WP-E rider-dot
    colour, on-route solid riderBlue/white. rider_off_route=True mirrors its
    inverted convention (white fill, colour stroke) when rider_fill is given.
    route_casing/gate_casing (WP-J re-emit fix pass, 2026-08-24): default
    False so pass-1 callers (routes/settings/demo — frozen, never touched by
    this pass) render byte-identically to before. The RECORD screens pass
    True for both, matching routeMapView.tsx's same-day hotfix: a black
    CASING outline under the route line and under every gate tick, so the
    line/ticks read as one continuous solid design language instead of a
    bare colour stroke. gate_casing also changes the unscored-tick colour
    from t['textDim'] (the near-invisible grey the hotfix removed) to a
    thinner/dimmer t['accent'] (yellow), and draws a scored tick at full
    width/opacity in its earned tier colour — so a genuinely-scored ordinary/
    yellow-tier gate still reads visibly bolder than an unscored one (the
    same D-013/D-030 distinction the app's own hotfix makes; see
    routeMapView.tsx's gate-ticks layer comment).
    placeholder_size: the schematic-map disclaimer rect's side length in px.
    Default 0 (pass-1's original zero-size leaf, unchanged). The RECORD
    screens pass a small nonzero value so the element is actually selectable
    in Inkscape instead of a 0×0 rect nothing can click on.
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

def route_label(route_id: str) -> str:
    """Mirrors store/defaultRoute.ts's routeLabel() exactly: 'EveningA' ->
    'Evening A', 'Morning' -> 'Morning' (no match, no change)."""
    return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", route_id)


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
# screen builders — one function per screen, implemented this pass
# --------------------------------------------------------------------------

def build_routes(theme_name: str, repo_root: str) -> ET.Element:
    t = THEMES[theme_name]
    asset = load_route_asset(repo_root, "Morning")
    catalog = load_catalog(repo_root)
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 20
    text_el(content, "content_places_heading", 16, y, "YOUR PLACES", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16

    # Real catalog data (app/src/store/catalog.seed.json) — all 6 landmarks,
    # in catalog order, labels rendered verbatim (RoutesScreen.tsx: `{l.label}`,
    # never re-cased), dormant computed by RoutesScreen.tsx's own rule.
    card_top = y
    ry = y + 24
    landmarks = catalog["landmarks"]
    for i, l in enumerate(landmarks):
        dormant = landmark_dormant(l)
        label_txt = l["label"] + ("  ·  dormant" if dormant else "")
        sub_txt = f"{l['lat']:.5f}, {l['lon']:.5f} · {l['radiusM']} m"
        text_el(content, f"content_places_row_{i+1}_label", 30, ry, label_txt, 14,
                color=t["textDim"] if dormant else t["text"])
        text_el(content, f"content_places_row_{i+1}_sub", 30, ry + 16, sub_txt, 11.5, color=t["textDim"])
        if i < len(landmarks) - 1:
            line(content, f"content_places_row_{i+1}_divider", 30, ry + 28, VB_W - 30, ry + 28,
                 t["cardBorder"], 1)
        ry += 44
    footnote_h = text_block(
        content, "content_places_footnote", 30, ry + 6,
        "Dormant places keep seeding history but are never offered at START. Radius is "
        "measured, not guessed: p90 of the endpoint spread, capped at half the gap to the "
        "nearest place.",
        10.5, VB_W - 32 - 28, color=t["textDim"],
    )
    card_h = (ry + 6 + footnote_h + 12) - card_top
    content.insert(0, E("rect", "content_places_card_bg", {
        "x": fmt(16), "y": fmt(card_top), "width": fmt(VB_W - 32), "height": fmt(card_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    y = card_top + card_h + 24

    text_el(content, "content_ways_heading", 16, y, "WAYS", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16

    way_top = y
    text_el(content, "content_way_header_label", 30, y + 26, "home → work", 15, color=t["text"])
    text_el(content, "content_way_header_sub", 30, y + 44,
            "2 routes · asks which one at START", 11.5, color=t["textDim"])
    text_el(content, "content_way_chevron", VB_W - 34, y + 30, "▾", 14, color=t["textDim"], anchor="middle")

    ry2 = y + 66
    text_el(content, "content_route_entry_label", 30, ry2, "Morning", 13.5, color=t["text"])
    text_el(content, "content_route_entry_sub", 30, ry2 + 16,
            "6 ghost laps seeded · 4 sectors · START ~160 m in", 11.5, color=t["textDim"])

    map_y = ry2 + 26
    map_h = 260
    draw_map(content, "content_route_map", t, asset, (30, map_y, VB_W - 60, map_h),
             gate_tiers=[None, None, None, None, None], rider_at=None, label_note=True)
    way_h = (map_y + map_h + 16) - way_top
    content.insert(0, E("rect", "content_way_card_bg", {
        "x": fmt(16), "y": fmt(way_top), "width": fmt(VB_W - 32), "height": fmt(way_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))

    text_block(content, "content_footer_note", 16, way_top + way_h + 22,
                "Route lines are pre-rendered from your own rides, with the measured gates "
                "marked. Moving a middle gate keeps lap history comparable; moving START or "
                "FINISH does not.",
                10.5, VB_W - 32, color=t["textDim"])

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
    y += 20
    text_el(content, "content_footer_note", 16, y,
            "Saved on the phone and restored on launch. A corrupt file falls back", 10.5, color=t["textDim"])
    text_el(content, "content_footer_note_2", 16, y + 13,
            "to these defaults rather than blocking the app.", 10.5, color=t["textDim"])

    draw_tabbar(svg, t, "SETTINGS")
    return svg


def build_demo(theme_name: str, repo_root: str) -> ET.Element:
    t = THEMES[theme_name]
    asset = load_route_asset(repo_root, "Morning")
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 20
    text_el(content, "content_heading", 16, y, "DEMO RIDE", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 18
    used = text_block(content, "content_sub", 16, y,
                       "A real archived Morning lap replayed at 25x. Buzz at every gate, tier "
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
    asset = load_route_asset(repo_root, "Morning")
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

    way = next(w for w in catalog["ways"]
               if w["startLandmarkId"] == from_id and w["endLandmarkId"] == to_id)
    way_routes = [r for r in catalog["routes"] if r["wayId"] == way["id"]]
    # §8a default: Morning is the only SEEDED (ghost-bearing) route on this
    # way — the real defaultRouteFor() picks it on ghost count, same result.
    picked_route_id = "Morning" if any(r["id"] == "Morning" for r in way_routes) else way_routes[0]["id"]
    if len(way_routes) > 1:
        text_el(content, "content_flow_route_label", 20, y, "WHICH ROUTE TODAY?", 11, weight="600",
                color=t["textDim"], letter_spacing=2)
        y += 16
        route_items = [(route_label(r["id"]), r["id"] == picked_route_id) for r in way_routes]
        # WP-J fix pass (2026-08-24): +8 left the hint's first-line ascender
        # colliding with the pill row's bottom edge — widened to +16.
        y += draw_pill_row(content, "content_route", t, 20, y, VB_W - 40, route_items) + 16
        y += text_block(content, "content_route_hint", cx, y,
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
    routeMapView.tsx's 2026-08-24 hotfix (the whole route used to read
    dotted-ahead at 'prestart' via routeSplitFeatures; that split was pulled
    back out on-device after it rendered as broken oversized dash blobs, see
    the routeMapView.tsx file header)."""
    t = THEMES[theme_name]
    asset = load_route_asset(repo_root, "Morning")
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
    text_el(content, "content_track_line_l1", VB_W / 2, 30, "home → work · Morning", 12,
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
    red-light button is not shown (§18)."""
    t = THEMES[theme_name]
    asset = load_route_asset(repo_root, "Morning")
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

    # Route line solid, casing + yellow core, full stop — routeMapView.tsx's
    # 2026-08-24 hotfix (see build_record_armed's docstring for why the
    # earlier dotted-ahead split was pulled back out; rider_ahead_dotted is
    # therefore False here too, not just at prestart).
    draw_map(content, "content_map", t, asset, (12, TOP_PAD, VB_W - 24, map_h),
             gate_tiers=[None, chip_palette("purple", t)[2], None, None, None],
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

    text_el(content, "content_status_line", VB_W / 2, y + 12, "MORNING · ROUTE LOCKED", 12,
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
    routeMapView back to browse framing). Route line + gate ticks: solid
    casing + core, matching routeMapView.tsx's 2026-08-24 hotfix (see
    build_record_armed's docstring). All 4 sectors now scored.
    WP-J fix pass (2026-08-24): the prior pass omitted the P-position chip,
    reading live/towerSource.ts's stale header comment ("B-28 UNBUILT") at
    face value. The function body right below that comment is actually
    labelled "B-28 BUILT (cycle 008)" and computes a real position —
    liveView.tsx's lapRow renders <LiveLapChip flex:1/> beside <PosChip/>
    whenever vm.posChip is non-null, which it is here (a clean Morning lap
    against real seeded ghost history). Drawn below accordingly, plus the
    (here-blank, matching st.phase==='finished' → contextLabel='') context
    line liveView.tsx always reserves above the big slot."""
    t = THEMES[theme_name]
    asset = load_route_asset(repo_root, "Morning")
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
             gate_tiers=[None, chip_palette("purple", t)[2], chip_palette("green", t)[2],
                         chip_palette("yellow", t)[2], chip_palette("green", t)[2]],
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

    text_el(content, "content_status_line", VB_W / 2, y + 12, "MORNING · ROUTE LOCKED", 12,
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
        {"route": "Morning", "date": "Sat 22 Aug · 07:41", "lap": "14:02.5", "quality": None,
         "rank": "P3/10", "expanded": True},
        {"route": "Evening A", "date": "Fri 21 Aug · 18:04", "lap": "15:11.9", "quality": None,
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


def build_result(theme_name: str, repo_root: str) -> ET.Element:
    """ResultScreen.tsx (WP-A3): "YOUR LAST RIDE" card (route, big lap
    figure, rank line, VIEW TRACE link, RECORD ANOTHER) + "PERSONAL BESTS —
    TAP A ROUTE" accordion, one route expanded with its ranking (dates, never
    rideIds) and best-ever sectors. The big lap figure's colour is
    ResultScreen.tsx's OWN local tierColour() (colors.purple/green/neutral,
    NOT chips.tsx's chipColors) — unlike RIDES's sector rows, this one is
    legible in both themes by construction; see build_rides's docstring for
    the contrasting case."""
    t = THEMES[theme_name]
    svg = new_svg()

    bg = layer(svg, "bg")
    rect(bg, "bg_ground", 0, 0, VB_W, VB_H, fill=t["bg"])

    content = layer(svg, "content")
    y = 24.0
    text_el(content, "content_last_heading", 16, y, "YOUR LAST RIDE", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16
    card1_top = y
    cy = y + 24
    text_el(content, "content_last_route", VB_W / 2, cy, "Morning", 13, color=t["textDim"],
            anchor="middle")
    cy += 30
    text_el(content, "content_last_lap", VB_W / 2, cy, "14:02.5", 32, weight="800",
            color=COLORS["purple"], anchor="middle", tabular=True)
    cy += 20
    text_el(content, "content_last_rank", VB_W / 2, cy, "P2 of 9 on this route", 12,
            color=t["textDim"], anchor="middle")
    cy += 26
    text_el(content, "content_last_trace_link", VB_W / 2, cy, "VIEW TRACE ›", 11,
            color=t["textDim"], anchor="middle", letter_spacing=1.5, upper=True)
    cy += 24
    btn_w, btn_h = 172.0, 40.0
    btn = group(content, "content_last_record_another", {})
    rect(btn, "content_last_record_another_bg", (VB_W - btn_w) / 2, cy, btn_w, btn_h,
         fill=t["accent"], rx=10)
    text_el(btn, "content_last_record_another_label", VB_W / 2, cy + 25, "RECORD ANOTHER", 12,
            weight="800", color=t["onAccent"], anchor="middle", letter_spacing=1)
    cy += btn_h + 16
    card1_h = cy - card1_top
    content.insert(0, E("rect", "content_last_card_bg", {
        "x": fmt(16), "y": fmt(card1_top), "width": fmt(VB_W - 32), "height": fmt(card1_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    y = card1_top + card1_h + 24

    text_el(content, "content_pb_heading", 16, y, "PERSONAL BESTS — TAP A ROUTE", 12, weight="700",
            color=t["textDim"], letter_spacing=2, upper=True)
    y += 16
    card2_top = y
    ry = y

    # Placeholder sample rows/detail (README convention) — never a real ride.
    pb_rows = [
        {"route": "Morning", "pb": "13:58.1", "n": 9, "open": True},
        {"route": "Evening A", "pb": "15:03.4", "n": 6, "open": False},
        {"route": "Home Church", "pb": "10:41.0", "n": 5, "open": False},
    ]
    ranking = [
        ("P1", "Tue 12 Aug", "13:58", "", False),
        ("P2", "today", "14:03", "+5s", True),
        ("P3", "Fri 08 Aug", "14:11", "+13s", False),
    ]
    pb_sectors = [("S1", "3:00.4"), ("S2", "3:18.9"), ("S3", "3:34.2"), ("S4", "3:04.6")]

    for pi, row in enumerate(pb_rows):
        rid = f"content_pb_{pi + 1}"
        text_el(content, f"{rid}_route", 30, ry + 20, row["route"], 15, weight="700", color=t["text"])
        text_el(content, f"{rid}_hint", 30, ry + 36,
                f"personal best {row['pb']} · {row['n']} rides on file", 11.5, color=t["textDim"])
        text_el(content, f"{rid}_chev", VB_W - 30, ry + 22, "▾" if row["open"] else "›", 15,
                color=t["textDim"], anchor="middle")
        ry += 48
        if row["open"]:
            text_el(content, f"{rid}_ranking_hint", 30, ry + 10, f"last {len(ranking)} on this route",
                    11.5, color=t["textDim"])
            ry += 22
            for pos, date, tval, gap_lbl, today in ranking:
                suf = pos.lower()
                text_el(content, f"{rid}_rank_{suf}_pos", 30, ry, pos, 13, weight="700", color=t["text"])
                text_el(content, f"{rid}_rank_{suf}_date", 74, ry, date, 13,
                        color=t["accentText"] if today else t["textDim"])
                text_el(content, f"{rid}_rank_{suf}_time", VB_W - 90, ry, tval, 13, color=t["text"],
                        anchor="end", tabular=True)
                text_el(content, f"{rid}_rank_{suf}_gap", VB_W - 30, ry, gap_lbl, 13,
                        color=t["textDim"], anchor="end", tabular=True)
                ry += 20
            ry += 8
            text_el(content, f"{rid}_pbsectors_hint", 30, ry + 10, "personal best sectors", 11.5,
                    color=t["textDim"])
            ry += 22
            for lbl, tval in pb_sectors:
                suf = lbl.lower()
                text_el(content, f"{rid}_pbsec_{suf}_label", 30, ry, lbl, 13, weight="700", color=t["text"])
                text_el(content, f"{rid}_pbsec_{suf}_time", VB_W - 30, ry, tval, 13, color=t["text"],
                        anchor="end", tabular=True)
                ry += 20
            ry += 6
        if pi < len(pb_rows) - 1:
            line(content, f"{rid}_divider", 16, ry, VB_W - 16, ry, t["cardBorder"], 1)
        ry += 6
    card2_h = ry - card2_top + 6
    content.insert(0, E("rect", "content_pb_card_bg", {
        "x": fmt(16), "y": fmt(card2_top), "width": fmt(VB_W - 32), "height": fmt(card2_h),
        "fill": t["card"], "stroke": t["cardBorder"], "stroke-width": fmt(1), "rx": fmt(16),
    }))
    y = card2_top + card2_h + 20

    text_block(content, "content_footer_note", 16, y,
               "Position is a fact; colour is a judgement — a mid-pack ride is never dressed as "
               "failure. Purple beats your best, green beats your recent average, yellow is an "
               "ordinary lap.", 10.5, VB_W - 32, color=t["textDim"])

    draw_tabbar(svg, t, "RESULT")
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
    "result": build_result,
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
