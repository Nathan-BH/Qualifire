# Proposal: smartwatch glance for runners

**Logged:** 2026-10-08 (cycle27 idea 4, with idea 5). **Status:** idea only, NOT urgent. Nathan owns no watch; this was a "crazy idea" parked so it is not lost.
Sources: `cycles/virgin-cycle27/00-nathan-ideas.md` (ideas 4, 5), `04-watch-glance-digest.md`, `11-note-watch-glance.md` (feasibility, full detail).

## The idea (Nathan)
Runners don't look at the phone mid-run and have no bike stand, but may wear a smartwatch. No map on the watch (screen too small); sector, time and position are enough.
- Turn the sector strip into a **circle divided by sectors**; each sector colours itself with the tier colours as today.
- In the **centre**: the current position P.
- No "S2"-style text for the current sector. Instead the **current sector "breathes"**: a slow fade in and out shows it is active.
- The same breathing cue is wanted on the phone's live ride (idea 5; planned separately, phone first).

## Question asked
Do we need a new app for watches, or can a connected phone show some things on the watch?

## Findings (from the repo; platform claims are UNVERIFIED and need a web check before any brief)
- Today: Expo SDK ~56 / React Native 0.85, **Android only**, managed Expo with local Kotlin modules. No watch code anywhere. The sector strip is four View bars (no ring); the ride runs in a foreground service whose notification shows `m:ss · S2` once a second.
- **Road A, zero code:** Android can mirror the ride notification to a paired Wear OS watch (and Garmin via Garmin Connect) as plain text only. No ring, colours or breathing. Needs one test run with a paired watch; whether an ongoing foreground-service notification bridges, and whether the 1 Hz updates buzz the wrist, is unknown.
- **Road B, real ring:** a native Wear OS companion app (Kotlin) fed by the phone through the Wearable Data Layer. The hard part is the build: a second Gradle module next to Expo's single app module (config-plugin spike needed), plus a watch to test on. Medium-large; OTA cannot carry it.
- **Other platforms:** Garmin Connect IQ would be a separate toolchain. Apple Watch needs an iOS app, and Qualifire is Android-only by decision (2026-09-09).

## Open decisions (when this is revisited)
1. Which watch does Nathan, or a target tester, wear? (Wear OS / Garmin / none yet.) Nothing can be chosen without this.
2. Try road A once a watch is available.
3. Only if road B: a build-system spike first, then UI.
