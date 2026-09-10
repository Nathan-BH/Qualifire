# deployment — work log (most recent first)

One entry per deployment-focused work session. Each entry: what was done, what actually
landed (checkable artifact), what's still open. Progress is an artifact, not a sentence —
if an entry says something was done, name the file/build/commit.

---

## 2026-09-10 — Q6/Q7 decided; all ten questions resolved; update mechanism explained

**Trigger.** Nathan answered the two rewritten signing questions inline, in a file he saved
as `QUESTIONS-FOR-NATHAN2.md` (the canonical `QUESTIONS-FOR-NATHAN.md` had meanwhile
reverted to an older 8,137-byte version without the Q6/Q7 primers). His Q6 answer carried a
real follow-up question — whether he can still use Expo for updates once the app is on Play,
or whether Play has its own update tool — and his Q7 answer carried a piece of reasoning he
asked to have confirmed.

**Decided (Nathan's words quoted in `QUESTIONS-FOR-NATHAN.md`):**
- **Q6 — let Google generate a fresh app-signing key** (option a, the Play Console
  default): "I would go with the play store route so I start from a fresh key." Consequence,
  already explained to him before he chose and now recorded as permanent: the clean package
  `com.nathanbonher.qualifire` is Play-only; a sideloaded EAS APK of it can never be updated
  by Play or vice versa, so §0's ordering rule hardens from "no sideload before Play is set
  up" to "no sideload of the clean package, ever". EAS's keystore for the clean package
  becomes the *upload* key only (replaceable via Play Console).
- **Q7 — no keystore backup for now:** "I would lean for no later … if I use the google
  play route, its not needed either?" Confirmed as correct for the Play population (Google
  holds the app-signing key; nothing for Nathan to export). His other reason — the app being
  far from complete — was noted as beside the point rather than wrong. One narrow exception
  named so it doesn't surprise him: his own `.preview` install is signed with EAS's
  `.preview` key, of which Expo holds the only copy; that install is being retired (§0
  Step 3), so it's a non-issue in practice. Optional ten-minute export stays available.

**His update question, answered (in `QUESTIONS-FOR-NATHAN.md` Q6 and `DEPLOYMENT-OPTIONS.md`
§0 "Two update paths"):** two independent mechanisms. **Path 1, EAS Update (OTA)** — JS and
assets via `expo-updates`, published with `eas update` to the build's channel, applied on
next launch when the native fingerprint matches; does not go through Play, is not reviewed
by Google, works identically for a Play-installed app; this is what `publish-preview.ps1`
does today and it continues unchanged (a `publish-play.ps1` sibling for channel `play`).
**Path 2, a new binary through the Play Console** — needed only when the native fingerprint
changes (new permission, new native module such as Sentry, Expo SDK upgrade); `eas build
--profile play` produces an `.aab`, uploaded manually or via `eas submit`; this is what Play
reviews (the background-location items) and then auto-installs on every tester's phone.
There is no separate "Play update tool" — the console *is* it, and only for Path 2. Under
Q6, Path 2 is the only way a native change reaches any phone with the clean package.

**Done (Plan pass, Fable; analysis only, nothing in the app)**
- `QUESTIONS-FOR-NATHAN.md` — **rewritten in full as the canonical, fully resolved
  record**, replacing the stale content at that path. All ten questions in order, each with
  the question as asked, Nathan's quote, and what it settles; Q6/Q7 written up in the same
  "Answered — decided" style as the other eight, with the primer kept as a "Background for
  Q6 and Q7" reference, the update-mechanism answer under Q6, and the reasoning check under
  Q7. Header states it supersedes `QUESTIONS-FOR-NATHAN2.md` and `QUESTIONS-FOR-NATHAN
  (answered before update).md`. Q4/Q8/Q10 "what this settles" lines got one-clause updates
  to reflect Q6.
