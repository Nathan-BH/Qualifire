# HYPERFRAMES-PLAN — marketing video slate for Qualifire (virgin)

Marketing here is for fun/showcase — Qualifire is a personal, sideloaded app,
not a store listing to sell. This document is the plan for a small slate of
short videos built with **HyperFrames** (github.com/heygen-com/hyperframes,
Apache 2.0, HeyGen) alongside `marketing/index.html`, the site.

**Status: a plan, not a production schedule.** Restructured 2026-09-08
(virgin-cycle5, `BRIEF-website-improvement-plan.md` §(d)) per Nathan's own
ruling: HyperFrames is *not* a priority and nothing here is being executed —
no renders, no ffmpeg runs, no compositions beyond the one teaser already
checked in. What this file is for: when someone picks the slate up later, it
should already be aligned with the app as it actually stands on `virgin`
(blank install, rides from ride one, no shipped archive), so they can start
from "which idea, and what footage" rather than from "is any of this still
true". First written 2026-08-17 on `main`; that version is in git history
(`git log --follow marketing/HYPERFRAMES-PLAN.md`) — see §6 for what it had
that this one deliberately drops.

## 1. Why HyperFrames, still

Nothing about the tool choice changed with the branch cut. HyperFrames
compositions are plain HTML/CSS/JS on one paused, seekable GSAP timeline —
the same skill set as `marketing/index.html`, so there is no new toolchain
between "web page" and "video". Rendering is deterministic (the CLI seeks
each frame in headless Chrome and encodes with FFmpeg), which suits a solo,
agent-driven project with nobody grading footage in an NLE. It is agent-native
(`npx skills add`, a router skill, a block registry), matching how this repo
already runs its model-tier pipeline (`CLAUDE.md`). And it costs $0 —
Node + FFmpeg, nothing hosted or metered — the same whole-pipeline-is-free
constraint the app itself lives under.

What *did* change is the material. `main`'s plan leaned on Nathan's 624-ride
Strava archive, its rendered route PNGs and its analysis pipeline. On `virgin`
none of that ships or is checked in (`data/README.md`): the app installs blank
(`app/src/store/seed.ts`, `'empty'` is the default), builds its routes from the
rider's own first ride (`app/src/store/routeCreation.ts`) and colours from the
second ride on (`app/src/ui/colourModel.ts`, `MIN_HISTORY = 1`). So the slate
below is written against what a blank install can honestly show: brand
motion, the site, the colour model as built, and — once it exists — on-device
footage of the app being used from nothing.

## 2. The slate — six ideas

| # | Working title | Length | Workflow skill | Needs | Blocked on |
|---|---|---|---|---|---|
| 1 | The Gate (logo sting) | ~4–6s | `/motion-graphics` | logo SVG only | nothing |
| 2 | Reframed (brand teaser) | ~12s | `/motion-graphics` | already built | nothing (first render test) |
| 3 | Qualifire, a tour | ~45–60s | `/product-launch-video` | `marketing/index.html` | nothing — the Option 2 copy landed 2026-09-08 |
| 4 | Why purple is rare | ~40–60s | `/faceless-explainer` | GLOSSARY.md + `colourModel.ts` | nothing hard; wants the empty-state pass to settle wording |
| 5 | First ride, first route | ~30–45s | `/general-video` | on-device screen footage of a blank install | that footage does not exist yet (OPEN-ITEMS.md items 1–3) |
| 7 | P2 of your last 10 | ~20–30s | `/faceless-explainer` or `/general-video` | `tower.tsx` choreography + on-device footage | on-device footage of a ≥2-ride route |

Numbering keeps `main`'s numbers for ideas 1–4 and 7 so cross-references stay
valid; idea 5 is a *new* idea in the old slot; idea 6 is gone (§6).

### 1 · The Gate (logo sting)

*What it is.* The ring-draws-clockwise, slash-lands-last motion — Qualifire's
one proprietary visual idea — as a standalone bumper. Race-black stage, ink
ring draws clockwise from the 12-o'clock start tick (~1.3s), yellow slash
lands, wordmark "QUALIFIRE" settles beneath, hold, cut. Literally the first two
seconds of idea 2, isolated.

