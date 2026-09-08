# Questions for Nathan — virgin-cycle5 (product/design/website briefs)

Per `process/CONVENTIONS.md`'s escalation convention: answer inline under each question
(a word or a sentence is enough), save the file, and whoever executes a brief next reads
your answers from here rather than from chat. Grouped by which brief they block; within a
brief, roughly in the order they'd come up.

---

## Blocks `BRIEF-product-docs-cleanup.md`

### Q1 — Does the "colours from ride 1" rule still stand?
**Context:** `STATE.md` and `COLD-START.md` both say your 2026-08-26 ruling (D-045, part 1)
removed the "fewer than 5 rides stays neutral" floor entirely: ride 1 on a way logs all-purple
sectors, ride 2 compares purple/yellow, ride 3+ runs the full model. The code never got the
second half of that ruling — `MIN_HISTORY = 5` in `colourModel.ts` still blanks every colour
and rank until the 5th ride on a way. Nothing since 2026-08-26 contradicts the ruling, but it's
a code change (work package NW-1), not a doc fix, so it's worth a fresh confirmation before
someone builds it — especially since it directly affects what a stranger sees on their first
few rides with the blank-seed Preview.

**Options:** (a) yes, build it as ruled — first ride all-purple, second ride purple/yellow,
third+ full model; (b) no, keep the 5-ride floor; (c) something in between (say what).

Your answer: yes build as ruled with one difference. I dont think the first ride is automatically all purple. Since now the rides are made in the app, when you save a reference route, we can use its data as the first "ride". So if you do a second ride, it compares it already to that route's average (one ride only). So if youre faster its purple, otherwise yellow (no green option yet). On the third ride, you have two rides to calculate the average, and now you can have a green option, if youre faster than average but still not fastest


### Q2 — SETUP-UX's "depth strip" idea — keep parked, or drop it?
**Context:** `product/proposals/SETUP-UX.md` §5 describes a "depth strip" onboarding element
that was never built and isn't referenced anywhere else. It's not blocking anything, but the
cleanup brief needs to know whether to keep it flagged as parked-for-later or mark it dropped.

Your answer: it does not ring a bell, if it does not serve an immediate critical purpose for the app, lets drop it.


### Q3 — "More uses of the launch animation" — still wanted?
**Context:** `product/BRAND.md` notes you asked for more uses of the launch animation
(`Nathan/Nathan's_notes2.md`, 2026-08-19) beyond app-launch/START/tab-switch/final-gate, which
is still marked "open work" three weeks later. If you still want this, it'd help to say
roughly where (e.g. a specific screen transition) so it becomes a real work package instead of
a standing "someday" note.

Your answer: I would like to get some visual ideas first, so maybe if I could get an html file with multiple options to test before implementation.


### Q4 — MAP-TILES' PMTiles offline pack — still on the table?
**Context:** `product/MAP-TILES.md` §3 describes an offline PMTiles map-tile pack as a
possible future addition. Not blocking anything now (online tiles work fine per current
STATE.md), but flag whether it's still something you want tracked or can be dropped.

Your answer: lets keep it as a future plan. For now it isnot blocking, it is also not needed to stay online during the whole ride. For example I am now in macedonia, and I had no tile loaded, but once I am connected the tile loads, and I can use it while I am here, so for people I think if they just are connected for example once before leaving home it is fine for most purposes ?


---

## Blocks `BRIEF-website-improvement-plan.md`

### Q5 — Who is the website's reader now: you, or someone you hand the APK to?
**Context:** the site currently says it's "not to sell it to anyone but its one user" and
describes a personal archive-fed tool — both now false or at least incomplete, since virgin's
top-priority goal is a stranger being able to install blank and get a real route from one
ride (and that capability — retroactive route creation — is built). Three options, laid out
in full with pros/cons in `BRIEF-website-improvement-plan.md` §(a):

1. **Stay personal** — fix the now-false sentences, don't add a handoff pitch. Smallest change,
   keeps the site's personal-mood-piece feel.
2. **Personal register, second reader** — keep the "you/your" voice, but write it so "you" is
   whoever has the app, not specifically you; lead with the cold-start story ("your first ride
   *is* the setup") as the hook. *This is the plan-tier's recommendation, not a ruling* — it's
   the option that's both most accurate and (per the brief's read) the best copy opportunity,
   but it is a real change in who the site is for, which is your call.
