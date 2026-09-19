#!/usr/bin/env python3
"""Read note PITCHES out of a LilyPond-engraved score PDF (Klangio piano2notes export).

    qpdf --qdf --object-streams=disable score.pdf score_qdf.pdf
    python3 extract_klangio_pdf.py score_qdf.pdf

Why this works: LilyPond sets noteheads as glyphs from the Emmentaler music font at exact
coordinates, and draws staff lines as horizontal strokes. So the pitch of every note is
recoverable as pure geometry - find the staff lines, find the clef glyph on each staff,
measure each notehead's height above the bottom staff line in half-spaces, and read off
the diatonic degree. No OCR, no image processing, no guessing.

WHAT THIS DOES NOT RECOVER: rhythm. Beams are drawn as filled paths rather than font
glyphs, so beamed groups cannot be told apart from plain quarter notes; a duration pass
built on glyphs alone produces bars that do not sum to 4 beats. Pitches: exact.
Durations: do not trust them. Use the MIDI for timing.

Assumes no accidentals (verify: the FontDescriptor /CharSet lists every glyph the PDF
actually uses - if no accidentals.* appear there, the score is all naturals).
"""
import re, sys, json
from collections import Counter

# Fallback code->glyph table (round-04's PDF). Each Emmentaler font embedded in a PDF is a
# SUBSET, and the /Differences array that assigns codes to glyphs is built per file from
# whichever glyphs that particular score happens to use - it is NOT the same across PDFs.
# extract() now reads each font's own /Differences first; this table is only a fallback
# for a PDF where that lookup fails. Trusting it as the primary source (round 4-6) silently
# mis-read glyphs.G/F clefs as noteheads whenever a later PDF assigned different codes,
# which defaulted every staff to treble and put anything actually in bass clef an
# octave-plus too high.
ENC = {0:'noteheads.s2', 1:'rests.1', 2:'dots.dot', 3:'noteheads.s1', 4:'flags.d3',
       5:'rests.3', 6:'rests.2', 7:'noteheads.s0', 8:'rests.0', 9:'clefs.F',
       10:'clefs.G', 11:'flags.d4', 12:'rests.4', 13:'flags.u3', 52:'four'}