- `DEPLOYMENT-OPTIONS.md` — framing note lists Q6/Q7 as decided and states nothing on
  route or signing is open; §0 short version, Step 0 (items 1–2 struck: answered / dropped),
  Step 2 (accept the Play App Signing default; EAS keystore auto-registered as upload key)
  updated; **new §0 subsection "Two update paths once Play is live"** with a Path 1 vs
  Path 2 comparison table, how they interact, and what Q6 changes; §2a, §3 header, §3 Play
  App Signing row, §3 ongoing list, §3 cost list, §6 "Signing continuity" (now decided, with
  Q7 folded in), §7 honest-reading bullets updated. Ordering rule made permanent throughout.
- `CURRENT-STATE.md` — one factual correction in §3 "Signing" (the sentence that described
  Q7 as unanswered) and one in §6 ("no documented keystore backup" is now by decision).
- This entry.

**Landed in the app:** nothing. No code, config, script, build, OTA, or git operation.
`device_bash` mount unavailable again ("no Plan9 drive shares mounted"); files read via
`device_stage_files` and written via `device_commit_files`. Tests/tsc not run — nothing to
verify.

**For the coordinator — not done here**
- **File cleanup:** `QUESTIONS-FOR-NATHAN2.md` and `QUESTIONS-FOR-NATHAN(answered before
  update).md` are now redundant copies of what `QUESTIONS-FOR-NATHAN.md` holds; safe to
  clear out once Nathan agrees. Neither was touched or deleted by this pass.
- Fold Q6/Q7 into `STATE.md` ("Distribution decisions locked in") and `OPEN-ITEMS.md`
  ("Distribution"): signing = Google-generated key, clean package Play-only, no keystore
  backup scheduled. The earlier note about `STATE.md`/`OPEN-ITEMS.md` overstating tester
  ride-history loss still stands.
- Relay the update-mechanism answer to Nathan (the Q6 write-up is written to him directly).
- `README.md` in this folder still describes `DEPLOYMENT-OPTIONS.md` as having "no single
  recommendation" and `QUESTIONS-FOR-NATHAN.md` as an inbox of pending decisions — both
  lines are out of date; not edited here (out of scope for this pass).

**Open after this session** — nothing decision-shaped. Work items only:
- §0 Step 1 repo work: `play` profile in `eas.json`, background-location disclosure UI
  (`cycles/` package, same build as Sentry), privacy-policy page on `marketing/`,
  justification text, store-listing minimums.
- Background-location cost-reduction check (`[UNVERIFIED]`, `DEPLOYMENT-OPTIONS.md` §3):
  one Digest pass into `expo-location` to see whether the foreground service alone suffices.
- Sideload-verification rollout status — one check, now only relevant to Nathan's own
  `.preview` install.
