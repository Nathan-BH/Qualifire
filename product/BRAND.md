# BRAND — what Qualifire is, and how the design should say it

Author: Designer · 2026-08-15 (original draft) · rewritten 2026-08-24 (cycle 024, WP-I)
Status: ACTIVE — rewritten 2026-08-24 (cycle 024) per Nathan's rulings in `Nathan/Nathan's_notes1.md`; supersedes the 2026-08-15 PROPOSED draft.
Feeds: logo concepts (`product/brand/`), two-mode theming (Nathan's "race mode" idea), D-013 palette.

## The story

Qualifire turns your own daily riding into a qualifying lap. Not racing other people
(D-010: never compare different roads, never other riders), not fitness (no calories,
no streaks, no averages — D-013's history screen is deliberately "mostly flat"). You,
racing yourself, on your own routes — and the only opponent is the rolling comparison
window of your recent rides (D-030/D-037: the last 10 comparable rides on that route).

The core emotional loop the design must serve:

1. **The ritual.** Same road, again and again — your daily trajects, not just commutes,
   made more fun, exciting, playful to ride. A bit better every day, by pushing
   yourself. Press START; the app watches for the line only it can see. The ride is
   unchanged — the *meaning* of the ride is new.
2. **Earned colour.** A sector is yellow just for happening; green when it beats your
   recent average; purple when it beats the best of your last 10 rides on that route —
   beyond a measured noise floor, so a colour can never be luck-of-the-GPS. The app's
   restraint is what makes the purple moment worth chasing.
3. **No failure state.** A slow lap is "time posted". A red light is "‖", not a
   scolding. The app never punishes; it only occasionally celebrates. No red anywhere,
   full stop (D-013) — livery red was tried and dropped by Nathan the same day it was
   proposed (`app/src/ui/theme.ts`: "tried and DROPPED the same day — do not
   reintroduce red anywhere").
4. **The instrument, not the coach.** While moving, the app is an inert timing
   instrument: zero touch targets, sound carries the story (D-019's E-major earcons),
   one glance maximum (D-006). It behaves like a pit wall, not a personal trainer.

**The tagline.** "Same road. New meaning." (Nathan: "perfectly on track with the brand
image") — the ride doesn't change, what it means to you does.

**The name.** Quali + fire: the qualifying lap, and the rare moment a sector lights
up. The "fire" is not aggression — it is the lit-up timing chip.

**F1 vocabulary stays internal.** Sectors, tower, quali, paddock/race mode — all fine
inside the team's and app's own docs (this file included). Outward-facing copy (the
website, App Store text, anything a stranger reads) doesn't name-drop F1; it leads
with self-improvement and making your own routes more fun.

## Why colour

Colour is used here because colours are easy, intuitive and relatable to something
that exists (Nathan's own reasoning). Purple, green and neutral keep their roles from
D-030: purple beats your best-10, green beats your recent average, yellow/neutral is
an ordinary lap, honestly reported. The honesty rule stands unchanged: no colour a
sector hasn't earned.

## Design principles derived

**P1 — Two states: paddock and race** (Nathan's direction, 2026-08-15; theming
confirmed and expanded 2026-08-24). The app lives in two moods, and — as shipped —
each mood has both a **daylight** and a **night** theme; daylight is the app default,
night is user-selectable (a toggle on the Record screen, persisted). Nathan: "happy
with the current night and day designs and they could be expanded with more themes in
the future."
- **Paddock** (home, rides, history, setup, board review): warmer, livelier — daylight
  ground `#FAF7EE` or night ground `#17171b`, the signature yellow `#F5C542` allowed in
  chrome (active tab, START border, section accents).
- **Race** (live screen, and Record while recording): drops to the theme's race
  surface — near-black `#0A0A0A` at night, clean white `#FFFFFF` in daylight — chrome
  recedes, tier colours become the only colour on screen, maximum contrast where a
  glance must land in under a second.
The transition is automatic (recording starts → race mode); no toggle to fiddle with
on the move.

**P2 — Colour hierarchy is meaning hierarchy.** Tier colours (purple > green >
yellow) always outrank identity colour. The signature yellow doubles as the neutral
tier — deliberate: the brand colour is the "time posted" colour, the app's default
temperature. Purple/green appear in chrome *never*; they are earned surfaces only.
Grey stays reserved for no-data.

**P3 — Numbers are the hero.** Heavy (800) tabular numerals at display sizes; labels
are small, uppercase, letterspaced servants. Any screen should be readable as a timing
tower from arm's length.

**P4 — The gate is the mark.** The one proprietary visual idea Qualifire owns is the
*gate line crossed at speed* — a chainage value, drawn perpendicular across a path.
The logo should come from this (or from the sector strip / lap ring), not from generic
bike/speed clichés.

## Motion (Nathan 2026-08-15: "the mark is built for animation" — ratified, more uses wanted)

The mark's two parts are the app's two nouns — ring = lap, slash = gate — so every
animation is a sentence, not decoration. Canonical uses (storyboard:
`brand/board_12_motion.png`): **app launch** — ring draws clockwise from the start
tick, slash lands last; **START pressed** — the yellow slab collapses into the slash
striking the ring (gates armed), screen drops to race mode; **tab switch** — the
active-tab bar *is* the slash, sliding between tabs with a 45° tilt mid-flight;
**final gate** — ring pulses once in the lap-tier colour, board slides in. This launch
animation is now built and shipped (`app/src/ui/launchAnimation.tsx`,
`launchChoreo.ts`, cycle 024 WP-A2) — Nathan asked for MORE uses of it
(`Nathan/Nathan's_notes2.md`, 2026-08-19), which is still open work. Hard rule: motion
lives in paddock and transitions only; while riding nothing moves except numbers
(D-006).

## Reference panels

`brand/brandboard.png` (+ `board_01..12`, regenerated by `make_brandboard.py`):
identity applied to every current surface, the race surfaces, sector-context palette
comparison, and the motion storyboard. Iterate design ideas against these panels
before touching app code.

## Logo brief (for the 5 concepts)

- Must read at launcher-icon size (48 dp, circular mask) and as an in-app wordmark
  companion.
- Palette: `#17171b` night ground / `#FAF7EE` daylight ground, warm ink, structural
  yellow `#F5C542`; at most one concept may use the full tier trio.
- No red, no wings, no generic bicycles, no speedometer needles.
- Should encode at least one of: the gate line, the Q of quali, the four-slot sector
  strip, the lap ring, the flying-start.
