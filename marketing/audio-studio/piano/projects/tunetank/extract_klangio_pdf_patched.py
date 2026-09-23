#!/usr/bin/env python3
"""Corrected reader for tunetank_qdf.pdf: parses TJ arrays (not just Tj), infers a
missing clef on a 2-staff grand staff from the sibling staff, and applies the key
signature (accidentals drawn at the clef, before the first notehead) to every
notehead of that pitch letter for the rest of the piece. Built as a patch on top of
../../tools/extract_klangio_pdf.py after discovering it silently drops TJ-array text
(kerned glyph pairs) and never applies key signatures at all.
"""
import re, sys, json
from collections import Counter

PC  = [0,2,4,5,7,9,11]
name = lambda dia: "CDEFGAB"[dia % 7] + str(dia // 7)
midi = lambda dia: (dia // 7 + 1) * 12 + PC[dia % 7]
letter = lambda dia: "CDEFGAB"[dia % 7]
REF  = {'clefs.G': 4*7+2, 'clefs.F': 2*7+4}
ESC = {'n':'\n','r':'\r','t':'\t','b':'\b','f':'\f','(':'(',')':')','\\':'\\'}

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
    cs = None
    for s in re.findall(rb'stream\r?\n(.*?)\r?\nendstream', raw, re.S):
        if s.lstrip()[:2] in (b'q ', b'q\n') or b' cm\n' in s[:80]: cs = s.decode('latin-1'); break
    if cs is None: raise SystemExit('no page content stream found')
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
        font_enc[rn] = diffs

    lines = sorted({round(s[1],2) for s in
        [(float(a)/10,float(b)/10,float(c)/10,float(e)/10) for a,b,c,e in
         re.findall(r'([-\d.]+)\s+([-\d.]+)\s+m\s+([-\d.]+)\s+([-\d.]+)\s+l', cs)]
        if abs(s[1]-s[3]) < 0.6 and s[2]-s[0] > 50})
    staves, cur = [], [lines[0]]
    for a, b in zip(lines, lines[1:]):
        if b - a < 8: cur.append(b)
        else: staves.append(cur); cur = [b]
    staves.append(cur)
    staves = [s for s in staves if len(s) == 5]

    # glyph placements: now handles BOTH single-string Tj AND kerned-array TJ
    glyphs, font, tm, td = [], None, None, (0., 0.)
    pat = re.compile(r'/(R\d+)\s+[\d.]+\s+Tf'
                     r'|([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm'
                     r'|([-\d.]+)\s+([-\d.]+)\s+Td'
                     r'|<([0-9A-Fa-f\s]+)>\s*Tj'
                     r'|\(((?:[^()\\]|\\.)*)\)\s*Tj'
                     r'|(\[(?:<[0-9A-Fa-f\s]+>|\((?:[^()\\]|\\.)*\)|[-\d.]+)+\])\s*TJ')
    for m in pat.finditer(cs):
        if m.group(1): font = m.group(1)
        elif m.group(6) is not None: tm = (float(m.group(6)), float(m.group(7))); td = (0., 0.)
        elif m.group(8) is not None: td = (td[0]+float(m.group(8)), td[1]+float(m.group(9)))
        else:
            if font not in music or tm is None: continue
            codes = []
            if m.group(10) is not None:
                h = re.sub(r'\s', '', m.group(10))
                codes = [int(h[i:i+2], 16) for i in range(0, len(h), 2)]
            elif m.group(11) is not None:
                codes = [ord(c) for c in unescape(m.group(11))]
            elif m.group(12) is not None:
                for piece in re.findall(r'<[0-9A-Fa-f\s]+>|\((?:[^()\\]|\\.)*\)', m.group(12)):
                    if piece[0] == '<':
                        h = re.sub(r'\s', '', piece[1:-1])
                        codes += [int(h[i:i+2], 16) for i in range(0, len(h), 2)]
                    else:
                        codes += [ord(c) for c in unescape(piece[1:-1])]
            x, y = tm[0]+td[0], tm[1]+td[1]
            fenc = font_enc.get(font, {})
            for c in codes: glyphs.append((round(x,2), round(y,2), fenc.get(c, '?%d' % c)))

    staff_of = lambda y: min(range(len(staves)), key=lambda i: abs(y - sum(staves[i])/5))
    clef = {}
    for x, y, g in glyphs:
        if g.startswith('clefs'): clef.setdefault(staff_of(y), g)
    # piano grand staff heuristic: if exactly one clef found for two staves, the other
    # gets the opposite clef (this file's 2nd clef was hiding inside a TJ this parser
    # used to skip; fixed above, but keep the heuristic as a safety net)
    if len(staves) == 2 and len(clef) == 1:
        found_i, found_c = next(iter(clef.items()))
        other_i = 1 - found_i
        other_c = 'clefs.F' if found_c == 'clefs.G' else 'clefs.G'
        clef[other_i] = other_c

    order = sorted(range(len(staves)), key=lambda i: -staves[i][0])
    system = {s: k // 2 for k, s in enumerate(order)}

    # key signature: accidentals.sharp/flat glyphs that sit BEFORE the first notehead
    # on their staff (x less than that staff's first notehead x)
    first_notehead_x = {}
    for x, y, g in glyphs:
        if g.startswith('noteheads'):
            s = staff_of(y)
            first_notehead_x[s] = min(first_notehead_x.get(s, 1e9), x)
    key_sig = {}  # letter -> +1 (sharp) / -1 (flat), applies to the whole piece
    for x, y, g in glyphs:
        if g not in ('accidentals.sharp', 'accidentals.flat'): continue
        s = staff_of(y)
        if x >= first_notehead_x.get(s, 1e9): continue   # an inline accidental, not the key sig
        c = clef.get(s, 'clefs.G')
        half = (staves[s][4] - staves[s][0]) / 8
        dia = REF[c] + round((y - staves[s][0]) / half)
        key_sig[letter(dia)] = 1 if g == 'accidentals.sharp' else -1

    notes = []
    for x, y, g in glyphs:
        if not g.startswith('noteheads'): continue
        if x < 60 and y > staves[order[0]][4]: continue
        s = staff_of(y); c = clef.get(s, 'clefs.G')
        half = (staves[s][4] - staves[s][0]) / 8
        dia = REF[c] + round((y - staves[s][0]) / half)
        base_midi = midi(dia)
        acc = key_sig.get(letter(dia), 0)
        notes.append(dict(system=system[s], x=round(x,2), staff=s,
                          clef='treble' if c == 'clefs.G' else 'bass',
                          midi=base_midi + acc, name=name(dia) + ('#' if acc==1 else '-' if acc==-1 else '')))
    notes.sort(key=lambda n: (n['system'], n['x'], n['midi']))
    return staves, glyphs, clef, key_sig, notes

if __name__ == '__main__':
    staves, glyphs, clef, key_sig, notes = extract(sys.argv[1])
    print("staves:", len(staves), " clefs found/inferred:", clef, " key signature:", key_sig)
    ordered = sorted(notes, key=lambda n: n['midi'])
    print("noteheads:", len(notes), "| range", ordered[0]['name'], "-", ordered[-1]['name'])
    groups, cur = [], None
    for n in notes:
        if cur and n['system'] == cur['s'] and abs(n['x'] - cur['x']) < 1.5: cur['n'].append(n['name'])
        else: cur = dict(s=n['system'], x=n['x'], n=[n['name']]); groups.append(cur)
    print("\nreading order (x-position groups, treble+bass merged):")
    for gr in groups:
        print(f"  x={gr['x']:7.2f}  " + "+".join(sorted(set(gr['n']))))
    if '--json' in sys.argv:
        json.dump(notes, open(sys.argv[1].replace('.pdf', '_notes.json'), 'w'), indent=1)
