# Qualifire

A mobile app that applies **F1 qualifying** logic to a daily bike commute: track the ride by GPS, split the route into sectors, and colour each sector by whether you beat your own benchmark.

Personal app first. Nathan is the only user, the only rider, and the product owner.

---

## How this repository is organised

The project is developed by a **virtual team**: a set of agent roles, each with its own file, coordinated by a Team Principal, running in periodic work cycles. This folder is the team's shared brain.

```
Qualifire/
├── README.md               You are here. Orientation only.
├── IDEAS.md                Nathan's raw idea log, in his own words. Append-only. Never edited by agents.
├── STATE.md                SINGLE SOURCE OF TRUTH. Current state, active priorities, blockers.
├── NATHAN-STATUS.md         Plain-language twin of STATE.md — no bare IDs. Start here if you're Nathan.
├── HOW-THE-APP-IS-BUILT.md  One page on the app's architecture, in plain language.
├── GLOSSARY.md              The words the team uses, defined plainly.
├── CLAUDE.md                Instructions for the coding agent working in this repo.
├── BUILD-4-RUNBOOK.md       The active riding-build runbook.
│
├── app/                What actually runs on the phone (React Native / Expo). See app/README.md.
├── archive/             Compacted history, outside the normal read path.
├── cycles/              One short report per completed cycle.
├── data/                The GPS ride archive and the analysis pipeline that builds the app's catalog.
├── demos/               Browser prototypes and design tools — never the real app.
├── design/              Editable SVG mirror of every app screen (Nathan's Inkscape round-trip, added cycle 024).
├── marketing/            The public-facing site and brand assets.
├── Nathan/               Nathan's own folder — agents read-only, never write here unless explicitly asked.
├── process/             How the team works: the cycle protocol and conventions.
├── product/             What we are building — split into live / proposals/ (designed, unbuilt) / superseded/.
├── safe_to_delete/       Where agents move things instead of deleting them. Nathan empties it.
├── scripts/              Build and replay tooling (PowerShell/cmd), run on Nathan's PC.
└── team/                 Who is building it — one file per agent role, plus the roster.
```

Every folder above has its own `README.md` (except `Nathan/`, described here instead
since agents don't write there, and `design/`, which has its own per its own brief).

## The two rules that matter most

1. **`STATE.md` is the only source of truth.** If a fact appears in two places, `STATE.md` wins and the other copy is a bug.
2. **Nothing is "done" because an agent said so.** Progress must point at something checkable — a file that exists, code that runs, or a decision Nathan approved.

## Where to start reading

**Nathan: start here → `NATHAN-STATUS.md`.**

- Want the idea? → `product/CONCEPT.md`
- Want the current status? → `STATE.md` (technical) or `NATHAN-STATUS.md` (plain language)
- Want to know how the app is put together? → `HOW-THE-APP-IS-BUILT.md`
- Want a word defined? → `GLOSSARY.md`
- Want to know how the team runs? → `process/CYCLE.md`
- Want Nathan's unfiltered thinking? → `IDEAS.md`
