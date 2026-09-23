# BRIEF — real Salamander piano for the scene soundtracks (`salamander_render.py`, the ride master's engine)

**Status: ready to execute (2026-09-20, third Plan pass).** Written 2026-09-20 (Plan
tier, Fable). Sonnet-executable: two new Python modules under `marketing/audio-studio/`,
four calibration layer WAVs into a new sibling folder, markdown. Runs on **Nathan's PC
shell** (`device_bash`: python3 + numpy 2.2.6 + ffmpeg/ffprobe confirmed present today)
— no FluidSynth, no scipy, no network. No renders of video. Stop-on-ambiguity applies —
every anchor below is quoted verbatim from disk on 2026-09-20.

**Q1 finalised (Nathan): "lets just have the rides use salamander, I believe it will
sound good so no need to check it."** So there is **no A/B round**: this brief delivers
the renderer, the shared windowing helper and the gain calibration, and
`BRIEF-ride-loop-track.md` renders the production master through it directly. The second
pass's §2c (A/B muxes `start-ride/soundv8`, `gates-saving/soundv9`) is withdrawn — those
round numbers now belong to the ride brief's slices. The first thing Nathan hears with
Salamander is `ride_v1.mp4`.

## 0. Nathan's question and the answer

> "i am wondering if in the start-ride_v4_with_sound_v7.mp4 and soundtrack_v8.wav files
> we already have the salamander piano update (which i think is the better quality
> sound, correct me if i am wrong)?"

**No.** Both files are FluidSynth renders of the bundled General-MIDI soundfont, not the
Salamander samples:

- `marketing/audio-studio/fluid_render.py` line 37:
  `SF2 = "/usr/share/sounds/sf2/TimGM6mb.sf2"  # bundled GM soundfont; program 0 = Acoustic Grand Piano`
- `marketing/audio-studio/piano/projects/interstellar/fluid_soundtrack.py` docstring:
  "Real piano samples (a bundled GM soundfont), not synthesized from scratch" — that
  script wrote `bass_only.wav` / `melody_only.wav` / `voice_a.wav` / `voice_e5.wav`
  (all mtime 2026-09-19 21:29), and `start-ride/soundv7` + `gates-saving/soundv8` are
  windowed sums of exactly those files (fit today: `soundtrack_v7.wav` = 1.5 ×
  (bass_only + voice_a) placed at 5.3 s — local scale factor exactly 1.500 across the
  whole sustain, falling off only inside the documented fade-out; `soundtrack_v8.wav`
  = 1.0 × (bass_only + melody_only) at 4.4 s, bit-identical to bass_only + melody_only
  in 98.5% of samples in the sustain, the remainder being peak limiting, not a wrong
  recipe).
- The real Salamander set (29 of 30 notes, `A0` 404s on that mirror) was downloaded
  by Nathan on 2026-09-20 into `piano/samples/salamander/` and embedded **only** into
  `piano/named-keys.html`'s `PIANO_SAMPLES` (the on-page preview keyboard). No scene
  soundtrack has ever been rendered with it. `start-ride/soundv7/FEEDBACK.md`'s "now
  rendered through FluidSynth (real piano samples)" means "sample playback instead of
  Karplus-Strong", not Salamander — see the informational note in
  `questionsfornathan.md`.

**And yes, Salamander is the better sound** — it is the multi-sampled Yamaha C5 that
midiviewer.io / Klang.io play back (the reference Nathan compared against in cycle 12
round 5); the GM soundfont was adopted as a substitute only because the real samples
were unreachable from both shells at the time (`NOTES.md`, 2026-09-19). The mirror we
have is a single-velocity-layer set (one mp3 per sampled note), which is the same set
the web players use.

**Adoption path (changed by Q1):** not an A/B round — Salamander becomes the engine of the
ride master outright; the FluidSynth layer files one level up stay on disk as the record
of rounds soundv5–v8 (nothing is overwritten) and as the level reference the gains below
are calibrated against.

**On the `named-keys.html` side (for the record, not this brief):** `NOTES.md`'s tail
leaves the "still sounds synthetic in the browser" report open; `piano/README.md`'s
later entry ("Update (2026-09-20, later the same day)") closes the caching theory —
the file on disk was what the browser loaded — and records three playback fixes
(decode at page load, damper-style 0.6 s release instead of a full-length fade,
limiter on a master bus). Whether it now sounds right is still Nathan's ear to confirm;
this brief does not touch that tool.

