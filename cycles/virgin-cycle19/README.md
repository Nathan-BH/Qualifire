# virgin-cycle19 — 3 briefs written 2026-09-30 (Plan tier, Fable). Status: BRIEFS ONLY, nothing executed.

Nathan's two asks, same day, while build 7 was being re-run: (1) "why are all these route map
assets shipped, if this app is supposed to be virgin" — the build preflight printed the section
"6. Route map assets (the faked map -- pre-rendered PNGs, no native module)" listing 20 Leuven
routes; "make new versions and update the build-prepare and build files in general to reflect
the current app implementations better". (2) "the app is 1.1Gb ... have a look at all the
unnecessary things that bloat the app" (from the EAS log: "Compressed project files 2m 59s
(1.1 GB) Your project archive is 1.1 GB ... excluding files that are unnecessary for the build
process in .easignore file").

**Two different sizes, stated plainly (verified 2026-09-30):**
- The **1.1 GB is the upload archive** — the whole git repo (`marketing/` alone is 608 MB of
  tracked media) plus, without a `.easignore`, the shallow clone's own `.git` pack. It is NOT
  the app. Brief 02.
- The **installed app (APK) size is unmeasured** — nobody has read it. `COMMANDS.md` has the
  one-liner. What we DO know: the blank-seed export of 2026-09-29 (`app/dist/`) still carries
  the three Leuven route PNGs (3.9 MB) and Nathan's seed catalog + archive ghost strings
  inside the Hermes bundle. Brief 01.

## Brief index

| # | file | idea | ships as | status |
| --- | --- | --- | --- | --- |
| 01 | `01-stop-shipping-leuven-seed.md` | stop bundling the Leuven catalog, archive ghost times, `ways.json` and the 3 route PNGs into blank-seed builds (Metro redirects them to stubs when `EXPO_PUBLIC_SEED_MODE` is not `shipped`) | JS / OTA (`publish-preview.ps1`); fingerprint expected unchanged — verify | brief only |
| 02 | `02-shrink-upload-archive.md` | repo-root `.easignore`: upload only `app/` (and drop the clone's `.git`) — 1.1 GB -> a few tens of MB expected; APK-bloat options listed, all unmeasured | repo-only (takes effect on the NEXT EAS build) | brief only |
| 03 | `03-refresh-build-scripts.md` | `build8.ps1`/`.cmd`: one self-contained preflight+build for the app as it is now (blank seed asserted, export inspected, `.easignore` asserted, no "route map assets" section); builds 3–7 moved to `scripts/legacy/`; `scripts/README.md` + `OTA-TROUBLESHOOTING.md` refreshed | repo-only (used for the next native build) | brief only |
| — | `COMMANDS.md` + `measure.ps1` | copy-paste lines for Nathan (all `-ExecutionPolicy Bypass -File …\measure.ps1 -<switch>`): archive size without a build, APK size + fingerprint of the last build, what is inside the APK, fingerprint of the tree now, export inspection | — | — |

## Order and dependencies

- **Wait for Nathan's current build 7 re-run to finish before touching `scripts/`** (brief 03
  moves `build4.ps1`/`build7.ps1`; a running PowerShell that has already loaded them is fine,
  but do not move files under a build that has not yet reached step 8).
- Execute **02 -> 01 -> 03**. 01 and 02 are independent of each other; 03 asserts what 01 and
  02 put in place (`metro.config.js`, `.easignore`), so it goes last.
- **Relative to the pending native rebuild:** virgin-cycle18 briefs 01+03 need the native
  rebuild Nathan is running now (build 7 script, cycle18 modules in the tree). Nothing in
  cycle19 needs a further native build *on its own*: 01 is bundler-only, 02 is a repo-root file
  the fingerprint does not read (`@expo/fingerprint` hashes `app/.easignore`, not the repo
  root's — expected, verified by COMMANDS.md §3 before/after), 03 is scripts. If §3 shows 01
  DID move the fingerprint, 01 rides the next native build (build 8) instead of an OTA — no
  harm, just later.
- Each brief: Sonnet executor, cold, stop-on-ambiguity; then a fresh Opus Inspect. Nathan runs
  everything that needs `npm`/`npx`/`eas` (COMMANDS.md).

## Nathan's calls still open (defaults chosen in each brief, none blocking)

1. **DEMO tab fixture (brief 01, Open call A).** `src/ui/demoWayFixture.ts` is a frozen copy of
   Nathan's real "Morning" commute (home -> work gate coordinates, Leuven) and stays in every
   build by his 2026-09-03 ruling. Options: (a) keep as is — default, it is the demo and he
   ruled on it; (b) replace with a synthetic loop that is not anyone's commute; (c) keep the
   shape, shift the coordinates to open countryside. Privacy note only — the fixture is not
   labelled as anyone's home.
2. **How far the `.easignore` goes (brief 02, Open call A).** Default: upload `app/` only.
   Alternative: keep the whole repo but drop `marketing/`, `.git` and the bins — simpler to
   read, ~10x smaller instead of ~50x.
3. **Build-8 default profile (brief 03, Open call A).** Default: `preview` (the standalone
   Preview APK — what every build since 5 actually built). `-BuildProfile development`
   rebuilds the dev client (also needed once for cycle18's native modules to reach Fast
   Refresh).
4. **APK diet options (brief 02 §5)** — arm64-only ABI, dropping `expo-dev-client` from
   release builds, unused earcons: all listed with unmeasured estimates; nothing is briefed
   until the APK has been measured once.

## Not briefed / parked follow-ups

- `marketing/archive/pre-teaser-full-studios` (391 MB on disk, tracked) — git-history weight,
  not an app concern; left alone.
- `app/dist/` (12 MB, gitignored) is a stale 2026-09-29 export; `app/eas.json.bak`,
  `app/err.log` — cosmetic, left alone (brief 02 lists them in `.easignore` anyway).
- `README-dev.md`, `HOW-THE-APP-IS-BUILT.md`: one line each may mention `build7.ps1` after
  brief 03 — coordinator's pass, not briefed.
