# Build 6 — EAS Update (OTA) setup

## Why this build happened

Nathan asked whether the standalone "Qualifire Preview" app could receive JS-only
updates without a full rebuild each time. It can, via `expo-updates`/EAS Update — but
turning that on requires one config change baked into a real build (this one), after
which future JS-only changes ship as an over-the-air push instead.

Full architecture, brief, and execution record: `cycles/cycle-025-briefs/BRIEF-eas-update-setup.md`,
landed in commit `126a177`. Memory/process notes: see the project's `qualifire-eas-update-setup`
memory entry.

## What it changed on the phone

- `expo-updates` is now part of the app, with `runtimeVersion` set to the `fingerprint`
  policy (auto-derived from the app's native dependency set) and `updates.url` pointed
  at the Qualifire EAS project.
- The `preview` build profile now publishes to an EAS Update channel called `"preview"`.
- Two new scripts: `scripts/build6.ps1`/`.cmd` (this build, run once) and
  `scripts/publish-preview.ps1`/`.cmd` (every future JS-only push, no build slot spent).

## Q&A (Nathan asked, Claude answered) — kept for when this needs re-explaining

### Q: Is it possible to have a standalone app that can still be updated without a new build? If yes, get the architecture ASAP.

Yes — that's exactly what `expo-updates`/EAS Update is for. The distinction is between
*native* changes (new modules, changed permissions, native config, SDK upgrades) and
*JS* changes (app logic, most bug fixes, UI tweaks). Native changes always need a real
rebuild. JS changes, once `expo-updates` is wired in, ship as an over-the-air update the
standalone app fetches and applies on its next launch — no rebuild, no store round-trip.
It isn't literally "QR-code like dev mode" (that live-reload-from-Metro mechanism is
dev-only), but the practical effect — change the JS, get it on the phone without a new
APK — is real and is the standard Expo production pattern.

The one-time cost: `expo-updates` has to be installed and configured (a runtime-version
policy, an update channel, EAS project linkage), and that config change itself needs one
new build to bake in. After that, JS-only pushes are instant; a build is only needed
again for a native-capability change.

### Q: How does the build know which app to update (Qualifire vs Qualifire Preview)? Do they have a unique identifier? What if I want to change their names?

The unique identifier is the Android package name (`applicationId`), not the display
name. Base `app.json` sets it to `com.nathanbonher.qualifire` (the dev-client app,
"Qualifire"). `app.config.js` has a small override: when `APP_VARIANT=preview` (set by
`eas.json`'s preview build profile), it renames the app to "Qualifire Preview" *and*
appends `.preview` to the package, giving `com.nathanbonher.qualifire.preview`. To
Android these are two completely unrelated apps — separate icons, separate storage,
separate everything — deliberately, so Preview sits beside the dev client instead of
replacing it (2026-08-19 decision, D-043).

For EAS Update specifically, matching isn't by name or package at all — it's by
**channel**. `eas.json` bakes `channel: "preview"` into the preview build and
`channel: "development"` into the dev build; `publish-preview.cmd` only ever pushes to
`"preview"`. So only the Preview app can ever receive what gets published, because
nothing publishes to `"development"`.

Renaming later: changing the **display name** ("Qualifire"/"Qualifire Preview") is a
one-line edit, but it's baked into the native app shell — it needs a real rebuild, it
can't ship as an OTA update. Changing the **package name** is a bigger deal — Android
treats a new `applicationId` as an entirely different app, not an update to the existing
install, so it becomes a fresh install (old local data doesn't carry over automatically).
Worth deciding while it's just test data, not after real ride history builds up.

### Q: What happens after this build? Does the dev-client Qualifire app still update via Metro? How does the standalone app receive updates — same QR code, or different? Does it still work as standalone, and will it ever expire during the day?

Nothing changes for the dev-client Qualifire app — it never runs its own embedded JS
bundle; every launch it connects live to Metro on the PC over the same QR-code flow
already in use. This EAS Update setup is invisible to it.

The standalone Preview app doesn't use a QR code for updates at all — that's dev-only.
Once build 6 is installed, the app checks in with Expo's update servers on every
launch (via `updates.url`), and if there's a newer publish on the `"preview"` channel
matching its runtime fingerprint, it downloads it in the background and applies it on
the **next** launch (open twice to see a change land — normal EAS Update behavior, not
staleness). Publishing is `publish-preview.cmd` on the PC — no QR code involved.

The two apps are never "updated together" — separate identifiers, separate channels,
separate lifecycles.

No, it does not expire during the day. Once installed, a standalone build behaves like
any normal installed Android app indefinitely — there's no session/tunnel time limit.
That expiring/timing-out behavior is specific to Expo Go or a dev-client-over-tunnel
connection, neither of which applies to an installed standalone APK.
