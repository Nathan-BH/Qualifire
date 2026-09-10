# Deployment — current state (as of 2026-09-10)

Factual inventory of where distribution stands. Everything below is drawn from the repo's
own config, scripts and `STATE.md`; anything inferred rather than read is tagged
`[UNVERIFIED]`. Update this file in place when a fact changes — don't append history here,
that goes in `CYCLE-LOG.md`.

## 1. One-paragraph summary

Qualifire is distributed **only as an Android APK that Nathan builds on EAS Build and
installs on his own phone.** No tester has received a build: Nathan, 2026-09-09 (Q10 of
`QUESTIONS-FOR-NATHAN.md`): "I have not sent anyone anything so far." Updates to
JavaScript/assets go out over the air via EAS Update on the `preview` channel; native changes
need a fresh APK. There is no store presence of any kind, no iOS build, no CI, no crash
reporting. The `STATE.md` ground rule that said *no store distribution* was superseded on
2026-09-09 (§2). Everything a new tester *would* need today is: the APK file (or an EAS
install link), "install unknown apps" enabled on their phone, and an explanation of what the
app is — the plan is that no tester ever goes through that (`DEPLOYMENT-OPTIONS.md` §0).

## 2. Governing rule on record

**Superseded 2026-09-09 — see `STATE.md`.** The rule below is kept here as the historical
record this morning's inventory was written against; it no longer applies. Nathan: "it is
not a personal app for myself anymore, but something i want people to be able to try out."
Store distribution is now in scope; `no accounts, no social` still stands (that's a separate,
undecided question about the in-app model, not distribution reach). See
`DEPLOYMENT-OPTIONS.md` §0 for the resulting staged plan.

`STATE.md` (root, source of truth), ground-rules section, ~lines 143–176, as it read before
the pivot:

> Single-user, no accounts, no social, no store distribution (except blank-install
> capability).

Read literally, this ruled out Google Play (even a testing track) until Nathan changed it —
which is what just happened.
The "except blank-install capability" clause is what the blank-seed-by-default work
(2026-09-06 / 2026-09-08) delivered: a stranger installing the APK gets a working, empty app
rather than Nathan's data. That is the current mechanism for "someone else can use this" and
it does not involve a store. `DEPLOYMENT-OPTIONS.md` treats the ground rule as a decision to
be revisited, not a fact of nature; `QUESTIONS-FOR-NATHAN.md` Q1 asks about it directly.

## 3. Expo / EAS configuration (what the repo says)

| Item | Value | Source |
|---|---|---|
| App name / slug | `Qualifire` / `qualifire` | `app/app.json` |
| Version | `0.1.0` (marketing version) | `app/app.json` |
| Version source | `remote` — EAS assigns/increments the Android `versionCode` server-side | `app/eas.json` `cli.appVersionSource` |
| Android package (base) | `com.nathanbonher.qualifire` | `app/app.json` |
| Android package (preview variant) | `com.nathanbonher.qualifire.preview`, display name "Qualifire Preview" | `app/app.config.js` via `APP_VARIANT=preview` |
| Android package (virgin variant) | `com.nathanbonher.qualifire.virgin`, display name "Qualifire Virgin" | `app/app.config.js` via `APP_VARIANT=virgin` |
| Platforms | **Android only** — no `ios` block, no iOS bundle identifier | `app/app.json` |
| EAS owner / project | owner `nahtanhbs-team`, project ID `a9f51461-f939-49a2-8c47-087fc39dc5f3` | `app/app.json` |
| EAS Update URL | `https://u.expo.dev/a9f51461-f939-49a2-8c47-087fc39dc5f3` | `app/app.json` |
| Runtime version policy | `fingerprint` — OTA updates only apply to builds with an identical native fingerprint | `app/app.json` |
| Icon | `./assets/icon.png` (+ `adaptive-icon.png` present) | `app/app.json`, `app/assets/` |
| Splash | No `splash.png` found in `app/assets/`. `[UNVERIFIED]` whether SDK 56 / `expo-splash-screen` config derives a splash from the icon or whether the current builds show a blank/default splash. Checklist item for any store-facing build, not a known defect. | digest of `app/assets/` |
| Expo SDK / RN | Expo `~56.0.0`, React Native `0.85.3` | `app/package.json` |
| OTA / dev-client modules | `expo-updates ~56.0.24` (added for build 6), `expo-dev-client ~56.0.24` | `app/package.json` |
| Other native modules | `expo-location`, `expo-task-manager`, `expo-audio`, `expo-file-system`, `expo-status-bar`, `@maplibre/maplibre-react-native ^11.3.6` | `app/package.json` |
| `eas-cli` | **not** a project dependency — installed globally on Nathan's PC | `app/README-dev.md` |

