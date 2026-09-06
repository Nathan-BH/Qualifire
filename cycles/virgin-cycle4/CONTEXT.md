# virgin-cycle4 -- CONTEXT

## What this cycle is

Started 2026-09-06, same day virgin-cycle3 (WP-1/2/3) landed. Not a work-package cycle
like 1/2/3 -- it's a single deploy/build task that turned out to need a real design
correction mid-flight, worth documenting the same way a WP would be.

## The trigger

Two things converged the same day:

1. **OTA publishes had stopped applying.** Nathan ran `publish-preview.ps1` successfully
   (tests green, "Published!", valid update group) but his phone kept showing the old app
   after three force-closes. Diagnosed via `eas-cli update:list --branch preview` vs
   `eas-cli build:list --platform android` (both from `app/`, not `scripts/`): build 6's
   installed fingerprint (`251ddb86...`) no longer matched the latest publish's runtime
   version (`662f91da...`). Root cause: `expo-updates` moved 56.0.24->56.0.25 in
   `package-lock.json`, and `app.config.js`/`eas.json` had gained a new `virgin` build
   variant (from earlier, unrelated B-39/D-045 work) -- any edit to `app.config.js` is
   native-relevant under `runtimeVersion.policy: "fingerprint"`, even in an unrelated
   profile. Expo Updates silently refuses a fingerprint-mismatched update -- no error, no
   crash, just nothing visibly happening, which is why it looked like a publish bug rather
   than what it was.

2. **Nathan is traveling to multiple countries in the coming weeks** and wants to record
   free rides/walks with zero pre-seeded Leuven/Belgium routes, gates, or sports in the
   way -- "just select the sport like walk and use the app on the road without worrying
   about pre-seeded assets." The trip is what surfaced the need, but Nathan later clarified
   (see "Second correction" below) that the actual goal is broader: Preview becoming a
   real, generic, any-user-applicable blank-slate build, permanently -- not a mode to
   revert out of once the trip ends.

The fix for (1) needed a fresh native build anyway (to re-anchor the fingerprint) -- (2)
needed one too (native builds are the only way to freeze `EXPO_PUBLIC_SEED_MODE` for a
standalone APK, since there's no runtime seed-mode toggle outside a Metro dev session).
Nathan's own call: fold both into one build rather than two.

## The rejected first attempt (read this before touching build4.ps1 or eas.json's virgin block)

The first pass misread "ship the virgin app... total blank state" as wanting a THIRD,
separate installable app -- "Qualifire Virgin," its own package id
(`com.nathanbonher.qualifire.virgin`), sitting beside Preview rather than replacing it.
This was fully built: `build4.ps1` gained a `-BuildProfile virgin` (ValidateSet, Step 0
profile gate, Step 4 variant/env checks, a virgin-specific Done message), and
`build7.ps1`/`build7.cmd` were written to delegate to it. Executed, fresh-Fable-inspected,
came back clean.

Nathan then corrected this explicitly: *"i think you got it wrong, the virgin build should
replace the qualifire preview. I wanted to have a standalone app like the preview but with
the virgin update like i have it for my standard qualifire development app. Not a separate
APK."* -- i.e. the same relationship `scripts/dev-virgin.ps1` has to the dev client (flip
one app to blank-seed mode for a session) should hold for the standalone Preview APK too,
except a native build freezes the choice at build time instead of offering a runtime
toggle.

**Design decision made on the correction: leave `build4.ps1`'s virgin support in place,
dormant.** Nathan's actual ask needed zero functional change to `build4.ps1` -- the fix is
entirely in `eas.json`'s existing `preview` profile plus a rewritten `build7.ps1`. Hand-
reverting the virgin additions out of a 330-line PowerShell file that can't be executed
live from here (no `pwsh` on the device_bash bridge) was judged the highest-risk move
available, especially since the same uncommitted diff also carries WP-3's path-rename
fixes (`routeMapView.tsx`->`wayMapView.tsx`, `assets/routes/routes.json`->
`assets/ways/ways.json`) that a preview build genuinely needs. So the dormant `virgin`
profile/branch/support stays as harmless unused config; a genuinely separate third app is
still one `build4.ps1 -BuildProfile virgin -Standalone` away if ever actually wanted later.

## What virgin-cycle3 established that this cycle relies on

- WP-1 (multi-sport support) and WP-2 (results tab) are both landed and committed on
  branch `virgin`. Sports are unconditionally never pre-seeded in ANY build (a fresh
  install has zero sports until Nathan adds one) -- so the blank-seed build needs no extra
  sport-related work at all.
- `DemoScreen.tsx`/`demoWayFixture.ts` (the "FIRST RIDE"/"SECOND RIDE" demo mode) is left
  exactly as-is per Nathan's explicit choice -- it's algorithm-demo scaffolding a traveling
  user wouldn't pick as a real route, not something that needs stripping for the blank
  build.
- An old `src/ui/preview/PreviewScreen.tsx` + `ways.ts` fixture with hardcoded Leuven
  route/gate data is confirmed dead code (not imported anywhere, superseded by
  `DemoScreen.tsx`) -- no action needed.

## Primary source documents

- Nathan's own messages in this chat (2026-09-06) are the primary spec, including the
  explicit correction quoted above.
- `BUILD7-PREVIEW-BLANK-SEED.md` -- the full technical writeup: exact diffs, design
  decisions, fresh-Fable inspection findings, verification results, open follow-ups.
- `app/src/store/seed.ts` -- the actual mechanism: `EXPO_PUBLIC_SEED_MODE === 'empty'`
  gates an empty catalog/results vs. the shipped (Leuven) ones.
- `scripts/OTA-TROUBLESHOOTING.md` -- pre-existing fingerprint/OTA reference; still says
  "clone build6.ps1 -> build7.ps1" and needs updating once the real build's fingerprint is
  known (not done in this cycle -- see README's "deliberately not in this cycle").

## Second correction: permanent, not a travel mode

Nathan, later the same day: *"i never want to restore the leuven catalog, the goal is to
try a real virgin app build applicable for any user of the app."* This reframes the whole
cycle: Preview's blank seed was never meant to be a temporary state to switch back out of
after the trip -- it's the app's actual generic default going forward, for any user, not
just Nathan on holiday. See `BUILD7-PREVIEW-BLANK-SEED.md` S7 for what this changed (a real
fix to `scripts/publish-preview.ps1`, which previously could have silently reintroduced
Leuven-specific data on any future OTA publish) and what it didn't need to change (the
build-7 design itself, which was already unconditional rather than time-boxed).

See also `cycles/virgin-cycle3/` (WP-1/2/3, landed the same day) and
`process/CONVENTIONS.md`'s "Where documentation lives" section (added this cycle, at
Nathan's request, to route future per-build writeups here instead of into device-side
project memory).
