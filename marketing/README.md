# Qualifire marketing — status

*(2026-09-09)*

## Right now
All four compositions in the slate are built. `teaser` was revised today
(fade transitions in place of shrink/travel, plus a hard-kill contract fix)
but its render in `renders/` still predates that revision — the render
environment (Nathan's PC, via `device_bash`) could not be reached this
session, so it needs a fresh render. `gate`, `purple` and `tour` are newly
built and have never been rendered. The exact commands to run are below and
in `hyperframes/COMMANDS.md`; see `cycles/01_first-slate/OPEN-ITEMS.md` for
the full note on why rendering didn't happen automatically this round.

## Current cycle
`cycles/01_first-slate/` — open until Nathan reviews the gate/purple/tour
renders (and the revised teaser) from this cycle.

## Videos
| Composition | State | Current render | Cycle |
|---|---|---|---|
| teaser (idea 2) | built, revised per feedback, **render pending** (existing mp4 predates the fix) | `hyperframes/teaser/renders/teaser_2026-09-09_09-14-01.mp4` (stale) | 01 |
| gate (idea 1) | built, **not yet rendered** | — | 01 |
| purple (idea 4) | built, **not yet rendered**, awaiting feedback | — | 01 |
| tour (idea 3) | built, **not yet rendered**, awaiting feedback | — | 01 |

To render all four, from `marketing/hyperframes/` on Nathan's PC:
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
├── guides/
│   └── VIDEO-EDITING-GUIDE.md
├── cycles/
│   └── 01_first-slate/    # this cycle's record + feedback
└── archive/               # superseded renders & composition sources
```

## The workflow loop
idea recorded in `PLAN.md` → build in `hyperframes/<comp>/` →
`npx hyperframes preview` to check, `render.ps1 -Name <comp> -Render` to
render → Nathan reviews the mp4 → feedback recorded in the current cycle
folder → revise → cycle closes.

## The rules
- **One-render rule:** `hyperframes/<comp>/renders/` holds only the current
  render. A new render supersedes the old one — move the old mp4 to
  `archive/renders/<comp>/` (keep its original filename) before/when a new
  one lands.
- **Archive before a substantive rewrite:** copy the composition's
  `index.html` to `archive/compositions/<comp>/<date>_cycleNN_index.html`
  before a rewrite that changes its structure (not needed for small tweaks).
- **Never delete.** Superseded material moves to `archive/`, always.
- **Closing a cycle:** (1) write the cycle's `README.md` record, (2) confirm
  the feedback doc is filed in the cycle folder, (3) move any superseded
  renders/sources to `archive/`, (4) update `PLAN.md` statuses, (5) update
  this file's table and "Current cycle" pointer.
