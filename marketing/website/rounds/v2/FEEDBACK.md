# Website — Round v2

**Snapshot:** index_v2.html (byte-identical to `website/index.html` as of 2026-09-14,
26,860 bytes, 685 lines).
**Date:** 2026-09-14.
**Source:** ../../index.html (the live page; identical to this snapshot at v2).

## What changed since v1
**Part A: Deletions**
- Hero pitch paragraph ("Press start. Ride. Save...") removed. Hero is now mark +
  kicker + H1 + Start button + scroll hint. `.hero h1` bottom margin changed to
  `28px` to keep spacing; the dead `.hero .pitch` CSS rule removed.
- Hero tagline ("Quali + fire...") removed, along with the dead `.hero-sig` and
  `.hero-sig b` CSS rules.
- The whole "While you ride, race mode" section (`#live`, the mocked sector clock
  and pulsing sector strip) removed: mocked HUD not verified against the real ride
  screen, copy was adjectives not mechanism, and the loop is already covered by the
  sections around it. Its CSS block, its two mobile-media-query lines, its
  reduced-motion line, and its IntersectionObserver script block were all removed.
  `#colour` picked up a `border-top` to keep the visual break that `#live` used to
  provide between `#mechanic` and `#colour`.
- "A slow lap is time posted." line removed from the philosophy section (standing
  rule: never "time posted").

**Part B: Em-dash sweep**
Every em-dash in the file replaced with a period, colon or comma per the standing
rule (title, meta description, three CSS comments, one aria-label, prose
throughout). `grep -c "—"` on the file now prints 0 (also 0 for `&mdash;`,
`&#8212;`, and en-dash `–`). The five bare `<div>—</div>` placeholders in tower
rows P1, P3, P4, P5, P6 became empty `<div></div>`; P2 ("Today"), the "3 more
laps" row and P10 ("Slowest of the window") were untouched.

**Part C: "How it works" section**
- H2 changed from "Same road. New meaning." (a duplicate of the hero H1, now
  glaring without the pitch between them) to "One ride sets the route. Every ride
  after it is timed." (Fable call, not asked for by Nathan.)
- The three step paragraphs rewritten shorter, more concrete, formal register, all
  em-dash-free. `.step p` font-size dropped to `.85rem` with `line-height:1.45`.
- The flat linear schematic SVG (GATE 1/2/3 labels, `#rideranim` dot) replaced with
  a real map render: the OpenFreeMap dark basemap plus an SVG overlay tracing the
  same route geometry, gate fractions (0.24/0.63/0.84) and tick style as
  `marketing/silent-studio/gates-saving/index.html`, with coordinates precomputed
  so no placement script is needed. A blue rider circle animates along the route
  via SMIL `animateMotion` (12s/lap), paused off-screen or under reduced motion by
  a small IntersectionObserver script (replaces the old sector-strip observer that
  the removed `#live` section used).
- New asset `website/assets/map.png`: the 3840x2160 source PNG downscaled to
  1920x1080 with PIL LANCZOS (800,809 bytes from PIL); final size on disk is
  806,579 bytes, the difference being an Anthropic C2PA manifest chunk stamped
  on commit (pixel data identical). Committed to both `website/assets/map.png`
  and `website/rounds/v2/assets/map.png` — the two on-disk copies are
  pixel-identical but not byte-identical, since each carries its own stamped
  manifest.

**Part D: "After you ride" section**
- Tower intro paragraph rewritten: explains the rolling ten-ride window and that
  the top spot always comes back within reach, instead of the old "No delta plot"
  framing.

**Part E: The colours section**
- Kicker: "Earned colour" to "The colours".
- H2: "How today's ride gets its colour." to "What each colour means." (Fable
  call, not asked for by Nathan.)
- Three swatch paragraphs rewritten plain and short (purple = best, green =
  better than average, yellow = below average), each opening with a bolded label
  (`<strong>`). New CSS rule `.swatch p strong{ color:var(--ink); }` added.
- Noise-floor callout rewritten em-dash-free, same underlying logic (first ride
  plain, second ride can go purple/yellow, third ride on green joins in).

## What you'll see, in order
1. Hero: animated Q mark, kicker "A bit better every day", H1 "Same road. New
   meaning.", Start button, scroll hint. No pitch paragraph, no tagline.
2. How it works: intro, three shorter step paragraphs, a real dark map render with
   a yellow route line, three white gate ticks and a blue rider circle looping
   along it.
3. The colours: three swatches (purple, green, yellow), each with a bolded label
   and a one-line plain explanation, and a callout on when colour first appears.
4. After you ride: the timing tower (P1 to P10, dash placeholders now empty) and
   four sector cards.
5. Philosophy: two bold lines (the "time posted" line is gone).
6. Footer.

No "While you ride, race mode" section; it sat between "How it works" and "The
colours" in v1 and is fully removed.

## Things to check
- Hero without the pitch: does it feel bare or clean?
- The new `#mechanic` H2 ("One ride sets the route. Every ride after it is
  timed.") and the new `#colour` H2 ("What each colour means.") — both Fable
  calls, not asked for by Nathan.
- Dark basemap in day mode: v2 ships the dark OpenFreeMap capture in both themes
  (see top-level `FEEDBACK.md` "Open preferences"). A day/positron capture is a
  later round if Nathan wants one.
- The philosophy line "Your only rival is the last ten versions of you." was
  kept; it echoes wording from the deleted pitch paragraph. Say if it should go
  too.
- Rider loop speed (12s per lap) and gate-tick legibility at phone width.
- The `<title>` now uses a pipe: "Qualifire | Same road. New meaning."

## Nathan's feedback
<!-- write your notes below; anything site-wide goes in ../../FEEDBACK.md instead -->
