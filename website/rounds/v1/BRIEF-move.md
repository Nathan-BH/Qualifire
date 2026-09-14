# BRIEF — Move the site out of marketing/ and set up rounds (round v1)

**Tier:** Execute. **Status: DONE (2026-09-14), by the coordinator directly** — this was
mechanical file placement with content already fully decided (a straight copy plus
folder scaffolding), not implementation judgment, so it did not go through a Sonnet
subagent. One step could not complete this session — see "What's left" below.

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

## What's left (needs a working PC shell, or Nathan doing it by hand)

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire"
git rm marketing/index.html
git add website/index.html website/rounds/v1/index_v1.html
git commit -m "website: finish move out of marketing/ (index.html was duplicated via device-bridge fallback, no shell available)"
```
Or, without git: just delete `marketing\index.html` by hand once you've confirmed
`website\index.html` matches it (a PowerShell `Compare-Object` or a diff works, or
just eyeball that the byte count matches: both should be 29,111 bytes as of the move).

## Verify
- `website/index.html` and `website/rounds/v1/index_v1.html` exist and are byte-identical
  to the original `marketing/index.html` (29,111 bytes, 812 lines, as of 2026-09-14).
- The five markdown files exist: `website/README.md`, `website/FEEDBACK.md`,
  `website/rounds/v1/FEEDBACK.md`, `website/rounds/v1/BRIEF-move.md` (this file),
  `website/rounds/v2/BRIEF-content-edits.md`.
- Open `website/index.html` in a browser: renders identically to before; the
  day/night toggle still works.

## Pointers that still say the old location (left for the coordinator/Nathan, not fixed here)
- Repo-root `README.md`, the line describing `marketing/` as containing "Video teasers,
  landing page (index.html), brand assets" — should note the landing page moved.
- Root `STATE.md`, wherever it mentions the landing page living under `marketing/`.
- `marketing/README.md`'s own folder map, if it lists `index.html`.

## Report
Done via device-bridge stage/commit, not a shell move. `marketing/index.html` is a
stale duplicate pending manual cleanup (see "What's left"). No git commit was made
(no shell to run git from this session); the files exist on disk but are not yet
staged/committed in the repo.