## 1. Ruling

Write a sample-based renderer over the 29 real files, with the **same call shape as
`fluid_render.py`** so `fluid_soundtrack.py`'s callers (and the ride-master script in
`BRIEF-ride-loop-track.md`) switch engines by one import:

    audio, sr = salamander_render.render([(midi, start_s, dur_s), ...], dur_s, velocity=100, gain=1.0)
    salamander_render.write_wav(path, audio, sr)

Design decisions (fixed, do not revisit):

1. **Decode with ffmpeg, not a Python mp3 library** (none is installed; ffmpeg is):
   `ffmpeg -v error -y -i <name>.mp3 -ac 1 -ar 44100 -f wav <cache>/<name>.wav`, then
   read with the stdlib `wave` module into float32. Cache dir =
   `os.path.join(tempfile.gettempdir(), "salamander_decoded")`, created on demand;
   nothing decoded is written into the repo. Verified today: `Fs2.mp3` decodes to
   12.93 s mono 44.1 kHz, peak 0.71, first 50 ms at −99 dBFS (clean start), decay to
   −25 dB by 2 s, −50 dB by 12 s.
2. **Sample map:** `piano/samples/salamander/<Name>.mp3`, names
   `C1 Ds1 Fs1 A1 C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6 Ds6 Fs6 A6 C7 Ds7 Fs7 A7 C8`
   (`A0` absent). MIDI numbers: `C1`=24, `Ds1`=27, `Fs1`=30, `A1`=33, … +3 each,
   `C8`=108. Nearest sample by semitone distance; with a 3-semitone grid every note is
   at distance 0 or 1, never a tie. Table for the notes this piece uses (name → MIDI →
   sample, shift in semitones): F2 41 → `Fs2` −1; G2 43 → `Fs2` +1; A2 45 → `A2` 0;
   A4 69 → `A4` 0; B4 71 → `C5` −1; C5 72 → `C5` 0; D5 74 → `Ds5` −1; E5 76 → `Ds5` +1.
   Any note below 24 or above 108 → raise `ValueError` (stop trigger: the piece has
   none).
3. **Pitch shift by resampling** with `numpy.interp` (linear): ratio
   `r = 2 ** (shift / 12)`; output sample `i` reads source position `i * r`. ±1 semitone
   through linear interpolation is inaudible on these sources (the same fallback
   `named-keys.html` uses).
4. **Envelope:** unity through the note's duration, then a damper-style release —
   multiply by `exp(-(t - t_off) / 0.12)` for 0.6 s after note-off, then zero (that is
   −43 dB at 0.6 s). No attack shaping (the samples start from silence). If the
   sample is shorter than `dur + 0.6 s`, it simply ends.
5. **Velocity → amplitude** linear, `vel / 127` (single-layer set; `velocity` is a
   per-call constant exactly as in `fluid_render.render`).
6. **Buffer** = `int((dur_s + 2.0) * sr)` samples like `fluid_render.py` line 71, so
   callers that truncate to `DUR` keep working and callers that want the tail get it.
7. **Output level is the caller's job** (`gain`), but `render()` prints
   `"peak %.3f (%.1f dBFS)"` and **clips nothing silently**: if the peak exceeds 1.0 it
   raises `ValueError("gain too high: peak %.2f")`. For the layer regeneration in §3
   the required gain is derived from a measurement, not guessed.
