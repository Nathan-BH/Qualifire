#!/usr/bin/env python3
"""
Qualifire logo concepts — 5 candidates from product/BRAND.md's brief.

Single source of truth: each logo is a list of primitive dicts. The same data
emits (a) a labelled, Inkscape-navigable SVG (canonical deliverable) and
(b) a PNG via pycairo (verification render — no rsvg in this sandbox, and
ImageMagick's SVG delegate is untrusted per scientific-figure-building).

Every SVG leaf/group carries id + inkscape:label (svg-labelling-conventions);
naming is generated here, never hand-added. Layers: background -> mark -> labels.

Run:  python3 make_logos.py   (writes qualifire_logo_1..5.svg/.png + sheet.png)
"""
import math
import cairo

W = H = 512
BG = '#17171b'      # paddock charcoal (BRAND P1)
INK = '#F4F2EC'
YEL = '#F5C542'     # signature / neutral tier
GRN = '#3ED598'
PUR = '#A667F0'
CHR = '#2a2a30'     # chrome lines
DIM = '#9a978f'


def hx(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


# ---------------- primitive -> SVG ----------------

def p_svg(p):
    a = p.get
    style = f'fill="{a("fill", "none")}"'
    if a('stroke'):
        style += f' stroke="{p["stroke"]}" stroke-width="{a("sw", 4)}" stroke-linecap="{a("cap", "round")}"'
        if a('dash'):
            style += f' stroke-dasharray="{p["dash"]}"'
    ident = f'id="{p["id"]}" inkscape:label="{p["label"]}"'
    t = p['type']
    if t == 'circle':
        return f'<circle {ident} cx="{p["cx"]}" cy="{p["cy"]}" r="{p["r"]}" {style}/>'
    if t == 'arc':  # stroked arc a0..a1 deg
        x0 = p['cx'] + p['r'] * math.cos(math.radians(p['a0']))
        y0 = p['cy'] + p['r'] * math.sin(math.radians(p['a0']))
        x1 = p['cx'] + p['r'] * math.cos(math.radians(p['a1']))
        y1 = p['cy'] + p['r'] * math.sin(math.radians(p['a1']))
        large = 1 if (p['a1'] - p['a0']) % 360 > 180 else 0
        d = f'M {x0:.2f} {y0:.2f} A {p["r"]} {p["r"]} 0 {large} 1 {x1:.2f} {y1:.2f}'
        return f'<path {ident} d="{d}" {style}/>'
    if t == 'line':
        return (f'<line {ident} x1="{p["x1"]}" y1="{p["y1"]}" x2="{p["x2"]}" y2="{p["y2"]}" {style}/>')
    if t == 'rect':
        return (f'<rect {ident} x="{p["x"]}" y="{p["y"]}" width="{p["w"]}" height="{p["h"]}" '
                f'rx="{a("rx", 0)}" {style}/>')
    if t == 'text':
        return (f'<text {ident} x="{p["x"]}" y="{p["y"]}" font-family="Segoe UI, DejaVu Sans, sans-serif" '
                f'font-size="{p["size"]}" font-weight="{a("weight", 800)}" letter-spacing="{a("ls", 0)}" '
                f'text-anchor="{a("anchor", "middle")}" fill="{a("fill", INK)}">{p["txt"]}</text>')
    raise ValueError(t)


# ---------------- primitive -> cairo ----------------

def p_cairo(ctx, p):
    a = p.get

    def setcol(c):
        ctx.set_source_rgb(*hx(c))

    def stroke_fill():
        if a('fill') and p['fill'] != 'none':
            setcol(p['fill'])
            ctx.fill_preserve() if a('stroke') else ctx.fill()
        if a('stroke'):
            setcol(p['stroke'])
            ctx.set_line_width(a('sw', 4))
            ctx.set_line_cap(cairo.LINE_CAP_ROUND if a('cap', 'round') == 'round' else cairo.LINE_CAP_BUTT)
            ctx.set_dash([float(x) for x in str(a('dash', '')).split(',')] if a('dash') else [])
            ctx.stroke()
        ctx.new_path()

    t = p['type']
    if t == 'circle':
        ctx.arc(p['cx'], p['cy'], p['r'], 0, 2 * math.pi)
        stroke_fill()
    elif t == 'arc':
        ctx.arc(p['cx'], p['cy'], p['r'], math.radians(p['a0']), math.radians(p['a1']))
        stroke_fill()
    elif t == 'line':
        ctx.move_to(p['x1'], p['y1'])
        ctx.line_to(p['x2'], p['y2'])
        stroke_fill()
    elif t == 'rect':
        rx = a('rx', 0)
        x, y, w, h = p['x'], p['y'], p['w'], p['h']
        if rx:
            ctx.new_sub_path()
            for cx, cy, ang in ((x + w - rx, y + rx, -90), (x + w - rx, y + h - rx, 0),
                                (x + rx, y + h - rx, 90), (x + rx, y + rx, 180)):
                ctx.arc(cx, cy, rx, math.radians(ang), math.radians(ang + 90))
            ctx.close_path()
        else:
            ctx.rectangle(x, y, w, h)
        stroke_fill()
    elif t == 'text':
        setcol(a('fill', INK))
        ctx.select_font_face('DejaVu Sans', cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(p['size'])
        # crude letterspacing: draw per char
        txt, ls = p['txt'], a('ls', 0)
        widths = [ctx.text_extents(ch).x_advance + ls for ch in txt]
        total = sum(widths) - (ls if txt else 0)
        x = p['x'] - (total / 2 if a('anchor', 'middle') == 'middle' else 0)
        for ch, wch in zip(txt, widths):
            ctx.move_to(x, p['y'])
            ctx.show_text(ch)
            x += wch


# ---------------- concepts ----------------
# Each returns (slug, title, [layer -> [primitives]]) with generated names.

def c1_gate_q():
    """The Q as a lap ring; the tail is the yellow gate line crossing it at speed."""
    cx, cy, r = 256, 246, 138
    mark = [
        dict(type='circle', cx=cx, cy=cy, r=r, stroke=INK, sw=34, fill='none',
             id='ring', label='lap_ring_ink'),
        # gate line = Q tail, but CROSSING the ring (inside to outside) so it
        # reads as a gate on the lap, not a magnifier handle
        dict(type='line', x1=cx + (r - 92) * 0.7071, y1=cy + (r - 92) * 0.7071,
             x2=cx + (r + 92) * 0.7071, y2=cy + (r + 92) * 0.7071,
             stroke=YEL, sw=40, id='gate', label='gate_line_yellow_crossing_ring'),
    ]
    return 'gate_q', 'Q with gate-line tail', {'mark': mark}


def c2_sector_strip():
    """The live strip: four slots, one lit — the fire in Qualifire."""
    y, w, h, gap, rx = 216, 88, 80, 14, 18
    x0 = (W - 4 * w - 3 * gap) / 2
    mark = []
    tiers = [(CHR, None), (CHR, None), (CHR, None), (None, YEL)]
    names = ['slot1_unlit', 'slot2_unlit', 'slot3_unlit', 'slot4_lit_yellow']
    for i, ((stroke, fill), nm) in enumerate(zip(tiers, names)):
        d = dict(type='rect', x=x0 + i * (w + gap), y=y, w=w, h=h, rx=rx,
                 id=f'slot{i + 1}', label=nm)
        if fill:
            d.update(fill=fill)  # lit = filled, same height: the real strip never grows a chip
        else:
            d.update(stroke=stroke, sw=10, fill='none')
        mark.append(d)
    return 'sector_strip', 'Sector strip, one lit', {'mark': mark}


def c3_lap_ring():
    """Lap ring in four sector arcs — colour earned per arc; gap = start gate."""
    cx, cy, r = 256, 256, 150
    sw = 40
    gapdeg = 14
    arcs = [
        (-90 + gapdeg / 2, 0, YEL, 'arc_s1_neutral_yellow'),
        (0 + gapdeg / 2, 90, YEL, 'arc_s2_neutral_yellow'),
        (90 + gapdeg / 2, 180, GRN, 'arc_s3_green'),
        (180 + gapdeg / 2, 270 - gapdeg / 2, PUR, 'arc_s4_purple'),
    ]
    mark = [dict(type='arc', cx=cx, cy=cy, r=r, a0=a0, a1=a1 - gapdeg / 2, stroke=col, sw=sw,
                 id=f'arc{i + 1}', label=lab) for i, (a0, a1, col, lab) in enumerate(arcs)]
    # start-gate tick in the top gap + PB dot
    mark.append(dict(type='line', x1=cx - 8, y1=cy - r - 34, x2=cx + 8, y2=cy - r + 34,
                     stroke=INK, sw=14, id='start_tick', label='start_gate_tick_ink'))
    return 'lap_ring', 'Lap ring, earned arcs', {'mark': mark}


def c4_flying_start():
    """Flying start: motion streaks crossing the vertical yellow gate line."""
    gx = 300
    mark = [
        dict(type='line', x1=gx, y1=96, x2=gx, y2=416, stroke=YEL, sw=26,
             id='gate', label='gate_line_yellow_vertical'),
    ]
    for i, (y, x0, x1, swd, col) in enumerate([
        (176, 78, 236, 30, CHR),
        (256, 48, 356, 44, INK),   # the rider's streak crosses the gate
        (336, 108, 216, 30, CHR),
    ]):
        mark.append(dict(type='line', x1=x0, y1=y, x2=x1, y2=y, stroke=col, sw=swd,
                         id=f'streak{i + 1}', label=f'streak{i + 1}_' + ('crossing_ink' if col == INK else 'trailing_chrome')))
    mark.append(dict(type='circle', cx=372, cy=256, r=34, fill=INK, id='dot', label='rider_dot_ink_past_gate'))
    return 'flying_start', 'Flying start crossing', {'mark': mark}


def c5_monogram_wordmark():
    """Typographic Q + gate tail, with QUALIFIRE wordmark (app splash / header)."""
    cx, cy, r = 256, 218, 118
    mark = [
        dict(type='circle', cx=cx, cy=cy, r=r, stroke=INK, sw=30, fill='none',
             id='q_ring', label='q_ring_ink'),
        dict(type='line', x1=cx + (r - 68) * 0.7071, y1=cy + (r - 68) * 0.7071,
             x2=cx + (r + 68) * 0.7071, y2=cy + (r + 68) * 0.7071,
             stroke=YEL, sw=30, id='q_tail', label='q_tail_gate_yellow_crossing'),
    ]
    labels = [
        dict(type='text', x=256, y=436, size=54, ls=18, txt='QUALIFIRE',
             id='wordmark', label='wordmark_qualifire_letterspaced', fill=INK),
    ]
    return 'monogram_wordmark', 'Q monogram + wordmark', {'mark': mark, 'labels': labels}


CONCEPTS = [c1_gate_q, c2_sector_strip, c3_lap_ring, c4_flying_start, c5_monogram_wordmark]


def emit(slug, title, layers, n):
    bg = dict(type='rect', x=0, y=0, w=W, h=H, rx=0, fill=BG, id='bg', label='background_paddock_charcoal')
    order = ['background', 'mark', 'labels']
    layers = {'background': [bg], **layers}
    # SVG
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" '
             f'xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" '
             f'viewBox="0 0 {W} {H}" width="{W}" height="{H}">']
    for lay in order:
        if lay not in layers:
            continue
        parts.append(f'<g id="{lay}" inkscape:label="{lay}_{slug}">')
        parts += [p_svg(p) for p in layers[lay]]
        parts.append('</g>')
    parts.append('</svg>')
    open(f'logos/qualifire_logo_{n}_{slug}.svg', 'w').write('\n'.join(parts))
    # PNG (same data)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    for lay in order:
        for p in layers.get(lay, []):
            p_cairo(ctx, p)
    surf.write_to_png(f'logos/qualifire_logo_{n}_{slug}.png')
    print(f'{n}. {slug:20s} — {title}')


if __name__ == '__main__':
    for i, fn in enumerate(CONCEPTS, 1):
        slug, title, layers = fn()
        emit(slug, title, layers, i)
    print('done')