### Build profiles (`app/eas.json`)

| Profile | Distribution | Channel | Build type | Env | Status |
|---|---|---|---|---|---|
| `development` | internal, `developmentClient: true` | `development` | apk | — | Defined; `app/README-dev.md` documents building it. `[UNVERIFIED]` whether a dev-client build has actually been produced and used recently — no script targets it and no cycle doc mentions one. |
| `preview` | internal | `preview` | apk | `APP_VARIANT=preview`, `EXPO_PUBLIC_SEED_MODE=empty` | **Live.** The profile every current install came from — which, per Q10, means Nathan's own phone(s); no tester install exists. Blank-seed permanent since 2026-09-06. |
| `virgin` | internal | `virgin` | apk | same seed env | Dormant per `STATE.md`. |

All three profiles are `distribution: internal` and `buildType: apk`. **No profile produces
an `.aab` (Android App Bundle)**, which is the format Google Play requires for new apps.

### Signing

EAS Build manages the Android keystore for this project on Expo's servers (`build7.ps1`
"reuses keystore"). No local export/backup exists, and none is planned — Nathan decided
against one (Q7, 2026-09-10) once the terms were explained. `[UNVERIFIED]` which keystore
the `.preview` package uses vs. the base package — EAS keeps credentials per application ID,
so the preview variant and base package likely have separate keystores. For the Play route
this is now settled (Q6, 2026-09-10): Google will generate the app-signing key for the clean
package at first upload, and the EAS keystore that signs the uploaded `.aab` serves only as
the upload key (see `DEPLOYMENT-OPTIONS.md` §6, "signing continuity"). No Play upload has
been made yet, so no Play key exists today.

## 4. Build and release tooling (what's proven)

All manual, all PowerShell, all run on Nathan's Windows PC. Nothing runs in CI.

| Script | Role | Proven? |
|---|---|---|
| `scripts/build7.ps1` | Current APK build: EAS Build, profile `preview`, ~10–20 min, needs `-ExecutionPolicy Bypass` | Yes — Build 7 exists (fingerprint `cc04b458…` in `scripts/OTA-TROUBLESHOOTING.md`) |
| `scripts/build4.ps1` | The underlying engine build7 calls: preflight (npm/node/git/tsc/tests), `eas login` check, `eas build` | Yes — the active runbook per `scripts/README.md` |
| `scripts/publish-preview.ps1` | OTA publish: `npx eas-cli update --channel preview --environment preview --platform android`; sets `APP_VARIANT=preview` + `EXPO_PUBLIC_SEED_MODE=empty` locally so the fingerprint matches the build; runs tsc + tests first; ~1–2 min, no build slot | Yes — Build 6 / Build 7 fingerprints recorded; `scripts/OTA-TROUBLESHOOTING.md` exists precisely because this has been exercised and debugged |
| `scripts/OTA-TROUBLESHOOTING.md` | Fingerprint-mismatch playbook (`eas update:list`, `eas fingerprint:compare`) | Doc, not a script |
| `scripts/README.md` | Build-tooling lineage build3 → build7 | Doc |
| `app/README-dev.md` | `npm install -g eas-cli`, `eas login`, `eas build --platform android --profile development`; seed-mode env switch | Doc |

Verification gates every script runs before building/publishing (also the gates any
store-bound build must pass):
- `cd app && node --experimental-strip-types tests/run.ts` — 560 tests, 557 pass / 0 fail / 3 skip (2026-09-08)
- `cd app && ./node_modules/.bin/tsc --noEmit` — clean

## 5. What a tester would experience today