8. Pure numpy + stdlib + ffmpeg subprocess. No scipy (not on the PC shell), no
   `synth.py` import inside the module (callers already bring `NOTES` if they need
   name→MIDI; `fluid_soundtrack.py`'s `_midi()` is reused as-is).

## 2. Files to create

### 2a. `marketing/audio-studio/salamander_render.py` (new)

Module docstring must say: what it is (real Salamander Grand Piano samples, the set
midiviewer.io/Klang.io use), that it is the **PC-shell-runnable** counterpart of
`fluid_render.py` (numpy + ffmpeg only), where the samples come from
(`piano/samples/salamander/`, fetched by `piano/projects/interstellar/get_salamander_samples.ps1`
on 2026-09-20, `A0` missing on that mirror), the eight design decisions above in
short form, and the usage block copied from `fluid_render.py`'s docstring with the
module name changed. Constants at the top:

    SR = 44100
    SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "piano", "samples", "salamander")
    SAMPLE_NAMES = ["C1","Ds1","Fs1","A1","C2","Ds2","Fs2","A2","C3","Ds3","Fs3","A3","C4","Ds4","Fs4","A4","C5","Ds5","Fs5","A5","C6","Ds6","Fs6","A6","C7","Ds7","Fs7","A7","C8"]
    SAMPLE_MIDI = {name: 24 + 3 * i for i, name in enumerate(SAMPLE_NAMES)}
    RELEASE_TAU = 0.12
    RELEASE_LEN = 0.6

Functions: `_decode(name) -> np.ndarray` (cached per process in a dict, decodes via
ffmpeg into the temp cache on first use, reads with `wave`), `_nearest(midi) ->
(name, shift)`, `render(notes, dur_s, velocity=100, gain=1.0, sr=SR) -> (float32
array, sr)`, `write_wav(path, x, sr=SR)` (byte-for-byte the same body as
`fluid_render.write_wav`, lines 101–106). `render` must accept the same `notes`
triples as `fluid_render.render`.

### 2b. `marketing/audio-studio/piano/projects/interstellar/salamander_soundtrack.py` (new — the gain calibration)

This script's job after Q1 is **calibration, not a round**: it renders the same four
layers as `fluid_soundtrack.py` so each Salamander layer's `gain` can be measured against
the FluidSynth file's peak, and it **exports those four gains as module constants**
(`GAIN_BASS`, `GAIN_MELODY`, `GAIN_VOICE_A`, `GAIN_VOICE_E5`) that `ride_master.py`
imports — the ride master must not re-measure. Same shape as `fluid_soundtrack.py` (read
it; keep `_midi`/`_events` identical) but:
imports `salamander_render as sr_` instead of `fluid_render`; writes into a new
sub-folder **`salamander/`** next to the existing files (`salamander/bass_only.wav`,
`salamander/melody_only.wav`, `salamander/voice_a.wav`, `salamander/voice_e5.wav`);
**no `gate_chimes_12.3s.wav`** (retired in round 7; do not regenerate it); truncates
each layer to `int(DUR * sr)` exactly like `fluid_soundtrack.py` lines 46/49/52/56 so
the two engines' files are drop-in equivalents (the ride brief renders its own,
untruncated, longer buffers). Docstring: "Salamander twin of fluid_soundtrack.py (cycle 14): renders the same four
layers through the real samples and exports the calibrated per-layer gains that
ride_master.py uses; the FluidSynth files one level up remain as the record of
soundv5–v8 and as the level reference". Runnable from its own folder on the PC shell:
`cd marketing/audio-studio/piano/projects/interstellar && python3 salamander_soundtrack.py`.

**Gain:** the FluidSynth layers peak at (measured today) `bass_only.wav` −12.3 dBFS,
`melody_only.wav` −8.4, `voice_a.wav` −9.2, `voice_e5.wav` −9.5. Render each layer
first with `gain=1.0`, read the printed peak, then set that layer's `gain` so its peak
lands within ±0.3 dB of the FluidSynth counterpart's — and hard-code the four resulting
gains in the script with a comment giving the measurement. This keeps `×1.5` /
`×1.0` mixes (ruling 5 in the cycle README) valid for either engine. Use `velocity=95`
for bass and `105` for the three melody layers, as `fluid_soundtrack.py` does.

### 2c. `marketing/audio-studio/window_mix.py` (new — shared helper; no A/B round)

The ride brief's master is assembled with this module, so it lands here with the engine:
`place(master, layer, at_s, gain)`, `fade_in(master, t0, len_s)`, `fade_out(master,
t_end, len_s)` (linear ramps, in place), `silence_outside(master, t0, t1)`; all numpy on
float64 buffers at 44.1 kHz, `write_wav` imported from `salamander_render`. Docstring
says who uses it (`ride/ride_master.py`) and that it is engine-agnostic (a layer is any
float array at 44.1 kHz). **No round folders, no muxes, no scene-README rows are created
by this brief** (Q1) — `start-ride/soundv8` and `gates-saving/soundv9` are reserved for
the ride brief's slices; stop trigger if this brief is asked to create them.

