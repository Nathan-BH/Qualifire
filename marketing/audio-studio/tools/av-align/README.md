# av-align — offline audio-to-video alignment tool (cycle 16, item C)

One HTML file you double-click on Windows. No server, no install, no network. You pick a video
(mp4) and an audio file (wav or mp3) from your disk, step the video frame by frame with the exact
time and frame number shown, see the audio waveform on the video's timeline, nudge the audio
offset, listen to it, and press **Save copy**: a copy of the page is downloaded with your numbers
written into one config block at the top, so the coordinator can diff it against the shipped file
and read the numbers off before any build is re-run.

Path: `C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\av-align\av-align.html`

## What this tool will and will not do

**Will:**
- Open any mp4 the browser can decode (all Qualifire renders: h264, yuv420p, 30 fps) and any wav or mp3.
- Step one frame forward/back (33.33 ms at 30 fps), ±10 frames, jump to a time or a frame, and show **time in seconds (3 decimals) and the frame number (0-based, frame 0 = 0.000 s)**.
- Draw the audio's waveform on the **video's** clock, shifted by the offset, with a playhead, frame ticks when zoomed in, and the audio's detected attacks ("onsets") marked and listed in both audio time and video time.
- Let him place the same audio file more than once (the ride uses two placements: `T1` and `T2`), nudge the selected placement's offset, and type an exact value.
- Play video + audio together at the chosen offset (real time, Web Audio clock), and **scrub**: while stepping frames, play exactly the 33.33 ms of audio that belongs to the frame on screen. This mode is exact by construction and is the one to trust.
- **Save copy**: download a copy of the whole page with the current offsets, markers and file names written into the config block; the rest of the file is unchanged.

**Will not:**
- Change any file in the repo, any render, any WAV, or any brief. It is a viewer. A number he settles on becomes a change only when the coordinator re-runs the relevant build with it (`ride_tunetank.py`'s `T1`, or `soundtrack.py`'s `T0`), which is a separate step he sees.
- Guarantee sample-exact real-time sync. Browser video and Web Audio run on different clocks; the page re-syncs whenever they drift more than ~25 ms, so **real-time playback is right to about ±1 frame (±33 ms) on a wired output, worse on Bluetooth (100–200 ms of latency the page cannot see)**. That is why the scrub mode and the onset markers exist: judge with those, use real-time playback for the feel.
- Mix, fade, apply gain curves, or reproduce the E5 pulse layer. To hear the *built* mix, load the built master WAV (e.g. `ride/soundv2/ride_master_v2.wav`) with one placement at 0.0 — it is already on the video's clock.
- Know where his files are. Browsers only expose the file *name* of a picked file, so the saved copy records names, not paths.
- Work in Firefox as intended (no `requestVideoFrameCallback`; it falls back to a coarser clock and says so). Chrome and Edge on Windows are the targets.

## How to use

1. Double-click `av-align.html` (Chrome or Edge; if it opens elsewhere: right-click, Open with, Chrome/Edge).
2. Pick the video with the **Video** button (or drop it on the drop zone).
3. Pick the audio with the **Audio** button. The status line shows its sample rate, length and peak.
4. Check the preset and fps (ride is the default; choose "preset: opening" for the opening) and that the placements match what you want to test.
5. Step with the left/right arrow keys (Shift = 10 frames) and listen with "play this frame's audio when stepping" on; nudge the selected placement with the buttons (or `,` and `.` for one frame), watching the waveform, onset table and config box update.
6. Press **Save copy**. The file `av-align.<scene>.<YYYYMMDD-HHMM>.html` lands in your Downloads folder; paste it (or its config block, from **Copy config**) into chat, or drop it into `marketing/audio-studio/tools/av-align/copies/` (create that folder the first time).

Keys: `←` `→` step, `Shift+←/→` ±10, `Space` play/pause, `,` `.` nudge the selected placement ∓/± one frame.

## What the numbers mean

A placement's `at` is **the video time (seconds on the video's own clock, 0 = first frame) at which the audio file's t = 0 is placed.** That is exactly `T1` in `BRIEF-tunetank-ride-soundtrack.md` (`ride_tunetank.py` line 66, `T1 = 3.80`) and `T0` in `BRIEF-tunetank-piano-logo-opening.md` (`soundtrack.py`, `T0 = 0.0`). Positive `at` = the audio starts later than the video. The ffmpeg mux never sees this number: the build script bakes the placement into the WAV and the mux starts both streams at 0. Frame numbering is 0-based: `frame = floor(t × fps)`, frame n covers `[n/fps, (n+1)/fps)`; 3.80 s = frame 114.

## Which files to load

| Scene | Video | Audio | Placements |
|---|---|---|---|
| ride | `marketing/audio-studio/ride/soundv2/ride_v2_silent.mp4` (before the ride brief has run: the two silent renders in `marketing/silent-studio/all-renders/`, one at a time) | `marketing/audio-studio/piano/projects/tunetank-ride/sources/tunetank-emotional-classical-484234.mp3` with the shipped placements, or `ride_master_v2.wav` with one placement at 0.0000 to hear the built mix | T1 (nudge) and T2 (derived, do not nudge) |
| opening | `marketing/silent-studio/all-renders/opening_v3.mp4` | `marketing/audio-studio/piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3` | preset "opening", one placement T0 |

Windows / OneDrive: the folder is under OneDrive-synced `Claude personal projects`. An mp4 that shows a
cloud icon (Files On-Demand) is downloaded by Windows when picked, so the first pick can take a moment.
Save copy writes to `Downloads`, not next to the original (browsers cannot write into the folder they
were opened from). Nothing is uploaded anywhere; the page has no network code.

## Accuracy

Real-time playback is right to about ±1 frame (±33 ms) on a wired output and worse on Bluetooth
(100–200 ms of latency the page cannot see). Trust scrub mode and the onset markers; use real-time
playback for the feel. Whether seeking is frame-exact and playback stays in sync is only confirmed by
opening the page in Chrome or Edge.

Onset markers are stamped at the start of the detector's 5 ms block, so they can read up to 5 ms early.

If git converts this file to Windows line endings, tests and Save-copy diffs break; `.gitattributes` pins it to LF.

## How a saved copy is read (coordinator)

The config block sits between `/* AV-ALIGN CONFIG BEGIN */` and `/* AV-ALIGN CONFIG END */`. Diff the
saved copy's block against the shipped file's; the changed `"at"` of the placement labelled `T1` is the new
`T1` for `ride_tunetank.py` (one constant), then re-run the ride brief's build. A changed `T2` is not
applied (it is derived from the start pulse). A changed `T0` on the opening preset maps to `soundtrack.py`'s
`T0`. A whole-file `diff` should show only that block; anything more is a tool bug, not a change by Nathan.

## Testing

`node av-align.test.mjs` (from this folder; node 18 or later, no dependencies). It extracts the pure
functions from the page and checks frame/time maths, nudges, onset detection, peak bins, and that the
config block round-trips byte-for-byte. It cannot test playback or the UI.
