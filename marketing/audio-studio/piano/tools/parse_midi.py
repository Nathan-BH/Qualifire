#!/usr/bin/env python3
"""Standard MIDI file -> note list (name, start, duration, velocity). No dependencies.

    python3 parse_midi.py file.mid [--json]

Written for the cloud sandbox and Nathan's PC alike: pure stdlib, no mido, no pretty_midi.
"""
import struct, sys, json
NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

def parse(path):
    d = open(path,'rb').read()
    if d[:4] != b'MThd': raise SystemExit('not a MIDI file')
    _fmt, ntrk, div = struct.unpack('>HHH', d[8:14])
    if div & 0x8000: raise SystemExit('SMPTE timing not supported')
    def varlen(p):
        v = 0
        while True:
            b = d[p]; p += 1; v = (v << 7) | (b & 0x7f)
            if not b & 0x80: return v, p
    p, tempos, events = 14, [], []
    for _ in range(ntrk):
        if d[p:p+4] != b'MTrk': break
        end = p + 8 + struct.unpack('>I', d[p+4:p+8])[0]; p += 8
        tick, status = 0, 0
        while p < end:
            dt, p = varlen(p); tick += dt
            if d[p] & 0x80: status = d[p]; p += 1
            hi = status & 0xf0
            if status == 0xff:
                mt = d[p]; p += 1; ln, p = varlen(p)
                if mt == 0x51: tempos.append((tick, struct.unpack('>I', b'\0'+d[p:p+3])[0]))
                p += ln
            elif status in (0xf0, 0xf7):
                ln, p = varlen(p); p += ln
            elif hi in (0xc0, 0xd0): p += 1
            else:
                n, vel = d[p], d[p+1]; p += 2
                if hi == 0x90 and vel > 0: events.append((tick, 1, n, vel))
                elif hi in (0x80, 0x90):   events.append((tick, 0, n, 0))
        p = end
    tempos = sorted(tempos) or [(0, 500000)]
    def secs(tk):
        s, last, cur = 0.0, 0, tempos[0][1]
        for tt, tp in tempos:
            if tt >= tk: break
            s += (tt - last) * cur / div / 1e6; last, cur = tt, tp
        return s + (tk - last) * cur / div / 1e6
    events.sort(key=lambda e: e[0])
    open_, out = {}, []
    for tk, on, n, vel in events:
        if on: open_.setdefault(n, []).append((tk, vel))
        elif open_.get(n):
            st, v0 = open_[n].pop(0)
            out.append(dict(name=NAMES[n%12]+str(n//12-1), midi=n,
                            t=round(secs(st),3), d=round(secs(tk)-secs(st),3), v=v0))
    out.sort(key=lambda x: (x['t'], x['midi']))
    return dict(bpm=round(6e7/tempos[0][1],2), division=div, count=len(out),
                dur=round(max((n['t']+n['d'] for n in out), default=0),2), notes=out)

if __name__ == '__main__':
    r = parse(sys.argv[1])
    if '--json' in sys.argv: print(json.dumps(r, indent=1)); raise SystemExit
    print(f"{r['count']} notes, {r['dur']}s, header tempo {r['bpm']} BPM")
    for n in r['notes']:
        print(f"{n['t']:7.2f}  {n['name']:<4} dur {n['d']:5.2f}  vel {n['v']}")
