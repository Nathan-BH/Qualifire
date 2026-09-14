# BRIEF — Move the site out of marketing/ and set up rounds (round v1)

**Tier:** Execute. **Status: DONE (2026-09-14).** History below: the coordinator's
first pass put this folder at a top-level `website/` (mechanical file placement,
content already fully decided, so done directly rather than through a Sonnet
subagent) and left `marketing/index.html` in place as a stale duplicate because
the device bridge could write but not delete that session. Nathan then moved the
whole folder to `marketing/website/` himself and removed the duplicate — see
"Superseded by Nathan's own move" below. Nothing is outstanding.

## Goal
Relocate `marketing/index.html` to a new top-level `website/` folder, freeze it as
round v1 unchanged, and create the README / FEEDBACK / rounds skeleton. No content
edits in this brief. The file is fully self-contained (inline CSS and JS, inline SVG
logo, no external images or fonts), so nothing else moves with it.

## What actually happened

`device_bash` (the shell on Nathan's PC) was unreachable for this entire session
("no Plan9 drive shares mounted" error, confirmed at the start of this task and
consistent with a known intermittent failure mode for this bridge). Without a shell,
a `git mv` is not possible — the device-bridge file tools available this session
(`device_stage_files`, `device_commit_files`) can only read and write file content, not
move or delete a file.

So: `marketing/index.html` was staged, and its exact content was **committed to two new
locations** — `website/index.html` and `website/rounds/v1/index_v1.html` — via
`device_commit_files`. `marketing/index.html` itself was **left in place**, since it
could not be removed. This is the fallback path, not the first-choice one.

## Superseded by Nathan's own move (2026-09-14, same day)

The coordinator's fallback (device-bridge stage/commit, no shell) placed this
folder at a top-level `website/` and left `marketing/index.html` as a stale
duplicate pending a manual `git rm`. Nathan moved `website/` to
`marketing/website/` by hand and removed the `marketing/index.html` duplicate
in the same pass — his intent all along was for the site to live under
`marketing/`, not at the repo root. All paths in this folder's docs now assume
`marketing/website/`. No cleanup remains.

## Verify
- `marketing/website/index.html` and `marketing/website/rounds/v1/index_v1.html`
  exist and are byte-identical to the original `marketing/index.html`
  (29,111 bytes, 812 lines, as of 2026-09-14).
- The five markdown files exist: `marketing/website/README.md`,
  `marketing/website/FEEDBACK.md`, `marketing/website/rounds/v1/FEEDBACK.md`,
  `marketing/website/rounds/v1/BRIEF-move.md` (this file),
  `marketing/website/rounds/v2/BRIEF-content-edits.md`.
- Open `marketing/website/index.html` in a browser: renders identically to
  before; the day/night toggle still works.

## Pointers that still say the old location (left for the coordinator/Nathan, not fixed here)
- Repo-root `README.md`, the line describing `marketing/` as containing "Video teasers,
  landing page (index.html), brand assets" — should note the landing page is now at
  `marketing/website/`.
- Root `STATE.md`, wherever it mentions the landing page living directly under
  `marketing/` as `index.html`.
- `marketing/README.md`'s own folder map, if it lists `index.html`.

## Report
Landed via device-bridge stage/commit at a top-level `website/`, corrected by
Nathan to `marketing/website/` the same day (he also removed the stale
`marketing/index.html` duplicate the fallback had left). Current state is
correct and final; no git commit exists yet for any of it (no shell reachable
this session to run git from).
