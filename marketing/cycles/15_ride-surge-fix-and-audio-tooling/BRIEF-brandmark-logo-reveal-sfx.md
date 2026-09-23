# BRIEF — brandmark/opening + brandmark/closing: the real logo-reveal sound on the two-step text reveal

**Status: ready to execute (2026-09-23, Plan tier, Fable).** Sonnet-executable: anchored
Python edits in three files (`synth.py`, `brandmark/opening/soundtrack.py`,
`brandmark/closing/soundtrack.py`), one new module (`brandmark/logo_reveal.py`), two
rebuilds, two muxes, round docs. **Runs on Nathan's PC through `device_bash`** (the
project is mounted at `$HOME/mnt/Qualifire`), not in the cloud sandbox: the mp3, ffmpeg
and the silent renders are there, and the WAV/mp4 outputs must land there. Nathan's PC
shell has python3 + numpy 2.2.6 + ffmpeg and **no scipy** — every command below was
dry-run on it at Plan time from a scratch mirror of the files (nothing in the repo was
executed or written). Stop-on-ambiguity applies — every anchor is quoted verbatim from
disk on 2026-09-23 (`synth.py` mtime 2026-09-19 18:52 UTC, `opening/soundtrack.py`
2026-09-13 22:08 UTC, `closing/soundtrack.py` 2026-09-14 07:19 UTC). Self-contained:
independent of this cycle's ride/surge items — execute in any order relative to them.

## 0. What this is, in one paragraph

Nathan found the sound he wants for the two-beat "QUALIFIRE" wordmark + tagline reveal
and wants it used **verbatim, not synthesised**: "the exact sound... a simple 2 notes
sound which fits perfectly with the two step animation of the qualifire text + slogan...
the same exact sound should also be used for closing as it is the same animation." The
file is already in the repo (untracked): `marketing/audio-studio/brandmark/sfx/logo-reveal.mp3`
(99 474 bytes; from `universfield-logo-reveal-199582.mp3`). This brief drops the
synthesised two-beat `BRAND_STINGER` (`sub_hit` + `chime`) from both scenes' soundv2 and
places the sample instead, dry and in stereo, with its first hit exactly on the
wordmark tween in each scene (2.95 s opening, 0.15 s closing); its second, softer chime
then lands 0.291 s later, 0.109 s ahead of the tagline in both (§2.2). Everything else
in both soundtracks (opening's ring-draw sweep and gate swoosh, both pads, opening's
trailing plucks) is unchanged. The placement code is shared (`brandmark/logo_reveal.py`)
so the two scenes cannot drift apart. Along the way `synth.py` gains a pure-numpy
fallback for its reverb so every `soundtrack.py` can now be rebuilt on Nathan's PC (§1.3).

## 1. Facts this brief rests on (measured on Nathan's PC at Plan time)

### 1.1 The sample — `brandmark/sfx/logo-reveal.mp3`

| | value |
|---|---|
| decode | ffmpeg → 44 100 Hz, **2 channels**, 137 088 frames = **3.1086 s** |
| channels | genuinely stereo: L/R correlation −0.03, max abs(L−R) 0.51; peak L 0.3572 / R 0.3270 (**−8.9 dBFS**); a mono fold-down peaks at only 0.229 (−12.8 dBFS) — 3.9 dB of cancellation |
| head | digital zeros to 0.1437 s; sub-LSB noise to 0.194 s; **first sample above −60 dBFS at 0.1940 s = the attack of hit 1**, first sample above 0.01 (×2.2) at 0.19411 s, peak of the hit at 0.2021 s |
| hit 2 | a softer second chime riding on hit 1's decay: 2 ms RMS jumps −31.7 → −24.8 → −22.7 dB at **0.484–0.486 s**; taken as **0.485 s**. Inter-onset gap **0.291 s** |
| tail | above −60 dBFS until **2.367 s** (−80 dBFS until 2.415 s); last non-zero sample 2.479 s; the final 0.63 s of the container are digital zeros |

So both notes are inside the first second, as Nathan believed (0.194 / 0.485).

### 1.2 The two animations (unchanged by this brief — `index.html` is not touched)

| scene | file | wordmark tween start | tagline tween start | end | silent render |
|---|---|---|---|---|---|
| opening | `silent-studio/brandmark/opening/index.html` lines 95–96 | **2.95** | **3.35** (+0.40) | 6.5 (fade 5.50–6.50) | `silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4` (6.500 s, 1920×1080, 30 fps, no audio) |
| closing | `silent-studio/brandmark/closing/index.html` lines 74–75 | **0.15** | **0.55** (+0.40) | 4.0 (fade 3.20–4.00) | `silent-studio/brandmark/closing/rounds/v4/closing_v4.mp4` (4.000 s, 1920×1080, 30 fps, no audio) |

Note closing's current visual is **v4** (opening's second part reused as the outro);
`closing/soundtrack.py`'s docstring, `closing/AUDIO-BRIEF.md` and `closing/soundv2/`
still describe the old v3 "mark fades/scales up" visual. That staleness is corrected
where this brief touches those files (§3.4, §5); the round is built against `closing_v4.mp4`.

### 1.3 The tooling fact that shapes the edits: no scipy on Nathan's PC

Both `soundtrack.py`s end with `finish(m, DURATION, wet=0.3, soften_passes=1)`, and
`synth.reverb()` → `comb()`/`allpass()` use `scipy.signal.lfilter`; `comb()` raises
`RuntimeError("scipy not available here …")` when scipy is missing. Their `__main__`
blocks also write through `scipy.io.wavfile`. Neither runs on Nathan's PC today (the
soundv2s were built in the cloud sandbox). This brief fixes both at the root, in the
smallest way: `comb()`/`allpass()` fall back to a pure-numpy block recursion
(`_comb_np`/`_allpass_np`, §3.1) that is **bit-identical** to the lfilter path (verified
in the cloud sandbox with scipy 1.17.1: max |diff| = 0.0 on 7 s of noise at every delay
`reverb()` uses — 1309/1636/1812/1927/220/74 samples — and faster: 3 ms vs 400 ms per
comb), and the two `__main__`s write WAVs with the stdlib `wave` module. The scipy path
is left in place for shells that have it; output is the same either way.