### 2d. Doc pointers (markdown only)

- `piano/projects/interstellar/NOTES.md`: append an `## Update (2026-09-20) — Salamander
  wired into the scene pipeline (cycle 14)` entry: the answer in §0 in three lines, the
  new module/script names, the `salamander/` sub-folder and what it is for (calibration
  + drop-in layer set), that from cycle 14 the ride master renders through Salamander
  (Nathan's Q1: no A/B) and the FluidSynth files remain as the record of soundv5–v8.
- `audio-studio/structure.md`: wherever `fluid_render.py` is listed, add
  `salamander_render.py` beside it with "PC-shell-runnable". If it is not listed, add
  nothing (do not restructure that file).

## 3. Stop-on-ambiguity triggers

`salamander_render.py`, `window_mix.py`, `salamander_soundtrack.py` or a `salamander/`
sub-folder already exist; any of the
29 sample files is missing or `ffprobe` reports a codec other than `mp3`, mono,
44100 Hz; `fluid_render.py` line 37/60/71/101 do not match the quotes above; the
FluidSynth layer peaks measured by the executor differ from the four figures in §2b by
more than 0.5 dB (would mean the files changed since Plan time); a Salamander layer
cannot reach its target peak without `gain` > 4 or clips at `gain` < 0.05. Any of
these → stop, report verbatim, do not adapt.

## 4. Verification (executor — numbers, not adjectives)

1. **Module self-test** (paste the output): render `[(69, 0.0, 1.0), (41, 0.5, 3.0)]`
   for `dur_s=4.0` at `gain=1.0` → array length `int(6.0 * 44100)` = 264 600; peak
   between 0.3 and 1.0; RMS of the last 0.1 s < −60 dBFS (release + natural decay
   have done their job by 6.0 s); `_nearest(41)` → `("Fs2", -1)`, `_nearest(76)` →
   `("Ds5", 1)`, `_nearest(45)` → `("A2", 0)`; `_nearest(21)` raises.
2. **Layer parity:** for each of the four `salamander/*.wav`: length 663 264 samples
   (= 15.04 s), mono, 44 100 Hz; peak within ±0.3 dB of the FluidSynth counterpart
   (report both figures); first 0.31 s at −inf/−180 dBFS (nothing before the pickup).
3. **Onset parity** — the executor's own 20 ms-RMS onset scan (threshold +6 dB over
   two windows back, floor −45 dBFS, 0.25 s refractory) on `salamander/melody_only.wav`
   must return the 16 MELODY onsets of `soundtrack.py` lines 39–44 within ±30 ms each;
   on `salamander/bass_only.wav` the 4 BASS onsets (0.31 / 4.03 / 7.88 / 11.84).
4. **`window_mix.py` self-test** (paste the output): on a 2.0 s zero buffer, `place` a
   1.0 s constant 0.5 layer at 0.5 s with gain 2 → samples [22 050, 66 150) equal 1.0,
   all others 0; `fade_in(m, 0.5, 0.1)` → sample at 0.55 s = 0.5 ± 0.01, at 0.6 s = 1.0;
   `fade_out(m, 1.5, 0.5)` → sample at 1.25 s = 0.5 ± 0.01, last sample of the layer
   (index 66 149) < 0.001; `silence_outside(m, 0.6, 1.4)` → RMS of 0–0.6 s and 1.4–2.0 s
   = −180 dBFS.
5. **Gain constants:** `python3 -c "import salamander_soundtrack as s; print(s.GAIN_BASS,
   s.GAIN_MELODY, s.GAIN_VOICE_A, s.GAIN_VOICE_E5)"` from the interstellar folder prints
   four numbers, each in (0.05, 4) — the same four hard-coded in the file with their
   measurements in a comment.
6. **Not applicable, do not run:** `app/` tests and `tsc` (CLAUDE.md §6).
7. Listening is Nathan's, on `ride_v1.mp4` (ride brief); the executor reports no opinion
   on how it sounds.

## 5. Report format

Paths created; the four gains with their measured peaks; §4.1–4.5 outputs verbatim;
one sentence per §3 trigger confirming it did not fire; the exact ffmpeg decode line
used by `_decode`.
