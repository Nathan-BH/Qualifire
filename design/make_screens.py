#!/usr/bin/env python3
"""
Canonical source of design/canonical/*.svg.

Nathan's hand-edits live in design/edited/ and are mirrored back into THIS
script (his edited file is the truth until mirrored). Re-run:
    python3 design/make_screens.py [--repo-root PATH]

Cycle 024 / WP-J, FIRST PASS (2026-08-22): this pass emits only the screens
that are NOT about to be redrawn by this cycle's WP-A (RECORD/RIDES/RESULT
redesign). Emitting those now would mean re-emitting them again within the
same cycle for no reason, so they are deliberately deferred to the WP-J
RE-EMIT pass that runs after WP-A + WP-E land. See DEFERRED below and
design/README.md.

Implemented this pass (3 screens x day/night = 6 files):
    routes, settings, demo

Deferred to the WP-J re-emit pass (6 screens x day/night = 12 files):
    record_setup, record_armed, record_running, record_finished, rides, result
(record_finished was drawn in an earlier revision of this pass on the theory
 that it renders through the existing cycle-020 race column, not something
 WP-A itself redesigns. Corrected after inspection: WP-A2's brief adds a
 fullscreen recording mode covering armed -> running -> the moment just
 after the finish gate, before END is pressed — record_finished sits INSIDE
 that span, so it moves with its RECORD siblings to the re-emit pass rather
 than shipping now as a screen already known to need a redraw.)

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
    "raceBgNight": "#0A0A0A",
    "raceCardNight": "#141414",
    "raceBorderNight": "#232323",
    "white": "#FFFFFF",
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

# Screens this pass draws vs. defers (see module docstring).
IMPLEMENTED = ["routes", "settings", "demo"]
DEFERRED = ["record_setup", "record_armed", "record_running", "record_finished", "rides", "result"]


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
    for rel in ("app/src/ui/theme.ts", "app/src/ui/chips.tsx", "app/src/ui/settings.tsx"):
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


def line(parent, id_, x1, y1, x2, y2, stroke, sw=1, dash=None, cap="round"):
    a = {
        "x1": fmt(x1), "y1": fmt(y1), "x2": fmt(x2), "y2": fmt(y2),
        "stroke": stroke, "stroke-width": fmt(sw), "stroke-linecap": cap,
    }
    if dash is not None:
        a["stroke-dasharray"] = dash
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
                anchor="start", line_h=None) -> float:
    """Wraps `s` to fit max_px and draws each line as its own labelled leaf
    (id_prefix, or id_prefix_l1/_l2/... when more than one line). Returns the
    total height consumed so callers can advance their y-cursor."""
    lines = wrap_text(s, max_px, size)
    lh = line_h or size * 1.3
    multi = len(lines) > 1
    for i, ln in enumerate(lines):
        this_id = f"{id_prefix}_l{i+1}" if multi else id_prefix
        text_el(parent, this_id, x, y + i * lh, ln, size, weight=weight, color=color, anchor=anchor)
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
             rider_ahead_dotted=False, label_note=True, ground_fill=None, ground_border=None):
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
        path(m, f"{id_prefix}_route_line", route_path_d(proj, pts), stroke=t["accent"], sw=3)

    # gate ticks: thin perpendicular line, dim theme-neutral when unscored,
    # tier-coloured once scored (WP-E's target rendering — brief §2).
    names = [g["name"] for g in asset["gates"]]
    for i, name in enumerate(names):
        gi = full_idx[i]
        x1, y1, x2, y2 = gate_tick_endpoints(proj, pts, gi)
        tier_col = gate_tiers[i] if i < len(gate_tiers) else None
        col = tier_col if tier_col else t["textDim"]
        line(m, f"{id_prefix}_gate_tick_{i+1}", x1, y1, x2, y2, col, 3 if tier_col else 2)

    # rider dot: distinct colour from gates (WP-E) — drawn as ink so it never
    # reads as a scored tier the way a gate colour would.
    if rider_at is not None:
        rider_idx = _rider_index(rider_at, full_idx, len(pts))
        rx_, ry_ = proj(*pts[rider_idx])
        circle(m, f"{id_prefix}_rider_dot", rx_, ry_, 5.5, fill=t["text"], stroke=gfill, sw=2)

    if label_note:
        # labelled so Nathan knows this rect is schematic, not a real basemap
        # render — a zero-size leaf (never a group: it must not add a nesting
        # level), comment-free, its label alone documents it.
        sub(m, "rect", f"{id_prefix}_placeholder_note", {"x": fmt(x), "y": fmt(y), "width": 0, "height": 0})
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


# record_finished intentionally has no builder yet — it moved to DEFERRED
# (see module docstring) rather than shipping now with a known-throwaway
# caveat. An earlier revision of this pass drew it here; that code is gone,
# not commented out, so this script doesn't quietly carry half-built work
# for a screen that isn't shipping — the re-emit pass writes it fresh,
# alongside its record_setup/armed/running/rides/result siblings, once
# WP-A2's fullscreen recording mode has actually landed.

BUILDERS = {
    "routes": build_routes,
    "settings": build_settings,
    "demo": build_demo,
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
