# Cycle 18: stemsplitter, first pass (MVSEP stems of the ride's Tunetank bed)

**Status (2026-09-24): analysis only, done.** Nothing in any render, script or `all-renders/`
changed. The one edit outside `audio-studio/stemsplitter/` and this folder is a dated pointer
line at the top of `../16_ride-tunetank-soundtrack/README.md`. Open decisions for Nathan are in
`OPEN-ITEMS.md`.

The work itself lives in **`marketing/audio-studio/stemsplitter/`** (its `README.md` indexes it and
logs it). This cycle folder records what was done and why, following the conventions in
`../README.md`.

## What Nathan asked, verbatim, in order

1. "Ive added the \"…\\Downloads\\gemini stemplitter export.pdf\" file which is an export from a
   gemini chat convo. Do you agree with its findings ? How feasable would the UVR5 route be ? Is
   it actually worth the hassle just to get the strings separated ? based on the work i am doing
   in \"…\\marketing\\cycles\\16_ride-tunetank-soundtrack\" — save your review to the new
   \"…\\marketing\\audio-studio\\stemsplitter\" i just made"
2. "i was able to get \"…\\Downloads\\mvsep-tunetank-emotional-classical- strings vs other\" and
   \"…\\Downloads\\mvsep-tunetank-emotional-classical- fuller analysis\". Have a look at the files in
   there, give them simpler names and analyze their waveform similar to the
   \"…\\audio-studio\\piano\\projects\\tunetank\" project" + (mid-task) "log all of it in the
   \"…\\stemsplitter\" folder. Organize it properly"
3. "do you agree that the vocals and guitar tracks are empty based on the analysis"
4. "add all of this first pass on the stempslitter as a new cycle018 in the \"…\\marketing\\cycles\" folder"
5. "based on the split waveforms of the emotional-classical tune. Do you feel like you can get a \"feeling\" of what the music sound like ?" → then: "if you can yes [the chord read], but i am already happy with your current description. Make sure you just save it as well for future reference"

## What was done

| step | result | where |
|---|---|---|
| Review of the Gemini export | Partly agree. UVR5 + Demucs 6-stem has **no strings stem** (strings land in "other"; Demucs' own README calls its piano stem weak). LALAL does not run Demucs. Gemini missed **MVSEP**, which has a Bowed Strings model and a free tier. Recommended trying MVSEP first. | `audio-studio/stemsplitter/REVIEW-gemini-stemsplitter.md`; source PDF copied here from Downloads: `gemini stemplitter export.pdf` |
| Nathan ran MVSEP (2026-09-23) | two jobs: MVSep Strings (strings / other) and bs6stem (vocals, drums, bass, guitar, piano, other + instrum) | `Downloads/mvsep-tunetank-emotional-classical- …/` |
| Rename + file | 9 stems renamed in place in Downloads (`strings-model_*.mp3`, `6stem_*.mp3`), copied with `original.mp3` into the project; rename map logged | `stemsplitter/README.md`; `stemsplitter/tunetank-emotional-classical/sources/` |
| Waveform analysis | `analyze_stems.py` (levels, energy share, reconstruction residuals, windowed RMS, `figures/stems_overview.png`) + per-stem `figures/waveform_*.png` via `piano/projects/tunetank/make_waveform.py` | `stemsplitter/tunetank-emotional-classical/` (`WAVEFORM-NOTES.md` = findings) |
| Vocals / guitar check | Both stems are silent (RMS −111.7 / −102.3 dBFS, peak ≈ −80 dBFS). "No vocals" is certain. "No guitar" is very likely: the strings split rebuilds the original to −36.7 dB with no separate plucked line, but a soft pluck could in principle sit in "other". | `WAVEFORM-NOTES.md`, "Empty stems" section |

## Key findings (full detail in `WAVEFORM-NOTES.md`)

- The track is strings (sustained 1.26–11.1 s), **five piano chords every 2.45 s** (1.24 / 3.70 /
  6.15 / 8.60 / 11.05 s), light percussion and bass. The 0–1.26 s swell is drums/other.
- The "decrescendo" from 11.1 s is **piano chord 5 ringing out**, not an ensemble fade. The strings
  are gone by 11.9 s.
- The strings-model split is clean: strings + other rebuild the original to −36.7 dB (6-stem: −29.1 dB).
- **Harmony (follow-up, same day):** **Am – F – C – G – Am** (vi–IV–I–V in C, key A minor / C
  major), read from the chroma of the piano, strings and bass stems, which agree on every chord
  (`chroma_stems.py`). The E5 gate pulse is an E: it belongs to Am and C and is a passing tone on F and G.
- **What it sounds like** (from the stems, not listened to): a slow, steady cue, a swell into sustained
  strings under a piano chord every 2.45 s, percussion the only thing building, ending on a lone
  ringing Am piano chord. Reflective/bittersweet. Written up in `WAVEFORM-NOTES.md`.
- **Ride 2 clash:** with `T2 = 16.54` the track's chords land at 17.78 / 20.24 / 22.69 / 25.14,
  while the E5 gate pulses are at 17.80 / 19.81 / 21.65 / 23.51 / 25.38. Two piano parts sit on
  two rhythms (2.45 s vs ~1.86 s). A bed without the track's piano for ride 2 removes the clash.

## Model-tier readout

Direct execution, cycle-05 style: research, file renaming and analysis only. No code landed in
the app, no briefs, no subagents.

| tier | model | tokens | outcome |
|---|---|---|---|
| coordinator (direct) | Opus 5.5 | ~100k over the four requests | review, rename, analysis, cycle log |
