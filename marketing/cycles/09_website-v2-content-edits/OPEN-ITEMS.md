# Cycle 09 — open items

## Blocker (partial — did not stop the work, just narrowed the verification)
`device_bash` was unreachable for this whole session (same recurring issue as
cycles 01/02/06/07: `sandbox-helper: no Plan9 drive shares mounted`). It did not
block this cycle's actual work — every file operation (reading, editing, staging
the map asset, committing back) went through the `device_list_dir` /
`device_stage_files` / `device_commit_files` fallback, which is fully sufficient
for the kind of change this cycle made (in-place HTML/CSS/JS edits + one image
downscale, no rendering, no build tooling). What it did rule out is opening the
page in an actual browser, so the visual/console half of Part F2's acceptance
tests was never run.

**No PowerShell or render commands are needed for this cycle** — unlike the
silent-studio/audio-studio cycles, nothing here goes through `render.ps1` or
`npx hyperframes`.

## What's left for Nathan

1. **Open `marketing/website/index.html` in a browser** (or the live site, once
   this round ships) and confirm: no console errors, the day/night toggle still
   switches and persists across reload, and the map card actually shows the dark
   basemap with the yellow route, three white gate ticks, and the blue rider
   circle moving along the route (12s/lap). This is the one thing this session
   could not check.
2. **Review `website/rounds/v2/FEEDBACK.md` → "Things to check"** and leave notes
   in its "Nathan's feedback" section. It already lists:
   - Hero without the pitch paragraph: bare or clean?
   - The two new section headings (`#mechanic` H2, `#colour` H2) — both were Fable
     calls, not things you asked for.
   - Dark basemap used in day mode too (a positron/day capture is a later round,
     needs you to run `silent-studio/_map/map-capture.html` once — see the site's
     top-level `FEEDBACK.md` "Open preferences").
   - The philosophy line "Your only rival is the last ten versions of you." was
     kept even though it echoes wording from the deleted hero pitch — say if it
     should go too.
   - Rider loop speed (12s/lap) and gate-tick legibility at phone width.
   - The `<title>` now uses a pipe separator instead of an em-dash.
3. Nothing to clean up on disk — no superseded renders or duplicate files from
   this cycle (unlike cycles 06/07).

## Judgment calls made without asking (both already flagged as such in the brief and in `FEEDBACK.md`, repeated here for visibility)

- `#mechanic`'s H2 was changed from the (now-repetitive) "Same road. New meaning."
  to "One ride sets the route. Every ride after it is timed." — not something you
  asked for.
- `#colour`'s H2 was changed from "How today's ride gets its colour." to "What
  each colour means." — same, for consistency with the simpler kicker rename.

## Doc-only nit, already fixed (not left open)

`website/rounds/v2/FEEDBACK.md` originally recorded `map.png` at 800,809 bytes
(the PIL output size); the on-disk committed file is 806,579 bytes because each
commit stamps its own Anthropic C2PA manifest chunk (pixel data unaffected). Fixed
directly in the doc — no action needed from you.