## 2. Design decisions (each one a ruling; the open ones are also in `questionsfornathan.md`)

### 2.1 Replace, don't layer

The sample **replaces** `sub_hit(BRAND_STINGER_LOW…)` + `chime(BRAND_STINGER_HIGH…)` in
both scenes. Nathan asked for "the exact sound"; layering the synth boom/ring under it
would change what it sounds like. `BRAND_STINGER_LOW/HIGH` stay defined in `synth.py`
(nothing else is edited there) — they are simply no longer imported by these two files.

### 2.2 Sync hit 1 to the wordmark exactly; accept hit 2 early — the numbers

The file's gap between its two notes (0.291 s) is shorter than the animation's gap
between wordmark and tagline (0.40 s), so both cannot land. **Hit 1 is placed exactly**:
it is the loud, sharp attack (−8.9 dBFS peak, from silence) against the first thing to
appear after black — the one alignment anyone will hear. Hit 2 is a subtle chime 13 dB
down riding on hit 1's tail, against a 0.7 s `power2.out` fade whose "moment" is soft.

| scene | sample starts at | hit 1 (attack) | wordmark | hit 2 | tagline | hit-2 drift |
|---|---|---|---|---|---|---|
| opening | `2.95 − 0.194 = 2.756` | 2.950 | 2.95 | 3.241 | 3.35 | **−0.109 s** (early) |
| closing | `0.15 − 0.194 = −0.044` | 0.150 | 0.15 | 0.441 | 0.55 | **−0.109 s** (early) |

Identical drift in both scenes because both animations use the same +0.40 s offset. For
scale: the ITU BT.1359 detectability threshold for audio *leading* video is ≈45 ms, so
109 ms early on the tagline is detectable in principle; whether it *reads* wrong on a
soft fade is Nathan's call (Q4: the alternatives are a 40 ms compromise nudge — hit 1
40 ms late, below the 125 ms lag threshold; hit 2 69 ms early — or, the only way to get
both exact, moving the tagline tween to +0.291 s in both `index.html`s and re-rendering).
Default: as in the table. The constant is one number per scene (`WORDMARK_T − HIT1`).

### 2.3 Closing's negative start: skip the file's silent head, don't clamp to 0

The ideal start is −0.044 s. Two options: (a) start the file at 0.0 — hit 1 then lands
at 0.194, **44 ms late** (1.3 frames) on the wordmark, and hit 2 at 0.485, 65 ms early;
(b) start it at −0.044 by skipping its first 0.044 s. **(b)**, because those 0.044 s are
*digital zeros* — the file's first non-zero sample is at 0.1437 s and the attack at
0.194 s — so nothing audible is dropped and the sample is still played verbatim.
`place_sfx()` (§3.2) implements negative `at_s` generically as "skip the head".

### 2.4 Keep the rest of both beds

- Opening's ring-draw sweep + gate swoosh (0.0–1.8 s) and the two C2 pads: a different
  moment entirely — untouched.
- Opening's C3/G3 pad at 3.35 s (amp 0.09) and its three trailing plucks from 5.0 s:
  kept, byte-identical. The pad sits ≈18 dB under the sample's peak and carries the
  4.05–5.5 s hold after the sample's tail (audible until 5.12 s) dies; the plucks
  carry the fade. One change at a time — the ask was about the two beats. Dropping the
  pad for a bare, Netflix-like sting is a one-line removal if Nathan prefers (Q5).
- Closing's C3/G3/C4 pad at 0.35 s: kept, byte-identical, for the same reason (the
  sample is audible until 2.32 s; the pad rings to the 3.2 s fade).
- Neither pad is re-anchored to hit 2 (0.35 → 0.441 would move a 0.5–0.6 s attack pad
  by 90 ms: inaudible, and it would break "byte-identical").

### 2.5 The sample does not go through `finish()`

`finish()` runs `soften()` (a 3-point moving-average low-pass) and a Schroeder reverb
(wet 0.3) over the whole master. Applied to an already-produced sound they would dull
its top end and add a second room — not "the exact sound". So each scene **finishes its
synthesised bed exactly as before**, widens it to stereo (`to_stereo`), then adds the
sample **dry** on top (`place_sfx`) and returns that. `finish()`'s peak limiter (0.9)
therefore only ever sees the bed; the master's peak is checked in §6 instead.

### 2.6 Stereo out

The file is genuinely stereo (§1.1) and folding it to mono changes it (−3.9 dB peak,
partial cancellation). The soundtrack WAV therefore becomes **stereo**: the bed in both
channels, the sample as-is. The mux command is unchanged (`-c:a aac` takes 2 channels;
dry-run: `channels=2` in the muxed mp4). First stereo WAV in audio-studio — noted in the
round docs. `salamander_render.write_wav` is mono, hence the new `write_wav_stereo`.

### 2.7 Gain 2.2 (sample peak −2.1 dBFS in the mix)

