# website — the Qualifire landing page

The public-facing site. One self-contained HTML file plus (from round v2) a small
`assets/` folder. It used to live at `marketing/index.html`; it moved into this
`marketing/website/` folder on 2026-09-14 so it could be iterated with proper
version rounds, a feedback file and a change log, mirroring the `silent-studio/`
convention. (First pass put it at a top-level `website/`, reasoning it wasn't
marketing collateral — Nathan corrected that same day: he wants it under
`marketing/`, and moved it here himself, also cleaning up the leftover
`marketing/index.html` duplicate the move had left behind. This file and the
rest of this folder now assume `marketing/website/` as home.)

**Day/night:** the page has its own toggle (`data-theme` on `<html>`, persisted in
`localStorage['qualifire-theme']`). That mechanism is settled and not up for change
in any round.

## Layout
```
marketing/website/
├── README.md              # this file: purpose, conventions, round index
├── FEEDBACK.md            # Nathan's STANDING rules and site-wide notes (not per round)
├── index.html             # the live page, always the newest round
├── assets/                # page assets (map.png from v2 on); none in v1
└── rounds/
    ├── v1/
    │   ├── index_v1.html  # frozen snapshot of the page as extracted from marketing/
    │   ├── FEEDBACK.md    # round doc: what changed, what to check, Nathan's notes
    │   └── BRIEF-move.md  # executor brief that created this structure
    └── v2/
        ├── BRIEF-content-edits.md   # executor brief for the v2 content edits
        ├── index_v2.html            # (after execution) frozen snapshot
        ├── assets/                  # (after execution) copy of assets the snapshot needs
        └── FEEDBACK.md              # (after execution) round doc
```

## The rounds convention (mirrored from marketing/silent-studio/)
- `index.html` at this level is the live page. It is always identical to the
  newest round's snapshot.
- Every round `vN/` holds a frozen `index_vN.html` (and an `assets/` copy when the
  page references assets, so each snapshot opens on its own) plus a `FEEDBACK.md`
  with four fixed sections: **What changed since vN-1**, **What you'll see, in
  order**, **Things to check**, **Nathan's feedback**. That "What changed" section
  is the change log; the table below is its index.
- A round is opened by a brief (`BRIEF-*.md` in the round folder), executed by a
  Sonnet executor, inspected by a fresh Fable pass, and only then does the table
  below get its row and `index.html` gets replaced.
- Nathan writes round-specific notes in `rounds/vN/FEEDBACK.md`. Anything he wants
  respected in every future round goes in the top-level `FEEDBACK.md` instead, so
  it is read before every brief is written and never silently re-introduced.
- Never delete. A superseded snapshot stays in its round folder; anything genuinely
  discarded goes to `safe_to_delete/` (repo rule 5).

Why a top-level `FEEDBACK.md` in addition to the per-round ones: the silent-studio
compositions are short renders where every note is about one specific cut. The
site accumulates rules that outlive any round ("no em-dashes", "never the word
failure"). Those need one home that every future brief-writer reads first.

## Feedback rounds
| Round | Snapshot | Date | Status |
|---|---|---|---|
| [v1](rounds/v1/FEEDBACK.md) | index_v1.html | 2026-09-14 | Extracted from marketing/index.html, no content edits. Baseline. Landed. |
| [v2](rounds/v2/FEEDBACK.md) | index_v2.html | 2026-09-14 | Built, awaiting Nathan's review |

## Verifying a round
- `grep -c "—" marketing/website/index.html` must print `0` (also `&mdash;`, `&#8212;`, `–`).
- Open `marketing/website/index.html` in a browser: sections render in order, day/night
  toggle works and persists across reload, nothing overflows at phone width.
- `marketing/website/index.html` and `marketing/website/rounds/vN/index_vN.html` are
  byte-identical for the newest N.

## Known state as of 2026-09-14
Resolved. This folder started life as a top-level `website/`, written while
`device_bash` (the shell on Nathan's PC) was unreachable, so the original
`marketing/index.html` couldn't be removed and briefly existed as a duplicate.
Nathan moved the whole folder to `marketing/website/` himself and removed the
duplicate in the same pass. Nothing outstanding.
