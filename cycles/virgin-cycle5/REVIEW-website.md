# REVIEW — marketing/ (the website) against virgin's current state

**Tier:** Plan (Fable) · 2026-09-08 · virgin-cycle5
**Scope:** `marketing/index.html` (copy + structure, not the CSS), `marketing/HYPERFRAMES-PLAN.md`,
`marketing/hyperframes/teaser/`, `marketing/README.md` — all copied unchanged from `main` in
`0fb4a1c`. Cross-checked against `product/BRAND.md` (voice rules), `STATE.md`, `GLOSSARY.md`,
`OPEN-ITEMS.md`, and the app code where a claim on the site is a claim about behaviour
(`app/src/ui/colourModel.ts`, `app/src/location/index.ts`, `app/src/ui/tower.tsx`,
`app/src/store/routeCreation.ts`, `app/src/store/gateSeeding.ts`).
**Nothing was edited.** This is the assessment; the plan is `BRIEF-website-improvement-plan.md`.

---

## Verdict in four lines

The site is a good piece of writing that is still on-brand and still right about the core
mechanic (sectors, last-10 window, earned colour, no failure state). It is wrong about
*who the app is for* — it describes a closed, one-person, archive-fed tool, which was true on
`main` and is exactly what virgin has moved away from — and it has one outright break (the
live demo embeds a file that does not exist on this branch) plus a handful of small claims that
are `main`-era or never shipped. Nothing here needs a rewrite from scratch; the bones hold.

## What still holds up (keep these — do not "improve" them away)

- **The copy is good.** The three-step mechanic (lines 607–624), the "Recent you, not peak
  you" line, "styled as *time posted*, not failure", "Most laps are yellow. That's fine." —
  these are the best sentences the project has about itself. Every one of them is inside
  `BRAND.md`'s voice: self-improvement first, no scarcity, no scolding, no F1 name-dropping
  beyond what the name itself carries.
- **The "last ten" framing is still exactly right.** `colourModel.ts` still has
  `WINDOW_N = 10` / `WINDOW_PREV = 9` (judged ride + 9 previous, "P_n of 10, never of 11").
  The site's "the last ten versions of you", "P2 of your last 10", the colour section's
  "your last 10 rides" all match the code and `GLOSSARY.md`'s Tier entry. Purple = beats the
  window's best, green = beats its average, yellow = the rest: correct, and in the right order.