No tester has gone through this yet (Q10, 2026-09-09: "I have not sent anyone anything so
far") — the list is what the current tooling implies, not an observation.

1. Receives the APK (file transfer) or the EAS build page / QR install link — neither has
   been used for anyone but Nathan.
2. Must enable "Install unknown apps" for whichever app opens the APK (browser, Files,
   messaging app). Android shows a warning.
3. Installs "Qualifire Preview" (`com.nathanbonher.qualifire.preview`).
4. JS/asset updates arrive automatically via EAS Update on next launch (fingerprint
   permitting). Native changes require Nathan to send a new APK; the old one keeps running
   with no prompt that it's stale.
5. No crash reports reach Nathan unless the tester describes the problem. No install
   counts, no device/OS breakdown.

## 6. What does not exist

- **No Google Play presence** — no Play Console account, no app listing, no testing track,
  no `.aab` build profile, no privacy policy URL, no data-safety declaration, no content
  rating. Nothing in the repo mentions Play Console at all.
- **No iOS** — no `ios` config, no Apple Developer account, no bundle identifier.
- **No CI/CD** — no `.github/workflows/`, no automated build or test on push.
- **No crash / error reporting** (no Sentry, no Bugsnag, no Expo error tracking).
- **No store assets** — no feature graphic, no screenshots set, no short/long description.
- **No public download page** — `marketing/` exists on `virgin` (copied from `main` in
  cycle 5) but `[UNVERIFIED]` whether it links to any APK; cycle-5 review found a dead demo
  link, so assume it does not currently serve as a distribution page.
- **No keystore backup** — by decision (Q7, 2026-09-10), not by omission (see §3 Signing).

## 7. Known app-side facts that bear on any store submission

Not deployment work as such, but they'd surface in a Play review or a data-safety form:

- **Location — background location is requested. Confirmed by code check (Digest pass,
  2026-09-09); line numbers approximate.**
  - `app/app.json`, `expo-location` plugin config: `isAndroidBackgroundLocationEnabled:
    true`, with `locationAlwaysAndWhenInUsePermission` copy set.
  - `app/app.json`, `android.permissions`: includes `ACCESS_BACKGROUND_LOCATION`,
    `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`.
  - `app/src/location/index.ts`: ride recording runs as a `TaskManager.defineTask` task
    started with `Location.startLocationUpdatesAsync(...)` (~lines 167–270, ~354–365),
    with a foreground-service notification titled "Qualifire — recording ride".
  - `app/src/location/index.ts` `ensurePermissions()` (~lines 282–293): two-step request,
    foreground permission first, then background.
  This is the real background-location pattern, not a foreground-only `watchPositionAsync`.
  What it means for Play (disclosure, justification, demo video) is in
  `DEPLOYMENT-OPTIONS.md` §3; whether the background permission is strictly needed given the
  foreground service is `[UNVERIFIED]` and noted there as a possible lever.
- **Data stays on device.** No accounts, no server, no analytics (`STATE.md`). Makes the
  data-safety form simple ("collects location, not shared, stored on device") but it still
  has to be filled in. `[UNVERIFIED]` whether MapLibre tile requests count as data sharing
  with a third party for the form's purposes (tile-server IP logging).
- **Seed mode is a bundle-time constant** (`EXPO_PUBLIC_SEED_MODE`), so a store build is
  necessarily a blank-seed build — consistent with what's already live.
- **Package-name split.** The only current install (Nathan's) runs the `.preview` package.
  Decided 2026-09-09 (Q5): the Play listing takes the clean `com.nathanbonher.qualifire`,
  app name "Qualifire". A phone with the `.preview` app and the Play app has two
  side-by-side apps and no shared data (Android sandboxes per package). There is GPX+
  export but `[UNVERIFIED]` whether there is any import path that could carry ride
  history across; whole-app export/import is parked in `OPEN-ITEMS.md` item 4.
- **Target SDK.** Play enforces a minimum `targetSdkVersion` for new submissions (raised
  yearly). Expo SDK 56 should satisfy the current bar; `[UNVERIFIED]` — confirm against
  Play's current requirement at submission time.
- **Debug export uses share-sheet / SAF text** (no `expo-sharing`) — fine for a store
  build, just noting no native-module change is pending there.

## 8. Cost of the status quo (for the comparison)

- Money: **€0** — EAS free tier (limited builds/month, sufficient at current cadence
  `[UNVERIFIED]` exact current quota), EAS Update free tier.
- Nathan's time per release: one script run (~10–20 min build, ~1–2 min OTA).
- Per new tester: a file hand-off + walking them through "unknown sources" (never yet
  incurred — no testers, Q10).
- Platform risk: Google has announced a phased **developer-verification requirement for
  sideloaded apps on certified Android devices** (announced 2025, first regions from late
  2026, wider rollout after). `[UNVERIFIED — check current status and regional
  applicability before relying on "sideload forever"]`. If/when it applies to Nathan's and
  his testers' region, even non-Play distribution may require a verified developer
  identity (Google has described a free/limited tier for hobbyists alongside the paid Play
  Console identity). This is the one thing that could force a decision rather than leave it
  open.