3. **Lead with "hand it to someone"** — make sharing the headline. Not recommended (the app
   isn't distributed, export/import for a real handoff is still parked).

Your answer (1 / 2 / 3, or your own steer): I would go with option 2. ""you" is
   whoever has the app"


### Q6 — The hero line: keep it, or swap it?
**Context:** "The commute, reframed as a qualifying lap." is the site's most-repeated line
(title, meta, h1, and the teaser video) but it's commute-only, while virgin is multi-sport
now (BRAND.md: "trajects, not just commutes"). The already-written, BRAND-ratified alternative
"Same road. New meaning." is sport-neutral but currently buried as a minor heading. Whatever
you pick applies in three places at once (`index.html`, the teaser, and `HYPERFRAMES-PLAN.md`
idea 2), so it's worth deciding once here rather than three times during execution.

**Options:** (a) keep "the commute, reframed…"; (b) swap to "Same road. New meaning."; (c)
keep the qualifying-lap idea but drop "commute" for something broader (say what).

Your answer: I think the same road, new meaning line aligns the strongest with my current vision, so I would lead with that. We can drop the ""The commute, reframed as a qualifying lap.""


### Q7 — HYPERFRAMES video slate: OK to strike/repoint as recommended?
**Context:** two of the seven planned marketing videos depend on things that only exist on
`main` (idea 5 needs your 624-ride archive; idea 6 references a stranded `main`-only PR). The
brief's recommendation is to strike idea 5 (or re-home it as "a `main`-branch video," with the
honest virgin-native successor being a real first-ride/first-route piece once on-device
footage exists) and strike or fold idea 6 into the product-tour idea (3). This felt more
mechanical than a taste call, so treat this as "will do unless you say otherwise" rather than
a hard blocker — flag here only if you disagree.

Your answer (leave blank to accept the recommendation): I am not sure i want to implement anything with hyperframes yet. But lets just make sure there is a plan ideas of what is possible with it, how it would work practically, what steps it would need (from a virgin build so the whole 624-ride archive is superseeded, we need a different plan). But as it is not a priority i believe, i would not plan to execute it, but i would plan to re-structure + reframe the hyperframes idea/folder to make sure it is aligned with the current virgin app vision + ready to execute in the future.


---

## Blocks `BRIEF-design-folder-plan.md` (and closes a loose end in `product/brand/`)

### Q8 — The palette decision (two parallel, unresolved explorations)
**Context:** two separate palette explorations have been sitting open for weeks, neither
referencing the other:
- `product/brand/palettes/` — candidates for the app's own main theme: **A/signal** (what
  ships today), **B/vibrant gold**, **C/two-tone**, **E/cool-gray** (D and F already rejected).
  `product/brand/README.md` has said "palette decision OPEN" since 2026-08-15.
- `design/drafts/` — a *different* idea from your notes4 point 6: extra chrome themes (not a
  replacement for the main theme, an option alongside it) in **pink / lightblue / green**,
  already fully built and WCAG-contrast-checked (33/33 chrome pairs pass, 42/42 verdict-colour
  pairs don't regress). Verdict colours (purple/green/yellow) are untouched in all three.

**Options:** (a) keep the current theme (A/signal), close both explorations as "considered,
kept," `design/drafts/` stays as history; (b) adopt one of pink/lightblue/green as the day
theme (say which); (c) adopt one of the brand candidates (B/vibrant gold, C/two-tone, or
E/cool-gray) instead — this one would need a fresh WCAG check, since the brand exploration
was never contrast-tested the way `drafts/` was; (d) not now — park both explicitly so future
audits stop rediscovering them as two separate open questions.

Your answer: I dont have a good visual idea of the different designs, for each image make different versions.
- the SVG is nice for control and for me to make changes but not easy to look at (I have to open each indivually in inkscape, and takes time to load)
- so make in addition to the SVGs an png/jpeg (whatever is easiest) collage for each design colour (so grouping multiple images in one canvas for an easy glance at how the different designs compare)


---

## Not blocking anything, just surfaced in passing

- **`product/README.md`'s index is fixing itself** — it currently lists `BACKLOG.md`,
  `DECISIONS.md`, and a `superseded/` folder as if they're live; all three were deleted from
  `virgin` at the branch cut and only exist on `main`. The product-docs brief already replaces
  this file's content — no decision needed from you, just flagging why the file changes so
  much.
- **A real code bug, separate from Q1's ruling question:** even once Q1 is answered, note that
  `STATE.md` currently states the "colours from ride 1" behavior as already true — it isn't,
  yet. The product-docs brief corrects that claim regardless of which way Q1 goes.
