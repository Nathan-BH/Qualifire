# DIGEST: Teaser Sound-Lanes Assets & Placement Constants

**Cycle:** 19  
**Date:** 2026-09-24  
**Scope:** Inventory of media assets and sound-placement constants for multi-lane sound-tool build

---

## A. MEDIA ASSETS

### Video

| File | Size (bytes) | Duration (s) | Codec | Resolution | FPS | Frames |
|------|---|---|---|---|---|---|
| `silent-studio/all-renders/teaser_v9.mp4` | 12,470,104 | 47.600 | h264 | 1920×1080 | 30 | 1428 |

**Status:** Silent (no audio stream). All video cuts are stream-copy concat @ h264; confirmed by ffprobe.

---

### Tunetank Audio Source (Original + Stems)

All files in `audio-studio/stemsplitter/tunetank-emotional-classical/sources/` • MP3 codec, 44100 Hz, 2 channels (stereo)

| File | Size (bytes) | Duration (s) | Peak (dBFS) | Notes |
|------|---|---|---|---|
| `original.mp3` | 481,489 | 15.047 | 0.0 | Full mix; basis for stem separation |
| `6stem_bass.mp3` | 603,995 | 15.073 | -13.0 | Bass layer active |
| `6stem_drums.mp3` | 603,995 | 15.073 | -0.8 | Drums layer active |
| `6stem_guitar.mp3` | 603,995 | 15.073 | -80.8 | **Effectively silent** |
| `6stem_instrum.mp3` | 603,995 | 15.073 | *(pending)* | Instrumental layer |
| `6stem_other.mp3` | 603,995 | 15.073 | *(pending)* | Other layer |
| `6stem_piano.mp3` | 603,995 | 15.073 | -0.9 | Piano layer active |
| `6stem_vocals.mp3` | 603,995 | 15.073 | -84.3 | **Effectively silent** |
| `strings-model_other.mp3` | 603,994 | 15.073 | *(pending)* | String separation (other) |
| `strings-model_strings.mp3` | 603,994 | 15.073 | *(pending)* | String separation (strings) |

**Key finding:** `6stem_guitar.mp3` and `6stem_vocals.mp3` are below -80 dBFS and should be treated as silent stems in any downstream mixing.

---

### Piano Projects

#### Piano Logo (Opening)

| File | Size (bytes) | Duration (s) | Codec | Sample Rate | Channels | Peak (dBFS) |
|------|---|---|---|---|---|---|
| `audio-studio/piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3` | 270,001 | 8.437531 | MP3 | 44100 Hz | 2 | -0.0 |

**Notes:** 
- Nathan's "exact perfect match" for opening (cycle 16 brief).
- Peak brickwall-limited (536 samples at 0.891+); stereo, L/R correlation ≈ 0.06.
- First attack (D-major chord) at 0.668 s; final sample above -40 dBFS at 6.61 s.
- Applied gain in opening render: 0.85 → stereo peak -1.41 dBFS.

#### Tunetank Ride Bed

| File | Size (bytes) | Duration (s) | Codec | Sample Rate | Channels | Peak (dBFS) |
|------|---|---|---|---|---|---|
| `audio-studio/piano/projects/tunetank-ride/sources/tunetank-emotional-classical-484234.mp3` | 481,489 | 15.047 | MP3 | 44100 Hz | 2 | 0.0 |

**Verification:** MD5 hash `a5ea27ca9bd0742beb78bf61bc0ae5fa` matches `original.mp3` exactly — files are identical.

---

### Ride Master Audio

| File | Size (bytes) | Duration (s) | Codec | Sample Rate | Channels |
|------|---|---|---|---|---|
| `audio-studio/ride/soundv2/ride_master_v2.wav` | 4,639,364 | 26.300 | PCM s16le | 44100 Hz | 2 |

**Composition (stereo):**
- **Bed layer:** Tunetank file placed at T1=3.80 and T2=16.54 (ride master clock) with gain 0.45 each.
- **E5 layer:** Five synthesized Salamander pulses at tau = [17.80, 19.81, 21.65, 23.51, 25.38] s (ride master clock) with gain 1.5 applied.
- **Fades:** Bed 1.0 s fade to 26.3 s; E5 0.5 s fade to 26.3 s.
- **Peak (scaled):** Within -1 dBFS ceiling (no additional scaling required by ride_tunetank.py).

---

### Audio Studio Structure (Ride Versions)

| Subdirectory | Contents | Notes |
|---|---|---|
| `audio-studio/ride/soundv1/` | `ride_master_v1.wav` (2.3 MB, 26.3 s) | Salamander-synthesized bed & E5 (cycle 14 baseline) |
| `audio-studio/ride/soundv2/` | `ride_master_v2.wav` (4.6 MB, 26.3 s) | Tunetank bed + Salamander E5 pulses (current) |
| `audio-studio/ride/soundv3/` | `ride_v1_with_sound_v3.mp4` (11 MB) | Video render with soundv2 applied (no standalone audio) |

