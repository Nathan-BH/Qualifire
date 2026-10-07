# Deployment: Round 3 review (Claude)

Date: 2026-10-06
Responds to: `ideas.md` in this folder (ten official pages)
Method: two Haiku digests (`DIGEST-expo.md`, `DIGEST-android.md`) read against round 1 §0/§6, round 2 `review.md` + `PLAN.md` §4 and `CURRENT-STATE.md`; six claims re-checked live (2026-10-06) plus three extra pages (Expo submit/android, Expo service-account guide, Play target-SDK page); `targetSdk` read from `app/node_modules`. [UNVERIFIED] = not confirmed on an official page.

---

## Short answers

| Question | Answer |
|---|---|
| Anything that changes the plan? | **Two facts.** (1) The first Play upload does **not** have to be manual any more: Expo says `eas submit` works for a brand-new app. (2) `eas submit` needs a Google Cloud **service account** JSON, which the Expo digest wrongly called "automatic". |
| Anything that breaks the plan? | **No.** Signing, AAB, tracks and versioning all match what we decided. |
| Target API level? | Play requires API 36 since 2026-08-31; our RN 0.85 default is `targetSdk = 36`. **OK.** |

---

## 1. Verdict per source

| Source | Verdict | Why |
|---|---|---|
| Expo submit-to-app-stores | **useful** | First submission via `eas submit`, `releaseStatus: draft`, listing not managed by EAS |
| Expo build-project | partly | Confirms `.aab` default and EAS keystore; nothing new |
| Android publish | partly | AAB mandatory for new apps; rest is Android Studio generic |
| Android insights | not relevant (for now) | Android Studio lint ("Play Policy Insights"), not Vitals; needs a native `android/` project we do not keep. Digester was right |
| Android preparing | partly | 2033 validity, developer verification 2026; Log/shrink/cleanup items are handled by the Expo release build |
| Android versioning | useful | versionCode rules, max 2,100,000,000; versionName `major.minor.point` |
| Android app-signing | **useful** | Confirms the Q6 model and upload-key reset |
| Android upload-bundle | partly | Play App Signing mandatory; internal track can defer review |
| Android troubleshoot | not relevant | Android Studio IDE issues; we build on EAS cloud, not locally |
| Android known-issues | not relevant | Studio/Gradle/AGP issues; nothing touches EAS Build or Windows PowerShell scripts |

## 2. Confirms

- **Play App Signing, Google-generated key:** "you don't have to do anything. The key you use to sign your first release becomes your upload key" (app-signing). This is exactly Q6; the EAS keystore becomes the upload key.
- **Upload key is resettable** in Play Console (app-signing); the new certificate starts 72 hours later (Expo app-credentials, per digest).
- **AAB** mandatory for new apps since August 2021 (publish, upload-bundle).
- **versionCode** must rise on every upload and is never reusable (versioning): our `appVersionSource: remote` + `autoIncrement: true` covers it.
- **Tracks:** a new app's first `eas submit` lands on internal testing; internal can defer review (upload-bundle, Expo submit).

## 3. New or changed information

1. **First upload need not be manual.** Expo: "If this is your app's first submission, the default `eas submit` command works out of the box... The app stays in draft status in Play Console until you complete the store listing and setup tasks" (docs.expo.dev/submit/android). `CURRENT-STATE.md` §3 and `PLAN.md` §4 item 8 say "manual by Google's rule"; that is now a choice, not a rule. The Android digest's "no automation for initial release" is not on any of its pages.
2. **Service account is required for `eas submit`.** Prerequisites: app created in Play Console; Google Cloud project; service account + JSON key; Google Play Android Developer API enabled; service account invited in Play Console with release/testing-track permissions; JSON uploaded to EAS (expo/fyi creating-google-service-account). The Expo digest's "no service account ... required / appears automatic" is **wrong**.
3. **Certificate validity after 2033-10-22** applies to the **app-signing key** (app-signing page), which Google generates for us. The digest over-generalised it to the upload key. EAS keystore validity [UNVERIFIED], but not decision-relevant.
4. **Target API 36** for new apps and updates since 2026-08-31 (Play target-SDK page). `node_modules/react-native/gradle/libs.versions.toml`: `targetSdk = "36"`, `minSdk = "24"`. Check again at every SDK bump.
5. **versionName** should be `major.minor.point` (versioning). Supports the deferred `0.1.0` bump; pick a value now.
6. **Digest mislabel:** "Internal App Sharing" in `DIGEST-android.md` is the page's **internal track** paragraph; internal app sharing is a separate tool.

## 4. Next steps (ordered)

1. **(b)** Finish identity, device and phone verification on the Play account.
2. **(b)** Create the app in Play Console: "Qualifire", app, free. Leave App signing on the default (Google generates). The package name is bound by the first upload.
3. **(b)** Start the Console setup tasks that do not need a build: privacy policy URL, data safety, content rating, store listing placeholders.
4. **(a)** Draft a `submit.play` block (track `internal`, `releaseStatus: draft`, `serviceAccountKeyPath` outside the repo) into `rounds/round2/DEFERRED-eas.json-with-play-profile.json` only. Not into `app/eas.json`.
5. **(a)** Correct `CURRENT-STATE.md` §3 ("first upload manual by Google's rule") and §7 (target SDK confirmed 36).
6. **(c)** Native-build cycle as in `PLAN.md` §4, plus: `version` bump to the agreed versionName, then the first `.aab`, uploaded by the method chosen in round 4.
7. **(b)** After the first upload: confirm in Play Console App signing that the upload certificate matches the EAS keystore SHA-1 (`eas credentials`).
8. **(b)** Before the second Play build: create the service account and upload its JSON to EAS; then `eas submit` takes over.

Unchanged: `app/eas.json` and other fingerprint-hashed files stay untouched until the native-build cycle (installed build 8, fingerprint `f52e438f...`).

## 5. Decisions for Nathan in round 4

1. **First upload: by hand in Play Console, or by `eas submit`?** Recommended: **by hand.** It needs no service account, and you see the signing screen once yourself.
2. **When to set up the service account?** Recommended: **after the first upload, before the second build.** Only `eas submit` needs it.
3. **First Play versionName?** Recommended: **`0.2.0`.** The testing track already signals "beta"; keep `1.0.0` for a public listing.
4. **Run Play Policy Insights?** Recommended: **skip.** It needs Android Studio and a prebuilt native folder; the Play review checks the same policy.

## 6. Sources

The ten from `ideas.md`:
- https://docs.expo.dev/deploy/submit-to-app-stores/
- https://developer.android.com/studio/publish
- https://developer.android.com/studio/publish/insights
- https://developer.android.com/studio/publish/preparing
- https://developer.android.com/studio/publish/versioning
- https://developer.android.com/studio/publish/app-signing
- https://developer.android.com/studio/publish/upload-bundle
- https://developer.android.com/studio/troubleshoot
- https://developer.android.com/studio/known-issues
- https://docs.expo.dev/deploy/build-project/

Extra, fetched 2026-10-06:
- https://docs.expo.dev/submit/android/
- https://github.com/expo/fyi/blob/main/creating-google-service-account.md
- https://developer.android.com/google/play/requirements/target-sdk

Repo: `app/node_modules/react-native/gradle/libs.versions.toml`.