*Needs.* `product/brand/logos/qualifire_logo_5_monogram_wordmark.svg` (copy
at `marketing/assets/`). Nothing from the app's data.

*Source of truth.* `product/BRAND.md` §Motion (the four canonical uses; app
launch is the one this reuses), `product/brand/LOGO-RATIONALE.md` §5, and the
shipped implementation `app/src/ui/launchAnimation.tsx` / `launchChoreo.ts` —
the timing and geometry there are the numbers to match, not reinvent.
`cycles/virgin-cycle5/launch-animation-options.html` (NW-5) holds four
further candidate uses of the same motion, unruled — if Nathan picks one,
it may become a second sting.

*How it'd get built.* Lift the first ~2s of `marketing/hyperframes/teaser/
index.html` into its own composition folder (`npx hyperframes init gate`,
from `marketing/hyperframes/`), extend the hold, end on the wordmark rather
than cutting to sector slots.

*Blocked on.* Nothing.

### 2 · Reframed (brand teaser)

*What it is.* Built and checked in at `marketing/hyperframes/teaser/
index.html` (see its README): logo sting → wordmark + tagline → four sector
slots filling yellow→green→yellow→purple with big tabular sector times → a
timing-tower line ("P2 · of your last 10 commutes") → yellow endcard. ~12s,
deliberately over `/motion-graphics`'s ~10s sweet spot because it needs all
four beats to introduce the whole vocabulary (gate, sector, tier colour,
tower) in one unnarrated piece.

*Currency check (2026-09-08).* The tagline element already reads **"Same
road. New meaning."** — the hero-line swap was applied to all three copies
(site, teaser, this file) in `3dcd4d5`. "P2 · of your last 10" stays true on
`virgin`: the ranking pool is the judged ride plus its nine most recent
(`WINDOW_N = 10`, `WINDOW_PREV = 9`), so a position always reads "of 10".
One wording drift, left alone for now: the tower line says *commutes* where
the site's Option 2 copy now says *rides* (`index.html` §tower, "of your last
10 rides"). Harmless in a brand teaser; retag when the teaser is next touched.

*Needs.* Nothing further. The only external asset is the GSAP CDN script.

*How it'd get built.* It is built. The first thing anyone does with this
slate is render it — `marketing\hyperframes\render.ps1 -Render` from a
PowerShell prompt on Nathan's PC (§4) — because that one render proves the
pipeline (Node 22+, FFmpeg, headless Chrome) before any other idea spends
time on it.

*Blocked on.* Nothing except someone choosing to spend the render.

### 3 · Qualifire, a tour

*What it is.* `/product-launch-video` run against `marketing/index.html`
directly — the skill is built for exactly this ("any website… site tour").
HyperFrames turns the page's existing scroll narrative into a cut sequence
rather than inventing new visuals.

*Storyboard.* The site's own sections in order: hero ("Same road. New
meaning."), `#mechanic` (the ride split into sectors, the rider-dot
animation), `#live` (minimal interface), `#colour` (how today's ride gets its
colour — the three swatches and the "first ride sets the mark" paragraph),
`#tower` (the timing tower, "P2 of your last 10 rides"), `#philosophy`. The
map moment that was idea 6 lives here: the tour shows the live map wherever
the site does, and no more — see §6.

*Needs.* The site as committed. No app data, no footage.

*Source of truth.* `marketing/index.html` itself; `product/BRAND.md` for
voice; `cycles/virgin-cycle5/BRIEF-website-improvement-plan.md` for why the
copy says what it says.

