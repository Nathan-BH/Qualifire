#!/usr/bin/env python3
"""
Palette trials — candidate structural yellows + companion tones from
piktochart.com/blog/white-yellow-color-palette/, applied to one identical
composite (logo, START slab, ride card, stats, tab bar) per candidate so
comparison is apples-to-apples. Tier colours (green/purple) are FIXED — a
candidate fails if its yellow drifts toward either, or if a companion tone
collides with a tier.
"""
import make_brandboard as bb
from make_brandboard import P, W, INK, GRN, PUR, PAD_CARD, PAD_BORDER

CANDS = [
    ('A_signal', '#F5C542', '#b5b3ac', 'CURRENT - SIGNAL', 'warm mid yellow · warm grey text (baseline)'),
    ('B_vibrant_gold', '#F1C40F', '#b5b3ac', 'VIBRANT GOLD', "article's Golden Hour - punchier, greener"),
    ('C_two_tone', '#F9CA24', '#F39C12', 'TWO-TONE GOLD', 'bright gold + amber-orange secondary accents'),
    ('D_butter', '#F7DC6F', '#c9c0a8', 'SOFT BUTTER', 'creamy yellow, warm cream text - gentler'),
    ('E_cool_gray', '#F4D03F', '#D5DBDB', 'YELLOW + COOL GRAY', "Sunny Delight - cool gray replaces warm grey"),
    ('F_teal_whisper', '#F4D03F', '#85C1AE', 'YELLOW + TEAL', 'Daffodil - teal links (RISK: nears tier green)'),
]


def panel(slug, yel, second, title, note):
    p = P('#17171b')
    p.text(24, 46, title, 17, INK, ls=1)
    p.text(24, 66, note, 10.5, '#9a978f', bold=False)
    # swatches incl. fixed tiers for collision check
    for i, (c, lbl) in enumerate([(yel, 'yellow'), (second, '2nd'), (INK, 'ink'),
                                  (GRN, 'tier G'), (PUR, 'tier P')]):
        x = 24 + i * 68
        p.rect(x, 82, 56, 30, r=8, fill=c, stroke=PAD_BORDER)
        p.text(x + 28, 128, lbl, 9, '#9a978f', align='center', bold=False)
    # logo + wordmark
    bb.logo_mark(p, W / 2, 200, r=34, sw=8)
    # slash colour override: redraw in candidate yellow
    d = 34 / 1.414
    p.line(W / 2 + d * 0.35, 200 + d * 0.35, W / 2 + d * 1.9, 200 + d * 1.9, yel, 12)
    p.text(W / 2, 268, 'QUALIFIRE', 15, INK, align='center', ls=5)
    # START slab
    p.rect(24, 290, W - 48, 92, r=20, fill=yel)
    p.text(W / 2, 342, 'START', 28, '#17171b', align='center', ls=4)
    p.text(W / 2, 364, 'records the ride', 9, '#17171b', bold=False, align='center', alpha=0.75)
    # stats strip
    p.rect(24, 402, W - 48, 58, r=13, fill=PAD_CARD, stroke=PAD_BORDER, left=yel)
    for i, (num, lbl) in enumerate([('12', 'RIDES'), ('3h08', 'RECORDED'), ('10,988', 'FIXES')]):
        x = 24 + (W - 48) / 6 * (2 * i + 1)
        p.text(x, 434, num, 20, yel, align='center')
        p.text(x, 450, lbl, 8, second, align='center', ls=1.5)
    # ride card with secondary text + link colour in `second`
    p.rect(24, 476, W - 48, 58, r=13, fill=PAD_CARD, stroke=PAD_BORDER, left=yel)
    p.text(40, 500, '2026-08-15 07:41', 14, INK)
    p.text(40, 518, '15m12s · 907 fixes', 11, second, bold=False)
    p.rect(W - 122, 490, 70, 28, r=8, fill=yel)
    p.text(W - 87, 508, 'Export', 10, '#17171b', align='center')
    # link row exercising the secondary as accent
    p.rect(24, 550, W - 48, 40, r=11, stroke=PAD_BORDER)
    p.text(40, 575, "Yesterday's board", 12, INK)
    p.text(W - 40, 575, 'Wed · 15:19 ->', 11, second, align='right')
    # tier chips next to yellow chip — the collision test
    p.text(24, 622, 'TIER COLLISION CHECK', 9, '#9a978f', ls=2)
    for i, (c, lbl, filled) in enumerate([(yel, 'S1', False), (yel, 'S2', False), (GRN, 'S3', None), (PUR, 'S4 ·', True)]):
        x = 24 + i * 68
        if filled is True:
            p.rect(x, 634, 56, 36, r=9, fill=PUR)
            p.text(x + 28, 657, lbl, 12, '#120521', align='center')
        elif filled is None:
            p.rect(x, 634, 56, 36, r=9, stroke=GRN, sw=2)
            p.text(x + 28, 657, lbl, 12, GRN, align='center')
        else:
            p.text(x + 28, 657, lbl, 12, yel, align='center')
    bb.H = 780
    # tab bar with candidate underline
    y = 780 - 54
    p.line(0, y, W, y, PAD_BORDER, 1, cap=False)
    for i, t in enumerate(['RECORD', 'RIDES', 'PREVIEW']):
        x = W / 6 + i * W / 3
        on = i == 0
        if on:
            p.rect(x - 40, y, 80, 3, fill=yel)
        p.text(x, y + 33, t, 11, INK if on else '#9a978f', align='center', ls=2)
    p.save(f'palettes/palette_{slug}.png')


if __name__ == '__main__':
    for slug, yel, second, title, note in CANDS:
        panel(slug, yel, second, title, note)
    print('done')
