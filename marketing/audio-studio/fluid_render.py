"""
Sample-based piano rendering via FluidSynth, for realistic (non-procedural) piano
audio -- an alternative to this toolkit's synth.py pluck()/pad() (Karplus-Strong
physical modelling, from scratch, sounds noticeably more "synthetic").

Why this exists: midiviewer.io and Klang.io's own preview both play back real
recorded piano samples (Salamander Grand Piano, most of that ecosystem). We could
not fetch those samples from this project's usual shells -- raw.githubusercontent.com/
unpkg.com/jsdelivr.net are all blocked by both the Cowork cloud sandbox's proxy AND
Nathan's own PC shell's proxy (checked both, 2026-09-19). What IS available: the
Cowork cloud sandbox already ships libfluidsynth3 plus a real (if modest -- MuseScore-
era "TimGM6mb", ~6MB) General MIDI soundfont on disk. Same underlying idea (sampled
piano, not synthesized), smaller sample set than Salamander.

CANNOT run on Nathan's PC shell -- libfluidsynth isn't installed there and can't be
(no network reach to apt/pip from that shell either, confirmed same date). This module
only runs in the Cowork cloud session's Bash tool. A script using it renders there,
writes to /mnt/user-data/outputs/, and the results get committed back into the repo
on Nathan's PC -- the code lives here for the record, not because it's runnable
in-place. See piano/projects/interstellar/NOTES.md's 2026-09-19 update for the full
investigation, and interstellar/get_salamander_samples.ps1 for a path to the real
Salamander-quality samples if Nathan wants to fetch them himself (his own machine's
normal internet, not this shell, can likely reach them).

    import fluid_render
    audio, sr = fluid_render.render([(69, 0.0, 1.0), (72, 0.5, 1.0)], dur_s=2.0)
    fluid_render.write_wav("out.wav", audio, sr)

notes: list of (midi_number, start_seconds, duration_seconds). velocity/gain are
render-wide (call once per "voice" -- bass, melody, etc, matching how synth.py's
pad()/pluck() calls are typically one voice at a time too).
"""
import ctypes as C
import numpy as np
import wave

SF2 = "/usr/share/sounds/sf2/TimGM6mb.sf2"  # bundled GM soundfont; program 0 = Acoustic Grand Piano
SR = 44100

LIB = None


def _lib():
    global LIB
    if LIB is None:
        LIB = C.CDLL("libfluidsynth.so.3")
        LIB.new_fluid_settings.restype = C.c_void_p
        LIB.new_fluid_synth.restype = C.c_void_p
        LIB.new_fluid_synth.argtypes = [C.c_void_p]
        LIB.fluid_settings_setnum.argtypes = [C.c_void_p, C.c_char_p, C.c_double]
        LIB.fluid_synth_sfload.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
        LIB.fluid_synth_sfload.restype = C.c_int
        LIB.fluid_synth_program_select.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int, C.c_int]
        LIB.fluid_synth_noteon.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int]
        LIB.fluid_synth_noteoff.argtypes = [C.c_void_p, C.c_int, C.c_int]
        LIB.fluid_synth_write_s16.argtypes = [C.c_void_p, C.c_int, C.c_void_p, C.c_int, C.c_int, C.c_void_p, C.c_int, C.c_int]
    return LIB


def render(notes, dur_s, channel=0, velocity=100, gain=2.2, sf2=SF2, sr=SR):
    """notes: [(midi_num, start_s, dur_s), ...]. Returns (float32 mono array, sr)."""
    lib = _lib()
    settings = lib.new_fluid_settings()
    lib.fluid_settings_setnum(settings, b"synth.sample-rate", float(sr))
    lib.fluid_settings_setnum(settings, b"synth.gain", gain)
    synth = lib.new_fluid_synth(settings)
    sfid = lib.fluid_synth_sfload(synth, sf2.encode(), 1)
    assert sfid >= 0, f"failed to load soundfont: {sf2}"
    lib.fluid_synth_program_select(synth, channel, sfid, 0, 0)

    n_total = int((dur_s + 2.0) * sr)  # pad for natural piano decay past the last note
    out = np.zeros(n_total, dtype=np.int16)

    events = []
    for midi_num, start, note_dur in notes:
        events.append((int(round(start * sr)), "on", midi_num))
        events.append((int(round((start + note_dur) * sr)), "off", midi_num))
    events.sort(key=lambda e: (e[0], 0 if e[1] == "off" else 1))

    block = 64
    buf = (C.c_int16 * (block * 2))()
    pos = 0
    ei = 0
    while pos < n_total:
        this_block = min(block, n_total - pos)
        while ei < len(events) and events[ei][0] <= pos:
            _, kind, midi_num = events[ei]
            if kind == "on":
                lib.fluid_synth_noteon(synth, channel, midi_num, velocity)
            else:
                lib.fluid_synth_noteoff(synth, channel, midi_num)
            ei += 1
        lib.fluid_synth_write_s16(synth, this_block, buf, 0, 2, buf, 1, 2)
        arr = np.frombuffer(buf, dtype=np.int16)[: this_block * 2]
        out[pos : pos + this_block] = arr[0::2][:this_block]
        pos += this_block

    return out.astype(np.float32) / 32768.0, sr


def write_wav(path, x, sr=SR):
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())
