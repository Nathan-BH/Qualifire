"""
Bass-only and melody-only tracks for the Interstellar "Time" theme, built straight
from the clean (Muscriptor, pitch-cross-checked against Klangio) note data in
NOTES.md -- not extracted from the source WAV. Only the first ~15.04s is real; the
Kyutai MIDI's own tail past that is a hallucination (see NOTES.md's 2026-09-19
update), so it is not represented here at all.

    python3 soundtrack.py

Writes bass_only.wav and melody_only.wav next to this file (44.1kHz, mono).
Draws on the shared ../../synth.py toolkit -- no reverb (wet=0): scipy isn't
available in this shell right now (see synth.py's lazy import), and a plain pad/
pluck bed doesn't obviously need it for a first pass anyway.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
import numpy as np
import synth
from synth import NOTES, pad, pluck, mix_into, new_master, finish, SR

DUR = 15.04  # real content only -- see NOTES.md "the tail is a hallucination"

# (note, start, dur) -- straight from NOTES.md / parse_midi.py's raw output,
# used as real seconds directly (confirmed 1:1 with the WAV, no scaling)
BASS = [
    ("F2", 0.31, 3.72),
    ("G2", 4.03, 3.72),
    ("A2", 7.88, 3.81),
    ("G2", 11.84, 3.20),
]

# 2026-09-19: the raw Kyutai MIDI has a D5 grace note at t=9.97 (dur 0.05s -- an
# audible "blip" on synthesis) that Nathan flagged as wrong. Cross-checked the WHOLE
# melody line against the Klangio PDF (the independently-built, pitch-exact reference
# -- see NOTES.md) note by note: every other note matches exactly; this is the one with
# no counterpart in the PDF at all. Dropped. Klangio has no usable timing of its own
# (see NOTES.md/round-04), so everything else here still comes from the MIDI's clock --
# only this one spurious pitch is removed.
MELODY = [
    ("A4", 0.31, 0.61), ("E5", 0.92, 1.22), ("A4", 2.14, 0.64), ("E5", 2.78, 1.25),
    ("B4", 4.03, 0.62), ("E5", 4.65, 1.23), ("B4", 5.94, 0.63), ("E5", 6.61, 1.21),
    ("C5", 7.88, 0.66), ("E5", 8.57, 1.33), ("C5", 10.06, 0.58),
    ("E5", 10.68, 1.10), ("D5", 11.84, 0.62), ("E5", 12.50, 1.28), ("D5", 13.85, 0.62),
    ("E5", 14.51, 0.53),
]


def write_wav(path, x, sr=SR):
    import struct, wave
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def build_bass():
    m = new_master(DUR)
    for name, start, dur in BASS:
        clip = pad([NOTES[name]], dur, amp=0.42, attack=0.6, release=0.9)
        mix_into(m, clip, start)
    return finish(m, DUR, wet=0, soften_passes=1, peak=0.85)


def build_melody():
    m = new_master(DUR)
    for name, start, dur in MELODY:
        clip = pluck(NOTES[name], dur=max(dur, 0.35), amp=0.5, decay=0.9985, brightness=0.55)
        mix_into(m, clip, start)
    return finish(m, DUR, wet=0, soften_passes=1, peak=0.85)


# The melody line is actually two interleaved voices -- a slow-moving line that
# keeps returning to a repeated, steady E5 (Nathan's "regular interval" pulse).
# Split out per his 2026-09-19 correction: start-ride gets the moving voice only,
# gates-saving gets the E5 pulse only (re-triggered at gate-crossing times, not at
# its own original timing -- see gate_chimes() below).
VOICE_A = [
    ("A4", 0.31, 0.61), ("A4", 2.14, 0.64), ("B4", 4.03, 0.62), ("B4", 5.94, 0.63),
    ("C5", 7.88, 0.66), ("C5", 10.06, 0.58), ("D5", 11.84, 0.62),
    ("D5", 13.85, 0.62),
]
VOICE_E5 = [t for t in MELODY if t[0] == "E5"]


def build_voice_a():
    m = new_master(DUR)
    for name, start, dur in VOICE_A:
        clip = pluck(NOTES[name], dur=max(dur, 0.35), amp=0.5, decay=0.9985, brightness=0.55)
        mix_into(m, clip, start)
    return finish(m, DUR, wet=0, soften_passes=1, peak=0.85)


def build_voice_e5():
    m = new_master(DUR)
    for name, start, dur in VOICE_E5:
        clip = pluck(NOTES[name], dur=max(dur, 0.35), amp=0.5, decay=0.9985, brightness=0.55)
        mix_into(m, clip, start)
    return finish(m, DUR, wet=0, soften_passes=1, peak=0.85)


def gate_chimes(gate_times, dur=1.2, amp=0.55, total_dur=13.0):
    """E5 struck at each real gate-crossing time (not the melody's own clock) --
    the pulse re-triggered as a "gate passed" cue instead of the video being
    retimed to match the melody's fixed timing."""
    m = new_master(total_dur)
    for t in gate_times:
        clip = pluck(NOTES["E5"], dur=dur, amp=amp, decay=0.9985, brightness=0.6)
        mix_into(m, clip, t)
    return finish(m, total_dur, wet=0, soften_passes=1, peak=0.85)


if __name__ == "__main__":
    here = os.path.dirname(__file__)
    bass = build_bass()
    melody = build_melody()
    voice_a = build_voice_a()
    voice_e5 = build_voice_e5()
    write_wav(os.path.join(here, "bass_only.wav"), bass)
    write_wav(os.path.join(here, "melody_only.wav"), melody)
    write_wav(os.path.join(here, "voice_a.wav"), voice_a)
    write_wav(os.path.join(here, "voice_e5.wav"), voice_e5)
    print(f"wrote bass_only ({len(bass)/SR:.2f}s) melody_only ({len(melody)/SR:.2f}s) "
          f"voice_a ({len(voice_a)/SR:.2f}s) voice_e5 ({len(voice_e5)/SR:.2f}s)")
