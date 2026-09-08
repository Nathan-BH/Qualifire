# Qualifire

A mobile app that applies **F1 qualifying** logic to a daily bike commute: track the ride by
GPS, split the route into sectors, and colour each sector by whether you beat your own
benchmark.

Personal app first, but "someone else can use this from a blank install" is now a
top-priority goal — see `STATE.md`.

---

## How this repository is organised

`virgin` branch (2026-08-31 onward, the primary line of work): a working-prototype-first
cut of the project. No named agent roles and no ceremony — just Nathan, a chat, and the
model-tier pipeline in `process/CONVENTIONS.md`; work is grouped into `cycles/<name>/`
folders only so each batch's briefs and findings have one home. The full archive-powered
original (624-ride GPX dataset, its analysis tooling, and the complete decision/backlog
history) still lives on `main`, untouched. `legacy-virgin` is a second frozen branch: this
branch as it was before WP-3 swapped the words "way" and "route" (2026-09-06).

```
Qualifire/
├── README.md               You are here. Orientation only.
├── IDEAS.md                Nathan's raw idea log, in his own words. Append-only. Never edited by agents.
├── STATE.md                SINGLE SOURCE OF TRUTH. Current status, ground rules, known stubs.
├── OPEN-ITEMS.md           Short, curated list of what's actually left toward a working prototype.
├── HOW-THE-APP-IS-BUILT.md One page on the app's architecture, in plain language.
├── GLOSSARY.md             The words used in chat, defined plainly.
├── CLAUDE.md               Instructions for any Claude session working in this repo.
│
├── app/                 What actually runs on the phone (React Native / Expo).
├── briefs/              Legacy: the five 2026-08+31 briefs ftom the branch cut. Every later
│                        brief lives inside its cycle folder — nothing new goes here.
├── cycles/              One folder per work cycle (virgin-cycle1, 2, …): briefs, decisions,
│                        Inspect findings, token usage. Start with the newest README.md.
├── data/                data/README.md plus data/activities/TEST in app rides/ and
│                        TEST in virgin-app rides/ — Nathan's notes and exports from
│                        app-recorded test rides. The Strava GPS archive lives on `main` only.
├── design/              Editable SVG mirror of every app screen (Nathan's Inkscape round-trip).
├── Nathan/              Nathan's own notes and future plans — agents read-only, never write here.
├── process/             CONVENTIONS.md — the model-tier pipeline, honesty rules, file ownership.
├── product/             CONCEPT.md, DATA-MODEL.md, LAYOUT.md, MAP-CONTRACT.md, MAP-TILES.md,
│                        PRIOR-ART.md, BRAND.md + brand/, and proposals/ (designed-but-unbuilt
│                        specs still feeding active work — COLD-START.md, SETUP-UX.md,
│                        ROUTING-AND-SEGMENTATION.md).
├── safe_to_delete/      Where things get moved instead of deleted. Nathan empties it whenever.
└── scripts/             Build and dev-server tooling (PowerShell/cmd), run on Nathan's PC.
```

## The rules that matter most

1. **`STATE.md` is the only source of truth.** If a fact appears in two places, `STATE.md`
   wins and the other copy is a bug.
2. **Nothing is "done" because an agent said so.** Progress points at something checkable —
   a file that exists, a test that flipped from FAIL to PASS, a change Nathan's actually seen.
3. **Never delete — move to `safe_to_delete/`.**

## Where to start reading

- Current status, ground rules, known issues → `STATE.md`
- What's actually left to build → `OPEN-ITEMS.md`
- What just happened → the newest `cycles/<name>/README.md`
- The idea → `product/CONCEPT.md`
- How the app is put together → `HOW-THE-APP-IS-BUILT.md`
- A word defined → `GLOSSARY.md`
- How work actually happens (the model-tier pipeline) → `process/CONVENTIONS.md`
- Nathan's unfiltered thinking → `IDEAS.md` and `Nathan/`
