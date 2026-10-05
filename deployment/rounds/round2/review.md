# Deployment: Round 2 review (Claude)

Date: 2026-10-05
Responds to: `ideas.md` in this folder (Nathan's two Expo questions)
Method: two Opus research subagents (Expo pricing from official pages; update workflow from the repo plus Expo/Play docs), merged here. Items marked [UNVERIFIED] could not be confirmed from an official page or have not been run.

---

## Short answers

| Question | Answer |
|---|---|
| Can I keep using EAS once I'm on the Play key? | **Yes.** Play and your `.preview` app are two separate lines, each with its own channel. JS changes go by `eas update` to both; native changes need a new build (`.apk` for you, `.aab` through Play for testers). |
| Can I test on my preview app before testers get it? | **Not yet, one fix needed.** Today the preview and Play builds get different fingerprints, so a bundle tested on `.preview` would be silently ignored by the Play build. A small config file fixes it (see 1b). |
| Will I hit an Expo paywall? | **Almost certainly not at your scale.** The free plan cannot run up charges: when the monthly build quota is used up, builds stop until the 1st. |

---

## 1. Updates and builds after the Play key

### 1a. Workflow

| Change | Your `.preview` app | Play internal track (you) | Play closed track (testers) |
|---|---|---|---|
| JS/assets only | `publish-preview.ps1` (channel `preview`), 1-2 min, no review | `eas update --channel play` (script `publish-play.ps1` does not exist yet), minutes, no review | **Same update.** Internal and closed run the same AAB on channel `play`, so they get it at the same moment |
| Native change (Sentry, SDK bump) | `build8.ps1` gives a new APK, ~10-20 min, sideload | `eas build --profile play` gives an `.aab`; upload to internal; live in minutes, review may be skipped | Promote the release to closed: review applies (days the first time, given background location), then Play auto-updates phones |
| New permission / background-location change | Same as native | Same as native, plus the Console permission declaration | Review always applies |

Play policy: an app may not update itself by any method other than Play's, except code running in an interpreter (JS). OTA of JS is therefore allowed; anything touching permissions or native code must ship as a new AAB and can never be an OTA.

### 1b. Testing on `.preview` before testers get it

- Promotion is a real feature: `eas update:republish --destination-channel play` republishes the exact tested bundle. Expo's caveat: only when runtime versions match.
- **They do not match today.** `app.json` uses `runtimeVersion.policy: "fingerprint"`, and `app.config.js` changes the app name and package for `.preview`, which changes the fingerprint. The repo was bitten by this before (`scripts/OTA-TROUBLESHOOTING.md` §3). A bundle republished from `preview` would be ignored by the Play build.
- **Fix:** add `app/fingerprint.config.js` skipping the app name and Android package (probably the version too; whether `version` is skipped by default is [UNVERIFIED]). Ship it in the same native build as Sentry, since both builds need rebuilding anyway. Then confirm with `eas fingerprint:compare` that both builds hash the same [UNVERIFIED until run].
- Resulting loop: `publish-preview` → check on your phone → `update:republish --destination-channel play`.
- **Fallback with no config change:** publish the same commit twice, once per channel. Same source, not the identical bundle.

### 1c. Play-side staging

- Internal track: up to 100 testers, live in minutes, may skip review. Put your own Google account here.
- Closed track for testers. Release order for native builds: AAB to internal, check it, promote to closed.
- Caveat: accounts on the internal track cannot also be in closed/open testing, and internal is **not** an OTA staging layer, because every Play release listens to channel `play`. `.preview` is your OTA staging step.

### 1d. What the repo still lacks (verified by the researcher)

- `app/eas.json`: no `play` profile. Needs `channel: "play"`, `buildType: "app-bundle"`, `EXPO_PUBLIC_SEED_MODE=empty`, no `APP_VARIANT`, and `autoIncrement: true` (gives each upload a new `versionCode` under `appVersionSource: remote`). No `submit` section yet.
- `scripts/publish-play.ps1` (the preview script hardcodes `APP_VARIANT=preview` and `--channel preview`).
- `app/fingerprint.config.js`.
- `app/app.json` still `version: "0.1.0"`.
- Nothing extra for the expo-updates channel: EAS Build injects it from `eas.json`.

---

## 2. Is Expo free for good?

**Free forever:** Expo SDK, Expo Go, the CLI, `expo prebuild`, all libraries, and building on your own machine.
**Metered cloud services (EAS):** Build, Update, Submit, Hosting, Workflows. Each has a free monthly allowance.

Limits (expo.dev/pricing, checked 2026-10-05):

| | Free $0 | Starter $19/mo | Production $199/mo |
|---|---|---|---|
| Builds | 15 Android + 15 iOS per month, low-priority queue | $45 credit, then usage-based; high priority | $225 credit |
| Build timeout / concurrency | 45 min / 1 | 2 h / 1 | 2 h / 2 |
| Update monthly active users | 1,000 | 3,000 | 50,000 |
| Update bandwidth / storage | 100 GiB / 20 GiB | same, then $0.10/GiB and $0.05/GiB | 1 TiB / 1 TiB |
| Submit, seats | included, unlimited | included, unlimited | included, unlimited |

Usage prices: Android build $1 (medium) or $2 (large); extra update user $0.005. Credits do not roll over.

**When the free allowance runs out:** Expo's billing FAQ says free accounts incur no overage charges; new builds are unavailable until the quota resets on the 1st. Expo emails at 80% and 100%. Behaviour above 1,000 update users on Free is not documented [UNVERIFIED]; a spend cap on paid plans is not documented [UNVERIFIED].

**Your scale:** 5-10 testers is about 10 of 1,000 update users; you would need roughly 1,000 active testers before updates alone forced Starter. Builds are the only thing to watch: "a few per week" is 12-16 a month against 15 Android builds, and each profile (preview, virgin, play) counts. Running out costs waiting or building locally, not money.

**Ways to stay free:**
- `eas build --local`: Linux/macOS supported; Windows only via WSL, "not officially tested" by Expo. Still needs `eas login` and fetches credentials from EAS.
- No EAS at all: `npx expo prebuild`, `gradlew bundleRelease`, upload the AAB to Play by hand. Standard React Native practice.
- Updates: a self-hosted server using the open expo-updates protocol is documented; or just ship AABs through Play.

**Lock-in: low.** `expo prebuild` yields a normal Android project. Credentials can be downloaded (`eas credentials` → Android → Credentials.json → download). Under your Q6 decision Google holds the signing key, so the EAS keystore for the Play package is only the upload key, which Google can reset [UNVERIFIED for your exact setup]. Only the `.preview` key lives solely at EAS (round 1, Q7: no backup decided; this stays optional).

---

## Decisions this round suggests (for Nathan to rule on in round 3)

1. Add `fingerprint.config.js` in the Sentry/disclosure native build so `.preview` can stage OTA bundles for Play. (Recommended.)
2. Keep EAS Free; revisit only if you pass ~12 builds a month regularly.
3. Optional ten-minute chore: download the `.preview` credentials once as a backup.

## Sources

Expo: expo.dev/pricing, docs.expo.dev/billing/plans, /billing/faq, /billing/usage-based-pricing, /build-reference/local-builds, /app-signing/syncing-credentials, /app-signing/managed-credentials, /eas-update/deployment, /eas-update/eas-cli, /eas-update/faq, /distribution/custom-updates-server, /versions/latest/sdk/fingerprint, /build-reference/app-versions.
Google: support.google.com/googleplay/android-developer/answer/9888379 and /answer/9845334.
Repo: `app/eas.json`, `app/app.json`, `app/app.config.js`, `scripts/publish-preview.ps1`, `scripts/OTA-TROUBLESHOOTING.md`, `deployment/CURRENT-STATE.md`, `deployment/rounds/round1/review.md`.
