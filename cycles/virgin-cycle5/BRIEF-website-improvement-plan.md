# BRIEF — website improvement plan (marketing/ on virgin)

**Tier:** Plan (Fable) · 2026-09-08 · virgin-cycle5
**Status:** PROPOSED — not executed. Self-contained; read `REVIEW-website.md` alongside for the
evidence behind each item, and `product/BRAND.md` before writing a single line of copy.
**What this is:** a decision space plus a work list. Part (a) is a call for Nathan (or, if he is
away, a fresh Fable ruling logged as `[ASSUMPTION]` per this cycle's convention). Parts (b)–(d)
are what follows from each choice. Part (c) is safe to execute *today* regardless of (a).
**What this is not:** final copy. Nobody should paste sentences out of this file into
`index.html`; the executor writes the copy inside BRAND.md's voice, using (b) as the
requirements, not the wording.

---

## (a) The positioning question — resolve this first

**Today the site says:** Qualifire is one person's tool, fed by one person's archive, and this
page exists "not to sell it to anyone but its one user."

**Virgin's truth:** still a single-user personal app (no accounts, no social, no store), *but*
the top-priority goal is that a stranger can install it blank, ride once, and have a real
tracked route — and that capability is built (retroactive route creation + ride-1-as-reference,
blank-seed Preview APK). `STATE.md` calls this "a capability, not a multi-user/social pivot."

The question is not "personal or public" — it stays personal. It is: **does the website's
reader become "someone Nathan hands the APK to" instead of "Nathan"?** Three defensible answers.

### Option 1 — Stay personal; stop contradicting the goal
Keep the second-person, one-rider register. Remove the three sentences that are now false
(archive-fed, one-user-only, "load the routes"). Do not add a "give it to a friend" pitch.

- *For:* smallest change; preserves the site's best quality (it reads like a person's own
  thing, not a product); BRAND.md's story is written in exactly this register; `STATE.md`
  still says single-user/no distribution. The site's own footer says it is "a mock… to show
  what the app looks and feels like" — a mood piece does not have to carry a distribution
  story.
- *Against:* leaves the site silent on the one thing virgin is actually *for* now. If the
  page's job is to be the thing a friend reads after receiving the APK, it does not help
  them: nothing tells them that a blank app becomes a route from one ride.

### Option 2 — Personal register, second reader
Keep "you" as the rider throughout, but write it so the "you" can be *anyone with the app
installed* — i.e. the reader is the friend, not Nathan. Add the cold-start story as the hero
mechanic ("your first ride *is* the setup"). Keep the "personal project / not for sale /
zero servers" footer, reworded so it describes sideloading to people Nathan knows.

- *For:* this is the truth as of build7 with the least rhetorical strain. "Same road. New
  meaning." already works for any rider. The cold-start story is a stronger hook than "load
  your routes" ever was, because it answers the question a stranger actually has. Costs one
  new short section (or a rewritten step 1) and a hero sentence.
- *Against:* it is a shift in who the site is *for*, which is Nathan's call, not a doc fix.
  Risk of drifting toward product-speak ("get started in one ride!") — BRAND.md's no-scarcity,
  no-coaching rules must hold. It also commits the site to a claim (a stranger can start from
  nothing) that `OPEN-ITEMS.md` item 3 says is not yet verified on a real blank Preview.

### Option 3 — Lead with "hand it to someone"
Make the handoff the headline: a friend installs from nothing, rides once, has a route.
Explicitly pitch it as something to share.

- *For:* maximally aligned with `STATE.md`'s goal statement.
- *Against:* over-rotates. The app is not distributed; the site says "not for sale"; the
  export/import that makes a real handoff survivable is parked (OPEN-ITEMS item 4). Leading
  with sharing invites the reader to expect an install link. Also the furthest from the
  voice BRAND.md ratified.

**Plan-tier recommendation (not a ruling):** Option 2, with Option 1's edits as its floor. The
deciding fact is that the cold-start story is *both* the most accurate thing the site could
say about virgin *and* the best copy opportunity on the page — it is not a compromise between
truth and taste. If Nathan wants the site to remain a purely personal mood piece, Option 1 is
entirely legitimate and this brief's part (c) is the whole job. Option 3 is not recommended.

