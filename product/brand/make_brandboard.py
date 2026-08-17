#!/usr/bin/env python3
"""
Qualifire brand board — the identity (charcoal / white / structural yellow,
Art Director pass 2026-08-15) applied across every app context: the five
paddock surfaces as built, plus the race-mode surfaces still to come (live
states, D-022 lap handover, post-ride board). One panel per surface at phone
aspect (390x780 @2x), plus a cover with mark, palette and type scale.

Reproducible: this script is canonical; rerun after any identity change and
re-montage. Renders with pycairo (no rsvg in sandbox).
"""
import math
import cairo

S = 2  # supersample scale
W, H = 390, 780

# palette (theme.ts + BRAND.md)
PAD_BG, PAD_CARD, PAD_BORDER = '#17171b', '#212127', '#41414c'
PANEL_BG = '#101014'  # map/trend recessed panels; follows theme overrides
RACE_BG, RACE_CARD, RACE_BORDER = '#0A0A0A', '#141414', '#232323'
INK, INK_DIM, TEXT2 = '#F4F2EC', '#9a978f', '#b5b3ac'
YEL, GRN, PUR, AMB, GREY = '#F5C542', '#3ED598', '#A667F0', '#E8A33D', '#6f6e6a'
ON_YEL, PUR_INK = '#17171b', '#120521'
NEUT_TXT = YEL  # yellow-as-text; palette overrides darken it on light grounds