- **Brand compliance is real, not cosmetic.** Day/night toggle persisted in `localStorage`
  (mirrors P1's two-mode theming); the race-mode section drops to a near-black surface where
  tier colours are the only colour (P1 race state); 800-weight tabular numerals everywhere
  a time is shown (P3); the ring+slash mark with the draw-then-land animation (Motion
  section); no red anywhere; purple/green used only on earned surfaces (P2). The site is
  arguably the cleanest single expression of `BRAND.md` in the repo.
- **"Same road. New meaning."** — the ratified tagline — is present (h2 of the mechanic
  section, line 605).
- **The footer's honesty stance** ("Not available on any app store. Not a company. Not for
  sale. This page is a mock") is the right register and still true on virgin. Only its
  *audience* clause is stale (below).
- The schematic (start → three gates → finish, four sectors) still matches the ground rule
  (exactly 4 sectors, gates at 25/50/75 %).

## What is out of step, most important first

### 1. Positioning: the site pitches a closed tool; virgin's top goal is "someone else can use this"

This is the gap Nathan is pointing at. Every sentence assumes the reader *is* Nathan:

- Footer (line 829): *"It runs off a single archive of one person's own commute data"* —
  false on virgin. The Preview APK is permanently blank-seed (build7); the 624-ride archive
  stays on `main`. A stranger installing this gets 0 sports, 0 routes, 0 rides.
- Footer (line 830): *"not to sell it to anyone but its one user"* — contradicts `STATE.md`'s
  goal ("a working prototype Nathan can hand to someone else… a top-priority goal, not just a
  design lens") and `README.md` ("someone else can use this from a blank install").
- Hero (line 596): *"Load the routes you already ride"* — there is nothing to load. On virgin
  a route is *made from* your first ride: the naming card at STOP creates landmarks + Route +
  Way, marks that ride as the reference, seeds four gates from it. This is the single
  strongest "how would a stranger even start" answer the app has, and the site does not know
  it exists. Mechanic step 3 ("timed against your last 10") compounds it by implying you
  need ten laps of history before anything happens.
- Nowhere: sports, the blank first launch, what the first ride looks like, export/import
  (parked — correctly absent), "give this to a friend".

To be clear: `STATE.md`'s ground rules still say "single-user personal app, no accounts, no
social, no store distribution" — the shift is *capability* (a blank install is usable by a
stranger), not a product pivot. So the site's personal register is not wrong; it is
*narrower than the truth*. Whether the site should lead with the new capability, mention it,
or stay personal and just stop contradicting it is a taste call — laid out in the brief.

### 2. The live demo is broken on this branch

Section `#demo` (lines 638–670) iframes `../demos/mockup.html`. `demos/` does not exist on
virgin (this cycle's GLOSSARY rewrite cut the same reference for the same reason). Result:
a "Try it live" section with an empty frame, and the sticky header's *"Try it out"* CTA
scrolls to it. The HTML comment in that section is the only place on the site that spells
out the dependency, so it is easy to miss when reading rendered output. This is not a
positioning question; it is a bug.

### 3. Claims about behaviour that are `main`-era, never-shipped, or overstated

- **"E-major earcons"** (race-mode caption, line 703; also implied in "Sound carries the
  story"). What ships is a 70 ms `Vibration.vibrate` at each gate crossing
  (`app/src/location/index.ts` ~line 483: "Earcons are build 3 (expo-audio); until then the
  buzz is the whole audio channel"). SETTINGS labels the toggle "Earcons — a short buzz at
  each gate crossing." The *design* (BRAND.md, D-019) is E-major tones; the *app* buzzes.
  The site states the design as fact.
- **Timing-tower mock** (lines 750–806): shows a P1 row labelled *"Reference lap"* with a
  `REF` badge and an *"Ideal lap · best sectors combined"* line. Neither exists on virgin:
  `tower.tsx` renders `P# · time (+ PB ●) · gap · date`; "REFERENCE SET" is a frame in the
  Preview demo only; there is no ideal-lap concept anywhere in `app/src`. On virgin a
  "reference ride" means *the ride the way's line and gates were built from* (ride 1) — not
  the fastest lap — so labelling P1 "Reference lap" now actively teaches the wrong meaning.
- **Gate placement** (step 2, line 617): *"downstream of junctions, never at stop lines"*.
  Implemented: 25/50/75 % chainage, nudged ≤ 250 m to a point ≥ 150 m clear of wherever the
  *single* reference ride sat still ≥ 20 s — honestly flagged `origin: 'geometric'`
  (`gateSeeding.ts`, STATE.md "Known stubs"). "Never at stop lines" is a promise the app does
  not make; "downstream of junctions" is not what it does.
- **Noise floor** (line 733): *"Fewer than five comparable rides… stays plain ink"*. This one
  is *accurate to the code* (`MIN_HISTORY = 5`, `tierFor` returns `'neutral'` below it) and
  to `BRAND.md` ("beyond a measured noise floor") — but `STATE.md`'s ground rule now says
  "No noise floor: a way's first-ever ride logs all-purple sectors… one prior ride compares
  purple/yellow", and `routeCreation.ts` line 24 says deriving ride 1 into that first
  all-purple lap is "STILL deferred". So the site agrees with today's build and disagrees
  with the stated rule. Not the site's problem to resolve — but whoever edits the colour
  section must not "fix" it in either direction without checking which one is true on the
  day. Flagged, not counted against the site.
- **Meta description** (line 7): *"everyday bike routes"*. Virgin is multi-sport with
  user-named sports (`SPORT_LABEL_PLACEHOLDER = 'e.g. Bike, Run, Walk, E-bike, Fast walk'`).
  Minor, but it is the one line search engines and link previews show.

### 4. Silences — and which ones actually matter

- **Multi-sport.** The hero, title, teaser and tower mock all say *commute*. `BRAND.md`
  already says "your daily trajects, not just commutes"; virgin adds Run/Walk. The hero h1
  ("The commute, reframed as a qualifying lap.") is the site's most-repeated line (title,
  meta, teaser video) and is now the narrowest thing on the page. Whether to widen it is a
  positioning call, not a fact fix — but it is worth noting the ratified tagline "Same road.
  New meaning." is already sport-neutral and currently sits in second place.
- **RESULTS tab (board → all-time ranked history → last-9 scatterplot).** Not mentioned.
  Judgment: it does *not* need its own section. The tower section already sells the idea
  ("your lap slots into a ranked classification of your own last rides"), and a landing page
  that enumerates tabs reads like a manual. The one thing worth knowing: virgin's RESULTS
  history is *all-time* ranked (no tier colours, provisional); the *last-10* pool is the
  RECORD-screen tower. The site's "of your last 10" is therefore still the right claim as
  long as it stays attached to the post-ride moment, not to a "history" screen.
- **Way vs route.** Site says "routes" throughout, generically. Fine — `STATE.md` notes the
  browse tab is still called ROUTES and the way/route distinction is internal vocabulary. Do
  not introduce "way" to the site.
- **Raw vs moving timing, export/import, reset-to-virgin, gate adjustment UI.** Correctly
  absent. Leave them to the app.

### 5. HYPERFRAMES-PLAN.md and the teaser

- Idea 5 ("624 commutes") is explicitly "the one idea that has to use real data" and sources
  `data/activities/` (624 GPX), `app/assets/routes/`, `data/analysis/` — none of which are on
  virgin (the archive stays on `main`; the bundled route PNGs were emptied on virgin builds by
  cycle1 WP-E). Idea 6 depends on a `spike/maplibre` PR that is `main`-era history. Idea 7
  storyboards against `demos/mockup.html` (absent). Ideas 1, 2, 4 are brand-only and fine.
  The plan's own framing ("a personal, sideloaded app, not a store listing") is still true.
- `hyperframes/teaser/index.html` hard-codes "The commute, reframed as a qualifying lap." and
  "P2 · of your last 10 commutes" — it inherits whatever the hero decision is.
- `marketing/README.md` is fine but should say the folder was brought over from `main` in
  `0fb4a1c` and reviewed this cycle, so the next reader doesn't assume it was written here.

## Not a problem (checked, leave alone)

- "Qualifying lap" in the hero/title: F1-adjacent, but it is the *name's own etymology*
  (Quali + fire), stated on the page. The cycle-024 rewrite kept it on purpose. Not a
  BRAND violation.
- "Your only rival is the last ten versions of you." — still true, still the best line.
- Theme toggle defaults to dark ("the app's native dark mood") while the app defaults to
  daylight (BRAND P1). The site is a mood piece, not the app; a taste item, not a fix.
