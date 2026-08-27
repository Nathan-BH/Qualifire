# Build 3 — the first real APK; native slate + preview app id

## Why this build happened

The first standalone build. Needed two native modules that don't exist in Expo Go /
the plain dev client: `expo-audio` (earcons) and `react-native-safe-area-context`.
MapLibre was deliberately left out at this point — a live map was faked instead with
a pre-rendered PNG per ratified route plus the rider's dot drawn on top
(`routeMapMath.ts`), specifically so the map could ship over Fast Refresh with no
native module and no build at all. D-026 (2026-08-15) also called for the preview
build to get its own Android app id (`.preview` suffix, via `APP_VARIANT`) so it could
sit *beside* the dev client on the phone instead of replacing it — Nathan's framing at
the time: "the app is standalone, which in the end is what you want when it's
finished." D-026 even flagged EAS Update/OTA as "a later option, not in build 3" — the
option this project only actually took up at build 6, 2026-08-27.

## What it changed on the phone

- Native: `expo-audio`, `react-native-safe-area-context` (MapLibre stayed out).
- The launcher icon (first real one — white lap ring, yellow gate slash).
- The preview build got its own package id, `com.nathanbonher.qualifire.preview`,
  so it installs next to the dev client rather than over it.

## Outcome — it failed, but not the way it sounds

Nathan installed the resulting preview APK and found the *old three-tab app* — none
of the in-flight five-tab redesign. Not a build defect: a standalone APK freezes its
JS bundle at build time, and the redesign existed only in `demos/mockup.html`, never
implemented in the codebase yet. The framing was wrong, not the build. This became the
central lesson driving every build since: **a standalone build only ever ships what's
actually landed in the tree at build time — nothing "in progress" comes along for
free.**

Source: `cycles/cycle-008.md`, `product/DECISIONS.md` → D-026, archived runbook
`safe_to_delete/BUILD-3-RUNBOOK.md`.