def hx(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


class P:
    def __init__(self, bg):
        self.surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W * S, H * S)
        self.c = cairo.Context(self.surf)
        self.c.scale(S, S)
        self.rect(0, 0, W, H, fill=bg)

    def rect(self, x, y, w, h, r=0, fill=None, stroke=None, sw=1, dash=None, left=None):
        c = self.c
        if r:
            c.new_sub_path()
            for cx, cy, a in ((x + w - r, y + r, -90), (x + w - r, y + h - r, 0),
                              (x + r, y + h - r, 90), (x + r, y + r, 180)):
                c.arc(cx, cy, r, math.radians(a), math.radians(a + 90))
            c.close_path()
        else:
            c.rectangle(x, y, w, h)
        if fill:
            c.set_source_rgb(*hx(fill))
            c.fill_preserve() if stroke else c.fill()
        if stroke:
            c.set_source_rgb(*hx(stroke))
            c.set_line_width(sw)
            c.set_dash(dash or [])
            c.stroke()
        c.new_path()
        if left:  # yellow kicker edge
            self.rect(x, y + 4, 3, h - 8, r=1.5, fill=left)

    def line(self, x1, y1, x2, y2, color, swd, dash=None, cap=True):
        c = self.c
        c.new_path()
        c.set_source_rgb(*hx(color))
        c.set_line_width(swd)
        c.set_line_cap(cairo.LINE_CAP_ROUND if cap else cairo.LINE_CAP_BUTT)
        c.set_dash(dash or [])
        c.move_to(x1, y1)
        c.line_to(x2, y2)
        c.stroke()
        c.set_dash([])

    def circle(self, cx, cy, r, fill=None, stroke=None, sw=2):
        self.c.new_path()  # show_text leaves a current point; never connect to it
        self.c.arc(cx, cy, r, 0, 2 * math.pi)
        if fill:
            self.c.set_source_rgb(*hx(fill))
            self.c.fill_preserve() if stroke else self.c.fill()
        if stroke:
            self.c.set_source_rgb(*hx(stroke))
            self.c.set_line_width(sw)
            self.c.stroke()
        self.c.new_path()

    def text(self, x, y, s, size, color=INK, bold=True, align='left', ls=0, alpha=1):
        c = self.c
        c.select_font_face('DejaVu Sans', cairo.FONT_SLANT_NORMAL,
                           cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
        c.set_font_size(size)
        widths = [c.text_extents(ch).x_advance + ls for ch in s]
        total = sum(widths) - (ls if s else 0)
        if align == 'center':
            x -= total / 2
        elif align == 'right':
            x -= total
        r, g, b = hx(color)
        c.set_source_rgba(r, g, b, alpha)
        for ch, wch in zip(s, widths):
            c.move_to(x, y)
            c.show_text(ch)
            x += wch
        return total

    def save(self, name):
        self.surf.write_to_png(name)
        print(name)


def tabbar(p, active, race=False):
    y = H - 54
    p.line(0, y, W, y, RACE_BORDER if race else PAD_BORDER, 1, cap=False)
    for i, t in enumerate(['RECORD', 'RIDES', 'PREVIEW']):
        x = W / 6 + i * W / 3
        on = t == active
        if on and not race:
            p.rect(x - 40, y, 80, 3, fill=YEL)
        p.text(x, y + 33, t, 12, INK if on else INK_DIM, align='center', ls=2)


def logo_mark(p, cx, cy, r=40, sw=9, slash=1.9):
    p.circle(cx, cy, r, stroke=INK, sw=sw)
    d = r / 1.414
    p.line(cx + d * 0.35, cy + d * 0.35, cx + d * slash, cy + d * slash, YEL, sw + 4)


# ---------- panels ----------

def cover():
    p = P(PAD_BG)
    logo_mark(p, W / 2, 150, r=64, sw=14)
    p.text(W / 2, 292, 'QUALIFIRE', 30, INK, align='center', ls=8)
    p.text(W / 2, 318, 'the commute, reframed as a qualifying lap', 12, TEXT2, bold=False, align='center')
    # palette
    sw_ = [(YEL, 'structural yellow / neutral tier', '#F5C542'),
           (INK, 'ink', '#F4F2EC'), (PAD_BG, 'paddock charcoal', '#17171b'),
           (RACE_BG, 'race black', '#0A0A0A'),
           (GRN, 'green - earned (7d)', '#3ED598'), (PUR, 'purple - earned (28d)', '#A667F0')]
    y = 370
    sw_[0] = (YEL, 'structural yellow / neutral tier', YEL)  # follow palette overrides
    for col, name, hexv in sw_:
        p.rect(28, y, 44, 34, r=8, fill=col, stroke=PAD_BORDER)
        p.text(86, y + 16, name, 12, INK)
        p.text(86, y + 30, hexv, 10, INK_DIM, bold=False)
        y += 44
    p.text(28, y + 26, 'TYPE', 11, INK_DIM, ls=3)
    p.text(28, y + 56, '14:46', 34, INK)
    p.text(130, y + 56, 'numbers: heavy, tabular', 11, TEXT2, bold=False)
    p.text(28, y + 82, 'LABELS SMALL UPPERCASE LETTERSPACED', 10, INK_DIM, ls=2)
    p.text(28, H - 20, 'no red anywhere - identity is the mark: charcoal / white / yellow', 9, INK_DIM, bold=False)
    return p


def record_idle():
    p = P(PAD_BG)
    logo_mark(p, W / 2, 190, r=46, sw=10)
    p.text(W / 2, 292, 'QUALIFIRE', 19, INK, align='center', ls=6)
    p.text(W / 2, 316, 'Ready to record.', 13, TEXT2, bold=False, align='center')
    p.rect(24, 390, W - 48, 130, r=22, fill=YEL)
    p.text(W / 2, 462, 'START', 36, ON_YEL, align='center', ls=5)
    p.text(W / 2, 488, 'records the ride · screen can go off', 10, ON_YEL, bold=False, align='center', alpha=0.75)
    tabbar(p, 'RECORD')
    p.text(W / 2, 30, 'PADDOCK · RECORD (idle)', 10, INK_DIM, align='center', ls=2)
    return p


def rides():
    p = P(PAD_BG)
    p.text(24, 56, 'RIDES', 26, INK, ls=2)
    p.rect(W - 100, 34, 76, 30, r=9, stroke=PAD_BORDER)
    p.text(W - 62, 53, 'Refresh', 11, TEXT2, bold=False, align='center')
    # stats strip
    p.rect(24, 80, W - 48, 64, r=14, fill=PAD_CARD, stroke=PAD_BORDER, left=YEL)
    for i, (num, lbl) in enumerate([('12', 'RIDES'), ('3h08', 'RECORDED'), ('10,988', 'GPS FIXES')]):
        x = 24 + (W - 48) / 6 * (2 * i + 1)
        p.text(x, 116, num, 24, NEUT_TXT, align='center')
        p.text(x, 133, lbl, 9, TEXT2, align='center', ls=1.5)
    y = 162
    for when, dur in [('2026-08-15 07:41', '15m12s · 907 fixes'), ('2026-08-15 00:24', '1m34s · 92 fixes'),
                      ('2026-08-14 22:19', '0m41s · 40 fixes')]:
        p.rect(24, y, W - 48, 62, r=14, fill=PAD_CARD, stroke=PAD_BORDER, left=YEL)
        p.text(40, y + 27, when, 15, INK)
        p.text(40, y + 46, dur, 12, TEXT2, bold=False)
        p.rect(W - 140, y + 16, 78, 30, r=9, fill=YEL)
        p.text(W - 101, y + 35, 'Export GPX', 10, ON_YEL, align='center')
        p.rect(W - 56, y + 16, 30, 30, r=9, stroke=PAD_BORDER)
        p.text(W - 41, y + 36, 'x', 13, INK_DIM, align='center', bold=False)
        y += 72
    tabbar(p, 'RIDES')
    p.text(W / 2, 30, 'PADDOCK · RIDES', 10, INK_DIM, align='center', ls=2)
    return p


def home():
    p = P(PAD_BG)
    p.text(W / 2, 58, 'QUALIFIRE', 17, INK, align='center', ls=5)
    p.rect(24, 80, W - 48, 92, r=14, fill=PAD_CARD, stroke=PAD_BORDER, left=YEL)
    p.text(40, 104, 'AUTO-SELECTED · 07:41 · NEAR HOME', 9, TEXT2, ls=1)
    p.text(40, 136, 'MORNING', 28, INK)
    p.text(40, 158, 'home -> work · 5.7 km · 4 sectors · ref 15:03', 11, TEXT2, bold=False)
    for i, t in enumerate(['Morning', 'Evening A', 'Evening B']):
        x = 24 + i * (W - 48 + 8) / 3
        sel = i == 0
        p.rect(x, 184, (W - 64) / 3, 34, r=9, fill=PAD_CARD, stroke=YEL if sel else PAD_BORDER, sw=1.5 if sel else 1)
        p.text(x + (W - 64) / 6, 206, t, 11, INK if sel else TEXT2, bold=sel, align='center')
    p.rect(24, 238, W - 48, 116, r=22, fill=YEL)
    p.text(W / 2, 302, 'START', 34, ON_YEL, align='center', ls=5)
    p.text(W / 2, 326, 'arms the gates · screen goes inert while moving', 9, ON_YEL, bold=False, align='center', alpha=0.75)
    y = 374
    for lbl, num in [("Yesterday's board", 'Wed · 15:19 ->'), ('History', '->'), ('Route & sector setup', '->')]:
        p.rect(24, y, W - 48, 44, r=11, stroke=PAD_BORDER)
        p.text(40, y + 27, lbl, 13, INK)
        p.text(W - 40, y + 27, num, 12, YEL, align='right')
        y += 52
    tabbar(p, 'PREVIEW')
    p.text(W / 2, 30, 'PADDOCK · HOME (track pick)', 10, INK_DIM, align='center', ls=2)
    return p


def setup():
    p = P(PAD_BG)
    p.text(24, 58, 'SETUP · GATES', 20, INK, ls=2)
    p.rect(24, 76, W - 48, 170, r=14, fill=PANEL_BG, stroke=PAD_BORDER)
    # route dots (stylized morning shape)
    pts = [(40 + i * (W - 100) / 24, 216 - 118 * (i / 24) ** 0.85 - 14 * math.sin(i * 0.7)) for i in range(25)]
    for x, y in pts:
        p.circle(x, y, 1.6, fill='#3a3a42')
    for i in [1, 7, 13, 19, 23]:
        x, y = pts[i]
        end = i in (1, 23)
        p.circle(x, y, 5 if end else 6, fill=PAD_BG if end else YEL, stroke='#8a8880' if end else None, sw=2)
    p.text(34, 96, 'MAP PREVIEW (COSMETIC - D-002) · REAL 5.7 KM TRACE', 8, '#55544f', ls=1)
    # chainage bar
    y = 274
    p.line(34, y, W - 34, y, '#3a3a42', 6, cap=True)
    for i, f in enumerate([0.03, 0.23, 0.47, 0.75, 0.97]):
        x = 34 + f * (W - 68)
        end = i in (0, 4)
        p.circle(x, y, 7 if end else 9, fill=PAD_BG if end else YEL, stroke='#8a8880' if end else None, sw=2.5)
    p.text(34, y + 28, '162 m', 10, TEXT2)
    p.text(W - 34, y + 28, '5487 m', 10, TEXT2, align='right')
    p.text(24, y + 60, 'Drag the handles - a gate IS a chainage value;', 12, TEXT2, bold=False)
    p.text(24, y + 76, 'the map only previews it (D-011).', 12, TEXT2, bold=False)
    p.rect(24, y + 94, W - 48, 54, r=10, fill='#181307', stroke='#3d3325')
    p.text(38, y + 116, 'gate near junction exit -> "move it downstream', 11, AMB, bold=False)
    p.text(38, y + 132, 'so queues wait BEFORE the gate"', 11, AMB, bold=False)
    y2 = y + 170
    for l in ['S1 · 1150 m · median 3:06', 'S2 · 1350 m · median 3:23', 'S3 · 1550 m · median 4:01', 'S4 · 1275 m · median 3:23']:
        p.text(24, y2, l, 12, TEXT2, bold=False)
        y2 += 20
    tabbar(p, 'PREVIEW')
    p.text(W / 2, 30, 'PADDOCK · SETUP (draggable gates)', 10, INK_DIM, align='center', ls=2)
    return p


def history():
    p = P(PAD_BG)
    for i, t in enumerate(['MORNING', 'EVENING A', 'EVENING B']):
        x = 24 + i * (W - 48 + 6) / 3
        sel = i == 0
        p.rect(x, 44, (W - 60) / 3, 30, r=9, fill=PAD_CARD, stroke=YEL if sel else PAD_BORDER, sw=1.5 if sel else 1)
        p.text(x + (W - 60) / 6, 63, t, 10, INK if sel else TEXT2, bold=sel, align='center')
    p.rect(24, 88, W - 48, 130, r=12, fill=PANEL_BG, stroke=PAD_BORDER)
    p.text(36, 106, 'LAP MOVING TIME · LAST 28 · DASHED = REF 15:03', 8, '#6f6e68', ls=1)
    p.line(60, 150, W - 40, 150, '#4a4944', 1, dash=[4, 4], cap=False)
    import random
    random.seed(7)
    for i in range(26):
        p.circle(64 + i * (W - 116) / 25, 160 + random.uniform(-34, 34), 2.6, fill='#c9c7c0')
    p.circle(W - 46, 196, 3.6, fill=YEL)
    y = 240
    rows = [('Thu 14 Aug', '14:46', GRN, ['-', '||', '-', 'P']), ('Wed 13 Aug', '15:19', INK, ['-', '-', '-', '-']),
            ('Tue 12 Aug', '15:24', INK, ['||', '-', '-', '-']), ('Mon 11 Aug', '15:13', INK, ['-', '-', 'G', '-']),
            ('Fri 08 Aug', '15:15', INK, ['-', '~', '-', '-']), ('Thu 07 Aug', '15:11', INK, ['-', '-', '-', 'G'])]
    for rd, rt, col, mini in rows:
        p.rect(24, y, W - 48, 40, r=10, fill=PAD_CARD if col == GRN else None,
               stroke=PAD_BORDER if col == GRN else None, left=YEL if col == GRN else None)
        p.text(40, y + 25, rd, 12, TEXT2, bold=False)
        p.text(150, y + 26, rt, 15, col)
        for j, m in enumerate(mini):
            x = W - 150 + j * 30
            mc = {'G': GRN, 'P': PUR, '~': GREY}.get(m if m in 'GP~' else '', NEUT_TXT)
            if m == 'P':
                p.rect(x, y + 11, 24, 17, r=5, fill=PUR)
                p.text(x + 12, y + 24, '·', 10, PUR_INK, align='center')
            elif m == 'G':
                p.rect(x, y + 11, 24, 17, r=5, stroke=GRN, sw=1.5)
            elif m == '~':
                p.rect(x, y + 11, 24, 17, r=5, stroke=GREY, sw=1.2, dash=[2, 2])
            else:
                p.text(x + 12, y + 24, m, 10, NEUT_TXT, align='center')
        y += 46
    tabbar(p, 'PREVIEW')
    p.text(W / 2, 30, 'PADDOCK · HISTORY', 10, INK_DIM, align='center', ls=2)
    return p


def live(state):
    p = P(RACE_BG)
    if state == 'waiting':
        p.rect(24, 100, W - 48, 170, r=18, stroke=RACE_BORDER, sw=2)
        p.text(44, 150, 'S1', 30, GREY)
        p.text(W / 2, 210, '...', 54, GREY, align='center')
        cap = 'RACE · LIVE (before gate 1)'
        strip = ['', '', '', '']
    elif state == 'purple':
        p.rect(24, 100, W - 48, 170, r=18, fill=PUR)
        p.text(44, 150, 'S4', 30, PUR_INK)
        p.text(W - 44, 150, '-11.2', 30, PUR_INK, align='right')
        p.text(W / 2, 224, '3:14.9 ·', 52, PUR_INK, align='center')
        cap = 'RACE · LIVE (purple sector + PB)'
        strip = ['N', 'NI', 'G', 'P']
    else:  # handover
        p.rect(24, 76, W - 48, 150, r=18, fill=PUR)
        p.text(44, 122, 'S4', 26, PUR_INK)
        p.text(W - 44, 122, '-11.2', 26, PUR_INK, align='right')
        p.text(W / 2, 186, '3:14.9 ·', 44, PUR_INK, align='center')
        p.rect(24, 242, W - 48, 74, r=16, stroke=GRN, sw=2)
        p.text(44, 288, 'LAP', 22, GRN, ls=2)
        p.text(W / 2 + 16, 292, '14:46', 36, GRN, align='center')
        p.text(W - 40, 288, '-0:17', 20, GRN, align='right')
        cap = 'RACE · FINAL GATE (D-022 lap handover)'
        strip = ['N', 'NI', 'G', 'P']
    y = 420
    for i, k in enumerate(strip):
        x = W / 2 - 130 + i * 68
        lbl = f'S{i + 1}'
        if k == 'P':
            p.rect(x, y, 56, 40, r=9, fill=PUR)
            p.text(x + 28, y + 25, lbl + ' ·', 13, PUR_INK, align='center')
        elif k == 'G':
            p.rect(x, y, 56, 40, r=9, stroke=GRN, sw=2)
            p.text(x + 28, y + 25, lbl, 13, GRN, align='center')
        elif k:
            p.rect(x, y, 56, 40, r=9, stroke=RACE_BG, sw=0)
            p.text(x + 28, y + 25, lbl + (' ||' if k == 'NI' else ''), 13, NEUT_TXT, align='center')
        else:
            p.rect(x, y, 56, 40, r=9, stroke=RACE_BORDER, sw=2)
            p.text(x + 28, y + 25, lbl, 13, '#3c3c3c', align='center')
    p.text(W / 2, y + 66, 'completed sectors only - nothing upcoming (D-006)', 9, '#4e4d48', bold=False, align='center')
    p.text(W / 2, H - 30, 'zero touch targets while moving', 9, '#43423e', bold=False, align='center')
    p.text(W / 2, 30, cap, 10, GREY, align='center', ls=2)
    return p


def board():
    p = P(RACE_BG)
    p.text(24, 52, '-> WORK · MORNING', 14, INK, ls=1)
    p.text(W - 24, 52, 'Thu 14 Aug · 07:41', 12, INK_DIM, align='right', bold=False)
    p.rect(60, 68, W - 120, 66, r=14, stroke=GRN, sw=2)
    p.text(84, 112, 'LAP', 14, GRN, ls=2)
    p.text(W / 2 - 6, 116, '14:46', 34, GRN, align='center')
    p.text(W - 78, 112, '-0:17', 16, GRN, align='right')
    p.text(W / 2, 152, 'moving · vs ref · 15:12 elapsed  || 1 stop', 10, INK_DIM, bold=False, align='center')
    p.text(28, 186, 'SECTOR OF THE DAY', 9, INK_DIM, ls=2)
    p.line(24, 170, 24, 232, PUR, 4)
    p.rect(36, 196, W - 60, 44, r=11, fill=PUR)
    p.text(52, 224, 'S4  Campus rise', 14, PUR_INK)
    p.text(W - 44, 224, '3:14.9  -11.2 ·', 15, PUR_INK, align='right')
    y = 258
    rows = [('S1', '', 'Village exit', '3:06.8', '-1.4', 'N'), ('S2', '||', 'Vaartdijk drag', '3:29.3', '+5.3', 'N'),
            ('S3', '', 'Canal straight', '3:55.4', '-7.1', 'G'), ('S4', '', 'Campus rise', '3:14.9', '-11.2', 'P')]
    for lbl, gl, nm, t, d, k in rows:
        col = {'N': NEUT_TXT, 'G': GRN, 'P': PUR_INK}[k]
        if k == 'P':
            p.rect(24, y, W - 48, 46, r=11, fill=PUR)
        elif k == 'G':
            p.rect(24, y, W - 48, 46, r=11, stroke=GRN, sw=2)
        else:
            p.rect(24, y, W - 48, 46, r=11, stroke=RACE_CARD, sw=1)
        p.text(40, y + 29, lbl, 17, col)
        p.text(76, y + 29, gl, 13, col, bold=False)
        p.text(96, y + 29, nm, 11, col, bold=False, alpha=0.75)
        p.text(W - 116, y + 29, t, 17, col, align='right')
        p.text(W - 52, y + 29, d, 14, col, align='right')
        y += 54
    p.line(24, y + 8, W - 24, y + 8, '#33322e', 2, dash=[5, 4], cap=False)
    p.text(24, y + 34, 'IDEAL LAP', 12, '#8a8880')
    p.text(W / 2, y + 36, '14:19', 18, '#a09e96', align='center')
    p.text(W - 24, y + 34, 'you: +0:27', 12, '#8a8880', align='right')
    p.text(W / 2, 30, 'RACE -> BOARD (post-ride, automatic)', 10, GREY, align='center', ls=2)
    return p


def sector_context():
    """Competitor identity palettes vs ours — approximate brand hues, for
    positioning only (not colour-accurate specimens)."""
    p = P(PAD_BG)
    p.text(24, 56, 'SECTOR CONTEXT', 20, INK, ls=2)
    p.text(24, 78, 'who owns which hue in ride-tracking', 12, TEXT2, bold=False)
    rows = [
        ('Strava', '#FC4C02', '#FFFFFF', 'orange on white - social fitness'),
        ('Komoot', '#6AA127', '#FFFFFF', 'green on white - touring, nature'),
        ('Garmin', '#006CC1', '#111111', 'blue on dark - devices, data'),
        ('Wahoo', '#00A7E1', '#111111', 'cyan on black - training hardware'),
        ('F1 TV', '#E10600', '#111111', 'red on black - the sport itself'),
        ('QUALIFIRE', YEL, PAD_BG, 'yellow on charcoal - the timing instrument'),
    ]
    y = 104
    for name, c1, c2, desc in rows:
        us = name == 'QUALIFIRE'
        p.rect(24, y, W - 48, 74, r=14, fill=PAD_CARD, stroke=YEL if us else PAD_BORDER,
               sw=2 if us else 1, left=YEL if us else None)
        p.rect(40, y + 16, 30, 42, r=8, fill=c1)
        p.rect(76, y + 16, 30, 42, r=8, fill=c2, stroke=PAD_BORDER)
        p.text(122, y + 34, name, 16, INK if us else TEXT2)
        p.text(122, y + 54, desc, 10.5, TEXT2 if us else INK_DIM, bold=False)
        y += 84
    p.text(24, y + 24, 'orange, green, blue: taken. red: the sport, not an app.', 11, TEXT2, bold=False)
    p.text(24, y + 42, 'yellow/charcoal timing-instrument space: empty. ours.', 11, YEL)
    return p


def motion():
    """Nathan 2026-08-15: the mark is built for animation. Four uses."""
    p = P(PAD_BG)
    p.text(24, 56, 'MOTION', 20, INK, ls=2)
    p.text(24, 78, 'the mark animates - ring = lap, slash = gate', 12, TEXT2, bold=False)
    y = 116
    # 1 launch: ring draws itself
    p.c.new_path()
    p.c.arc(80, y + 40, 34, math.radians(-90), math.radians(150))
    p.c.set_source_rgb(*hx(INK)); p.c.set_line_width(8)
    p.c.set_line_cap(cairo.LINE_CAP_ROUND); p.c.stroke()
    p.line(80, y + 40 - 42, 80, y + 40 - 24, YEL, 6)
    p.text(140, y + 30, 'APP LAUNCH', 12, INK, ls=1)
    p.text(140, y + 48, 'ring draws clockwise from the start', 10.5, TEXT2, bold=False)
    p.text(140, y + 63, 'tick, ~600 ms; slash lands last', 10.5, TEXT2, bold=False)
    y += 110
    # 2 start: slash strikes through
    p.circle(80, y + 40, 34, stroke=INK, sw=8)
    p.line(80 + 6, y + 40 + 6, 80 + 52, y + 40 + 52, YEL, 11)
    p.text(140, y + 30, 'START PRESSED', 12, INK, ls=1)
    p.text(140, y + 48, 'the yellow START slab collapses into', 10.5, TEXT2, bold=False)
    p.text(140, y + 63, 'the slash striking the ring: gates armed,', 10.5, TEXT2, bold=False)
    p.text(140, y + 78, 'screen drops to race black', 10.5, TEXT2, bold=False)
    y += 120
    # 3 tab switch: slash slides as underline
    for i, on in enumerate([False, True, False]):
        p.circle(60 + i * 90, y + 34, 4, fill=INK if on else '#4a4a52')
    p.line(60 + 90 - 26, y + 52, 60 + 90 + 26, y + 52, YEL, 5)
    p.line(60 - 12, y + 52, 60 + 14, y + 52, '#4a4a52', 3, dash=[2, 3])
    p.text(140 + 130, y + 30, '', 10, TEXT2)
    p.text(24, y + 84, 'TAB SWITCH - the active-tab bar IS the slash: it slides to the', 10.5, TEXT2, bold=False)
    p.text(24, y + 99, 'next tab, tilting 45 deg mid-flight, landing flat', 10.5, TEXT2, bold=False)
    y += 128
    # 4 lap complete
    p.circle(80, y + 40, 34, stroke=GRN, sw=8)
    p.line(80 + 6, y + 40 + 6, 80 + 52, y + 40 + 52, YEL, 11)
    p.text(140, y + 30, 'FINAL GATE', 12, INK, ls=1)
    p.text(140, y + 48, 'ring pulses once in the lap tier colour', 10.5, TEXT2, bold=False)
    p.text(140, y + 63, '(here: green), then the board slides in.', 10.5, TEXT2, bold=False)
    p.text(140, y + 78, 'race surface itself stays animation-free', 10.5, TEXT2, bold=False)
    y += 118
    p.text(24, y + 10, 'RULE: motion lives in paddock + transitions only. While riding,', 10.5, INK_DIM, bold=False)
    p.text(24, y + 25, 'nothing moves except the numbers (D-006).', 10.5, INK_DIM, bold=False)
    return p


PANELS = [
    ('01_cover', cover), ('02_record_idle', record_idle), ('03_rides', rides),
    ('04_home', home), ('05_setup', setup), ('06_history', history),
    ('07_live_waiting', lambda: live('waiting')), ('08_live_purple', lambda: live('purple')),
    ('09_lap_handover', lambda: live('handover')), ('10_board', board),
    ('11_sector_context', sector_context), ('12_motion', motion),
]

if __name__ == '__main__':
    for name, fn in PANELS:
        fn().save(f'board/board_{name}.png')
    print('done')
