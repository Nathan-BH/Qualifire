# HYPERFRAMES-PLAN — marketing video pipeline for Qualifire

Marketing here is for fun/showcase — Qualifire is a personal, sideloaded app,
not a store listing to sell. This plan sets up **HyperFrames**
(github.com/heygen-com/hyperframes, Apache 2.0, HeyGen) as the video pipeline
for that showcase, alongside `marketing/index.html` (the mock landing page).
Dated 2026-08-17.

## 1. Why HyperFrames fits Qualifire

HyperFrames compositions are plain HTML/CSS/JS driven by a single paused,
seekable GSAP timeline — the same skill set already used for
`marketing/index.html` and `demos/mockup.html`, so no new toolchain is needed
to go from "web page" to "video." Rendering is deterministic: the CLI seeks
each frame in headless Chrome and encodes with FFmpeg, so a composition
renders identically every time — useful for a solo, agent-driven project
with nobody manually grading footage in an NLE. It is agent-native by design
(`npx skills add`, a router skill, a `hyperframes add` block registry),
matching how this repo already runs (D-039's model tiers; `/hyperframes`
plays the same role a Sonnet executor plays for code). And it is $0 and
Apache-2.0 — Node + FFmpeg, nothing hosted or metered — matching D-012's
whole-pipeline-is-free constraint for the app itself.

## 2. The video slate

| # | Working title | Length | Workflow skill | Where it'd be used |
|---|---|---|---|---|
| 1 | The Gate (logo sting) | ~4–6s | `/motion-graphics` | README hero, social avatar loop |
| 2 | Reframed (brand teaser) | ~12s | `/motion-graphics` (slightly over its ~10s sweet spot, deliberately — see below) | Showcase page hero, social clip |
| 3 | Qualifire, a tour | ~45–60s | `/product-launch-video` | README hero, showcase |
| 4 | Why purple is rare | ~40–60s | `/faceless-explainer` | Social clip, lab show-and-tell |
| 5 | 624 commutes | ~30–45s | `/general-video` + `/media-use` (`data-chart` block) | Showcase, lab show-and-tell |
| 6 | Shipped: the real map | ~30–60s | `/pr-to-video` | Social clip, lab show-and-tell (dev-log) |
| 7 | P2 of your last 10 | ~20–30s | `/faceless-explainer` or `/general-video` | Showcase, social clip |

**1 · The Gate (logo sting).** The ring-draws-clockwise, slash-lands-last
motion is Qualifire's one proprietary visual idea (D-011,
`LOGO-RATIONALE.md` concept 5); needs nothing but
`product/brand/logos/qualifire_logo_5_monogram_wordmark.svg`. Storyboard:
race black stage, ink ring draws clockwise from the start tick (~1.3s),
yellow slash lands, wordmark "QUALIFIRE" settles beneath, hold, cut —
literally the first two seconds of idea 2 below, isolated into its own
standalone bumper.

**2 · Reframed (brand teaser).** The scaffold already built at
`marketing/hyperframes/teaser/index.html` — logo sting, wordmark + tagline
("The commute, reframed as a qualifying lap."), four sector slots filling
yellow→green→yellow→purple with big tabular sector times, then a
timing-tower line ("P2 · of your last 10 commutes") fading to the yellow
endcard. It runs ~12s rather than `/motion-graphics`'s ~10s sweet spot
because it needs all four beats to introduce the whole vocabulary (gate,
sector, tier colour, timing tower) in one unnarrated piece — a deliberate
overrun, not scope creep.

**3 · Qualifire, a tour.** Once `marketing/index.html` is finalized, run
`/product-launch-video` against it directly — built for exactly this ("any
website... site tour"). Storyboard: scroll-driven reveal of the landing
page's own sections (hero, the three tracks, the colour model, the timing
tower) — HyperFrames turns the page's existing scroll narrative into a cut
sequence rather than inventing new visuals.

**4 · Why purple is rare.** A no-product-shot explainer of D-030's colour
model, for anyone landing on the repo cold. Storyboard: LLM-invented but
brand-true visuals — a gate, a rolling window of ten past laps, a lap time
landing inside/above/below that window — building to "purple is rare by
design." Source: D-030 in `product/DECISIONS.md`,
`app/src/ui/colourModel.ts` (`WINDOW_N = 10`).

**5 · 624 commutes.** The one idea that has to use real data, not invented
visuals. Source: `data/activities/` (624 GPX rides, Aug 2024–Aug 2026, all
e-bike; 64 Morning / 32 Evening A / 29 Evening B / 6 off-route / 493 other
per D-014/D-015), the rendered route crops and `routes.json` in
`app/assets/routes/`, and `data/analysis/`. Storyboard: the three tracks
draw in from their rendered PNGs one at a time, a `data-chart` block (`npx
hyperframes add data-chart`) counts up through ride totals and the
1.3M-fix figure, then settles on the three-track split as a simple bar —
the one piece impossible without 624 rides of its own founder already
ridden.

