# Build 4 — MapLibre lands, but only on the dev client

## Why this build happened (and why its scope changed mid-flight)

Build 4 was originally planned (see the archived pre-cycle-015 runbook) as a
*standalone preview APK* rebuild carrying everything that had landed in JS since
build 3 — six tabs instead of three, the live route-map PNG with gate colouring, the
settled colour model, the ghost tower, persisted settings, the corrected launcher
icon, a real Result tab, gate buzzes, and the Demo tab. Before that ran, Nathan ruled
(2026-08-17, in direct response to build 3's stale-bundle failure): **"no
standalone/preview APK until the app is finalized."** Build 4 was redefined around
that ruling — it became a **dev-client-only** rebuild, and its one job narrowed to
carrying MapLibre (B-50/D-041, the real map replacing the PNG fallback) as the single
native delta. The JS feature list above didn't need build 4 at all — a dev client
streams JS live from Metro, so all of it was already visible over Fast Refresh before
this build ever ran.

## What it changed on the phone

- **Exactly one native delta: MapLibre.** Everything else (six tabs, colour model,
  ghost tower, settings persistence, icon, Result tab, buzzes, Demo tab) was already
  pure JS and had been visible on the dev client via Fast Refresh before this build.
- Same app id as before (`com.nathanbonher.qualifire`, dev-client profile) — this
  build replaced the dev client in place; the (at-the-time-frozen, stale) Preview app
  was untouched.
- `-BuildProfile preview` was deliberately barred without an explicit `-Force`,
  printing a refusal citing the 2026-08-17 ruling and build 3's failure as precedent —
  a guard rail baked directly into `build4.ps1`, not just a runbook note.

## Outcome

Landed clean, no repeat of build 3's staleness — because a dev client, unlike a
standalone build, has no baked-in bundle to go stale in the first place.

Source: current `BUILD-4-RUNBOOK.md` (root), archived pre-scope-change draft
`safe_to_delete/BUILD-4-RUNBOOK.pre-cycle015.md`, `cycles/cycle-015.md`,
`product/DECISIONS.md` → D-041.
