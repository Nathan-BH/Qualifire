# Qualifire marketing — status

*(2026-09-09, updated after round-v1 feedback docs landed)*

## Right now
All four compositions in the slate are built AND rendered. Each composition
now has its own **round-tracked feedback doc** at
`hyperframes/<comp>/rounds/v1/FEEDBACK.md`, written against the actual
current render, with a place for Nathan's notes. `teaser`'s current render
(`teaser_2026-09-09_18-08-41.mp4`) is the post-revision one (fade
transitions in place of shrink/travel, plus the hard-kill contract fix);
its earlier render (`teaser_2026-09-09_09-14-01.mp4`) is stale and still
sits in `renders/` pending an archive pass. Feedback tracking has moved
from whole-slate cycles to a per-composition round scheme — see below.

## Feedback rounds (replaces "Current cycle")
Each composition tracks its own rounds under `hyperframes/<comp>/rounds/`:
`v1/` holds that round's render copy + its `FEEDBACK.md`; a `v2/` gets
added once Nathan's v1 feedback drives a revision, and so on. Each
composition's own `README.md` has a "Feedback rounds" table linking to
every round's feedback doc, so improvement over time stays traceable
per composition. `cycles/01_first-slate/` is the earlier whole-slate
record (superseded by this scheme going forward) — kept for history, not
current.

## Videos
| Composition | State | Current render | Round |
|---|---|---|---|
| gate (idea 1) | built, rendered | `hyperframes/gate/renders/gate_2026-09-09_18-09-25.mp4` | [v1](hyperframes/gate/rounds/v1/FEEDBACK.md) — awaiting feedback |
| teaser (idea 2) | built, revised per feedback, rendered | `hyperframes/teaser/renders/teaser_2026-09-09_18-08-41.mp4` | [v1](hyperframes/teaser/rounds/v1/FEEDBACK.md) — awaiting feedback |
| tour (idea 3) | built, restructured, rendered | `hyperframes/tour/renders/tour_2026-09-09_23-16-48.mp4` | [v1](hyperframes/tour/rounds/v1/FEEDBACK.md) — awaiting feedback |
| purple (idea 4) | built, rendered | `hyperframes/purple/renders/purple_2026-09-09_18-09-50.mp4` | [v1](hyperframes/purple/rounds/v1/FEEDBACK.md) — awaiting feedback |

To re-render any of these after a revision, from `marketing/hyperframes/`
on Nathan's PC:
```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name teaser -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gate -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name purple -Render
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name tour -Render
```

## Folder map
```
marketing/
├── README.md            # this file
├── PLAN.md               # the slate plan
├── index.html            # the site
├── assets/               # brand assets
├── hyperframes/           # HyperFrames compositions
│   ├── COMMANDS.md, STUDIO-GUIDE.md, render.ps1
│   └── teaser/ gate/ purple/ tour/
│       ├── index.html, README.md (has a "Feedback rounds" table)
│       ├── renders/       # raw render.ps1 output, one-render rule
│       └── rounds/        # vN/ = that round's render copy + FEEDBACK.md
├── guides/
│   └── VIDEO-EDITING-GUIDE.md
├── cycles/
│   └── 01_first-slate/    # earlier whole-slate cycle record (superseded)
└── archive/               # superseded renders & composition sources
```

## The workflow loop
idea recorded in `PLAN.md` → build in `hyperframes/<comp>/` →
`npx hyperframes preview` to check, `render.ps1 -Name <comp> -Render` to
render → a round doc is written in `hyperframes/<comp>/rounds/vN/` →
Nathan reviews the mp4 and fills in `FEEDBACK.md` → revise → next round
(`vN+1`) repeats the loop.

## The rules
- **One-render rule:** `hyperframes/<comp>/renders/` holds only the current
  render. A new render supersedes the old one — move the old mp4 to
  `archive/renders/<comp>/` (keep its original filename) before/when a new
  one lands.
- **Archive before a substantive rewrite:** copy the composition's
  `index.html` to `archive/compositions/<comp>/<date>_cycleNN_index.html`
  before a rewrite that changes its structure (not needed for small tweaks).
- **Never delete.** Superseded material moves to `archive/`, always.
- **Closing a feedback round:** (1) Nathan fills in `rounds/vN/FEEDBACK.md`,
  (2) revisions land in `index.html` and get re-rendered, (3) the new
  render + a fresh `FEEDBACK.md` go into `rounds/vN+1/`, (4) the
  composition's own README "Feedback rounds" table gets a new row, (5) this
  file's Videos table row is updated to point at the new round.