**6 · Shipped: the real map.** A dev-log for the D-041 map work — MapLibre +
OpenFreeMap landing in `routeMapView.tsx` (cycle 015, commit `676f01e` on
`spike/maplibre`). `/pr-to-video` reads a GitHub PR, so this needs that
branch actually opened as a PR against `github.com/Nathan-BH/Qualifire`
first (STATE.md already flags `spike/maplibre`'s uncommitted WIP for Nathan
to triage — this idea rides on that, nothing beyond it). Storyboard:
before/after — pre-rendered PNG map, then live MapLibre tiles — narrated by
the PR's own diff and commit message, changelog-style.

**7 · P2 of your last 10.** A short, focused piece on the post-ride timing
tower — today's lap sliding into its ranked place among past selves. Until
the app is finalized it storyboards against `demos/mockup.html` and
`tower.tsx`'s static states rather than real screen capture; once build 4
lands and later rides produce on-device footage, it upgrades to
screen-recorded without changing the storyboard.

At least one idea (5) is grounded in the real 624-ride archive rather than
invented visuals — the same honesty rule this project already applies to
its UI (D-013's no-failure-styling, D-030's real-data comparison) extended
to marketing.

## 3. A `frame.md` starter

HyperFrames' `frame.md` concept inverts a design system "for the camera" — a
superset of the UI's `theme.ts` that adds motion nouns and a broadcast
ground rule. Starting point, ready to copy into any Qualifire video project:

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
- **No red.** Not for errors, not for emphasis, not anywhere — D-013,
  unchanged for the camera.

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
  closes — the one piece of proprietary motion language Qualifire owns;
  reuse it, don't reinvent a new sting per video.

## Rules
- Purple/green are earned, not decorative — a shot needing "a colour" uses
  yellow or ink, never purple/green as generic accent.
- No bicycles, wings, speedometers, red. The gate is the only proprietary
  visual idea; everything else traces back to it or a real number.
```

## 4. Production workflow on Nathan's PC

The cloud sandbox that wrote this plan cannot `npm install` or reach the npm
registry (403) — every command below runs on Nathan's PC, never in the
sandbox.

**One-time setup**, from the repo root: `npx skills add heygen-com/hyperframes
--full-depth` (interactive picker — the core set is enough; `/hyperframes`
installs each creation-workflow skill on demand from there). Non-interactive/
agent run instead: `npx hyperframes skills update`.

**Per-project loop.** `npx hyperframes init my-video` scaffolds a brand-new
composition folder — run it from `marketing/hyperframes/` (the parent
directory), never from inside an existing composition. Once a composition
exists (e.g. `marketing/hyperframes/teaser`), `cd` into it and run:
```
npx hyperframes preview            # live-reload in the browser
npx hyperframes render             # deterministic MP4 via headless Chrome + FFmpeg
```
Requirements: Node.js 22+, FFmpeg on PATH.

**First render test**: `marketing/hyperframes/teaser/index.html` is already
built and checked in, ready to preview or render today. Run
`marketing\hyperframes\render.ps1` from the repo (add `-Render` to render
instead of preview) — it checks Node/FFmpeg first with clear errors, then
runs the two commands above from the teaser folder. If that one render
produces a clean MP4, the rest of the slate is just more compositions in
more folders.

## 5. Order of execution

Tied to app milestones, cheapest/least-blocked first:

1. **The Gate + Reframed (ideas 1–2)** — first, start today. Both depend only
   on the logo SVG and settled brand decisions; `marketing/hyperframes/teaser`
   is Reframed's scaffold, already built, and doubles as the pipeline's first
   render test (§4).
2. **624 commutes + Why purple is rare (ideas 5, 4)** — next, also unblocked
   today: both source from data/decisions that already exist
   (`data/activities/`, D-030), no app dependency.
3. **Qualifire, a tour (idea 3)** — once `marketing/index.html` (being built
   in parallel) is finalized, since `/product-launch-video` tours the site as
   it actually stands.
4. **Shipped: the real map (idea 6)** — once `spike/maplibre` is committed
   and opened as a real PR (STATE.md's open item), since `/pr-to-video` needs
   an actual PR to read.
5. **P2 of your last 10 (idea 7)** — last, deliberately: wants real on-device
   footage, needing build 4 installed and ideally the app "finalized" per
   Nathan's no-standalone-APK-until-final ruling. Storyboard against
   `demos/mockup.html` sooner if wanted; upgrade to real capture later
   without changing the plan.
