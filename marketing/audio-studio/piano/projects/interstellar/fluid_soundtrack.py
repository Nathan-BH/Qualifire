"""
Production audio for this piece, from 2026-09-19 on: renders BASS/MELODY/VOICE_A
(imported from this folder's soundtrack.py -- the Klangio-corrected note lists, the
one source of truth) through ../../fluid_render.py's FluidSynth-based sampler instead
of soundtrack.py's own pluck()/pad() Karplus-Strong synthesis. Real piano samples
(a bundled GM soundfont), not synthesized from scratch -- see NOTES.md's 2026-09-19
"why our synth sounds worse" update for the full reasoning.

CANNOT be run from Nathan's PC shell -- libfluidsynth isn't installed there (checked,
same date) and that shell's network can't reach a package registry to install it
either. This script only runs in the Cowork cloud session's Bash tool (not
device_bash). A session doing that: stage this project's soundtrack.py logic (or just
reproduce the note lists, as this script does), run this here, then commit the
resulting WAVs back over the device bridge to the paths below.

Writes (overwriting soundtrack.py's outputs -- these ARE the production files now):
    bass_only.wav, melody_only.wav, voice_a.wav, voice_e5.wav, gate_chimes_12.3s.wav

Then the scene mixes (start-ride/soundv7, gates-saving/soundv7) are built from these
exactly as soundv6 was from the pluck()/pad() versions -- same ffmpeg windowing, only
the input WAVs changed.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))  # -> audio-studio/
import fluid_render as fr
from soundtrack import BASS, MELODY, VOICE_A

DUR = 15.04
GAIN = 2.2
GATE_TIMES = [6.46, 9.15, 10.60]  # real gate-crossing times in gates-saving_v6.mp4


def _midi(freq_name, NOTES):
    import math
    return round(69 + 12 * math.log2(NOTES[freq_name] / 440.0))


def _events(notes, NOTES):
    return [(_midi(n, NOTES), s, d) for n, s, d in notes]


if __name__ == "__main__":
    from synth import NOTES

    audio, sr = fr.render(_events(BASS, NOTES), DUR, velocity=95, gain=GAIN)
    fr.write_wav("bass_only.wav", audio[: int(DUR * sr)], sr)

    audio, sr = fr.render(_events(MELODY, NOTES), DUR, velocity=105, gain=GAIN)
    fr.write_wav("melody_only.wav", audio[: int(DUR * sr)], sr)

    audio, sr = fr.render(_events(VOICE_A, NOTES), DUR, velocity=105, gain=GAIN)
    fr.write_wav("voice_a.wav", audio[: int(DUR * sr)], sr)

    voice_e5 = [t for t in MELODY if t[0] == "E5"]
    audio, sr = fr.render(_events(voice_e5, NOTES), DUR, velocity=105, gain=GAIN)
    fr.write_wav("voice_e5.wav", audio[: int(DUR * sr)], sr)

    e5_midi = _midi("E5", NOTES)
    gate_notes = [(e5_midi, t, 1.2) for t in GATE_TIMES]
    audio, sr = fr.render(gate_notes, max(GATE_TIMES) + 1.5, velocity=110, gain=GAIN)
    fr.write_wav("gate_chimes_12.3s.wav", audio, sr)

    print("wrote all 5 layers via FluidSynth")
