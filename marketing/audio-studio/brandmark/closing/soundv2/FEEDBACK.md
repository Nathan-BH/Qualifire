# brandmark/closing — soundv2

**Render:** closing_v3_with_sound_v2.mp4 — **NOT YET BUILT.** brandmark/closing's
visual v3 (the "tighter, more together" redesign — see
`../../../silent-studio/brandmark/closing/rounds/v3/FEEDBACK.md`) hasn't been
rendered by Nathan yet (device_bash was unreachable this session, so nothing
could render on his PC). This round ships the standalone `soundtrack_v2.wav`
only, built against v3's planned timeline (read directly from its
`index.html`, not a render). **Once Nathan renders `closing_v3.mp4`** (see
that FEEDBACK.md for the render.ps1 command) and it lands in
`../../all-renders/`, mux this wav onto it — same one-line ffmpeg mux every
other round in this folder uses — to finish this round properly.
**Also here:** `soundtrack_v2.wav` — the soundtrack alone.
**Script that made it:** `../soundtrack.py` (canonical, see `../../structure.md`;
draws on the shared `../../synth.py` toolkit — see brandmark/opening/soundv2's
FEEDBACK.md for what's new there this round).
**Source:** v3's planned timeline (4.0s, 1920x1080) — mark/wordmark/tagline all
arrive within 0.75s now, instead of v2's ~1.9s staggered reveal.
**Built:** 2026-09-13
**Previous round:** `../soundv1/FEEDBACK.md`

## What this is

Nathan's soundv1 feedback: "Should use the same Netflix type sound as In the
beginning to close it off." soundv1 deliberately played only the quiet
"landing" half of the brand chime, as an understated echo of the opening —
that restraint is gone. This round plays the **full two-beat brand stinger**
from brandmark/opening's soundv2 (the low boom + the bright ring — see
`synth.py`'s `BRAND_STINGER_LOW`/`BRAND_STINGER_HIGH`), timed to the now-tight
v3 reveal: beat 1 at 0.0s (as the mark/wordmark arrive together), beat 2 at
0.35s (as the tagline lands) — the identical brand sound at both ends of the
video, played in full this time rather than cut down for the close.

## What changed since v1
- Replaced the quiet landing-chord-only chime with the full two-beat BRAND_STINGER (same low boom + bright ring as brandmark/opening/soundv2).
- Re-timed to v3's tightened visual reveal (beats at 0.0s / 0.35s instead of the old ~1.3s single chime).
- Sustained pad tail extended so the close still rings through the 0.75-3.5s hold before the visual fade-to-black.

## What to listen for
- Whether reusing the *exact same* stinger (not a variation) reads as "closing the loop" the way Nathan asked, or feels too repetitive so close to opening in a short teaser.
- Once Nathan's v3 render lands and this gets muxed on: whether the 0.35s gap between beats (tightened from opening's 0.4s to match closing's faster reveal) still reads clearly at this shorter spacing.

## Nathan's feedback
<!-- write your notes below -->