**Second call bundled with (a): the hero line.** "The commute, reframed as a qualifying lap."
is the site's most-repeated sentence (title, meta, h1, the teaser video) and its narrowest
(commute-only; virgin is multi-sport, BRAND says "trajects, not just commutes"). Options:
keep it (it is memorable and the name's own gloss); swap in the ratified "Same road. New
meaning." (sport-neutral, BRAND-anointed, currently buried as an h2); or keep the qualifying
sentence but drop "commute" for something broader. This is taste. Whatever is chosen must be
applied to `index.html` (title, meta, h1), `hyperframes/teaser/index.html` (tagline element),
and `HYPERFRAMES-PLAN.md` idea 2 together — three copies of one line.

---

## (b) Copy and section changes that follow from each option

Referenced by section id in `index.html`. Line numbers are as of `0fb4a1c`.

### If Option 1 (stay personal)
- `#hero` pitch (l.596): remove "Load the routes you already ride"; replace with a clause
  that is true from ride one (the executor's wording — the *fact* is that the app builds the
  route from the ride, not the other way round).
- `footer` (l.829–830): drop "It runs off a single archive of one person's own commute data";
  drop "to anyone but its one user". Keep "personal project", "zero servers", "not on any app
  store", "not a company", "not for sale", "this page is a mock".
- Everything in (c).
- Nothing added.

### If Option 2 (personal register, second reader) — everything above, plus
- **`#mechanic` step 1 or a new step 0** ("Ride your normal route"): carry the cold-start
  fact — on a blank install your first ride *is* the setup: at STOP you name where you
  started and where you ended, and that ride becomes the route, its line, and its four gates.
  Keep it to the same length as the other steps; it is a step, not a feature block. Must not
  promise anything the app doesn't do: the first ride gets you a *route with gates*; colour
  and ranking still need history (see the noise-floor caveat in (c)).
- **`#mechanic` step 3** ("timed against your last 10"): keep the last-10 framing but make
  the *build-up* explicit — the window fills as you ride; until it does, sectors are plain
  ink. This removes the "you need ten rides before it does anything" reading without adding
  a new section.
- **`#colour` noise-floor paragraph (l.733):** no change to the *claim* until (c)'s
  noise-floor check is done; but reword so it reads as "the window fills up" rather than
  "a track" (the site's "track" is `main` vocabulary — GLOSSARY.md uses route/way; the site
  should say "route" everywhere and never "track").
- **`#hero` kicker or pitch:** one clause that makes the "you" portable — the reader has the
  app, not Nathan's data. Do not write "share it with a friend" copy (that is Option 3).
- **Sports:** one mention is enough, best in step 1 (the ride can be a bike commute, a run,
  a walk — the app doesn't care, you name the sport). Do not add a "multi-sport" section;
  do not list the placeholder string from the app.
- **`meta description` (l.7):** widen from "bike routes" to routes/rides generally, and lead
  with the mechanic rather than the commute.
- **footer:** after the cuts above, one sentence that says how it is used — sideloaded, given
  by hand to people the author knows, no store, no servers. This is where "someone else can
  use it" lives; it is a fact in the footer, not a pitch in the hero.

### If Option 3 (lead with handoff) — not recommended; if chosen
- New section between `#mechanic` and `#demo` — the blank-install-to-first-route story as a
  three-beat strip (install → ride → name it). Hero pitch rewritten around it. Footer's "not
  for sale" reconciled with an explicit "given away by hand" line. Reconsider the header CTA
  ("Try it out" → whatever the demo becomes; there is no install link and there must not be
  a fake one).

### Section-by-section notes regardless of option
- **`#demo` ("Try it live"):** see (c) item 1 — it cannot stay as-is. If it is *kept* under
  Option 2/3, the honest replacement is a static/animated mock of the RECORD → STOP → naming
  card → tower moment (the cold-start beat), built in-page like the race-mode and tower mocks
  already are. If *removed*, the header's "Try it out" CTA must go with it or repoint.
- **`#live` (race mode):** keep. Fix the sound claim ((c) item 2). "Zero touch targets",
  "one glance", "chrome recedes" are all true and BRAND-derived.
- **`#tower`:** keep the section; fix the mock ((c) item 3). Consider whether the header
  label "Morning · home → work" and "commutes" stay if the hero drops "commute" — consistency,
  not correctness.
- **`#philosophy`:** do not touch. Three lines, all still true.
- **RESULTS tab:** do *not* add a section. If anything, one clause in `#tower` noting that
  every ride is kept and ranked for good — but only if it earns its place. The tower section
  already carries the idea.

---

## (c) No-regrets fixes — correct regardless of (a)

Ordered by severity. All are factual, none are taste.

1. **Broken demo embed.** `#demo` iframes `../demos/mockup.html`; `demos/` is not on virgin.
   Decide: (i) remove the section and the header "Try it out" CTA (cleanest, matches this
   cycle's precedent of cutting main-artifact references), or (ii) replace the iframe with an
   in-page mock as the other sections do. Under Option 1, (i). Under Option 2/3, (ii) is
   worth the work only if the mock shows the cold-start beat; otherwise (i). Never bring
   `demos/mockup.html` over from `main` to make the iframe work — it is `main`'s mockup of
   `main`'s app (tabs, vocabulary, seeded data all wrong for virgin).
2. **"E-major earcons" → what ships.** The race-mode caption (l.703) states the *design*
   (BRAND.md/D-019 tones) as shipped behaviour. The app buzzes (70 ms vibration per gate,
   `app/src/location/index.ts`; the SETTINGS hint literally says "a short buzz"). Either say
   "a buzz at every gate — never a screen you're meant to read" or keep "sound carries the
   story" only if expo-audio earcons actually land. Do not describe tones that don't play.
3. **Tower mock: remove "Reference lap / REF" and "Ideal lap".** Neither exists in
   `tower.tsx`. Worse, on virgin "reference ride" means *ride 1, the one the line and gates
   were built from* — not the fastest — so a P1 labelled "Reference" teaches the wrong
   meaning to exactly the reader Option 2 is written for. Replace P1's badge with the PB ●
   the real tower uses (all-time best, D-007), or with nothing. Drop the ideal-lap row.
4. **Gate-placement claim (step 2, l.617).** "Downstream of junctions, never at stop lines"
   → state what is implemented: gates at quarter points of the route, nudged away from where
   your reference ride stood still (a red light, a crossing). Keep the "you never see them"
   framing — that part is true and good. No promise words ("never").
5. **"Track" → "route".** Search `index.html` for "track" (colour section l.717, l.733;
   tower l.746, l.754). `main` vocabulary; GLOSSARY.md on virgin has no "track". Use "route".
   Do not introduce "way" on the site.
6. **Noise-floor sentence (l.733) — verify before touching.** Code: `MIN_HISTORY = 5`, no
   colour below five comparable rides (site is currently *correct*). `STATE.md` ground rule:
   "No noise floor… first-ever ride logs all-purple". `routeCreation.ts` l.24: the all-purple
   first lap is "STILL deferred". Executor must check `colourModel.ts` on the day and write
   whatever is true then; if the rule and the code still disagree, keep the site on the
   code's side and add a note to `OPEN-ITEMS.md` that STATE.md's "no noise floor" rule is not
   what ships. Do not describe a behaviour that is only a rule on paper.
7. **Footer falsehoods** (l.829: "single archive of one person's own commute data"; l.830:
   "anyone but its one user"). Cut under every option — see (b).
8. **`meta description` "bike routes"** — widen (see (b)); cheap, and it is the one line
   that shows in link previews.
9. **`marketing/README.md`:** add one line — brought over from `main` unchanged in `0fb4a1c`
   (2026-09-08), reviewed in virgin-cycle5 (`cycles/virgin-cycle5/REVIEW-website.md`), and
   note that `demos/mockup.html` referenced by the site does not exist on this branch (until
   fix 1 lands, at which point the note goes). Also its "cycle 022 / cycle 024" references
   are `main` cycle numbers — say so rather than delete them, they are the provenance.
10. **Theme toggle default** — site defaults dark, app defaults daylight (BRAND P1). Not a
    fix, a taste item; listed so the executor doesn't "fix" it unasked.

Verification for (c): open `index.html` in a browser from the repo (no server needed; the
iframe fix is visible immediately), toggle day/night, check both themes for any purple/green
in chrome (there should be none), and `grep -n -i "track\|earcon\|E-major\|ideal\|REF\b\|archive\|one user\|mockup" marketing/index.html` returns nothing (or only the items the
chosen option deliberately kept).

---

## (d) HYPERFRAMES-PLAN.md and the teaser

The plan is `main`'s plan (dated 2026-08-17). Its premise — "marketing is for fun/showcase,
a personal sideloaded app, not a store listing" — is still true. Its slate is half-stranded.

| Idea | Status on virgin | Recommendation |
|---|---|---|
| 1 The Gate (logo sting) | Brand-only, no data | Keep as-is |
| 2 Reframed (teaser) | Built (`hyperframes/teaser/`); hard-codes the hero line and "of your last 10 commutes" | Keep; update the tagline element together with whatever (a) decides for the hero. "P2 · of your last 10" stays true |
| 3 Qualifire, a tour | Tours `index.html` "once finalized" | Keep, explicitly blocked on this brief landing first |
| 4 Why purple is rare | Sources D-030 + `colourModel.ts` `WINDOW_N` | Keep; the source pointer to `product/DECISIONS.md` is a `main` file — repoint to GLOSSARY.md Tier entry + `colourModel.ts`. Carries the same noise-floor caveat as (c) 6 |
| 5 624 commutes | Needs `data/activities/` (624 GPX), `app/assets/routes/` PNGs, `data/analysis/` — all `main`-only; bundled route PNGs were emptied on virgin builds (cycle1 WP-E) | **Strike from the virgin slate, or re-home it as "a `main`-branch video".** Do not rewrite it around virgin data — there isn't any yet. If a "real data" piece is wanted for virgin, the honest successor is a *first-ride* piece: one blank install, one ride, one route appearing — and it needs on-device footage that `OPEN-ITEMS.md` item 3 (empty-state pass) hasn't produced yet. Park it there |
| 6 Shipped: the real map | `/pr-to-video` on a `spike/maplibre` PR that was `main` history; the map is simply shipped on virgin | Strike, or fold into idea 3 (the tour shows the map) |
| 7 P2 of your last 10 | Storyboards against `demos/mockup.html` (absent) + `tower.tsx` | Keep the idea; change the storyboard source to `tower.tsx` + on-device footage only; drop the mockup path. Fix the same REF/ideal-lap mistake as (c) 3 if it appears in the storyboard |

Also: §4's "cloud sandbox cannot npm install" note and §5's ordering both reference the
stranded ideas; §5 step 2 ("624 commutes + Why purple — unblocked today") is wrong on virgin.
Rewrite §5 with ideas 1, 2, 4 as the unblocked set and 3, 7 as post-site/post-footage.
Whether any of this gets *rendered* is separate — the plan itself says nothing has been
rendered yet ("first render test… ready to preview today"). The plan should be edited, not
executed, in this cycle.

---

## Sequencing for the executor

1. Get the (a) ruling (Nathan, or a fresh Fable `[ASSUMPTION]` with reasoning logged).
2. Do (c) 1–9 in one pass — they are independent of (a) except where (b) says otherwise.
3. Do the (b) changes for the chosen option. Write copy fresh, in BRAND.md's voice; reuse the
   site's existing sentences wherever they are still true (most are).
4. Propagate the hero decision to `hyperframes/teaser/index.html` and `HYPERFRAMES-PLAN.md`
   idea 2; apply (d) to the plan file.
5. Inspect: a fresh Fable pass reads the rendered page top to bottom as *the reader the chosen
   option targets*, checks every behavioural claim against `STATE.md` ground rules and the
   code pointers in this brief, and runs the grep in (c).

## Out of scope (say no if asked)
- Bringing `demos/mockup.html` or the 624-ride archive over from `main` to make stale
  references resolve. The precedent this cycle set is: cut the reference, don't import the
  artifact.
- Any install link, download button, store badge, or email capture. There is nothing to link
  to and BRAND.md's no-scarcity rule applies to "get it now" copy as much as to "limited".
- Redesign. The CSS, theming and mocks are the best-executed part of the folder.
