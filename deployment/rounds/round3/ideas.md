# Deployment: Round 3 ideas and decisions (Nathan)

Date: 2026-10-06
Status: sources logged and reviewed (`review.md`, same folder). Nathan's words only, no review here.

Builds on round 2: `../round2/ideas.md` (Play developer account created 2026-10-06; identity, Android device and phone verification still to do).

---

## 1. Official docs to review for anything that helps us forward

> have a look at following sites that might contain some useful information to help us forward? save your review of it in round3

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

---

## 2. Progress log: Google Cloud service account for `eas submit` (2026-10-06)

Status updates from Nathan, same evening as the review (`review.md` flagged that `eas submit` needs a service account):

- Google Cloud free trial not needed; he created a Cloud project instead (name "Qualifire", project ID `qualifire-510820`, no billing attached).
- Google Play Android Developer API: **enabled** (his step 1 done).
- Service account created: `eas-submit@qualifire-510820.iam.gserviceaccount.com` (name `eas-submit`, no Cloud roles added; permissions will come from Play Console).
- JSON key: **created and downloaded.** Location on his computer not recorded here. The key is a secret: never commit it, never put it in the repo or in these notes.

> I will wait for step 4 until my console account is approved

**Waiting on Nathan:** Play Console verification (identity, Android device, contact phone number) and account approval.
**Next, once approved (step 4):** invite `eas-submit@qualifire-510820.iam.gserviceaccount.com` in Play Console under Users and permissions with release permissions for Qualifire, after the Qualifire app exists in the console. Then the key can be given to EAS (`eas credentials`, or `serviceAccountKeyPath` in the `submit` block of `eas.json`, which belongs to the deferred native-build cycle because `eas.json` is fingerprint-hashed).