- From earlier entries: dev-client build status (now informational only — under Q6 the
  clean package's EAS keystore is just the upload key), SDK 56 splash, folder-structure
  mentions in root `README.md` / `STATE.md`, `TOKEN-USAGE.md` figures (coordinator).

---

## 2026-09-09 (evening) — Nathan answered the questions; folder revised to match

**Trigger.** Nathan answered all ten questions inline in
`QUESTIONS-FOR-NATHAN(answered before update).md` (his file; answered against the original
wording, before the same-day revision reworded Q2/Q4 — the questions asked the same thing).
Coordinator folded the decided answers into `STATE.md` (ground rules, "Distribution
decisions locked in 2026-09-09") and `OPEN-ITEMS.md` ("Distribution") before this pass; a
Haiku Digest pass resolved Q9 from the code. This pass brought the `deployment/` folder into
line with those.

**Decided (Nathan's words quoted in `QUESTIONS-FOR-NATHAN.md`):**
- Q1 Google Play route — the sideload "strange app" warning is the friction to remove.
- Q2 5–10 testers to start, Android only. Q3 $25 Play fee approved; Apple "would have to
  see if it makes sense financially" → deferred/unfunded. Q4 no timeline pressure.
- Q5 clean package `com.nathanbonher.qualifire`, app name "Qualifire" — "no preview/virgin
  name", which also closes the previous entry's `.virgin` third-option question.
- Q8 Sentry: yes (tracked in `OPEN-ITEMS.md` as an app work package, not planned here).
- Q10 no tester has received any build — the `.preview` install base is Nathan's phone(s).

**Confirmed by code, not by Nathan:** Q9 — the app requests background location
(`isAndroidBackgroundLocationEnabled: true` + `ACCESS_BACKGROUND_LOCATION` in `app.json`;
`TaskManager` + `startLocationUpdatesAsync` in `app/src/location/index.ts`). Play's
prominent-disclosure / written-justification / demo-video requirements now apply for
certain.

**Done (Plan pass, Fable; analysis only, nothing in the app)**
- `QUESTIONS-FOR-NATHAN.md` — restructured into "Still open" (Q6, Q7) and "Answered".
  Q1–Q5, Q8, Q10 marked decided with his quote and what each settles; Q9 marked resolved by
  code check, with a plain-language foreground-vs-background explanation since he asked
  what the difference was; Q5 carries a "you should know" note on ride-history loss —
  visibility, not a re-ask. **Q6 and Q7 rewritten from scratch**: Nathan said "keystore"
  and "EAS" were unfamiliar, so both now open with a plain-language primer (signing key,
  EAS, Play App Signing), a worked example (Q6: Anna-via-Play vs Ben-via-APK locked into
  different keys; Q7: the Expo account is the only copy), and a plain either/or question.
  Q6 was reframed: Q5 (different package) makes "can Play update over the existing
  `.preview` install" moot, and Q10 means no tester install exists to strand — what Q6
  still decides is whether Play installs and EAS-built APKs of the clean package are ever
  interchangeable. `[ASSUMPTION]`-tagged lean recorded (upload the EAS key, if Q7 is yes).
- `DEPLOYMENT-OPTIONS.md` — framing note now lists the decisions; §0 rewritten from
  "recommendation and staging" to a concrete step order (Step 0 Nathan-present hygiene +
  Q6/Q7; Step 1 repo work incl. the background-location disclosure UI, privacy page on
  `marketing/`, justification text, `play` profile; Step 2 Play Console → internal → closed
  track with the background-location declaration + demo video; Step 3 Nathan's own phone).
  The key sequencing point from Q10: rename and signing choice *before* the first hand-off,
  first hand-off *through Play*, so no tester ever reinstalls or sees a sideload warning.
  §2 demoted entirely (Q1 rules out sideloading as the destination; Q10 removes the bridge
  use). §3 background-location row rewritten as a confirmed cost with the three concrete
  items, plus an `[UNVERIFIED]` cost-reduction lever (foreground-service-only location
  without the background permission — app work, one Digest pass to check). §3 cost list,
  §4 (5–10 testers may be under Google's production-gate tester count — `[UNVERIFIED]`
  figure), §5 (iOS explicitly deferred/unfunded, Nathan's decision), §6 (signing continuity
  reshaped; package-name split and crash reporting marked decided), §7 table + honest
  reading updated.
- `CURRENT-STATE.md` — factual corrections only: §1/§3/§5/§8 no longer describe a tester
  population (none exists, Q10); §3 Signing records that no keystore backup exists; §7
  Location replaced the `[UNVERIFIED]` with the confirmed background-location facts and
  their citations; §7 package-name split records the Q5 decision.
- This entry.

**Landed in the app:** nothing. No code, config, script, build, OTA, or git operation.
`device_bash` mount unavailable again ("no Plan9 drive shares mounted"); files read via
`device_stage_files` and written via `device_commit_files`. Tests/tsc not run — nothing to
verify.

**Noticed, for the coordinator — not changed here**
- `STATE.md` and `OPEN-ITEMS.md` say "current sideloaded testers will need to reinstall and
  lose local ride history". Q10 means the only `.preview` install is Nathan's own phone, so
  the loss is his, not a tester's, and is avoidable for testers entirely by sequencing
  (§0). The consequence is real but smaller than those lines suggest; a one-line tweak
  there would keep the three files consistent.
- The previous entry's `.virgin` third-option worry is closed by Q5's wording.

**Open after this session**
- **Q6 and Q7 — waiting on Nathan**, now that they're explained. Q6 is permanent at first
  Play upload; Q7 needs him at the keyboard for ~10 minutes.
- Background-location cost-reduction check (`[UNVERIFIED]`, `DEPLOYMENT-OPTIONS.md` §3):
  does `expo-location`'s `startLocationUpdatesAsync` work with a while-in-use foreground
  service and no `ACCESS_BACKGROUND_LOCATION`? One Digest pass; decides whether the
  disclosure/justification/video work can be avoided.
- Sideload-verification rollout status — lower priority now, still one check.
- From earlier entries, still standing: dev-client build status (bears on whether the clean
  package already has an EAS keystore), SDK 56 splash, folder-structure mentions in root
  `README.md` / `STATE.md`, `TOKEN-USAGE.md` figures (coordinator).

---

## 2026-09-09 (later) — pivot: goal decided, options file takes a position

**Trigger.** Nathan, in chat: Qualifire "is not a personal app for myself anymore, but
something i want people to be able to try out" — the virgin build and the deployment /
marketing effort exist *because of* that. This answers Q1 of `QUESTIONS-FOR-NATHAN.md`,
which was the question this whole folder was waiting on.

**Already landed before this pass (coordinator, not re-described here):** `STATE.md`
"The goal" quotes the pivot and its ground-rules bullet records "no store distribution" as
superseded (with "no accounts, no social" explicitly left standing); root `README.md`'s
opening blurb was updated to match. This folder's job was to stop sounding out of sync
with those.

**Done (Plan pass, Fable; analysis only, nothing in the app)**
- `DEPLOYMENT-OPTIONS.md` — rewritten from "deliberately no recommendation" to a
  recommendation. New framing note at the top (goal decided; what the pivot does and
  doesn't settle). New **§0 Recommendation and staging**: route-independent hygiene now
  (keystore backup, background-location check, sideload-verification status check,
  package-name + signing decisions, EAS install link for new testers), then **Google Play
  closed testing (§3) as the first commitment** — internal track to prove the pipeline,
  closed track as the real "people can try it" — with Sentry in the same window, and a
  **public listing (§4) as a later, separate decision** gated by Google's closed-test
  requirement and by unscoped product work (onboarding for strangers, known stubs). §2c
  Obtainium / §2d Firebase demoted to fallback-if-no-Play-account; §2a/2b kept as cheap
  wins on any route. Every "conflicts with the ground rule / needs re-ruling" line in
  §1–§4 and the comparison table replaced with post-pivot wording (table row is now
  "Fits the post-pivot goal"). §4's "Why it looks premature" became "Why it's second, not
  first" — a sequencing argument, no longer a fit-with-the-record one. §5 iOS and §6
  cross-cutting content unchanged in substance (one-line notes that the pivot doesn't
  touch Android-only, and that keystore backup is now staging step 1).
- `QUESTIONS-FOR-NATHAN.md` — Q1 marked answered with the quote; spelled out what it
  settles (store distribution in scope; at least option (b), (c) left open) and what it
  does *not* (invited-vs-public, scale, timeline, package name, signing, in-app model).
  Q2 reworded from "the testers you have in mind" to "the first people to try it" with a
  wider range of scales laid out, no scale assumed. Q4 reworded to include "a point at
  which you'd want a public listing" and to note Google's 14-day closed-test clock. Section
  headers updated (Q5/Q6 now "unblocked by Q1, needed before a listing exists"). Q3,
  Q5–Q10 body text untouched.
- This entry.

**Landed in the app:** nothing. No code, config, script, build, OTA, or git operation.
`device_bash` mount unavailable again this pass; files written via `device_commit_files`.
Tests/tsc not run — nothing to verify.

**Deliberately not changed — so it doesn't look like an oversight**
- `CURRENT-STATE.md` §2 still quotes the old ground rule verbatim and says it "rules out
  Google Play until Nathan changes it" — it's a factual inventory dated this morning and
  the rule *was* on record then. Coordinator's call whether to add a one-line "superseded
  2026-09-09, see `STATE.md`" note there; not done here since the file was out of scope.
- iOS scope: unchanged. The pivot is about reach, not platform; Android-only is a separate
  rule and a separate decision.
- The "no accounts, no social" rule: untouched everywhere in this folder, matching
  `STATE.md`.
- Package name and signing key (Q5/Q6): §0 records a *leaning* toward the clean package
  name while the tester circle is small, explicitly tagged `[ASSUMPTION]` and "Nathan's
  call". Not decided — both are permanent once a listing exists.
- `TOKEN-USAGE.md`: coordinator's to fill (this pass is a second Plan row).

**Open after this session**
- Nathan's answers to Q2–Q10 — Q5/Q6 (package name, signing) and Q3 (fee/ID/name on a
  listing) are the real blockers for §3 now; Q7/Q9 are the first two staging steps in §0.
- Everything in the previous entry's open list still stands (sideload-verification status,
  background-location check, dev-client build status, SDK 56 splash, folder-structure
  mentions in root `README.md` / `STATE.md`).
- A third package name exists in `app.config.js` (`com.nathanbonher.qualifire.virgin`,
  dormant profile). Q5 still lists only `.preview` vs clean; if Nathan's "virgin build"
  means that variant rather than the branch, Q5 needs a third option. Not added — would
  be guessing at what he meant.

---

## 2026-09-09 — folder created; inventory + options analysis; questions raised

**Done**
- Created `deployment/` as a standing folder (Nathan asked for it by name; deliberately
  outside the `cycles/<name>/` convention — see `README.md`).
- `CURRENT-STATE.md`: factual inventory from the repo — Android-only, three internal APK
  profiles (`preview` live, `development` and `virgin` dormant/unproven), EAS Update on
  channel `preview` with fingerprint runtime policy, all builds manual via PowerShell, no
  `.aab` profile, no store presence, no iOS, no CI, no crash reporting, keystore lives only
  in the EAS account (backup status unknown). Quoted the `STATE.md` ground rule
  ("no store distribution") verbatim.
- `DEPLOYMENT-OPTIONS.md`: five routes (status quo; smoother sideloading via EAS links /
  download page / Obtainium / Firebase App Distribution; Play internal-closed testing;
  Play public; iOS scoping) plus cross-cutting concerns (signing continuity, the
  `.preview` package-name split, crash reporting, versioning, EAS free tier) and a
  comparison table. No recommendation — the goal isn't decided.
- `QUESTIONS-FOR-NATHAN.md`: ten questions. Q1 (does the app ever leave Nathan's/testers'
  phones — direct conflict with the `STATE.md` rule) gates the store routes; Q7–Q9
  (keystore backup, crash reporting, background-location check) are route-independent.
- `TOKEN-USAGE.md`: running readout table started with today's Digest + Plan rows
  (token figures to be filled by the coordinator).

**Landed in the app:** nothing. No code, config, or script touched. No build, no OTA
publish, no git operations (the `device_bash` mount was unavailable this session; files
were written through `device_commit_files`). Tests/tsc not run — nothing to verify.

**Open after this session**
- Nathan's answers to `QUESTIONS-FOR-NATHAN.md`, Q1 first.
- Check current status of Google's Android developer-verification-for-sideloading rollout
  (announced 2025, phased from late 2026) — it's the one external factor that could force
  a decision; every mention in this folder is `[UNVERIFIED]`.
- Confirm from the Android manifest / `expo-location` config whether background location is
  requested (Q9) — decides whether the Play route is cheap or expensive.
- Confirm whether a `development` (dev-client) build has ever actually been produced.
- Confirm splash-screen handling in SDK 56 (no `splash.png` in `app/assets/`).
- Coordinator: fill token figures in `TOKEN-USAGE.md`; decide whether `README.md` (root)
  and `STATE.md` should list `deployment/` in their folder-structure sections.
