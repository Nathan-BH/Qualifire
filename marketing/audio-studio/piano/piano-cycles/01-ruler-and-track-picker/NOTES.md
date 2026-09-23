# 01 — track picker + time ruler (2026-09-20)

All changes this round are direct edits to `../../named-keys.html` (no other files
touched). Verified with `node --check` after every edit; the track-note claims below
were additionally checked against the real rendered audio, not just source code.

## 1. Keyboard shortcuts: restart + seek
- `R` — restart (seeks to 0).
- `ArrowLeft` / `ArrowRight` — seek back/forward 1.0s each (started at 2.0s per
  Nathan's first ask, changed to 1.0s on request).
- `Space` (play/pause) unchanged. `Up`/`Down` deliberately left alone — reserved for
  page scroll, per instruction.

## 2. Default track swapped: ratpac -> Interstellar
The page used to open on a "ratpac" ambient-loop piece, shown as two rival
transcriptions (Kyutai Muscriptor vs. Basic Pitch) for comparison. Replaced with
`piano/projects/interstellar/interstellar_corrected.mid`'s corrected note data
(bass F2/G2/A2/G2 + full 16-note melody, 20 notes, 0-15.04s) — see that project's
`write_midi.py`/`NOTES.md` for how that MIDI was derived. The old Kyutai/Basic-Pitch
comparison data (`SEED_KY`/`SEED_BP`) was removed from the file, not just hidden.

## 3. "Track" dropdown — 3 options
Turned the old single-source "Transcription" picker into a 3-way "Track" picker, all
built from the same Interstellar theme data (not new compositions):

| value | title | notes | what it matches |
|---|---|---|---|
| `interstellar` | Interstellar (full theme) | 20 | `interstellar_corrected.mid`, both voices, full 15.04s |
| `gates_saving` | Gates & Saving mix (soundv8) | 10 | `gates-saving/soundv8/soundtrack_v8.wav` — bass+melody, but only the theme's first ~7.3s is ever audible (video windows it to 4.4-11.7s of a 12.3s clip) |
| `start_ride` | Start Ride mix (soundv7) | 8 | `start-ride/soundv7/start-ride_v4_with_sound_v7.mp4` — bass + the melody's "moving" voice only (voice_a, E5 pulse excluded), theme's first ~8.5s (video windows it to 5.3-13.8s of a 14.0s clip) |

**Verification done, not just read off the docs:** staged both actual media files into
a scratch environment and ran onset-detection + autocorrelation pitch analysis on the
real audio. Gates-saving: 8 onsets at 4.71/5.31/6.54/7.17/8.42/9.04/10.33/11.00s,
pitches F2/A4, F2/E5, F2/A4, F2/E5, G2/B4, G2/E5, G2/B4, G2/E5 — exact match. Start-ride:
5 onset clusters at 5.6/7.44/9.32/11.23/13.17s, bass F2->G2->A2 under melody
A4/A4/B4/B4/C5, no E5 anywhere — exact match, confirms voice_a excludes the E5 pulse.

## 4. Vertical time ruler either side of the roll
Added two narrow (34px) ruler canvases flanking the main falling-note canvas
(`.rollrow` flex wrapper), redrawn every frame in sync with playback. Tick density:
major tick + label every 1.0s, medium (unlabeled) tick every 0.5s, minor (unlabeled)
tick every 0.1s — tenths felt like the right floor given the roll only spans a 6s
window at ~40-75px/sec; hundredths would be sub-pixel-spaced and pointless.
Screenshotted a live playthrough (headless Chromium) to confirm the ruler tracks the
falling notes correctly before calling this done.

## Loose ends noticed along the way (not acted on this round)
- **`../README.md`'s "Shortcuts" table is stale/aspirational.** It lists a much richer
  scheme than what's ever actually been in `named-keys.html` — `Shift+arrow` for
  next/previous press, `Up`/`Down` for speed, single-key `S`/`K`/`C`/`M` toggles, and
  arrows as a 0.25s nudge. None of that existed before this round (Nathan's own report:
  "now only spacebar does something"), and what got built this round (plain
  arrow-seek, `R` restart) doesn't match that table either. Worth reconciling next time
  that README gets touched, so it stops describing a version of the tool that was never
  shipped.
- **The published Cowork "Named Keys" artifact is now further behind.** Per
  `../README.md`'s own standing rule ("any edit to named-keys.html needs a matching
  artifact republish, or the published link silently goes stale again") — it was
  already flagged there as behind as of 2026-09-19/20 (missing the Salamander samples
  and the playback fixes), and today's four changes (shortcuts, default track, track
  picker, ruler) widen that gap further. Not republished this round — the file is
  7.4MB with embedded base64 audio, so pushing it costs a lot, and it wasn't part of
  what this round was asked to do. Flagging so it's a deliberate choice whenever it
  happens, not a surprise.