*How it'd get built.* `npx hyperframes init tour` from `marketing/
hyperframes/`, then `/product-launch-video` pointed at the site; keep any
narration in BRAND.md's register (no scarcity, no "get it now" — there is
nothing to link to).

*Blocked on.* Nothing. This was "once `index.html` is finalized" on `main`;
the Option 2 copy pass (`3dcd4d5`) and the day-mode logo fix (`6240b9c`)
landed 2026-09-08, so the site is tourable as it stands. The most
virgin-native idea on the slate: everything it shows is already true of a
blank install.

### 4 · Why purple is rare

*What it is.* A no-product-shot explainer of the colour model for anyone
landing on the repo cold. LLM-invented but brand-true visuals: a gate, a
short column of past laps, today's lap landing inside/above/below that
column — building to "purple is rare by design".

*The model as actually built (NW-1, 2026-09-08 — `e6b2975`, `a6f4d1e`).*
Get this right; it is the thing most likely to go stale:

- The comparison window is the rider's **nine most recent** ranked rides on
  that way (`WINDOW_PREV = 9`); judged ride + window = a pool of exactly ten
  (`WINDOW_N = 10`). Position is a fact — "P_n of 10", never "of 11".
- **Purple** beats the best of the window. **Green** beats its average.
  **Yellow** is the default colour of a time that happened — not a failure,
  never red (`product/BRAND.md` "The story" points 2–3, D-013).
- **Noise floor `MIN_HISTORY = 1`.** Below one prior ride there is no verdict
  at all: `'neutral'`, rendered as plain ink. So a route's **reference ride**
  (the first ride you save on it, `GLOSSARY.md` "Reference ride",
  `routeCreation.ts`) is neutral *on the day it's ridden* — it did not race
  anything — but is still **ranked** once stored: rank and colour are
  independent facts. **One prior ride** can only produce purple or yellow
  (best and mean coincide at a pool of one, so green is unreachable).
  **Two or more** unlock green. The reference ride is not permanently
  exempt: the window excludes the judged ride by id, not by time, so
  re-opening ride 1's result after later rides exist judges it like any other.
- Sector history is **clean-only** — an interrupted sector (red light, "‖")
  still ranks as part of the lap but does not define what "average" means
  for that sector (`sectorValues`). COLD-START F-2
  (`product/proposals/COLD-START.md` §5; OPEN-ITEMS.md item 3): a lap can
  colour while its busiest sector stays plain.

The site already says this in plain words (`index.html` §colour: "Your first
ride on a route sets the mark — plain ink, nothing to race yet. The ride
after that can go purple or yellow. From the third ride on, green joins the
mix too.") — the video's script should match that sentence, not paraphrase
the code.

*Needs.* No footage, no data. Invented visuals only.

*Source of truth.* `GLOSSARY.md` "Tier (purple / green / yellow)" +
`app/src/ui/colourModel.ts` (`WINDOW_N`, `WINDOW_PREV`, `MIN_HISTORY`,
`tierFor`). *Not* `product/DECISIONS.md` — that register is `main`-only; the
D-numbers the code cites (D-008, D-013, D-045) resolve there, not on this
branch.

*How it'd get built.* `npx hyperframes init purple`, `/faceless-explainer`;
palette and motion nouns from §3's `frame.md`; the lap column reuses idea 7's
tower anatomy at a smaller scale.

*Blocked on.* Nothing hard. Soft: OPEN-ITEMS.md item 3 (the empty-state pass)
may change what the app *says* about a plain-ink first ride and about F-2's
lap-coloured/sector-plain case; the script should be written after that pass
so the video and the phone use the same words.

### 5 · First ride, first route (new — replaces `main`'s "624 commutes")

*What it is.* The honest virgin-native successor to the archive piece: one
blank install, one ride, one route appearing. This is the thing `virgin` can
show that `main` never could — the app starting from nothing.

*Storyboard.* Blank first launch (no sports, no places, no rides — the
launch sting plays over it). Create a sport. RECORD: press START; the live
view with nothing to lock to. Stop. The naming card offers the ride's two
endpoints (`routeNamingCard.tsx`, `routeCreation.ts`: "ride first, name
after"); name them; a way and a route exist, gates seeded at 25/50/75 % of
the ridden line, nudgeable (`gateAdjustCard.tsx`). ROUTES now lists one
route. RIDES lists one ride, plain ink — the reference ride, no verdict yet
(idea 4's rule). Endcard: "Ride it again." The whole arc is
`product/proposals/COLD-START.md` §3 steps 5–9 as the app actually performs
them.

*Needs.* **Screen-recorded on-device footage of the blank Preview install
going through that arc** — a real phone, a real ride of ≥200 m
(`MIN_TRACK_LENGTH_M`), a real name typed. Plus, optionally, the day's GPX+
export and `qualifire-catalog-*.json` from `data/activities/TEST in
virgin-app rides/` for an inset map drawn from the actual trace.

*Source of truth.* `app/src/store/routeCreation.ts` (header comment is the
spec), `GLOSSARY.md` "Reference ride", `OPEN-ITEMS.md` items 1–3,
`cycles/virgin-cycle4/BUILD7-PREVIEW-BLANK-SEED.md`.

*How it'd get built.* `/general-video`; the phone recording is the spine,
HyperFrames adds the sting, captions and the endcard. A `data-chart` block
is *not* needed — there is no dataset, that is the point.

*Blocked on.* **The footage does not exist.** Nothing since the 2026-09-04
test round has been seen on a phone; build7's blank first launch has not
been recorded (OPEN-ITEMS.md item 1), the post-cycle3 on-device pass has not
run (item 2), and the empty-state pass — what a blank install says to a
stranger before any history — has not happened (item 3). Do not storyboard
against mockups instead: `design/`'s empty-state mockups are themselves
parked (D4). This idea waits for the phone.

### 7 · P2 of your last 10

*What it is.* A short, focused piece on the post-ride timing tower — today's
lap sliding into its ranked place among past selves.

*Storyboard.* From `app/src/ui/tower.tsx`'s own choreography, which is the
spec: a freshly finished board, today's row enters at the **bottom** and
travels **up** to its rank over ~700 ms ease-out, the rows it passes stepping
down; arrival (accent-yellow bar + TODAY) fades in over ~200 ms. Upward is
the only direction; zero travel still gets the arrival fade — never an
animation of failure. Row anatomy: P# · tier-coloured time (+ PB ●) · gap to
P1 · date. Position is a fact, no failure styling for low positions.

*Needs.* `tower.tsx` + `towerModel.ts` for the static states and motion
numbers; **on-device footage** of a real post-ride board on a route with at
least two rides on file (so there is a rank to slot into — and, per idea 4,
at least three if the storyboard wants a green row in shot). No
`demos/mockup.html`: that file is `main`-only and does not exist on this
branch (the cycle's precedent is to cut the reference, not import the
artifact).

*Colour-model currency.* Same as idea 4: the ranks in shot are "of 10" at
most, the top row is purple only if it beat the other nine, a two-ride route
shows one coloured row (purple or yellow) and one plain, and the reference
ride's own row is plain ink only while it has nothing to be judged against.

*How it'd get built.* `/faceless-explainer` if the tower is redrawn in HTML
from `tower.tsx`'s numbers (it is a plain list — cheap to rebuild
pixel-faithfully in a composition), `/general-video` if real screen capture
is the spine. Either way the storyboard is the same; the second is an
upgrade of the first, not a rewrite.

*Blocked on.* On-device footage of a multi-ride route on the blank Preview
(OPEN-ITEMS.md items 1–2 first). The HTML-redraw variant is *not* blocked
and could be built from `tower.tsx` alone — but it would be a mockup of a
screen nobody has yet seen on the phone since cycle 3, which is the stale
footing this rewrite is trying to leave behind.

## 3. A `frame.md` starter

HyperFrames' `frame.md` concept inverts a design system "for the camera" — a
superset of `app/src/ui/theme.ts` that adds motion nouns and a broadcast
ground rule. Hex values verified against `theme.ts` 2026-09-08 (D5 ruled the
same day: original palette kept permanently, both explorations closed).
Starting point, ready to copy into any Qualifire video project:

```markdown
# frame.md — Qualifire, for the camera