ESC = {'n':'\n','r':'\r','t':'\t','b':'\b','f':'\f','(':'(',')':')','\\':'\\'}
PC  = [0,2,4,5,7,9,11]
name = lambda dia: "CDEFGAB"[dia % 7] + str(dia // 7)
midi = lambda dia: (dia // 7 + 1) * 12 + PC[dia % 7]
REF  = {'clefs.G': 4*7+2,   # treble: bottom staff line is E4
        'clefs.F': 2*7+4}   # bass:   bottom staff line is G2

def unescape(s):
    out, i = [], 0
    while i < len(s):
        if s[i] == '\\':
            n = s[i+1]
            if n.isdigit():
                j, o = i+1, ''
                while j < len(s) and s[j].isdigit() and len(o) < 3: o += s[j]; j += 1
                out.append(chr(int(o, 8))); i = j
            else: out.append(ESC.get(n, n)); i += 2
        else: out.append(s[i]); i += 1
    return ''.join(out)

def extract(path):
    raw = open(path, 'rb').read()
    # the page content stream is the one that starts with graphics operators
    cs = None
    for s in re.findall(rb'stream\r?\n(.*?)\r?\nendstream', raw, re.S):
        if s.lstrip()[:2] in (b'q ', b'q\n') or b' cm\n' in s[:80]: cs = s.decode('latin-1'); break
    if cs is None: raise SystemExit('no page content stream found - did you run qpdf --qdf?')

    # music font resource names: those whose font object is an Emmentaler. Each font
    # subset assigns its own codes, so read /Differences from ITS OWN /Encoding object
    # rather than trusting a codepoint map lifted from a different score (see ENC above).
    txt = raw.decode('latin-1')
    music, font_enc = set(), {}
    res = re.search(r'/Font\s+(\d+) 0 R', txt)
    fd = re.search(r'%d 0 obj\s*(<<.*?>>)' % int(res.group(1)), txt, re.S).group(1)
    for rn, objn in re.findall(r'/(R\d+)\s+(\d+) 0 R', fd):
        ob = re.search(r'%s 0 obj\s*(<<.*?>>)' % objn, txt, re.S)
        if not ob or 'Emmentaler' not in ob.group(1) or 'Brace' in ob.group(1): continue
        music.add(rn)
        diffs = {}
        enc_ref = re.search(r'/Encoding\s+(\d+)\s+0\s+R', ob.group(1))
        if enc_ref:
            eo = re.search(r'%s 0 obj\s*(<<.*?>>)' % enc_ref.group(1), txt, re.S)
            darr = eo and re.search(r'/Differences\s*\[(.*?)\]', eo.group(1), re.S)
            if darr:
                code = 0
                for tok in re.findall(r'/[A-Za-z0-9_.]+|-?\d+', darr.group(1)):
                    if tok.startswith('/'): diffs[code] = tok[1:]; code += 1
                    else: code = int(tok)
        font_enc[rn] = diffs or ENC   # fall back to the old table if none found

    # staff lines = long horizontal strokes
    seg = [(float(a)/10, float(b)/10, float(c)/10, float(e)/10) for a,b,c,e in
           re.findall(r'([-\d.]+)\s+([-\d.]+)\s+m\s+([-\d.]+)\s+([-\d.]+)\s+l', cs)]
    lines = sorted({round(s[1],2) for s in seg if abs(s[1]-s[3]) < 0.6 and s[2]-s[0] > 50})
    staves, cur = [], [lines[0]]
    for a, b in zip(lines, lines[1:]):
        if b - a < 8: cur.append(b)
        else: staves.append(cur); cur = [b]
    staves.append(cur)
    staves = [s for s in staves if len(s) == 5]

    # glyph placements: track current font, text matrix and accumulated line offsets
    glyphs, font, tm, td = [], None, None, (0., 0.)
    pat = re.compile(r'/(R\d+)\s+[\d.]+\s+Tf'
                     r'|([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm'
                     r'|([-\d.]+)\s+([-\d.]+)\s+Td'
                     r'|<([0-9A-Fa-f\s]+)>\s*Tj'
                     r'|\(((?:[^()\\]|\\.)*)\)\s*Tj')
    for m in pat.finditer(cs):
        if m.group(1): font = m.group(1)
        elif m.group(6) is not None: tm = (float(m.group(6)), float(m.group(7))); td = (0., 0.)
        elif m.group(8) is not None: td = (td[0]+float(m.group(8)), td[1]+float(m.group(9)))
        else:
            if font not in music or tm is None: continue
            if m.group(10) is not None:
                h = re.sub(r'\s', '', m.group(10))
                codes = [int(h[i:i+2], 16) for i in range(0, len(h), 2)]
            else:
                codes = [ord(c) for c in unescape(m.group(11))]
            x, y = tm[0]+td[0], tm[1]+td[1]
            fenc = font_enc.get(font, ENC)
            for c in codes: glyphs.append((round(x,2), round(y,2), fenc.get(c, '?%d' % c)))

    staff_of = lambda y: min(range(len(staves)), key=lambda i: abs(y - sum(staves[i])/5))
    clef = {}
    for x, y, g in glyphs:
        if g.startswith('clefs'): clef.setdefault(staff_of(y), g)
    order = sorted(range(len(staves)), key=lambda i: -staves[i][0])   # top staff first
    system = {s: k // 2 for k, s in enumerate(order)}

    notes = []
    for x, y, g in glyphs:
        if not g.startswith('noteheads'): continue
        if x < 60 and y > staves[order[0]][4]: continue   # the metronome-mark notehead
        s = staff_of(y); c = clef.get(s, 'clefs.G')
        half = (staves[s][4] - staves[s][0]) / 8
        dia = REF[c] + round((y - staves[s][0]) / half)
        notes.append(dict(system=system[s], x=round(x,2),
                          clef='treble' if c == 'clefs.G' else 'bass',
                          midi=midi(dia), name=name(dia)))
    notes.sort(key=lambda n: (n['system'], n['x'], n['midi']))
    return staves, glyphs, notes

if __name__ == '__main__':
    staves, glyphs, notes = extract(sys.argv[1])
    print("staves:", len(staves), "| glyphs:", Counter(g[2] for g in glyphs).most_common())
    ordered = sorted(notes, key=lambda n: n['midi'])
    print("noteheads:", len(notes), "| range", ordered[0]['name'], "-", ordered[-1]['name'])
    print("pitch letters used:", sorted({n['name'][0] for n in notes}))
    groups, cur = [], None
    for n in notes:
        if cur and n['system'] == cur['s'] and abs(n['x'] - cur['x']) < 1.5: cur['n'].append(n['name'])
        else: cur = dict(s=n['system'], x=n['x'], n=[n['name']]); groups.append(cur)
    print("\nreading order:")
    print("  " + "  ".join("/".join(sorted(set(g['n']))) for g in groups))
    if '--json' in sys.argv: json.dump(notes, open('notes.json','w'), indent=1)
