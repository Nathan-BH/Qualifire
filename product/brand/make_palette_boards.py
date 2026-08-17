#!/usr/bin/env python3
"""
Palette boards, ROUND 2 — Nathan's verdict on round 1: varying only the yellow
hue is invisible at board scale. So these candidates vary the COLOUR
ARCHITECTURE (ground, cards, ink, panel tone), not the yellow: four visibly
different worlds. Race-mode surfaces stay black in all of them (settled).

  night    — current identity: charcoal ground, white ink, yellow structure
  daylight — the article's actual premise: warm WHITE ground, charcoal ink,
             yellow accents; race mode then becomes a dramatic day->night flip
  navy     — the article's "pair with navy" tip: deep blue-navy ground,
             yellow pops harder against blue (complementary)
  golden   — yellow-forward: warm brown-charcoal ground, sand secondary text,
             saturated gold; the whole paddock warm-tinted

Renders the full 12-panel board per candidate into palettes/<slug>/ + montage
palettes/brandboard_<slug>.png. Round-1 outputs (A/B/C/E hue trials) were
superseded and removed.
"""
import os
import subprocess
import make_brandboard as bb

BASE = {k: getattr(bb, k) for k in
        ['PAD_BG', 'PAD_CARD', 'PAD_BORDER', 'PANEL_BG', 'INK', 'INK_DIM', 'TEXT2', 'YEL',
         'RACE_BG', 'RACE_CARD', 'RACE_BORDER', 'NEUT_TXT']}

CANDS = {
    'night': {},  # baseline = current identity
    # Nathan 2026-08-15: race mode follows the theme — daylight race is white.
    'daylight': dict(PAD_BG='#FAF7EE', PAD_CARD='#FFFFFF', PAD_BORDER='#E0D9C4',
                     PANEL_BG='#F1ECDC', INK='#201F24', INK_DIM='#8A8577', TEXT2='#6D6759',
                     RACE_BG='#FFFFFF', RACE_CARD='#F5F1E6', RACE_BORDER='#E4DECB',
                     NEUT_TXT='#B98A0A'),
    'navy': dict(PAD_BG='#131B2B', PAD_CARD='#1C2740', PAD_BORDER='#35435F',
                 PANEL_BG='#0E1522', INK_DIM='#8B94A8', TEXT2='#AEB6C6'),
    'golden': dict(PAD_BG='#1B1508', PAD_CARD='#28200E', PAD_BORDER='#57451C',
                   PANEL_BG='#140F06', INK='#F7F1DF', INK_DIM='#A6935F',
                   TEXT2='#CBB98A', YEL='#F1C40F'),
}

for slug, over in CANDS.items():
    for k, v in BASE.items():
        setattr(bb, k, over.get(k, v))
    outdir = f'palettes/{slug}'
    os.makedirs(outdir, exist_ok=True)
    for name, fn in bb.PANELS:
        fn().save(f'{outdir}/board_{name}.png')
    subprocess.run(
        ['montage'] + sorted(f'{outdir}/{f}' for f in os.listdir(outdir)) +
        ['-tile', '4x3', '-geometry', '+12+12', '-background', '#0A0A0A',
         f'palettes/brandboard_{slug}.png'],
        check=True)
    print('board:', slug)
print('done')