## Palette
- Stage ground: **race black `#0A0A0A`** — always, even for pieces that would
  be "paddock" in the app. Video has one ground, not two.
- Chrome: **paddock charcoal `#17171b`**, **ink `#F4F2EC`**, **signature
  yellow `#F5C542`** (ink-on-yellow `#17171b` for text ON a yellow surface)
  — nothing else.
- Earned only: **earned green `#3ED598`**, **earned purple `#A667F0`** —
  exclusively on sector/tier/timing elements standing in for a real result.
  Never chrome, never decorative.
- **No red.** Not for errors, not for emphasis, not anywhere — BRAND.md
  "No failure state", unchanged for the camera.

## Type
- Numerals: heavy (800 weight), tabular — every lap/sector/position number.
- Labels: uppercase, letterspaced (sector names, tier names).
- System font stack (`-apple-system, "Segoe UI", Roboto, ...`) — no webfont
  fetch, keeps compositions offline-renderable.

## Motion nouns
- **Ring** = the lap. Always drawn, never filled solid — a closed loop, the
  same road every day.
- **Slash** = the gate. A line crossed at speed; it lands, it doesn't grow.
- **Canonical motion**: ring draws clockwise from the start tick (top, 12
  o'clock) via `stroke-dashoffset`; slash lands last, after the ring
  closes — the one piece of proprietary motion language Qualifire owns
  (BRAND.md §Motion; shipped as `launchAnimation.tsx`); reuse it, don't
  reinvent a new sting per video.

## Rules
- Purple/green are earned, not decorative — a shot needing "a colour" uses
  yellow or ink, never purple/green as generic accent.
- Plain ink is a state, not an absence: a first ride on a route is ink
  because it has nothing to race yet. Don't "fix" it with a colour.
- No bicycles, wings, speedometers, red. The gate is the only proprietary
  visual idea; everything else traces back to it or a real number.
```

## 4. Production workflow on Nathan's PC (for later — nothing runs now)

The cloud sandbox cannot `npm install` or reach the npm registry — every
command below runs on Nathan's PC, never in the sandbox, and none of it is
scheduled.

**One-time setup**, from the repo root: `npx skills add heygen-com/hyperframes
--full-depth` (interactive picker — the core set is enough; `/hyperframes`
installs each creation-workflow skill on demand). Non-interactive/agent run
instead: `npx hyperframes skills update`.

**Per-project loop.** `npx hyperframes init <name>` scaffolds a new
composition folder — run it from `marketing/hyperframes/` (the parent),
never from inside an existing composition. Then `cd` into it and run:
```
npx hyperframes preview            # live-reload in the browser
npx hyperframes render             # deterministic MP4 via headless Chrome + FFmpeg
```
Requirements: Node.js 22+, FFmpeg on PATH.

**First render test**: `marketing/hyperframes/teaser/` is built and checked
in. `marketing\hyperframes\render.ps1` (add `-Render` to render instead of
preview) checks Node/FFmpeg with clear errors, then runs the two commands
above from the teaser folder. If that one render produces a clean MP4, the
rest of the slate is just more compositions in more folders.

## 5. Order, if and when this is picked up

Not a schedule — a dependency order, cheapest and least-blocked first:

1. **Reframed (2), then The Gate (1).** Render the teaser: it is the pipeline
   test. The Gate is a two-minute derivation of it.
2. **Qualifire, a tour (3).** Unblocked since 2026-09-08; needs only the site.
3. **Why purple is rare (4).** Unblocked; write its script after the
   empty-state pass (OPEN-ITEMS.md item 3) so the words match the phone.
4. **P2 of your last 10 (7).** HTML-redraw variant possible from `tower.tsx`
   alone; the real version waits for on-device footage.
5. **First ride, first route (5).** Last — it is *only* footage, and the
   footage waits on OPEN-ITEMS.md items 1–3.

Ideas 4, 5 and 7 all get better after Nathan's on-device passes, which are
the real gate on this whole slate. Nothing in this list has a date.

## 6. Retired from this branch's slate

Recorded so nobody has to reconstruct why two numbers vanished. Neither is
deleted from history — `main`'s plan is in this file's git log.

- **Old idea 5 — "624 commutes".** Counted up through Nathan's 624-ride
  Strava archive (Aug 2024–Aug 2026), the three rendered route crops and the
  `data/analysis/` figures. That material is `main`'s and stays there
  (`data/README.md`); a `virgin` build has none of it and should not pretend
  to. The idea belongs to `main`'s history, not this plan. Its slot is taken
  by the new idea 5 above — one install, one ride, one route — which is what
  this branch can honestly show.
- **Old idea 6 — "Shipped: the real map".** A `/pr-to-video` dev-log of the
  MapLibre map landing, read off a PR that lives in `main`'s history and was
  never opened as such. The map is shipped and ordinary now
  (`app/src/ui/wayMapView.tsx`, `@maplibre/maplibre-react-native`); it does
  not need its own changelog video. Folded into idea 3 — the tour shows the
  map wherever the site shows it.