---

## B. PLACEMENT CONSTANTS

### Opening Scene (0–6.5 s teaser clock)

**Source script:** `audio-studio/brandmark/opening/soundtrack.py`

| Constant | Value | Notes |
|---|---|---|
| **T0** | 0.0 s | Piano logo file t=0 aligns with video t=0 (no offset) |
| **GAIN** | 0.85 | Stereo peak: 0.9997 → 0.8497 (-1.41 dBFS) |
| **END_FADE** | 0.5 s | Linear fade 6.0–6.5 s (ensures hard end) |
| **DURATION** | 6.5 s | Opening video/audio sync duration |

**Piano logo timing (within opening):**
- First attack (D-major chord): 0.668 s
- Arpeggio: 1.0–1.7 s (during ring completion & slash fade)
- Re-strikes: 2.125, 2.928, 3.253 s (during mark fade & text beats)
- Decay: -31 dBFS @ 5.1 s; -44 dBFS @ 6.3 s

---

### Ride Master Build (26.3 s total duration, cycle 14 baseline)

**Source script:** `audio-studio/ride/ride_master.py`

| Constant | Value | Definition |
|---|---|---|
| **P** | 15.43 s | Loop period (note list cycle); ruling 2 derivation (cycle 14 brief) |
| **SR_OFFSET** | 5.3 s | Content clock → ride master clock offset; soundv7 placement constant |
| **SCENE_SPLIT** | 14.0 s | Boundary between start-ride (0–14.0) and gates-saving (14.0–26.3) |
| **GS_LEN** | 12.3 s | Gates-saving duration within master (14.0 + 12.3 = 26.3) |
| **RIDE_T0** | 3.80 s | Ride-2 start on content clock |
| **RIDE_DUR** | 7.58 s | Ride-2 duration on content clock |
| **E5_CONTENT** | [12.50, 14.51, 16.35, 18.21, 20.08] s | Five E5 pulse times (content clock) |
| **GAIN** | 1.5 | Global mix gain (bass, voice_a, e5 layers) |
| **FADE_IN** | (5.3 s, 0.15 s) | Fade-in ends at t=5.3 over 0.15 s duration |
| **FADE_OUT_END** | 26.3 s | Fade-out target time (master end) |
| **FADE_OUT_LEN** | 0.5 s | Fade-out duration |
| **MASTER_DUR** | 26.3 s | Total master duration |

**E5 pulse times (ride master clock):** τ = content + SR_OFFSET = [17.80, 19.81, 21.65, 23.51, 25.38] s

---

### Tunetank Ride Build (soundv2, cycle 16)

**Source script:** `audio-studio/ride/ride_tunetank.py` (imports P, SR_OFFSET, MASTER_DUR, RIDE_T0, SCENE_SPLIT, TEMPO from ride_master.py)

| Constant | Value | Definition |
|---|---|---|
| **T1** | 3.80 s | Ride 1: file t=0 on ride master clock; frame 114 on video (START box fade-out 3.55–4.00) |
| **ATTACK** | 1.26 s | File time of first full-scale transient (D-major chord) |
| **RIDE_T0_ABS** | 17.80 s | Ride-2 start on ride master clock (SCENE_SPLIT + RIDE_T0) |
| **T2** | 16.54 s | Ride 2: file t=0 on ride master clock (RIDE_T0_ABS − ATTACK) |
| **GAIN_BED** | 0.45 | Tunetank bed gain (stereo peak 1.0435 → 0.470, -6.6 dBFS) |
| **GAIN_E5** | 1.5 | E5 layer gain (imported from ride_master.GAIN) |
| **BED_FADE** | (26.3 s, 1.0 s) | Ride-2 bed: linear fade ending at video end |
| **E5_FADE** | (26.3 s, 0.5 s) | E5 layer: fade kept from soundv1 master |

**Bed placement (on ride master clock):**
- **Ride 1:** File t=0 → tau=3.80 s; attack lands 5.06 s; body carries 5.3–13.8 s; decrescendo 14.9–18.85 s
- **Ride 2:** File t=0 → tau=16.54 s; attack lands 17.80 s (coinciding with ride-2 start pulse); plateau → fade 25.3–26.3 s

**E5 pulses (on ride master clock):** τ = [17.80, 19.81, 21.65, 23.51, 25.38] s (identical to ride_master.py; durations matched from MELODY list iteration-wise)

---

## C. TEASER VIDEO BOUNDARIES & SOUND PLACEMENT

### Video Scene Cuts (teaser_v9.mp4)

