# gates-saving — soundv10

Slice [14.0–26.3s] of `../../ride/soundv2/ride_master_v2.wav` (stereo): Nathan's Tunetank track
replaces the synthesised bed, with `ride_master.py`'s five E5 pulses on top. Judge the join in
`../../ride/soundv2/ride_v2.mp4` (built, confirmed 26.300000s via ffprobe).

Scene-clock numbers (scene time = master time − 14.0):

- The first pass's level over 0–1.0 s is flat with the body (about −17 dBFS, RMS −17.3 / −17.1 dBFS);
  the decrescendo begins at scene time about 0.90 s (14.90 on the combined ride clock), under −25 dBFS from 1.44 s.
- The second pass attacks on the start pulse at 3.80 s (3.82 on the 20 ms grid).
- The five E5 pulses at 3.80 / 5.81 / 7.65 / 9.51 / 11.38 s (unchanged from soundv9), lifts over the bed of +14.3 / +8.0 / +7.4 / +6.1 / +5.1 dB.
- 1.0 s linear fade to the end of the scene (26.3 s master, 12.3 s here).
- Slice parity: 542,430 samples, equal to the master's last 542,430.

**Licence:** per Nathan, 2026-09-23 — free, usable without copyright issues.

**Render:** `gates-saving_v8_with_sound_v10.mp4` — built. Confirmed via ffprobe at exactly 12.300000s (aac, 2 channels).

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
