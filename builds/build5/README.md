# Build 5 — the standalone Preview APK is allowed again (D-043)

## Why this build happened

The 2026-08-17 "no standalone APK until finalized" rule (the one that shaped build 4)
got amended two days later. Trigger: the dev client lost its JS mid-day on 2026-08-18
when Android evicted the app in the background and it couldn't re-fetch from Metro —
no PC, no network, no ride data that day. Nathan's ruling (D-043, 2026-08-19, cycle
021): the dev client stays the iteration vehicle, but the `preview` profile
("Qualifire Preview") gets rebuilt on demand whenever he wants the *current* tree
riding with zero PC/Metro/network dependency. The explicit reframe: build 3's failure
was a bundle frozen *before* the changes he wanted landed — not evidence that
standalone builds themselves are unsafe. The rule that keeps that from repeating:
commit (or at least check `git status`) before every build, and rebuild after any
change that needs to actually ride.

## What it changed on the phone

- `scripts/build5.ps1` is a thin wrapper, not a new engine — it's
  `build4.ps1 -BuildProfile preview -Standalone` with the argument names fixed to
  match the build number. All the real preflight (tsc, tests, native-slate checks)
  is build4.ps1's.
- Targets the `preview` EAS profile → `APP_VARIANT=preview` → `app.config.js` names it
  "Qualifire Preview", package `com.nathanbonher.qualifire.preview`. Android replaces
  whatever already has that exact package id + signing key (the previous Preview
  install), and leaves the dev client (`com.nathanbonher.qualifire`) untouched.
- Bakes in **whatever JS is in `app/` at the moment the build runs** — nothing
  in-progress, nothing uncommitted-and-forgotten. This is the same lesson build 3
  taught, just now with a rule (`-Standalone` gate + "commit first") instead of an
  outright ban.

## Where this led

D-043 is what made a rebuildable Preview APK a normal, recurring thing rather than a
one-off — which is exactly the gap build 6 (2026-08-27) closed: instead of a full
rebuild for every JS-only change, EAS Update now lets most of those ship as an
over-the-air push instead. See `builds/build6/README.md`.

Source: `product/DECISIONS.md` → D-043, `scripts/build5.ps1`/`build5.cmd` headers,
`BUILD-4-RUNBOOK.md` §0 and §8 (the `-Standalone`/`-Force`/`-BuildProfile preview`
gate).