| Scene | Frames | Teaser Clock | Duration |
|---|---|---|---|
| **1. Opening** | 0–195 | 0:00.000–0:06.500 | 6.500 s |
| **2. Start-ride** | 195–615 | 0:06.500–0:20.500 | 14.000 s |
| **3. Gates-saving** | 615–984 | 0:20.500–0:32.800 | 12.300 s |
| **4. Ranking** | 984–1308 | 0:32.800–0:43.600 | 10.800 s |
| **5. Closing** | 1308–1428 | 0:43.600–0:47.600 | 4.000 s |
| **Total** | **1428** | **0:00.000–0:47.600** | **47.600 s** |

**Verified:** Stream-copy concat (all h264/1920×1080/30fps); confirmed 2026-09-23 with ffprobe.

---

### Sound Placement on Teaser Clock

#### Opening (0–6.5 s)
- **Piano logo:** T0=0.0 s (file t=0 at video t=0) → entire opening 0–6.5 s teaser
- **End fade:** 6.0–6.5 s (0.5 s linear)
- **Gain:** 0.85 (-1.41 dBFS)

#### Start-Ride (6.5–20.5 s teaser)
- **Bed (Tunetank) Ride 1:** 
  - File t=0 at teaser t=10.3 s (T1=3.80 + 6.5)
  - Attack lands at teaser t=11.56 s (3.80 + 1.26 + 6.5)
  - Body carries 11.8–20.3 s teaser (5.3–13.8 on ride clock + 6.5)
  - Decrescendo carries into gates-saving (file's own, no fade applied at scene boundary)
  - Gain: 0.45

#### Gates-Saving (20.5–32.8 s teaser)
- **Bed (Tunetank) Ride 2:**
  - File t=0 at teaser t=23.04 s (T2=16.54 + 6.5)
  - Attack lands at teaser t=24.3 s (16.54 + 1.26 + 6.5)
  - Fade-out: 25.3–26.3 s on ride clock → 31.8–32.8 s teaser (1.0 s linear to video end)
  - Gain: 0.45

- **E5 Layer (5 synthesized pulses):**
  - Scheduled on ride master clock τ, mapped to teaser by adding 6.5 s
  - **Pulse times (teaser clock):**
    | Pulse # | τ (ride clock) | Teaser clock |
    |---|---|---|
    | 1 (START) | 17.80 s | 24.30 s |
    | 2 (Gate 1) | 19.81 s | 26.31 s |
    | 3 (Gate 2) | 21.65 s | 28.15 s |
    | 4 (Gate 3) | 23.51 s | 29.81 s |
    | 5 (FINISH) | 25.38 s | 31.88 s |
  - Gain: 1.5 × GAIN_VOICE_E5 (Salamander velocity 105)
  - Fade-out: 25.3–26.3 s on ride clock → 31.8–32.8 s teaser (0.5 s linear)
  - Sample selection: Each pulse duration determined by MELODY durations (iteration-matched)

---

## D. E5 PULSE SYNTHESIS & SAMPLE SELECTION

**Status:** No standalone E5-only WAV file found in `audio-studio/ride/` or `audio-studio/gates-saving/`. The five E5 pulses are synthesized in `ride_master.py` and `ride_tunetank.py` via:

1. **Salamander piano samples:** `audio-studio/piano/samples/salamander/E5.mp3` (per `synth.py` note mappings)
2. **MIDI rendering:** Each pulse generated via `salamander_render.render()` with:
   - Note: MIDI 76 (E5, from `synth.NOTES`)
   - Velocity: 105
   - Duration: Fetched per-pulse from `MELODY` list (ride_master.py line 116–121)
3. **Gain chain:** `GAIN_VOICE_E5` (imported from `salamander_soundtrack.py`) × `GAIN` (1.5 in ride_tunetank.py)
4. **Rendered once, scheduled twice:** Both ride-1 and ride-2 iterations use their own E5 pulse times; only ride-2 pulses are audible in the teaser (SCENE_SPLIT guard keeps ride-1 pulses in soundv1 baseline only).

**To render E5 pulses standalone:** Would require isolated run of `salamander_render.render()` for the five (midi=76, tau, duration) tuples at the above times, output to mono/stereo WAV @ 44.1 kHz with the same gain chain.

---

## E. INCONSISTENCIES & FLAGS

- **None detected** between ride_master.py, ride_tunetank.py, and opening/soundtrack.py constants.
- **Verification:** 
  - MD5 match confirms original.mp3 ≡ tunetank-emotional-classical-484234.mp3
  - E5_CONTENT values match between ride_master.py (defining content clock) and ride_tunetank.py (importing and using them)
  - GAIN chain (`GAIN` 1.5, `GAIN_BED` 0.45, `GAIN_VOICE_E5` imported) maintains -1 dBFS ceiling per ride_tunetank.py scaling check
  - Teaser video boundary sum (6.5 + 14.0 + 12.3 + 10.8 + 4.0 = 47.6 s, 1428 frames) matches ffprobe exactly

---

**End digest**
