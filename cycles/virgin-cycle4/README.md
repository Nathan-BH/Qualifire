# virgin-cycle4 — README (start here, especially in a fresh chat)

**Goal of this cycle:** one build (build 7) doing two jobs at once — make the standalone
Preview APK permanently generic/blank-slate (no Leuven/Belgium pre-seeded data, usable by
any user, not a temporary "travel mode" — see the second correction below), and re-anchor
Preview's OTA fingerprint (which had drifted since build 6, silently blocking
`publish-preview.ps1`). Triggered by Nathan's own upcoming trip, but the actual goal
generalized beyond it. Smaller and more linear than virgin-cycle1/2/3: no work-package
briefs, one build script, two design corrections mid-cycle.

## Status at a glance (updated 2026-09-06)

**Designed, executed, fresh-inspected, one real bug found and fixed. Not yet built for
real** — no `pwsh`/`powershell.exe` is reachable from the device_bash bridge, so Nathan
still needs to run the dry run himself on his own machine before spending a real build.

| Step | What | Status |
|---|---|---|
| Diagnosis | Preview's OTA fingerprint drifted past build 6 (`expo-updates` 56.0.24->56.0.25 + earlier `virgin` app.config.js/eas.json additions) -- `eas-cli update:list` vs `build:list` showed the mismatch | Done -- see `BUILD7-PREVIEW-BLANK-SEED.md` S1 |
| First design pass (**rejected by Nathan, see below**) | Built a THIRD, separate "Qualifire Virgin" app (`-BuildProfile virgin` in `build4.ps1`, own package id) | Executed, fresh-inspected clean -- then explicitly rejected by Nathan as the wrong shape of fix |
| Correction | Nathan: *"the virgin build should replace the qualifire preview... Not a separate APK."* Redesigned to rebuild the EXISTING Preview app in place instead | Done |
| Final design + execute | `app/eas.json`'s `preview` profile gets `EXPO_PUBLIC_SEED_MODE=empty`; `scripts/build7.ps1` rewritten to rebuild Preview in place (blank seed + fingerprint re-anchor); `scripts/build7.cmd` relabeled | Landed, uncommitted |
| Fresh-context inspect | Independent Opus/Fable pass, no memory of the execute work | PASS with concerns -- see `BUILD7-PREVIEW-BLANK-SEED.md` S4 |
| Bug found + fixed | `build7.cmd` had LF-only line endings (every sibling `.cmd` is CRLF; `cmd.exe`'s multi-line `if/else` is unreliable on LF) | Fixed directly, verified |
| Live dry run | `build7.ps1 -DryRun` | **DONE 2026-09-06, clean pass** -- every check green (fingerprint policy, blank-seed wiring, native slate, icon, route map assets, tsc, tests), preflight verdict OK, printed the correct queued command. First live confirmation, not just a hand-traced prediction. |
| Real build | `build7.ps1` (drops `-DryRun`) | **RUN by Nathan, completed** -- reached build4's "Done." block (only reachable after a successful `eas-cli build`), which only prints post-success. Committed first (`build7 pre-build commit` / `...cleanup`, `03710eb`). |
| Post-build note fix | `build7.ps1`'s header + printed notes still warned that `publish-preview.ps1` could restore the Leuven seed | **Stale, caught by Nathan, fixed** -- that warning described the exact risk already closed by S7's `publish-preview.ps1` fix, just never updated to say so. Rewritten to state it's fixed, not still a risk; also broadened the "travel" framing to match the permanent-seed correction. |

**Final test suite: 560 tests, 557 pass / 0 fail / 3 skip. `tsc --noEmit`: exit 0.**
(verified both before and after every edit in this cycle)

**Read next:** `CONTEXT.md` for the full framing including the rejected first attempt,
`BUILD7-PREVIEW-BLANK-SEED.md` for the technical detail (diagnosis, design decisions,
exact diffs, inspection findings, open follow-ups), `TOKEN-USAGE.md` for the dispatch
readout.

## Second correction: this is not a "travel mode," it's permanent (2026-09-06, later same day)

Nathan: *"i never want to restore the leuven catalog, the goal is to try a real virgin app
build applicable for any user of the app."* -- Preview isn't being blanked temporarily for
one trip and then reverted; it's becoming the app's actual generic, blank-slate build going
forward, usable by anyone, not just Nathan's own commute demo. No code change was needed for
this part -- `eas.json`'s `preview.env.EXPO_PUBLIC_SEED_MODE` was already unconditional, not
time-boxed. What changed: `scripts/publish-preview.ps1` also now sets
`EXPO_PUBLIC_SEED_MODE=empty` before publishing (previously it only set `APP_VARIANT`), so an
OTA publish can no longer silently reintroduce Leuven-specific data into what is now meant to
be permanently generic. See `BUILD7-PREVIEW-BLANK-SEED.md` S6 (updated) for detail.

## What's deliberately not in this cycle

- Removing the dormant `virgin` eas.json profile / `app.config.js` branch /
  `build4.ps1 -BuildProfile virgin` support left over from the rejected first attempt --
  kept deliberately as harmless, working, unused config rather than hand-reverted out of a
  330-line script with no way to execute it live. See `BUILD7-PREVIEW-BLANK-SEED.md` S2 for
  the full reasoning.
- Updating `scripts/OTA-TROUBLESHOOTING.md` / `STATE.md` with the new fingerprint -- that
  only exists once the real build finishes; it's the coordinator's job post-build, logged
  as a pending step in `BUILD7-PREVIEW-BLANK-SEED.md` S6.
- Any further change to `app/src` -- the blank-seed catalog is generic by construction
  already (an empty catalog is an empty catalog for any user); nothing Leuven-specific
  needed removing from application code, only from what the two deploy scripts ship.
