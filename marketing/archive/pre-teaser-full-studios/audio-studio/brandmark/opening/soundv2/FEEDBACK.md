# brandmark/opening — soundv2

**Render:** opening_v3_with_sound_v2.mp4 — the same picked render (opening_v3.mp4,
unchanged) with this round's soundtrack muxed on.
**Also here:** `soundtrack_v2.wav` — the soundtrack alone.
**Script that made it:** `../soundtrack.py` (canonical — edited in place, see
`../../structure.md`; draws on the shared `../../synth.py` toolkit, which gained
two new building blocks this round: `sweep()` and `sub_hit()`, plus the shared
`BRAND_STINGER_LOW`/`BRAND_STINGER_HIGH` constants).
**Source video:** `../../all-renders/opening_v3.mp4` (6.5s, 1920x1080, no audio — unchanged)
**Built:** 2026-09-13
**Previous round:** `../soundv1/FEEDBACK.md`

## What this is

v2 answers both of Nathan's soundv1 notes:

1. **The logo's two-part draw now has its own sound.** The ring-draw (0.0-1.3s)
   gets a rising pitch sweep (220→660Hz) that tracks the stroke being drawn on,
   answered by a short swoosh (1.3-1.8s) as the slash/gate fades in — "a sound
   for the drawing and then a kind of swoosh for the gate," as asked.
2. **The wordmark+tagline reveal is now a clean two-beat sound, not a chime pair.**
   The old BRAND_CHIME_RISE (~3.0s) + BRAND_CHIME_LAND (~4.3s) — which didn't
   even line up with this file's actual timing — is replaced by a new shared
   **brand stinger**: a low boom (`sub_hit`, at `BRAND_STINGER_LOW`) on the
   wordmark (2.95s), answered 0.4s later by a bright ring (`chime` at
   `BRAND_STINGER_HIGH`, which reuses `BRAND_CHIME_LAND`'s three notes) on the
   tagline (3.35s) — exactly two beats, "similarly to the Netflix sound,"
   for the two things (wordmark, tagline) appearing right after each other.
   Closing's own soundv2 reuses this identical stinger in full, so both ends
   of the video now share one recognizable brand sound.

## What changed since v1
- Ring-draw (0-1.3s): silence → rising pitch sweep.
- Slash/gate fade-in (1.3-1.8s): silence → short swoosh.
- Wordmark+tagline (2.95s/3.35s): BRAND_CHIME_RISE+LAND pair → two-beat BRAND_STINGER (sub_hit + chime).
- Trailing shimmer plucks (5.0s+): unchanged.
- `synth.py` gained `sweep()`, `sub_hit()`, `BRAND_STINGER_LOW`, `BRAND_STINGER_HIGH` — all reusable elsewhere (gates-saving's "gate draw" motif is conceptually related, though it uses its own whoosh rather than this exact sweep).

## What to listen for
- Whether the ring-draw sweep reads as "the logo being drawn" or just as an abstract rising tone — first time this technique's been used.
- Whether the two-beat stinger actually lands as "Netflix-like" — the 0.4s gap between beats is a judgment call, shorten/lengthen if it doesn't feel right.
- Balance between the drawing sweep/swoosh (0-1.8s) and the stinger (2.95-3.35s) now that both live in the same short clip.

## Nathan's feedback
<!-- write your notes below -->
