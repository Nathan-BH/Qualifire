"""Render the demo RESULTS scatterplot preview (FIRST / SECOND / TENTH ride x day / night).

Input : plotdump.json  (real buildPlotModel output, made by plotdump.ts - see README.md)
Output: results_scatterplot_demo_preview.png  (written beside this script)

This is a DESIGN PREVIEW: positions/ticks/tones come from the app's own model;
the drawing (fonts, spacing) approximates resultsPlot.tsx, it is not a phone screenshot.
Run:  python render_preview.py      (needs Pillow)
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
S = 3  # supersampling scale

def find_font(bold):
    names = (['LiberationSans-Bold.ttf', 'arialbd.ttf', 'DejaVuSans-Bold.ttf'] if bold
             else ['LiberationSans-Regular.ttf', 'arial.ttf', 'DejaVuSans.ttf'])
    dirs = ['/usr/share/fonts/truetype/liberation', 'C:/Windows/Fonts', '/usr/share/fonts/truetype/dejavu']
    for n in names:
        for d in dirs:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return p
    raise SystemExit('no usable font found')

F, FB = find_font(False), find_font(True)
def font(sz, b=False): return ImageFont.truetype(FB if b else F, int(sz * S))

d = json.load(open(os.path.join(HERE, 'plotdump.json'), encoding='utf-8'))
# All-time position captions (P<rank> of <n>) were derived by hand from the demo lap sums
# (today's 836 s against DEMO_HISTORY laps) - NOT produced by the app; see README.
POS = {'first': 'P1 of 1', 'second': 'P1 of 2', 'tenth': 'P3 of 10'}
TITLES = {'first': 'FIRST RIDE', 'second': 'SECOND RIDE', 'tenth': 'TENTH RIDE'}

# theme.ts: daylight / night PaddockTheme tokens
TH = {'day':   dict(bg='#FAF7EE', card='#FFFFFF', border='#E0D9C4', text='#201F24', dim='#8A8577', acc='#B98A0A'),
      'night': dict(bg='#17171b', card='#212127', border='#41414c', text='#F4F2EC', dim='#9a978f', acc='#F5C542')}
TONE = {'fastest': '#9000C8', 'faster': '#00D000', 'slower': '#F5C542'}  # purple / green / YELLOW_TIER

# resultsPlot.tsx / resultsPlotModel.ts layout constants
GUT, PH, PADT, PADH = 44, 220, 12, 8
BOX_W = 344                      # inner width the model was built for (plotW = BOX_W - GUT = 300)
FW = BOX_W + 2 * PADH + 2        # frame width
FH = PADT + PH + 16 + 8 + 38 + 2 # frame height (plot + x axis + caption)

def card(theme, key):
    t, m = TH[theme], d[key]['model']
    im = Image.new('RGB', (FW * S, FH * S), t['bg'])
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle([0, 0, FW * S - 1, FH * S - 1], radius=14 * S, fill=t['card'], outline=t['border'], width=S)
    ox, oy = 1 + PADH + GUT, 1 + PADT
    def txt(x, y, s, f, fill, anchor='la'): dr.text((x * S, y * S), s, font=f, fill=fill, anchor=anchor)
    for tk in m['yTicks']:
        if tk['label']:
            txt(1 + PADH + 36, oy + tk['at'], tk['label'], font(10), t['dim'], 'rm')
    mm, ss = divmod(round(m['meanS']), 60)
    txt(1 + PADH + 44, oy + m['meanY'], 'avg %d:%02d' % (mm, ss), font(10, True), t['dim'], 'rm')
    x = 0
    while x < m['plotW']:  # dotted mean line: 2px squares every 6px
        dr.rounded_rectangle([(ox + x) * S, (oy + m['meanY'] - 1) * S, (ox + x + 2) * S, (oy + m['meanY'] + 1) * S],
                             radius=S, fill=t['dim'])
        x += 6
    for p in m['points']:  # selection ring on today's dot (demo pre-selects it)
        if p['rideId'] == 'demo:today':
            cx, cy = ox + p['x'], oy + p['y']
            dr.ellipse([(cx - 8) * S, (cy - 8) * S, (cx + 8) * S, (cy + 8) * S], outline=t['text'], width=2 * S)
    for p in m['points']:
        r = 5 if p['tone'] == 'fastest' else 4
        cx, cy = ox + p['x'], oy + p['y']
        dr.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=TONE[p['tone']])
    ax, seen = oy + PH, set()
    for tk in m['xTicks']:
        if tk['at'] in seen:
            continue
        seen.add(tk['at'])
        txt(ox + tk['at'], ax + 1, tk['label'], font(10), t['dim'], 'ma')
    cy0 = ax + 16 + 8
    dr.line([(1 + PADH) * S, cy0 * S, (FW - 1 - PADH) * S, cy0 * S], fill=t['border'], width=1)
    txt(1 + PADH, cy0 + 19, d[key]['todayCaption'] + ' \u00b7 ' + POS[key], font(12.5), t['dim'], 'lm')
    txt(FW - 1 - PADH, cy0 + 19, 'open \u203a', font(12.5, True), t['acc'], 'rm')
    return im

M, LAB = 28, 40
split = M + FW + M
W = split + M + FW + M
H = LAB + 3 * (FH + LAB) - 6
sheet = Image.new('RGB', (W * S, H * S), TH['day']['bg'])
dr = ImageDraw.Draw(sheet)
dr.rectangle([split * S, 0, W * S, H * S], fill=TH['night']['bg'])
for ci, th in enumerate(['day', 'night']):
    x = M if ci == 0 else split + M
    dr.text((x * S, 10 * S), th.upper(), font=font(13, True), fill=TH[th]['text'])
    for ri, key in enumerate(['first', 'second', 'tenth']):
        y = LAB + ri * (FH + LAB)
        dr.text((x * S, (y + 8) * S), TITLES[key], font=font(11, True), fill=TH[th]['dim'])
        sheet.paste(card(th, key), (x * S, (y + LAB - 8) * S))
out = os.path.join(HERE, 'results_scatterplot_demo_preview.png')
sheet.save(out)
print(out, sheet.size)
