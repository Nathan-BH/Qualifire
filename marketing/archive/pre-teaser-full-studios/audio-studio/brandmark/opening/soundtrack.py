"""
brandmark/opening - soundv3 (cycle 16): Nathan's real piano logo track carries
the whole scene. Nothing is synthesised any more.

Source video: ../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4
(6.5 s, 1920x1080, 30 fps, no audio - unchanged since soundv1; this round only
touches the audio).
Visual: ring draws clockwise (0-1.3 s) -> yellow slash/gate fades in (1.3-1.8)
-> full mark fades out (2.15-2.6) -> empty frame -> "QUALIFIRE" wordmark fades
in (2.95-3.75) -> tagline "Same road. New meaning." (3.35-4.05, overlapping)
-> hold -> fade to black (5.5-6.3), hard end 6.5.

Track: ../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3
(Nathan, 2026-09-23: "use the tunetank-piano-logo mp3 for the opening render.
If applied correctly, which I think is just starting the two at the same time,
it is an exact perfect match. The audio file runs a bit longer but at that point
it is already silent"). 8.438 s, 44.1 kHz, genuinely stereo (L/R correlation
0.06). Measured on Nathan's PC (ffmpeg decode, numpy): near-silent head, first
attack (the opening D-major chord) at 0.668 s, a rising arpeggio through
1.0-1.7 s, re-struck D5+D6 pairs at 2.125 / 2.928 / 3.253 s, then only decay -
50 ms RMS -31 dBFS at 5.1 s, -38 at 5.95, -44 at 6.3, -49 at 6.45; the last
sample above -40 dBFS is at 6.61 s and the container runs to 8.44 s.
Peak 0.9997 (-0.00 dBFS, left channel, brickwall-limited: 536 samples above
0.891) - the mono-average figure in the piano project's WAVEFORM-NOTES.md
(-0.58 dBFS) understates the stereo peak, hence GAIN below.

Placement (marketing/cycles/16_ride-tunetank-soundtrack/
BRIEF-tunetank-piano-logo-opening.md): the file's t = 0 on the video's t = 0,
exactly as Nathan lined it up by hand - no offset, no trim. That puts the first
chord at 0.668 s, halfway through the ring draw; the arpeggio across the ring's
completion and the slash (1.3-1.8); a re-strike 25 ms before the mark starts to
fade (2.15); and the last two re-strikes 22 ms before the wordmark (2.95) and
97 ms before the tagline (3.35) - the two text beats are punctuated by the
piece's own final two attacks, which is the "exact perfect match" he heard.
The decay then carries the hold (3.55-5.5) and is at -35..-44 dBFS under the
fade to black; the video ends 1.94 s before the file does, in the file's tail.

GAIN 0.85 puts the stereo peak at 0.8497 (-1.41 dBFS), under the audio-studio
ceiling of -1 dBFS (0.891) with 0.4 dB to spare; 0.89 is the maximum. A 0.5 s
linear fade into the hard end (6.0-6.5 s) only guarantees the last sample is 0:
the file is at -43 dBFS there and the picture has been black since 6.3 s, so
nothing Nathan heard is changed (a hard cut would leave a -39 dBFS click).
Stereo out; nothing passes through synth.finish() (no reverb, no soften - the
recording is already produced), and nothing here imports synth.py or scipy, so
this file rebuilds on Nathan's PC as is.

The synthesised soundv2 build (ring-draw sweep, gate swoosh, C2 pads, the
sub_hit + chime BRAND_STINGER, C3/G3 pad, trailing plucks) is not carried
forward and is recoverable from git history (this file at soundv2, built
2026-09-13). An earlier plan (cycle 15, cancelled by Nathan on 2026-09-23,
never executed) would have put his logo-reveal sample on the two text beats
with the synthesised bed kept; it is not part of this round - see the cycle 16
README. Closing is untouched by this file and this track does not fit it
(the file is still at -19 dBFS when closing's 4.0 s end cuts it).

    cd marketing/audio-studio/brandmark/opening
    python3 soundtrack.py         # -> soundv3/soundtrack_v3.wav
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", ".."))  # -> audio-studio/ (window_mix)

import window_mix as wm

SR = 44100
DURATION = 6.5
TRACK = os.path.join(HERE, "..", "..", "piano", "projects", "tunetank", "sources",
                     "tunetank-piano-logo-484286.mp3")

T0 = 0.0            # file t=0 on video t=0 - Nathan's "just starting the two at the same time"
GAIN = 0.85         # stereo peak 0.9997 -> 0.8497 (-1.41 dBFS); 0.89 is the -1 dBFS ceiling
END_FADE = 0.5      # linear fade over the last 0.5 s (6.0-6.5), so the hard end is a true 0


def dbfs(x):
    return 20 * math.log10(x + 1e-12)


def decode_stereo(path, sr=SR):
    """ffmpeg -> float64 stereo (n, 2) at sr, straight from stdout as raw float32.
    No downmix: -ac 1 would sum L+R at -3 dB each and misreport the peak."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"],
        check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def write_wav_stereo(path, x, sr=SR):
    """x: (n, 2) float in [-1, 1] -> 16-bit interleaved stereo WAV (stdlib wave)."""
    pcm = (np.clip(x, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(np.ascontiguousarray(pcm).tobytes())


def build():
    n = int(round(DURATION * SR))
    track = decode_stereo(TRACK)
    m = np.zeros((n, 2), dtype=np.float64)
    for ch in range(2):
        wm.place(m[:, ch], track[:, ch], T0, gain=GAIN, sr=SR)
        wm.fade_out(m[:, ch], DURATION, END_FADE, sr=SR)
    return m, track


if __name__ == "__main__":
    audio, track = build()
    print("track: %d frames (%.4f s), stereo peak %.4f (%.2f dBFS)" % (
        len(track), len(track) / SR, np.abs(track).max(), dbfs(np.abs(track).max())))
    os.makedirs(os.path.join(HERE, "soundv3"), exist_ok=True)
    out = os.path.join(HERE, "soundv3", "soundtrack_v3.wav")
    write_wav_stereo(out, audio)
    peak = float(np.abs(audio).max())
    print("wrote soundv3/soundtrack_v3.wav: %.4f s, %d ch, peak %.4f (%.2f dBFS), last sample %.6f" % (
        len(audio) / SR, audio.shape[1], peak, dbfs(peak), float(np.abs(audio[-1]).max())))
