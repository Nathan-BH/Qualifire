# Review of the Gemini "stem splitter" chat export — 2026-09-24

Source reviewed: `C:\Users\natha\Downloads\gemini stemplitter export.pdf` (a copy is in
`marketing/cycles/18_stemsplitter-first-pass/`). Context: cycle 16, where
`tunetank-emotional-classical-484234.mp3` (15.05 s, stereo, lossy) is the bed under both rides
at `GAIN_BED = 0.45`, with the Salamander E5 piano pulses layered on top of ride 2.

## Verdict in one line

Gemini names the right kind of tool (stem separation) but its main recommendation is off: UVR5 with
Demucs v4 6-stem does **not** give you a strings stem, so it will not reproduce what impressed you
in LALAL.AI. The tool it missed, **MVSEP**, has a dedicated bowed-strings model and a free tier:
try that first. It takes about 5 minutes and needs no install.

## Where Gemini is right

- The general landscape is right: LALAL.AI, Moises, Fadr and BandLab are real stem splitters, and
  4-stem tools (Moises, BandLab, audio.com) put strings in "Other". That explains why only LALAL
  worked for you.
- LALAL.AI really does have a strings stem, and its free tier is preview-only (about 10 s of
  output, no full downloads). The cheapest paid plan is about $15/month.
- UVR5 is free, open source, local and unlimited, and it outputs lossless WAV.

## Where Gemini is wrong or overpromising

1. **"LALAL runs Demucs."** It doesn't. LALAL uses its own proprietary models (Phoenix / Orion).
   So nothing in UVR5 is "the exact model LALAL charges for".
2. **"UVR5 + Demucs v4 6-stem matches LALAL."** htdemucs_6s splits into drums / bass / vocals /
   guitar / piano / other. There is **no strings stem**. Strings, pads, swooshes and anything
   else unclassified all land in "other". The Demucs authors also say the 6-stem piano source
   "is not working great", with "a lot of bleeding and artifacts". The repo is no longer
   actively maintained.
3. **"Other = strings."** That is only true if the track contains nothing but strings,
   piano, drums and bass. For a cinematic "emotional classical" stock cue it is a gamble.
4. **It missed MVSEP.** mvsep.com offers "MVSep Bowed Strings" (strings / other) plus separate
   violin, viola, cello and double-bass models and a Roformer-based piano model. The free tier
   showed 50 separations per day. Output is MP3 320 without an account; lossless WAV needs a
   (free) registration.

## How feasible is the UVR5 route?

Technically easy but a poor fit for this repo:

- It is a Windows GUI installer of about 1-2 GB. A 15 s clip separates in well under a minute
  even on CPU. Getting the first stem out takes about 20-30 min all in.
- It is GUI-only, so there is no reproducible command for `cycles/.../` docs. The scriptable
  version is the `audio-separator` Python package, which needs PyTorch on your Windows PC.
  Neither the cloud sandbox (no PyPI) nor the device VM (2 cores, no torch) can run it.
- Its best available result for your goal is still "other" = strings + everything unclassified.

## Is it worth the hassle just for the strings?

Only if there is a concrete job for a strings-only (or piano-removed) bed. The one I can see in
cycle 16 is **ride 2**, where the track's own piano sits under your Salamander E5 piano pulses.
A strings-only bed there would let the gate pulses read cleanly, with no piano against piano. If
the current `ride/soundv2` mix already reads well to you, the answer is **no**.

Points in favour if you do want it: the bed plays at 0.45 gain, under video, in stereo.
Separation artifacts (smearing, faint bleed) that are obvious when soloed mostly disappear there.
The source is also a lossy MP3, so no stem will be pristine anyway.

## Recommended order

1. **MVSEP, free, in the browser:** upload the Tunetank MP3 and run "MVSep Bowed Strings". If
   you care about lossless output, register (free) and download WAV. Listen to the strings stem
   soloed, then under `ride_v2.mp4`.
2. Good enough → drop it next to the source as
   `piano/projects/tunetank-ride/sources/tunetank-...-strings.wav` and brief a round that
   swaps `BED_MP3` for ride 2 only (a small change in `ride_tunetank.py`).
3. Not good enough → before installing anything, try LALAL's 10 s preview on the ride-2
   window as a comparison. Pay for one month only if it is clearly better.
4. UVR5 only if you want an offline, unlimited tool for many future tracks. It's not worth it for
   this single 15 s clip.

Licence note: the stems are derived from the same Tunetank file you recorded as free to use. No
new licence question is added, but the stems carry the same terms.

## Sources

- Demucs README (6-stem piano caveat, maintenance status): https://github.com/adefossez/demucs
- MVSEP model list and free tier: https://mvsep.com/en
- LALAL.AI stems / free tier / pricing / proprietary model: https://stemsplit.io/blog/lalal-ai-review
