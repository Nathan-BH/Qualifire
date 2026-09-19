#!/usr/bin/env python3
"""Find transcription artifacts in an audio-to-MIDI file.

    python3 find_split_notes.py file.mid [gap_seconds]

Audio-to-MIDI models cut one held note into two consecutive notes when their pitch
confidence dips mid-note (decay, pedal, reverb). The give-away is a same-pitch pair
whose gap is at or near zero. This lists them, plus short+quiet events that are
usually reverb tails heard as new notes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_midi import parse

GAP = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25
r = parse(sys.argv[1]); N = r['notes']
by = {}
for n in N: by.setdefault(n['midi'], []).append(n)

print(f"=== same-pitch re-triggers with a gap under {GAP}s (one held note split in two) ===")
tot = 0
for m, v in sorted(by.items()):
    v.sort(key=lambda x: x['t'])
    for a, b in zip(v, v[1:]):
        gap = round(b['t'] - (a['t'] + a['d']), 3)
        if gap < GAP:
            tot += 1
            print(f"{a['name']:<4} {a['t']:6.2f}+{a['d']:.2f} -> ends {a['t']+a['d']:6.2f} | "
                  f"next starts {b['t']:6.2f}  gap {gap:+.3f}  vel {a['v']}->{b['v']}")
print("total:", tot)
faint = [n for n in N if n['d'] < 0.25 and n['v'] < 55]
print(f"\n=== short (<0.25s) and quiet (vel<55), likely reverb artifacts: {len(faint)} of {len(N)} ===")
