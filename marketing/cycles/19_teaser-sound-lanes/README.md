# Cycle 19 — teaser sound lanes

Goal: a new, simple, single-page tool (`marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html`) that plays the silent
teaser (`teaser_v9.mp4`) on the LEFT (readout, transport, clip editor under it) and nine long sound lanes on the RIGHT, full height, on one playhead
(Nathan, later the same day: "the tracks themself are long shaped while the video itself is more square"; below 1100 px wide it stacks) — the opening piano logo, the emotional-classical
bed (original), the same bed split two ways (A: strings + other; B: piano + drums + bass + other) and the five E5 gate pulses —
each lane with its own source clock next to the render clock, mute/solo, typed clip placements (source in–out → render start),
and a plain-words clip list to paste into chat. The tool plays live and writes no audio. The old av-align tool stays untouched.

## Files in this folder

| File | What |
|---|---|
| `REQUIREMENTS-from-nathan.md` | Nathan's words (binding) |
| `DIGEST-B-assets-and-constants.md` | asset inventory + today's placement constants (note: pulse 4 "29.81" is a typo, it is 30.01; "15.073 s" stems are 15.0465 s once decoded) |
| `BRIEF-teaser-sound-lanes.md` | the executor brief (Plan tier, Fable 5.1). §0 is the plain-language summary for Nathan; §13 lists the taste decisions taken for him |
| `EXEC-REPORT.md` | written by the Sonnet executor, phase by phase (A core+tests, B prep script+kit, C page, D synthetic checks, E real media) |
| `prep-report.txt` | copy of the kit build report (sample counts, alignment lags, master reproduction diff) |
| `shots/` | Playwright screenshots looked at during verification |
| `INSPECT-REPORT.md` | written by the fresh-context Opus inspector |

Digest A (av-align code) was never written; Plan read the av-align source anchors directly and recorded them in the brief §2.

## Status rows (coordinator fills)

| date | tier | model | tokens | outcome |
|---|---|---|---|---|
| 2026-09-24 | Plan | Fable 5.1 | — | brief written |