The old synth stinger peaked at 0.900 (`finish()`'s limiter). Master convention: peak
≤ −1 dBFS (0.891). Measured on the real beds (dry-run, both scenes):

| `GAIN` | sample peak alone | opening master peak | closing master peak | sample-window RMS vs ring-draw RMS (opening) |
|---|---|---|---|---|
| 2.0 | 0.714 (−2.9 dBFS) | 0.714 | 0.714 | −20.4 dB vs −20.2 dB |
| **2.2** | **0.786 (−2.1 dBFS)** | **0.774** | **0.786** | **−19.6 dB vs −20.2 dB** |
| 2.4 | 0.857 (−1.3 dBFS) | 0.857 | 0.857 | −19.0 dB |
| 2.5 | 0.893 (−1.0 dBFS) | 0.893 | 0.893 | over the ceiling |

**2.2**: the sting is the loudest thing in either clip by 8 dB of peak over opening's
ring-draw (0.307), with 1.1 dB left under the ceiling; 2.4 is the maximum that keeps
−1 dBFS. (Its 2.3 s decay makes the window RMS look modest next to the sweep; the attack
is what is heard.) One constant, `GAIN`, in `logo_reveal.py`.

### 2.8 Trailing silence: not trimmed

The whole file is placed (opening: ends 5.865 s < 6.5; closing: 3.065 s < 4.0); its
0.63 s of trailing zeros add nothing and trimming would buy nothing. `place_sfx` clips
to the master length like `mix_into`/`place`, so this is safe in any future scene too.

## 3. The edits

Line numbers are the pre-edit files'. Every anchor must be found **exactly once**;
otherwise stop and report.

### 3.1 `marketing/audio-studio/synth.py` — three edits (310 lines pre-edit)

**Edit S1 — line 17**, anchor (inside the `except ImportError:` at lines 14–17):
```python
    lfilter = None  # reverb()/comb()/allpass() unavailable until scipy installs; rest of this file is pure numpy
```
replace with:
```python
    lfilter = None  # no scipy (Nathan's PC shell): comb()/allpass() fall back to the bit-identical pure-numpy _comb_np/_allpass_np below (cycle 15)
```

**Edit S2 — lines 152–154**, anchor:
```python
def comb(x, delay, fb):
    if lfilter is None:
        raise RuntimeError("scipy not available here - pass wet=0 to finish()/skip reverb()")
```
replace with:
```python
def comb(x, delay, fb):
    if lfilter is None:
        return _comb_np(x, delay, fb)
```

**Edit S3 — line 161**, anchor (the `def allpass` line and the line after it):
```python
def allpass(x, delay, fb=0.7):
    b = np.zeros(delay + 1)
```
replace with (the two helpers are inserted *above* `allpass`, which gains its guard):
```python
def _comb_np(x, delay, fb):
    """Pure-numpy comb (y[n] = x[n] + fb*y[n-delay]) for shells without scipy
    (Nathan's PC). Block recursion: every block of `delay` samples depends only
    on the previous block, so it is exact -- bit-identical to the lfilter path
    (max abs diff 0.0 on 7 s of noise at every delay reverb() uses) and faster."""
    y = np.array(x, dtype=np.float64, copy=True)
    for s in range(delay, len(y), delay):
        e = min(s + delay, len(y))
        y[s:e] += fb * y[s - delay:e - delay]
    return y


def _allpass_np(x, delay, fb=0.7):
    """Pure-numpy Schroeder allpass (y[n] = -fb*x[n] + x[n-delay] + fb*y[n-delay]),
    same block recursion as _comb_np; bit-identical to the lfilter path."""
    x = np.asarray(x, dtype=np.float64)
    y = -fb * x
    for s in range(delay, len(y), delay):
        e = min(s + delay, len(y))
        y[s:e] += x[s - delay:e - delay] + fb * y[s - delay:e - delay]
    return y


def allpass(x, delay, fb=0.7):
    if lfilter is None:
        return _allpass_np(x, delay, fb)
    b = np.zeros(delay + 1)
```
Nothing else in `synth.py` changes (`reverb()`, `finish()`, `BRAND_STINGER_*`, every
generator). Post-edit the file is 335 lines. Every other scene's `soundtrack.py` is
unaffected on a shell with scipy (same code path) and newly *runnable* on one without.

### 3.2 New file `marketing/audio-studio/brandmark/logo_reveal.py` — verbatim

Stop trigger if the path already exists. Content, exactly:

```python
"""
brandmark/logo_reveal.py - the one real (recorded, not synthesised) sound in the
brandmark scenes: Nathan's pick for the two-step "QUALIFIRE" wordmark + tagline
reveal, used verbatim by BOTH ../opening/soundtrack.py and ../closing/soundtrack.py
("the same exact sound should also be used for closing as it is the same animation").

File: sfx/logo-reveal.mp3 (from universfield-logo-reveal-199582.mp3, Nathan,
2026-09-23). 44.1 kHz, stereo, 3.109 s. Measured on Nathan's PC (ffmpeg decode,
numpy): digital silence until 0.144 s, first sample above -60 dBFS at 0.194 s =
the attack of hit 1 (peak 0.202 s); a softer second chime rides on hit 1's tail
at 0.485 s = hit 2; audible (-60 dBFS) tail ends 2.367 s; the last 0.63 s of the
file are digital zeros. Peak 0.357 (-8.9 dBFS, left channel).

Everything that must be identical in the two scenes lives here once: the file,
the two onset offsets, the gain, the placement rule. A scene calls
`place_sfx(stereo_master, load_sfx(), WORDMARK_T - HIT1)` so that hit 1 lands
exactly on its wordmark tween start; hit 2 then lands HIT2 - HIT1 = 0.291 s
later, which is 0.109 s ahead of the tagline tween (0.40 s after the wordmark
in both scenes) - the file's own spacing, accepted as-is, see
marketing/cycles/15_ride-surge-fix-and-audio-tooling/BRIEF-brandmark-logo-reveal-sfx.md.

The sample is NOT passed through synth.finish() (its soften() low-pass and the
Schroeder reverb would colour a sound that is already produced): the scene builds
and finishes its synthesised bed as before, widens it to stereo with to_stereo(),
then adds the sample dry with place_sfx(). Stereo is kept because the file is
genuinely stereo (L/R correlation -0.03; a mono fold-down loses 3.9 dB of peak
and changes its character). Pure numpy + stdlib + ffmpeg subprocess; no scipy.
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
SFX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sfx", "logo-reveal.mp3")
HIT1 = 0.194   # s into the file: first sample above -60 dBFS = the attack of hit 1
HIT2 = 0.485   # s into the file: onset of the softer second chime
GAIN = 2.2     # 0.357 * 2.2 = 0.786 peak = -2.1 dBFS in the mix; 2.4 is the ceiling that keeps the master under -1 dBFS


def load_sfx(sr=SR):
    """Decode sfx/logo-reveal.mp3 with ffmpeg to a float64 (n, 2) array at `sr` Hz,
    straight from ffmpeg's stdout as raw float32 - no temp file, no 16-bit requantise."""
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", SFX_PATH, "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(out, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def to_stereo(mono):
    """(n,) -> (n, 2), the same signal in both channels."""
    return np.stack([mono, mono], axis=1)


def place_sfx(stereo_master, sfx, at_s, gain=GAIN, sr=SR):
    """Add `gain * sfx` into the (n, 2) master starting at `at_s` seconds, in place.
    A negative `at_s` skips the head of the sample instead (used by closing, where
    the wordmark is at 0.15 s and the file's attack is at 0.194 s: the 0.044 s
    skipped are digital zeros - the file's first non-zero sample is at 0.144 s).
    Clips the tail to whatever fits, like synth.mix_into / window_mix.place."""
    start = int(round(at_s * sr))
    skip = 0
    if start < 0:
        skip, start = -start, 0
    end = min(start + len(sfx) - skip, len(stereo_master))
    if end > start:
        stereo_master[start:end] += gain * sfx[skip:skip + (end - start)]
    return stereo_master


def write_wav_stereo(path, x, sr=SR):
    """(n, 2) float in [-1, 1] -> 16-bit stereo WAV (stdlib wave, no scipy)."""
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def report(x, sr=SR):
    """One line of numbers for the round doc: duration, channels, peak."""
    peak = float(np.max(np.abs(x)))
    return "%.4f s, %d ch, peak %.4f (%.2f dBFS)" % (len(x) / sr, x.shape[1], peak, 20 * np.log10(max(peak, 1e-12)))
```

### 3.3 `marketing/audio-studio/brandmark/opening/soundtrack.py` — six edits (77 lines pre-edit)

**Edit O1 — line 2**, anchor `brandmark/opening - soundv2` → `brandmark/opening - soundv3`.

**Edit O2 — lines 23–24** (the docstring's last line and the closing quotes), anchor:
```python
   in full, so both ends of the video use the identical brand sound.
"""
```
replace with:
```python
   in full, so both ends of the video use the identical brand sound.

soundv3 (cycle 15): the two-beat reveal is no longer synthesised. Nathan found
the exact sound he wants - ../sfx/logo-reveal.mp3, a real two-note logo reveal
("a simple 2 notes sound which fits perfectly with the two step animation of
the qualifire text + slogan") - and it is placed verbatim (dry, stereo, added
after finish() so the bed's soften/reverb never touch it) with its first hit
exactly on the wordmark at 2.95s; its second, softer chime then falls at
3.241s, 0.109s before the tagline's 3.35s - the file's own spacing, kept as-is.
The sub_hit + chime BRAND_STINGER pair is gone; everything else (ring-draw
sweep, gate swoosh, pads, trailing plucks) is unchanged. All placement code is
shared with ../closing/ through ../logo_reveal.py, so both ends of the video
use the identical sound by construction. Output is now a stereo WAV.
"""
```

**Edit O3 — lines 25–32**, anchor:
```python
import sys
sys.path.insert(0, "../..")
from synth import (
    SR, new_master, mix_into, finish, pad, chime, whoosh, pluck, sweep, sub_hit,
    NOTES, BRAND_STINGER_LOW, BRAND_STINGER_HIGH,
)

DURATION = 6.5
```
replace with:
```python
import sys
sys.path.insert(0, "../..")
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, whoosh, pluck, sweep,
    NOTES,
)
from logo_reveal import load_sfx, to_stereo, place_sfx, write_wav_stereo, report, HIT1

DURATION = 6.5
WORDMARK_T = 2.95   # index.html: '#wordmark .word' tween start; the tagline follows at 3.35
```

**Edit O4 — lines 53–59** (the stinger comment, its two `mix_into` lines and the blank
line after them), anchor:
```python
    # ~2.95s / ~3.35s: the brand stinger, exactly two beats, one per text
    # element (wordmark, then tagline) - replaces the old rise+land chime
    # pair per Nathan's "only a two-beat sound, similarly to the Netflix
    # sound, because only two things are being shown right after each other."
    mix_into(m, sub_hit(BRAND_STINGER_LOW, dur=1.3, amp=0.55), 2.95)
    mix_into(m, chime(BRAND_STINGER_HIGH, dur=1.6, amp=0.4, stagger=0.09), 3.35)

```
replace with:
```python
    # ~2.95s / ~3.35s: the two-beat text reveal is the real logo-reveal sample,
    # added after finish() below (soundv3) - nothing synthesised here any more.

```
(lines 42–51 — the ring-draw sweep, the swoosh, both C2 pads — and lines 60–67 — the
C3/G3 pad at 3.35 and the plucks — stay byte-identical.)

**Edit O5 — line 69**, anchor:
```python
    return finish(m, DURATION, wet=0.3, soften_passes=1)
```
replace with:
```python
    bed = finish(m, DURATION, wet=0.3, soften_passes=1)

    # The real two-note logo reveal (soundv3): dry, stereo, on top of the finished
    # bed, hit 1 exactly on the wordmark. Its hit 2 lands 0.291s later (3.241s).
    out = to_stereo(bed)
    place_sfx(out, load_sfx(), WORDMARK_T - HIT1)
    return out
```

**Edit O6 — lines 72–77** (the whole `__main__` block), anchor:
```python
if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
```
replace with:
```python
if __name__ == "__main__":
    import os
    audio = build()
    os.makedirs("soundv3", exist_ok=True)
    write_wav_stereo("soundv3/soundtrack_v3.wav", audio, SR)
    print("wrote soundv3/soundtrack_v3.wav:", report(audio, SR))
```

### 3.4 `marketing/audio-studio/brandmark/closing/soundtrack.py` — six edits (55 lines pre-edit)

**Edit C1 — line 2**, anchor `brandmark/closing - soundv2` → `brandmark/closing - soundv3`.

**Edit C2 — lines 22–23**, anchor:
```python
0.35s later), so it plays out fully rather than being cut down for the close.
"""
```
replace with:
```python
0.35s later), so it plays out fully rather than being cut down for the close.

soundv3 (cycle 15): built against closing_v4.mp4 (4.0s; visual v4 = opening's
second part reused as the outro: "QUALIFIRE" wordmark tween at 0.15s, tagline
at 0.55s, hold, fade to black 3.20-4.00s - the mark fade/scale described above
no longer exists). The two-beat reveal is no longer synthesised: Nathan's real
two-note logo reveal, ../sfx/logo-reveal.mp3, is placed verbatim through
../logo_reveal.py exactly as ../opening/ does it ("the same exact sound should
also be used for closing as it is the same animation"), hit 1 on the wordmark
at 0.15s. Because the file's attack sits 0.194s in, that means starting the
file at -0.044s: place_sfx() skips those 0.044s, which are digital zeros in the
file (its first non-zero sample is at 0.144s), so nothing audible is lost. Hit 2
then falls at 0.441s, 0.109s before the tagline. The sub_hit + chime pair is
gone; the sustained pad is unchanged. Output is now a stereo WAV.
"""
```

**Edit C3 — lines 24–31**, anchor:
```python
import sys
sys.path.insert(0, "../..")
from synth import (
    SR, new_master, mix_into, finish, pad, chime, sub_hit,
    NOTES, BRAND_STINGER_LOW, BRAND_STINGER_HIGH,
)

DURATION = 4.0
```
replace with:
```python
import sys
sys.path.insert(0, "../..")
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad,
    NOTES,
)
from logo_reveal import load_sfx, to_stereo, place_sfx, write_wav_stereo, report, HIT1

DURATION = 4.0
WORDMARK_T = 0.15   # index.html: '#wordmark .word' tween start; the tagline follows at 0.55
```

**Edit C4 — lines 37–41** (comment, two `mix_into` lines, blank line), anchor:
```python
    # 0.0s / 0.35s: the same two-beat brand stinger from brandmark/opening,
    # played in full this time (soundv1 only used the quiet landing half).
    mix_into(m, sub_hit(BRAND_STINGER_LOW, dur=1.4, amp=0.5), 0.0)
    mix_into(m, chime(BRAND_STINGER_HIGH, dur=2.2, amp=0.36, stagger=0.10), 0.35)

```
replace with:
```python
    # 0.15s / 0.55s: the two-beat text reveal is the real logo-reveal sample,
    # added after finish() below (soundv3) - nothing synthesised here any more.

```
(lines 42–45, the pad comment and its `mix_into` at 0.35, stay byte-identical.)

**Edit C5 — line 47**, anchor:
```python
    return finish(m, DURATION, wet=0.3, soften_passes=1)
```
replace with:
```python
    bed = finish(m, DURATION, wet=0.3, soften_passes=1)

    # The real two-note logo reveal (soundv3): dry, stereo, on top of the finished
    # bed, hit 1 exactly on the wordmark - the file starts at -0.044s, i.e. its
    # first 0.044s (digital zeros) are skipped. Hit 2 lands 0.291s later (0.441s).
    out = to_stereo(bed)
    place_sfx(out, load_sfx(), WORDMARK_T - HIT1)
    return out
```

**Edit C6 — lines 50–55** (the `__main__` block; same anchor text as O6, it is identical
in both files), replace with the same six lines as O6's replacement.

## 4. Build, mux, `all-renders/` (Nathan's PC, `device_bash`)

Every `soundtrack.py` is run **from its own folder** (`sys.path` is relative), per the
docstring convention. `set -e` semantics: stop at the first failure and report it.

```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio/brandmark/opening && python3 soundtrack.py
cd $HOME/mnt/Qualifire/marketing/audio-studio/brandmark/closing && python3 soundtrack.py
```
Expected output, to the digit (same machine, same code, deterministic):
```
wrote soundv3/soundtrack_v3.wav: 6.5000 s, 2 ch, peak 0.7741 (-2.22 dBFS)
wrote soundv3/soundtrack_v3.wav: 4.0000 s, 2 ch, peak 0.7857 (-2.09 dBFS)
```
Then the mux (the folder's usual one-liner, stereo AAC now), the `all-renders/` swap,
and the superseded files to `_to_delete/` (never `rm`):
```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio/brandmark/opening/soundv3 && ffmpeg -y -v error -i ../../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4 -i soundtrack_v3.wav -c:v copy -c:a aac -b:a 192k -shortest opening_v3_with_sound_v3.mp4
cd $HOME/mnt/Qualifire/marketing/audio-studio/brandmark/closing/soundv3 && ffmpeg -y -v error -i ../../../../silent-studio/brandmark/closing/rounds/v4/closing_v4.mp4 -i soundtrack_v3.wav -c:v copy -c:a aac -b:a 192k -shortest closing_v4_with_sound_v3.mp4
cd $HOME/mnt/Qualifire/marketing/audio-studio && for f in brandmark/opening/soundv3/opening_v3_with_sound_v3.mp4 brandmark/closing/soundv3/closing_v4_with_sound_v3.mp4; do ffprobe -v error -show_entries stream=codec_type,codec_name,channels:format=duration -of compact "$f"; done
mkdir -p $HOME/mnt/Qualifire/_to_delete && cd $HOME/mnt/Qualifire/marketing/audio-studio/all-renders && mv opening_v3_with_sound_v2.mp4 closing_v3_with_sound_v2.mp4 $HOME/mnt/Qualifire/_to_delete/ && cp ../brandmark/opening/soundv3/opening_v3_with_sound_v3.mp4 ../brandmark/closing/soundv3/closing_v4_with_sound_v3.mp4 . && ls -la
```
Expected `ffprobe`: each file `codec_name=h264|codec_type=video`, `codec_name=aac|codec_type=audio|channels=2`,
`duration=6.500000` / `duration=4.000000`. `silent-studio/all-renders/` already holds
`opening_v3.mp4` and `closing_v4.mp4` — nothing to do there. (`mv` across mounts may
copy-then-fail on the source; if so, report it — do not request delete permission.)

## 5. Round docs (markdown only)

1. **Create `brandmark/opening/soundv3/FEEDBACK.md`** (the folder exists after §4;
   stop trigger if the *file* exists). Shape of `soundv2/FEEDBACK.md`. Header:
   **Render:** `opening_v3_with_sound_v3.mp4` — the same picked render (`opening_v3.mp4`,
   unchanged) with this round's soundtrack muxed on; **Also here:** `soundtrack_v3.wav`
   (stereo — the first stereo WAV in audio-studio; why in §2.6 of this brief, cite the
   path); **Script that made it:** `../soundtrack.py` + the new shared
   `../../logo_reveal.py`; **Source video:** `../../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4`
   (6.5 s, 1920×1080, no audio — unchanged); **Built:** 2026-09-23; **Previous round:**
   `../soundv2/FEEDBACK.md`. "What this is": Nathan's words (§0, quoted), what was
   done (§0/§2 in your own words), the §2.2 table row for opening, the §2.7 gain
   ruling, that the bed is untouched. "What changed since v2": bullet list — synth
   `sub_hit`+`chime` pair → the real sample; everything else byte-identical; stereo
   out; `synth.py` reverb now runs without scipy; `__main__` writes with stdlib.
   "Numbers" : the two `python3 soundtrack.py` output lines and the §6.1 output,
   verbatim. "What to listen for": (a) hit 1 on the wordmark — should feel glued;
   (b) hit 2 lands 0.109 s before the tagline starts fading in — does it read as
   "early", or does the tagline's soft fade absorb it? (Q4); (c) is the C3/G3 pad
   under it wanted, or should the sting stand bare? (Q5); (d) level: sting at
   −2.1 dBFS peak against the ring-draw at −10 dBFS — louder/softer is `GAIN` in
   `logo_reveal.py` (2.4 max). Empty "Nathan's feedback" section with the usual
   `<!-- write your notes below -->` line.
2. **Create `brandmark/closing/soundv3/FEEDBACK.md`**, same shape. **Render:**
   `closing_v4_with_sound_v3.mp4` — `closing_v4.mp4` (the current visual — soundv2 was
   muxed onto v3) with this round's soundtrack; **Source video:**
   `../../../../silent-studio/brandmark/closing/rounds/v4/closing_v4.mp4` (4.0 s);
   **Built:** 2026-09-23; **Previous round:** `../soundv2/FEEDBACK.md`. "What this
   is": Nathan's "the same exact sound should also be used for closing as it is the
   same animation"; the closing row of §2.2's table; the −0.044 s start and why it
   is lossless (§2.3); the pad kept. "What changed since v2": the pair → sample; the
   round is now against v4's timeline (wordmark 0.15 / tagline 0.55, not soundv2's
   0.0 / 0.35 — the old "mark fades/scales up" beat no longer exists); stereo;
   scipy-free build. "Numbers" and "What to listen for" as for opening, plus: (e)
   the clip opens on 0.15 s of silence before the attack — should the sample be
   allowed to start at 0.0 instead (hit 1 then 44 ms after the wordmark)? Empty
   "Nathan's feedback".
3. **`brandmark/opening/README.md`** (stale — its table stops at soundv1): add two
   rows after the soundv1 row, same format:
   `| [soundv2](soundv2/FEEDBACK.md) | opening_v3_with_sound_v2.mp4 | Built 2026-09-13 — superseded by soundv3 |`
   `| [soundv3](soundv3/FEEDBACK.md) | opening_v3_with_sound_v3.mp4 | Built 2026-09-23, awaiting Nathan's feedback — real logo-reveal sample on the wordmark/tagline reveal (cycle 15) |`
   and change soundv1's status cell to `Built — superseded`. Replace the "Sonic
   direction so far" paragraph with: "Near-silence → a rising sweep as the ring draws
   and a swoosh for the gate (soundv2) → black → **Nathan's real two-note logo-reveal
   sample** (`../sfx/logo-reveal.mp3`, since soundv3) with its first hit on the
   "QUALIFIRE" wordmark and its second just ahead of the tagline, over a soft pad, then
   three trailing plucks into the fade. The sample is shared byte-for-byte with
   `../closing/` through `../logo_reveal.py`, so both ends of the video use the identical
   brand sound. Full rationale in `soundv3/FEEDBACK.md`."
4. **`brandmark/closing/README.md`**: line 3's source video → `../../../silent-studio/brandmark/closing/rounds/v4/closing_v4.mp4`
   (4.0s, 1920x1080, silent)`; rows as for opening (`closing_v3_with_sound_v2.mp4` /
   `closing_v4_with_sound_v3.mp4`); "Sonic direction so far" → "The sign-off is
   opening's text reveal reused: **the same real two-note logo-reveal sample**
   (`../sfx/logo-reveal.mp3`, via `../logo_reveal.py`) with its first hit on the
   "QUALIFIRE" wordmark at 0.15 s and its second just ahead of the tagline, over a sustained pad
   that rings through the hold into the fade. Identical sound to `../opening/` by
   construction. Full rationale in `soundv3/FEEDBACK.md`."
5. **`brandmark/README.md`**: both status rows → `in progress — soundv3` and
   `opening/soundv3/FEEDBACK.md` / `closing/soundv3/FEEDBACK.md`; in the "Both share a
   **brand chime**…" paragraph append one sentence: "Since cycle 15 (soundv3 in both)
   the wordmark/tagline reveal itself is a real recorded sample, `sfx/logo-reveal.mp3`,
   placed by the shared `logo_reveal.py` — the synthesised chime/stinger remains in
   `synth.py` for the teaser's bookends."
6. **`brandmark/opening/AUDIO-BRIEF.md`** — the direction changed (Nathan supplied the
   sound), which per its own "How this file is used" #4 is the case where it *is*
   edited: line 4 `**Current soundtrack round:** soundv3 (`soundv3/FEEDBACK.md`)`; beat
   4's "Sounds like now" → `Real logo-reveal sample (sfx/logo-reveal.mp3), hit 1 — its attack exactly on the wordmark`;
   beat 5's → `Sample's hit 2 (softer chime) at 3.24s, 0.11s before the tagline; sustained pad starts`;
   beat 6's → `Sample's tail rings to ~5.1s over the pad; three soft high plucks trail off from 5.0s`;
   and, under the table, a new italic line: *Direction change 2026-09-23 (cycle 15): Nathan
   supplied the reveal sound himself — `sfx/logo-reveal.mp3`, used verbatim in both
   opening and closing. Beats 4–6 updated; the rest of the table is unchanged.*
   Status stays `draft`; Nathan's column stays empty.
7. **`brandmark/closing/AUDIO-BRIEF.md`** — direction change *and* a visual re-render
   (v4) that changed the timings, both of which #4 says to record: line 3's visual
   source → `../../../silent-studio/brandmark/closing/rounds/v4/closing_v4.mp4` (4.0 s)`;
   line 4 → soundv3; **replace the Beats table** with v4's timeline:
   `| 0 | 0.0–0.15 | Black/empty | Silence (the sample's first 0.044 s of digital zeros are skipped so its attack lands at 0.15) | |`
   `| 1 | 0.15–0.95 | "QUALIFIRE" wordmark fades in | Real logo-reveal sample (sfx/logo-reveal.mp3), hit 1 — its attack exactly on the wordmark | |`
   `| 2 | 0.55–1.25 | Tagline "Same road. New meaning." fades in, overlapping | Sample's hit 2 (softer chime) at 0.44s, 0.11s before the tagline; sustained pad (C3/G3/C4) begins at 0.35s | |`
   `| 3 | 1.25–3.2 | Hold on wordmark + tagline | Sample's tail rings to ~2.3s; the pad carries the hold | |`
   `| 4 | 3.2–4.0 | Fade to black | Pad fades into the black | |`
   and under it, in italics: *Direction change 2026-09-23 (cycle 15): Nathan supplied the reveal
   sound himself — `sfx/logo-reveal.mp3`, identical to opening's. Timings re-read from
   the v4 visual (`closing_v4.mp4`): the old "mark fades/scales up" beat no longer exists.*
8. Do **not** edit `structure.md`, `APPROACH.md`, `window_mix.py`, `salamander_render.py`,
   any `index.html`, anything under `ride/` or `gates-saving/`, or this cycle's other
   files; do not touch `soundv1/` or `soundv2/` folders.

## 6. Verification (executor — numbers, not adjectives)

1. **The check script.** Save the following outside the repo (e.g. `$HOME/check_v3.py`)
   and run it from `marketing/audio-studio/brandmark/` after §4:
   ```python
   """Cycle-15 check for brandmark soundv3. Run from marketing/audio-studio/brandmark/
   after both `python3 soundtrack.py` runs: format, exact length, peak under -1 dBFS,
   and the sample's attack exactly on the wordmark in BOTH scenes. The synthesised bed
   is dual-mono (to_stereo) and the sample is real stereo, so |L-R| is the sample
   alone; its first sample above 0.01 is the attack (0.19411 s into the file)."""
   import wave, numpy as np
   SR = 44100
   ok, offs = True, []
   for scene, dur, wm, tag in [("opening", 6.5, 2.95, 3.35), ("closing", 4.0, 0.15, 0.55)]:
       with wave.open("%s/soundv3/soundtrack_v3.wav" % scene, "rb") as f:
           ch, sr, n = f.getnchannels(), f.getframerate(), f.getnframes()
           x = np.frombuffer(f.readframes(n), dtype=np.int16).reshape(-1, ch).astype(np.int32)
       side = np.abs(x[:, 0] - x[:, 1]) / 32768.0
       attack = int(np.argmax(side > 0.01)) / SR
       peak = float(np.abs(x).max()) / 32768.0
       good = ch == 2 and sr == SR and n == int(dur * SR) and 0.70 <= peak <= 0.891 and abs(attack - wm) <= 0.0005
       ok &= good; offs.append(attack - wm)
       print("%s: ch=%d sr=%d frames=%d (%.4f s; DURATION*SR=%d) peak=%.4f (%.2f dBFS) attack=%.5f (wordmark %.2f, %+.5f) -> %s" % (
           scene, ch, sr, n, n / sr, int(dur * SR), peak, 20 * np.log10(peak), attack, wm, attack - wm, "PASS" if good else "FAIL"))
       print("   hit 2 = hit 1 + 0.291 = %.3f vs tagline %.2f (%+.3f s, by design)" % (wm + 0.291, tag, wm + 0.291 - tag))
   same = abs(offs[0] - offs[1]) <= 0.0001
   print("identical placement relative to the wordmark in both scenes:", same)
   print("ALL PASS" if ok and same else "SOMETHING FAILED")
   ```
   **Pass criteria — computed at Plan time on Nathan's PC from the scratch mirror with
   this exact code; must match to the last printed digit:**
   ```
   opening: ch=2 sr=44100 frames=286650 (6.5000 s; DURATION*SR=286650) peak=0.7741 (-2.22 dBFS) attack=2.95011 (wordmark 2.95, +0.00011) -> PASS
      hit 2 = hit 1 + 0.291 = 3.241 vs tagline 3.35 (-0.109 s, by design)
   closing: ch=2 sr=44100 frames=176400 (4.0000 s; DURATION*SR=176400) peak=0.7857 (-2.09 dBFS) attack=0.15011 (wordmark 0.15, +0.00011) -> PASS
      hit 2 = hit 1 + 0.291 = 0.441 vs tagline 0.55 (-0.109 s, by design)
   identical placement relative to the wordmark in both scenes: True
   ALL PASS
   ```
   (`+0.00011` is the sample's own attack ramp: its first sample above 0.01 sits 0.11 ms
   after the −60 dBFS threshold that defines `HIT1`; the same number in both scenes is
   the proof that the placement is identical.)
2. **The reverb fallback, on its own** (from `marketing/audio-studio/`):
   ```bash
   python3 -c "
   import sys; sys.path.insert(0,'.'); import numpy as np, synth
   print('lfilter is None:', synth.lfilter is None)
   x=np.zeros(5000); x[0]=1
   y=synth.comb(x,1309,0.78); print('comb impulse: y[0]=%.4f y[1309]=%.4f y[2618]=%.4f nonzero=%d'%(y[0],y[1309],y[2618],np.count_nonzero(y)))
   y=synth.allpass(x,220,0.7); print('allpass impulse: y[0]=%.4f y[220]=%.4f y[440]=%.4f'%(y[0],y[220],y[440]))
   print('reverb ok, len', len(synth.reverb(np.zeros(44100), wet=0.3)))"
   ```
   must print `lfilter is None: True`, `comb impulse: y[0]=1.0000 y[1309]=0.7800 y[2618]=0.6084 nonzero=4`,
   `allpass impulse: y[0]=-0.7000 y[220]=0.5100 y[440]=0.3570`, `reverb ok, len 44100`
   (1, fb, fb²; −fb, 1−fb², fb(1−fb²): the textbook impulse responses).
3. **Greps** (from `marketing/audio-studio/`): `grep -n "mix_into(m, sub_hit\|mix_into(m, chime\|from scipy\|wavfile" brandmark/opening/soundtrack.py brandmark/closing/soundtrack.py`
   → no hits; `grep -n "place_sfx(out, load_sfx(), WORDMARK_T - HIT1)" brandmark/*/soundtrack.py`
   → exactly two hits; `grep -n "raise RuntimeError" synth.py` → no hits;
   `grep -c "" synth.py` → 335; `git -c core.quotepath=off status --short marketing/audio-studio`
   (with `GIT_OPTIONAL_LOCKS=0`) → modified: `synth.py`, the two `soundtrack.py`, the
   README/AUDIO-BRIEF files of §5; untracked: `brandmark/sfx/`, `brandmark/logo_reveal.py`,
   the two `soundv3/` folders, and `all-renders/` changes. **Do not commit** (Nathan's
   call; note in the report that `sfx/logo-reveal.mp3` must be committed with the code).
4. **Not applicable, do not run:** anything under `ride/`, `gates-saving/`, `piano/`; the
   other scenes' `soundtrack.py` (unchanged behaviour, and they still import scipy's
   `wavfile` in `__main__`); `app/` tests.

## 7. Report format

Post-edit line counts of the three edited `.py` files; the two `python3 soundtrack.py`
output lines, the §6.1 and §6.2 outputs and the `ffprobe` lines verbatim; the grep
results; `ls -la audio-studio/all-renders/` after §4; one sentence per stop trigger (an
anchor not found exactly once; `logo_reveal.py` or a `soundv3/FEEDBACK.md` already
existing; a §4 command failing — including the `mv` to `_to_delete/`; any §6.1 value
off by more than 1 in the last printed digit; `lfilter is None` printing `False` — that
would mean scipy appeared and §6.2's guarantee should be re-checked, not that anything
is wrong).

## 8. Things to watch (for the coordinator / Inspect)

- The sample's attack is sample-exact on the wordmark by construction, but the *video*
  is 30 fps: the wordmark's first visible frame is the one at 2.967 s (frame 89,
  opening) / 0.167 s (frame 5, closing), so on screen the sound leads the first drawn
  pixel by up to 17 ms — normal, and below any threshold.
- Hit 2 at −0.109 s (Q4) is the one thing Nathan is likely to notice, if anything.
- `sfx/logo-reveal.mp3` is untracked; the pipeline now depends on it.
- `synth.py`'s scipy path is untouched but unexercised on Nathan's PC; the cloud sandbox
  (scipy 1.17.1) is where the bit-identity was shown.
