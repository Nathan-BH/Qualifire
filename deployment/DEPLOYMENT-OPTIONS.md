# Deployment options (drafted 2026-09-09; revised the same day after the pivot, that evening after Nathan's answers, and 2026-09-10 after the signing decisions)

How Qualifire reaches phones beyond the current "Nathan builds an APK and hands it over"
model — grounded in what this app actually is (Android-only, no accounts, local data,
GPS-heavy, EAS Build + EAS Update already working) rather than a generic Expo deployment
tour.

**Framing (revised 2026-09-10).** This file started as a survey with no recommendation,
became a recommendation after the 2026-09-09 pivot (Qualifire is meant to be something
other people can try — `STATE.md`, "The goal"), and is now a **plan with nothing left to
decide**: Nathan answered all ten questions in `QUESTIONS-FOR-NATHAN.md` (eight on
2026-09-09, the two signing questions on 2026-09-10 once the terms were explained) and the
coordinator folds the answers into `STATE.md` / `OPEN-ITEMS.md`. What's decided:

- **Google Play, closed testing, not a public listing yet** (Q1) — chosen *because* the
  sideloading warning is the friction he wants gone, which is the one thing §2 can't fix.
- **5–10 testers to start, Android only** (Q2); **$25 Play fee approved** (Q3); **no
  timeline pressure** (Q4).
- **Clean package `com.nathanbonher.qualifire`, app name "Qualifire"** (Q5) — decided, with
  a consequence he should keep in view (§6, "The package-name split").
- **Apple / iOS is deferred and unfunded** (Q3: "would have to see if it makes sense
  financially") — a considered "not now", not an oversight. §5 stays scoping only.
- **Sentry crash reporting: yes** (Q8) — an app work package tracked in `OPEN-ITEMS.md`,
  not deployment config; referenced here only for sequencing.
- **Background location is requested** (Q9, confirmed by code check, not by Nathan) — the
  Play route's largest cost item is now a certainty, not a swing factor (§3).
- **No tester has an install yet** (Q10) — the `.preview` install base is Nathan's own
  phone(s). Everything in this file that said "current testers" was describing a
  population that turns out not to exist; that is good news for sequencing (§0).
- **Play App Signing: let Google generate a fresh app-signing key** (Q6, 2026-09-10) —
  the Play Console default. Consequence: the clean package is **Play-only** — no
  sideloaded EAS APK of `com.nathanbonher.qualifire`, ever; native changes reach phones
  only as a new `.aab` through Play. EAS Update (OTA) is unaffected (§0, "Two update
  paths").
- **No keystore backup** (Q7, 2026-09-10) — under Q6 Google holds the key that matters, so
  there is nothing to back up for the Play population. The EAS `.preview` key stays
  Expo-only; that only affects Nathan's own `.preview` install, which is being retired
  (Step 3). Optional, low priority, not scheduled.

**Nothing about the distribution route or signing is open.** What remains is work: the repo
prep in §0 Step 1 and the Play Console setup in Step 2. Nothing here touches the in-app
model — "no accounts, no social" still stands. Facts I couldn't confirm from the repo are
`[UNVERIFIED]`; guesses about what Nathan wants are `[ASSUMPTION]`.

Sections:

0. The plan (decided route and signing, concrete step order, how updates work once Play is live)
1. Status quo — internal EAS APK + EAS Update OTA
2. Lower-friction sideloading — EAS install links, a download page, Obtainium/GitHub releases, Firebase App Distribution
3. Google Play internal / closed testing (not public)
4. Google Play public production listing
5. iOS / App Store (scoping only)
6. Cross-cutting: signing continuity, crash reporting, the package-name split
7. Comparison

---

## 0. The plan (was: recommendation and staging)

**Short version:** Google Play closed testing for 5–10 Android testers under the clean
package name, Google-generated signing key (Play-only from then on), Sentry in the same
native build, a public listing left as a later, separate decision. The route and the
signing are chosen; what remains before the Play Console account is opened is the repo work
in Step 1 — chiefly the background-location paperwork that Q9 made certain.

### Why closed testing first, rather than smoother sideloading (§2)

*(Argued before Nathan answered; kept because it's the reasoning behind the decision. Q1's
answer confirms the first bullet was the deciding one.)*
- "People can try it" names exactly the population sideloading is worst at. The
  unknown-sources toggle and the Play Protect warning are where a non-technical newcomer
  stops. §2 makes the hand-off smoother; §3 is the first route that changes what the
  tester actually experiences (tap the link, tap Install, get updates).
- Everything §3 needs is either already in place or a small delta from it. EAS Build
  already works, so the `.aab` profile is a few lines in `eas.json`; EAS Update keeps
  working unchanged for Play installs; `eas submit` can replace a manual upload. Nothing
  new has to be invented — no CI, no server, no accounts, no iOS.
- On a personal Play Console account the closed-testing gate is **mandatory before
  production access** anyway (`[UNVERIFIED]` current tester count / 14-day figures). So
  §3 sits on the critical path whatever Nathan eventually decides about public. Doing it
  first pre-commits to nothing, and nothing is lost if §4 never happens.
- It establishes the verified developer identity that Google's sideloading-verification
  rollout may end up requiring regardless (§1) — so the $25 buys something even for the
  sideloaded installs.
- The cost is bounded and known up front: $25, an ID check, and console work whose size
  depended on the location question — now answered (Q9: background), so the size is
  "more than a weekend", and known.

### Why not straight to a public listing (§4)
Not because public is off the table — the pivot puts it on the table — but because it is
gated twice. Google gates it (the closed-test requirement — and with 5–10 testers Nathan may
sit *below* its minimum tester count, `[UNVERIFIED]` current figure), and the product gates
it: the app has no onboarding for someone who has never heard of Nathan or the
F1-qualifying metaphor, and it has known stubs that are fine for testers who know they're
testing and awkward under public reviews. A closed test is precisely the mechanism for
finding out what that product work is. §4 is a decision to take *after* a closed test has
run, with real testers' reactions in hand — not before. Nathan's "for now … hand it to
people" (Q1) says the same.

### The concrete plan

The single most useful fact from the answers is Q10: **no tester has an install yet.** Every
"two install populations / existing testers must reinstall" cost in the first two drafts
assumed a population that doesn't exist. So the order below is arranged to make sure it
never does: package rename and signing choice *before* the first hand-off, and the first
hand-off *through Play*. Done in that order, no tester ever reinstalls and no tester ever
sees a sideload warning. Skipping ahead — sending anyone an APK "just for now" — is the one
way to make the rollout rough; with Q6 decided it is also permanently unfixable (a
sideloaded copy of the clean package can never be updated by Play), so the rule is now
**no sideloaded APK of the clean package to anyone, at any point.**

**Step 0 — before any Play account exists. No longer needs Nathan for anything.**
1. ~~Nathan reads and answers Q6/Q7~~ — **done** (2026-09-10): Q6 = Google generates the
   key (Play Console default); Q7 = no backup. Nothing on this list is decision-blocked.
2. ~~Back up the `.preview` keystore from EAS~~ — **dropped** (Q7: no). Google holds the
   key that matters once Play is set up; the `.preview` key only protects Nathan's own
   install, which Step 3 retires. Stays available as an optional ten-minute `eas
   credentials` export if he ever wants it. What survives of this item: at the first Play
   build, note whether the clean package already had a keystore in EAS (`[UNVERIFIED]` —
   it will if a `development` build was ever made) — informational only, since under Q6
   that keystore is just the *upload* key and Play can replace it.
3. **Check the current status of Google's developer-verification-for-sideloading rollout**
   (§1). Less urgent than it was — the plan no longer relies on sideloading at all — but it
   still decides whether Nathan's own `.preview` install keeps updating unattended.
4. ~~Confirm background vs foreground location~~ — **done** (Q9): background. Its cost is
   now in step 2 below, not a question mark.
5. ~~Decide package name~~ — **done** (Q5): clean name. Its consequence is in §6.
6. ~~Hand new testers the EAS install link~~ — **dropped.** Q10 says nobody has one, and Q1
   says the sideload warning is the thing to avoid; the first testers come in through Play.

**Step 1 — repo work, no Nathan needed, no money spent.** Can run in parallel with step 0.
- `eas.json`: a `play` profile — base package (no `APP_VARIANT`), `EXPO_PUBLIC_SEED_MODE=
  empty`, channel `play`, app-bundle build type. `app.config.js` already resolves the base
  package when `APP_VARIANT` is unset (`CURRENT-STATE.md` §3). Bump `version` from `0.1.0`
  (§6 Versioning).
- **Prominent background-location disclosure in the app** (Q9's cost, part 1): a screen
  or dialog shown *before* the two-step permission request in
  `app/src/location/index.ts` `ensurePermissions()`, saying in plain words that Qualifire
  records your location in the background while a ride is running, and why. Play's
  reviewers look for this specifically. Small UI change, but it's app code — a `cycles/`
  work package, and it should ride in the same native build as Sentry (Q8) so there's one
  build to review, not two.
- **Privacy-policy page** on the website (`marketing/` — the landing page work there is
  the natural home; also where Play listing screenshots and description copy can be
  reused from rather than written twice). Content: precise location, background while
  recording, stored on the device, not sent to Nathan; map tiles fetched from the tile
  provider; crash reports sent to Sentry (once Q8 lands).
- **Written background-location justification** (Q9's cost, part 2) drafted now so the
  console form is a paste: core function is timing a ride, phone is in a pocket, screen
  off; no location collected outside an active recording; nothing leaves the device.
- Store-listing minimums: 512×512 icon (exists), 1024×500 feature graphic, ≥2 screenshots,
  short + full description. Placeholder-quality is fine for a closed track.

**Step 2 — the commitment. $25. Nathan present for the ID check (and the one-click signing
default).** Play Console account → create the app under `com.nathanbonher.qualifire` →
**Play App Signing: accept the default, "Let Google manage and protect your app signing
key"** (Q6 — permanent; nothing to export or upload) → first `eas build --profile play` →
upload (manual first; `eas submit` with a service-account key later; the EAS keystore that
signed the `.aab` is registered as the *upload* key automatically) → **internal testing track**
(no review, live in minutes, ≤100 emails — big enough for all 5–10, so this could even be
the whole test at first) → data-safety form, content rating, **background-location
declaration + demo video** (Q9's cost, part 3: a short screen recording of the disclosure,
the permission prompt, and a recording ride) → **closed testing track** (first release goes
through review — allow for a slower one given background location; opt-in link or email
list). Crash reporting (Q8) is in the build by then, so the tester count never grows on a
build without it.

**Step 3 — Nathan's own phone.** Install the Play build alongside "Qualifire Preview";
keep the old one until whole-app export/import (`OPEN-ITEMS.md` item 4) exists or its
history stops mattering; then uninstall it and retire the `preview` profile.

**Later — a separate decision (§4).** Production listing, once a closed test has run and
the product work it surfaces has been scoped. Not a deployment task; a product one with
a deployment step at the end. Note the tester-count gate above.

**Not on this path.** §2a–2d (smoother sideloading) — Q1 rules them out as the destination
(they don't remove the warning) and Q10 removes the reason to use them even as a bridge.
§2c/2d stay documented only as the fallback if Play *rejects* the app (a background-
location review going badly is the realistic way that happens). iOS (§5): deferred and
unfunded per Q3; nothing scheduled.

### Two update paths once Play is live (the ongoing workflow)

Written down because Nathan asked (Q6: "I can still use expo to update things and it will
go through the play store? or does the play store have its own tool?") and because the
answer is the mental model every future release decision rests on. The two paths are
independent, and Play only touches the second.

| | **Path 1 — EAS Update (OTA)** | **Path 2 — new binary via Play Console** |
|---|---|---|
| What it carries | JavaScript + assets: screens, logic, images, sounds — anything that isn't native code | Everything, including native code and config |
| When it's needed | Any change that leaves the native **fingerprint** unchanged — the everyday case | Any change that alters the fingerprint: new permission, new native module (Sentry), Expo SDK upgrade (Play's yearly target-SDK bump forces one), native config in `app.json` |
| The command | `eas update --channel play` — a `publish-play.ps1` sibling of today's `publish-preview.ps1` | `eas build --profile play` → `.aab` → upload to the Play Console (manual, or `eas submit`) — today's `build7.ps1`/`build4.ps1` with a different output |
| Goes through Play? | **No.** Delivered by Expo's servers via `expo-updates` (`~56.0.24`, already in the app); applied on next launch | **Yes.** This is what Play reviews (background-location disclosure/justification/video are checked here) and then auto-installs on every tester's phone in the background |
| Reviewed by Google? | No | Yes — first closed-track release slow (§3); later ones usually quick |
| Time to testers | Minutes | Review (days, first time) + Play's rollout (hours to a day or two, per phone auto-update settings) |
| Nathan's effort | One script run | One build + one upload + waiting |
| Tester's effort | None | None (Play updates apps on its own) |

How they interact: after a Path 2 release, phones still on the old binary have the old
fingerprint and won't take Path 1 updates published for the new one until Play has delivered
the new binary — the same mismatch `scripts/OTA-TROUBLESHOOTING.md` documents, except on
Play it clears itself instead of needing a re-send. Rule of thumb: `eas fingerprint:compare`
changed → Path 2; unchanged → Path 1. There is no third mechanism — "Play's own update tool"
*is* uploading a new `.aab` to a track; Play has no OTA equivalent, which is why Path 1 stays
Expo's job. (`[UNVERIFIED]` but long-standing: Play policy allows OTA code updates that don't
change what the app fundamentally is; Expo's product depends on it. Treat Path 1 as safe.)

What Q6 changes: Path 2 is now the **only** way a native change reaches any phone with the
clean package — an EAS-built APK is signed with a different key than the Play copy and won't
install over it. So native changes get batched (Sentry + the disclosure UI in one build,
Step 1) and Path 1 carries everything in between. Nathan's own `.preview` install is
unaffected: different package, still served by `publish-preview.ps1` on channel `preview`
until Step 3 retires it.

---

## 1. Status quo: internal EAS Build APK + EAS Update OTA

### What it is
`scripts/build7.ps1` → EAS Build (profile `preview`, `distribution: internal`, APK) →
Nathan gets an APK → testers sideload it. `scripts/publish-preview.ps1` → EAS Update on
channel `preview` → JS/asset changes land on the next launch of any install whose native
fingerprint matches. Proven end to end (Build 6 → Build 7, OTA troubleshooting doc exists
because it has been exercised).

### What it already buys
- **Zero money, zero review, zero policy surface.** No store rules, no data-safety form,
  no permission justifications, no content rating.
- **Fast iteration.** OTA in 1–2 min for most changes; a full APK in 10–20 min.
- **Full control of the install base.** Nathan knows exactly who has it.
- **Needs no new decisions** — but it no longer *matches* the goal on record. The pivot
  says other people should be able to try the app, and this model scales with Nathan's
  time per tester.

### Real limits (the ones testers would hit — none observed yet: per Q10 no tester has an install)
- **Install friction for a newcomer.** They must enable "install unknown apps" for the app
  that opens the APK, dismiss a Play Protect warning, and trust that a `.apk` from a friend
  is fine. For a technical friend, one minute; for a non-technical tester, this is where
  you lose them or end up doing the install on their phone yourself.
- **Native updates don't propagate.** OTA covers JS/assets only. A change to any native
  module (new Expo SDK, MapLibre bump, permission change) requires a new APK, and there is
  no mechanism telling an installed app "you're stale, go get build 8". Testers on an old
  fingerprint silently stop receiving OTA updates (`OTA-TROUBLESHOOTING.md` is about
  exactly this).
- **No visibility.** No crash reports, no install count, no "which Android version broke".
  Bugs arrive as text messages, if at all.
- **Scales linearly with Nathan's time.** Every new tester is a hand-off. Fine for 3,
  tiresome at 10, impossible at 50.
- **Play Protect can flag or block** sideloaded apps it hasn't seen. Hasn't happened to a
  tester because there are none (Q10); the unknown-sources warning itself is the thing
  Nathan named in Q1 as unacceptable friction.
- **Platform risk — developer verification for sideloading.** Google announced (2025) that
  certified Android devices will progressively require sideloaded apps to come from a
  verified developer, phased in by region from late 2026 with wider rollout after.
  `[UNVERIFIED — status and regional timing must be checked before treating "sideload
  forever" as a stable plan]`. Google has described a lighter/free tier for hobbyists with
  install limits alongside the $25 Play Console identity. If it lands for Nathan's region,
  the status quo stops being free-of-admin even if it stays free-of-money.

### Cost to keep doing this
Effectively nothing beyond what's already spent — until either (a) the tester count grows
past what hand-offs tolerate, or (b) the verification requirement reaches Nathan's region.
After the pivot, (a) is the plan rather than a hypothetical, which is why this stops being
the recommended end state (§0). It remains the right thing to keep running *in parallel*
until Play installs exist — nothing here needs to be torn down.

---

## 2. Lower-friction sideloading (still no store)

Same distribution model, less manual work. These stack; none needs a Play account. All
`[UNVERIFIED]` in the sense that none has been tried on this project, but they're standard
tools. **After Nathan's answers, none of this is on the path** (§0): Q1 names the
unknown-sources warning as the friction to remove, and no §2 option removes it; Q10 says
there's no existing sideload population to smooth things for. §2b survives in a different
role — the website is where the privacy policy and the Play opt-in link go. §2c/2d are the
fallback if Play rejects the app. Kept for the record.

### 2a. EAS internal-distribution install page
Every `distribution: internal` build already has a page on expo.dev with a QR code and an
install link. Sharing that link instead of the file removes the "how do I get a .apk onto my
phone" step and gives testers a stable place to fetch the latest build. It does **not**
remove the unknown-sources toggle or Play Protect warning. Cost: nothing — it exists today;
Nathan hasn't used it because he hasn't sent anyone anything (Q10). Caveat: the link is
for the build, not for "latest" — Nathan would have to send a new link per native build,
unless he keeps a redirect somewhere. **Not to be used for the clean package at all** —
under Q6 a sideloaded copy could never be updated by Play; see §6, signing continuity.

### 2b. A download page on the website (`marketing/`)
A "Get the app" page with the current APK link (or the EAS link), the two-sentence
"unknown sources" instruction, and a version number. Turns "ask Nathan" into "visit the
page". Cycle 5 already flagged the site needs a factual refresh and found a dead demo link,
so this would ride along with that work rather than being separate. Cost: doc/HTML work
only, no money. Still sideloading. Once a Play track exists, the same page is where the
Play opt-in link goes — so it isn't wasted either way.

### 2c. GitHub Releases + Obtainium
If the repo (or a public releases-only mirror) publishes each APK as a GitHub Release,
testers who install **Obtainium** (a free open-source app that watches GitHub releases)
get automatic update prompts for sideloaded apps — solving the "native updates don't
propagate" problem without a store. Cost: a release step per native build (could be
scripted into `build7.ps1`'s successor); requires the APK to be publicly downloadable,
which `[ASSUMPTION]` Nathan may or may not be comfortable with even if the source stays
private; requires testers to install a second app. Honest read: great for technical
testers, adds a step for everyone else — and Play auto-update makes it redundant for
anyone on the Play track.

### 2d. Firebase App Distribution
Google's tester-management service for pre-release Android/iOS builds: upload an APK, invite
testers by email, they get an install link and update notifications via the "App Tester"
app. Free; no Play Console needed; no store listing; no review. It's the closest thing to
"Play internal testing without Play". Cost: a Firebase project (free tier), a Google account
for each tester, and Nathan uploading each build (CLI or console — scriptable). Doesn't
remove unknown-sources (it's still sideloading), but does give install tracking and
update nudges. `[UNVERIFIED]` current feature set; it has been stable for years. Q3 came
back "yes" to the Play account, so this is now only the fallback if Play *rejects* the app:
it gets most of §3's tester management without a listing — but not the install-friction
fix Nathan asked for (Q1), and not the developer identity.

### What these don't fix
Unknown-sources friction, Play Protect warnings, crash reporting (see §6), and the
verification-requirement risk from §1. They make the current model *smoother*, not
*different* — and "different" is what the pivot asks for.

---

## 3. Google Play — internal or closed testing track (not public)

The middle ground: the app goes through Play's install/update machinery, but only invited
testers can see it. Nothing appears in public search. **This is the route — decided
2026-09-09 (Q1), for 5–10 Android testers (Q2), fee approved (Q3), under the clean package
name (Q5), with a Google-generated signing key (Q6). See §0 for the step order.** The old
"no store distribution" ground rule is superseded (`STATE.md`); the fee, ID check and a name
on a listing are accepted. Nothing is decision-blocked; the one sizeable work item before
first upload is the background-location paperwork, which Q9 turned from a maybe into a
certainty (table row below).

### What it requires — one-time
| Item | Cost / effort | Notes |
|---|---|---|
| Google Play Console developer account | **$25 one-time — approved (Q3)**, plus identity verification (government ID for a personal account; `[UNVERIFIED]` current details — Google has tightened this repeatedly) | Personal account is fine; an organisation account needs a D-U-N-S number and is overkill. Personal accounts created since late 2023 also have a **closed-test requirement before production access** (a minimum number of testers opted in continuously for 14 days — the number has been 20, then 12; `[UNVERIFIED]` current figure). That gate only matters for §4; for testing tracks it's irrelevant — but note 5–10 testers (Q2) may be under it. |
| Contact details shown to testers/public | Developer name + contact email are visible on the listing; `[UNVERIFIED]` whether a personal account must also show a physical address for a free app (it does for paid/monetised) | Accepted in principle (Q3). Which name appears — real name, or "nahtanhbs" etc. — is a form field at setup time. |
| **`.aab` build profile** in `eas.json` | Small config change (`buildType: "app-bundle"` or omit `buildType`) — a new profile, `play`, base package (no `APP_VARIANT`) | Play requires App Bundles for new apps. Current profiles all produce APKs, and all for variant packages; the Play profile is the first build of the clean package (Q5). |
| **Play App Signing** | Mandatory for AAB uploads. Google holds the app-signing key; Nathan uploads with an upload key. | **Decided — Q6 (2026-09-10): let Google generate the app-signing key** (the console default; one click, nothing exported). The EAS keystore that signs the uploaded `.aab` becomes the *upload* key — replaceable via Play Console if ever lost. Consequence: Play installs and any EAS-built APK of the clean package can never update over each other, so the clean package is Play-only (§0 ordering rule, §6). Since Q5 makes the Play app a different package from today's `.preview` install, no existing install is affected. |
| Store listing (minimal) | App name, short description (80 chars), full description, **icon 512×512**, **feature graphic 1024×500**, **at least 2 phone screenshots**, category, contact email | Required even for closed testing, though it isn't publicly visible. Internal testing (≤100 testers by email) historically requires less of this — `[UNVERIFIED]` exactly which sections must be complete before an internal-track release goes live; plan for all of it. |
| **Privacy policy URL** | A public web page; can live on the website (`marketing/`) | Required for any app requesting location. Content: "collects precise location, including in the background while a ride is being recorded, to time your rides; stored on your device; not transmitted to us; map tiles are fetched from <provider>; crash reports are sent to Sentry" (once Q8 lands). Short, but must exist and stay up. |
| **Data safety form** | Console questionnaire | Declares location collection (precise, required for core function, not shared, not encrypted-in-transit-to-us because it never leaves the device) and, once Sentry is in, crash logs / diagnostics shared with a third party. `[UNVERIFIED]` whether tile-server requests count as sharing with a third party. |
| **Content rating questionnaire** (IARC) | ~10 minutes | Utility app, no user content, no ads → "Everyone" tier. |
| App-access, ads, target-audience, government/financial/health declarations | ~10 minutes | All "no" / "not a health app" `[ASSUMPTION]` — a cycling-timing app is not a Health Connect app, but Google's health-apps policy has widened; check the current definition. |
| **Background-location review** | **The biggest single item — confirmed, not hypothetical (Q9, code check 2026-09-09; `CURRENT-STATE.md` §7).** | The app requests `ACCESS_BACKGROUND_LOCATION` (`isAndroidBackgroundLocationEnabled: true` in `app.json`; `startLocationUpdatesAsync` + `TaskManager` in `app/src/location/index.ts`). Play therefore requires three things: **(1)** a **prominent in-app disclosure** shown before the permission prompt — its own screen or dialog, in plain words, saying the app collects location in the background while recording and why (this is app code — a small `cycles/` package, §0 step 1); **(2)** a **written justification** in the console's permissions-declaration form (a ride timer with the phone in a pocket is squarely inside Google's accepted use cases — fitness/activity tracking — so this is paperwork, not a fight); **(3)** usually a **short demo video** showing the disclosure, the prompt, and the feature in use. Reviews of background-location apps are stricter and slower; budget days-to-a-week for the first closed-track review and expect one round of "please clarify". Cost-reduction lever, `[UNVERIFIED]` and app work, not deployment: since Android 10 a foreground service of type `location` started while the app is on screen keeps receiving location without the background permission, and the app already runs such a service — whether `expo-location`'s `startLocationUpdatesAsync` works without the background grant is unverified. If it does, dropping `ACCESS_BACKGROUND_LOCATION` would remove all three items above. Worth one Digest pass into `expo-location`'s Android implementation before the disclosure UI is built. |
| Tester list | Emails (internal: ≤100; closed: unlimited via email lists or Google Groups) or an opt-in link | Testers need a Google account signed into Play. |
| **Review** | Internal testing: no review, live in minutes. Closed testing: first release goes through review (days, sometimes a week; longer if location policy is involved). Subsequent closed-track releases are usually quick. `[UNVERIFIED]` current timings. | |

### What it requires — ongoing
- Keep the privacy policy URL alive.
- Respond to Play policy emails (target-SDK deadlines every year, new declaration forms,
  occasional "update your data safety form"). Missing one gets the app suspended from the
  track — not catastrophic for a test track, but it's a standing chore.
- Per *native* release: build `.aab` (`eas build --profile play`), upload (`eas submit` can
  automate this with a service-account key — another one-time setup), roll out to the
  track. Roughly the same wall-clock as today plus a couple of clicks. Under Q6 this is the
  only way a native change reaches a tester (§0, "Two update paths").
- EAS Update keeps working for Play installs exactly as it does for sideloads (same
  `expo-updates` mechanism, channel is baked into the build). Nathan can push OTA to Play
  testers between store releases — this is the everyday path and does not involve Play at
  all. `[UNVERIFIED]` — Play policy permits OTA JS updates as long as they don't change the
  app's core purpose; Expo's whole business relies on this, so treat as safe.

### What it buys
- **Install becomes "tap the link, tap Install."** No unknown-sources toggle, no Play
  Protect warning, no file transfer. This is the single biggest win for non-technical
  testers — and the reason it's the recommended first step.
- **Native updates propagate.** Play auto-updates the app (subject to the user's settings)
  when Nathan rolls out a new AAB. The "tester silently stuck on build 6" problem goes
  away. EAS Update stays as the fast path for JS changes; Play becomes the backstop for
  native ones.
- **Android vitals**: crash and ANR rates, device/OS breakdown, for free, for Play installs.
  Not full stack traces with breadcrumbs like Sentry, but far better than nothing.
- **Tester management** — see who's opted in, who's on what version.
- **Path to public later** without redoing the setup; closed testing is also the gate
  Google imposes before production for personal accounts anyway.
- **Developer identity established** — which also covers the sideloading-verification
  requirement from §1 if/when it lands.

### Real cost / friction
- **$25** and an ID check — approved (Q3).
- **Console work: more than a weekend.** Background location is confirmed (Q9), so the
  disclosure UI, the justification text and the demo video are on the list, and the first
  review will be the slow kind. Still bounded; no timeline pressure (Q4) means the slow
  review costs nothing but patience.
- **A public-facing privacy policy** with Nathan's name/contact on the listing. Accepted
  (Q3); which name to show is a setup-time detail.
- **Two install populations** — this cost has **shrunk to Nathan's own phone** (Q10: no
  tester installs). The clean package (Q5) is a different app from `.preview`, so his
  `.preview` ride history doesn't migrate — but the old app can stay installed alongside
  the new one until export/import exists. For testers the cost is zero *if* nobody is ever
  sideloaded with the clean package (§0) — and under Q6 that rule is permanent, not just
  "until Play is live".
- **Recurring policy admin** — the annual target-SDK bump alone means at least one forced
  Expo SDK upgrade per year, on Google's schedule rather than Nathan's. Each one is a
  Path 2 release (§0) — a new `.aab` through Play, not an OTA.
- **Two permanent choices, both made** — package name (Q5) and the signing key (Q6: Google
  generates it). Neither can be walked back by unpublishing; neither is open.

---

## 4. Google Play — public production listing

Everything in §3, plus what it takes to be findable by strangers.

### Additionally requires
- **Production access** — for a personal account created after late 2023, a completed
  closed test (N testers opted-in continuously for 14 days, then an application form
  explaining the testing and the app; `[UNVERIFIED]` current N — it was 20, then 12 — and
  whether the requirement still applies unchanged). This alone imposes a minimum tester
  count and a two-week clock. **With 5–10 testers planned (Q2), Nathan may be below N**;
  going public would mean widening the circle first. Not a problem today — Q1 says
  "for now … hand it to people", and Q4 says no date.
- **A real store listing**: polished description, proper screenshots (phone, ideally
  tablet), feature graphic that isn't a placeholder, possibly a promo video; localisation
  if the audience isn't English-only.
- **Full policy review** at launch and on updates — public apps get more scrutiny,
  especially with location.
- **A support channel** — the listing's contact email will receive real emails from real
  strangers.
- **Maintenance commitment** — target-SDK deadlines become hard (a public app that misses
  one becomes invisible to new users, then gets pulled), reviews and ratings appear
  publicly, and every OTA/AAB release is now visible to people Nathan has never met.
- **Product implications outside deployment**: onboarding for someone who has never heard
  the F1-qualifying metaphor, a first-run explanation of location use, probably a "what
  is a reference route" walkthrough — cycle-5's website review already surfaced that the
  app's framing assumes a reader who knows Nathan.

### What it buys
Discoverability, and the app existing independently of Nathan's phone. After the pivot
that *is* a goal, or at least the far end of one — "people can try it" doesn't say whether
it means invited people or anyone. The open question is when, not whether it's valuable.

### Why it's second, not first
Not a judgement about the app's quality, and no longer a fit-with-the-record argument —
the record now says public is allowed. It's a sequencing argument:
- Google's closed-test gate means §3 has to happen first on a personal account anyway
  (`[UNVERIFIED]` current terms). There is no shortcut to production that skips it.
- Known stubs (gate placement is a geometric proxy; seed mode is a bundle-time constant;
  export naming inconsistencies) are fine for testers who know they're testing and
  awkward under public reviews. A closed test is how those get found and prioritised.
- The onboarding work above is product work nobody has scoped. Doing §3 first produces
  the list.
- The maintenance commitment is open-ended, and this is a side project of someone whose
  main work is elsewhere `[ASSUMPTION]`. Closed testing lets Nathan see what the admin
  load feels like at small scale before signing up for the version with hard deadlines.

Nothing is lost by doing §3 first and deciding about production with a closed test's
results in hand. That is the recommendation in §0.

---

## 5. iOS / App Store — scoping only

**Deferred and unfunded — Nathan's decision, not an omission.** Asked directly (Q3), he
said of the $99/year: "I would have to see if it makes sense financially"; asked who the
testers are (Q2): "I can ignore iPhone users for now if It makes it easier." That is a
considered "not now" — different from the earlier "hasn't come up". Nothing iOS-shaped is
scheduled, and no iOS cost appears in §0's plan.

Technically the position is unchanged: `app.json` declares Android only, there is no iOS
bundle identifier, no Apple account, and no iOS-tested native config (MapLibre, background
location strings, audio session). Android-only remains a separate rule from the one that
was superseded.

If it were ever wanted:
- **Apple Developer Program: $99/year**, recurring, plus identity verification (two-factor
  Apple ID; individual enrolment is fine).
- **No Mac required for building** — EAS Build produces iOS binaries in the cloud and EAS
  can manage certificates/provisioning profiles. Nathan's Windows PC is not a blocker for
  building. `[UNVERIFIED]` whether any of the current native modules has an iOS-only
  config gap; MapLibre and expo-location both support iOS, so expect config work rather
  than porting.
- **Testing**: TestFlight — internal testers (App Store Connect users, up to 100) with no
  review; external testers (up to 10,000 by email or public link) after a light Beta App
  Review. This is Apple's equivalent of §3 and is genuinely lower-friction than Play's
  closed testing for the *tester* (TestFlight app, tap Install).
- **Ad-hoc / dev-client builds** need each device's UDID registered (100 devices/year) —
  workable for a handful of testers, annoying beyond.
- **App Store production** — full review (stricter than Play on privacy strings, background
  modes and "does this app do enough"), privacy nutrition labels, screenshots per device
  class. Same sequencing arguments as §4, plus a recurring fee.
- **Real cost** is less the $99 than the second platform: every native change gets tested
  twice, every permission has two policy regimes, and Nathan has no iOS device to debug on
  `[UNVERIFIED — assumed from Android-only config]`.

Don't spend anything here unless a specific person with an iPhone is the reason — and then
it's Nathan's financial call (Q3) before it's a technical one.

---

## 6. Cross-cutting concerns (apply to whichever route is chosen)

### Signing continuity — **decided (Q6, Q7 — 2026-09-10)**
Android will only install an update over an existing app if both are signed with the same
key. The first two drafts framed this as "can Play builds update over today's sideloaded
`.preview` installs?" That question became moot twice over: Q5 puts the Play app under a
*different package name*, which Android treats as a different app regardless of key, and
Q10 says the only `.preview` install is Nathan's own phone. No existing tester install can
be stranded because none exists.

What Q6 decided is the **future**: Play installs and EAS-built APKs of the clean package are
**not** interchangeable, by choice. Nathan (2026-09-10): "I would go with the play store
route so I start from a fresh key." At first upload, Play App Signing takes the console
default — **Google generates the app-signing key**. The EAS keystore that signed the
uploaded `.aab` is registered as the *upload* key (replaceable through Play Console if the
Expo account were ever lost; the app-signing key itself never leaves Google). Consequences:
- The clean package is **Play-only**. A sideloaded EAS APK of `com.nathanbonher.qualifire`
  is an incompatible line — a phone can't move between it and the Play copy without
  uninstall + data loss. The ordering rule is therefore permanent: **no sideloaded APK of the
  clean package to anyone, ever.** A tester who can't use Play goes on the internal track's
  email list, not on an APK.
- Native changes reach phones only as a new `.aab` through Play; EAS Update (OTA) is
  unaffected and stays the everyday path (§0, "Two update paths").
- The option-(b) alternative (upload the EAS key so both lines stay interchangeable) is
  closed once the first upload is made. Not to be relitigated; recorded so nobody re-asks.

Nathan's stated premise — that whole-app export/import (`OPEN-ITEMS.md` item 4) would make
switching copies painless — is a correct instinct but isn't load-bearing: under (a) and the
ordering rule, no tester ever switches copies. It only serves his own `.preview` → Play
migration (Step 3), which can wait for the feature.

**Keystore backup — decided (Q7): no, not for now.** Nathan: "I would lean for no later …
if I use the google play route, its not needed either?" — confirmed, for the Play population:
Google holds the app-signing key, so a Play install stays updatable even if the Expo account
were lost, and there is nothing for Nathan to export or store. The one thing an EAS export
would still protect is his own `.preview` install (signed with EAS's `.preview` key, of which
Expo holds the only copy) — and Step 3 retires that install. Optional, ten minutes via `eas
credentials`, not scheduled. Full reasoning in `QUESTIONS-FOR-NATHAN.md` Q7.

### The package-name split — **decided (Q5): clean `com.nathanbonher.qualifire`, "Qualifire"**
Nathan: "clean name, it should be called qualifire only (no preview/virgin name) as that is
what people will know." That also settles the third variant (`.virgin`) — neither goes to
Play. Consequence, recorded here and in `OPEN-ITEMS.md` as a fact, not a re-ask:
- The clean package is a different app to Android. Nothing carries over from a `.preview`
  install (ride history, routes, settings) unless whole-app export/import lands first
  (`OPEN-ITEMS.md` item 4 — parked). Per Q10 the only `.preview` install is Nathan's, so
  the history at stake is his own, and the old app can stay installed alongside the new
  one until export/import exists. No tester is affected if §0's order is kept.
- Config: `eas.json` gains a `play` profile with no `APP_VARIANT` (base package) and an
  app-bundle build type; `app.config.js` already resolves the base package when the
  variable is unset. Small change; the decision it needed is made.

### Crash reporting — **decided (Q8): yes, Sentry**
Nathan: "this might be useful for improving the app without having people needing to
explicitly text me." Tracked in `OPEN-ITEMS.md` ("Distribution") as an app work package
with its own `cycles/` folder — not planned here. Deployment-side sequencing only: it's a
native change, so it should ship in the same build as the background-location disclosure
UI (§0 step 1) and be in the first build that reaches Play's internal track, so no tester
is ever on a build without it; and the privacy policy / data-safety form must say crash
reports leave the device.

### Versioning
`appVersionSource: remote` means EAS owns `versionCode`; `version` is `0.1.0` in
`app.json`. Play shows `version` to users. A store-bound build should bump this to
something meaningful (`0.2.0`, `1.0.0-beta`) and the bump should be part of the release
script, not remembered.

### The EAS free tier
Builds per month are capped on the free plan (`[UNVERIFIED]` current numbers — historically
~30/month with a per-platform sub-cap; queue priority is low). Current cadence is well
within it. A Play route adds AAB builds alongside APK builds if both populations are kept,
roughly doubling build count per native release — still likely within the cap, but worth
knowing.

---

## 7. Comparison

| | 1. Status quo | 2. Smoother sideload | 3. Play internal/closed | 4. Play public | 5. iOS |
|---|---|---|---|---|---|
| Money | €0 | €0 | $25 once — approved (Q3) | $25 once | $99/yr — deferred/unfunded (Q3) |
| One-time effort | none | hours | more than a weekend — background location confirmed (Q9) | §3 + weeks of listing/test gating; tester count may need to grow (Q2) | §3-equivalent + a second platform |
| Recurring admin | none | per-release upload | policy emails, yearly target-SDK bump | same, but hard deadlines and public consequences | same + Apple's |
| Tester install | file + unknown-sources | link + unknown-sources | tap Install | tap Install | TestFlight tap Install |
| Native updates reach testers | no (manual re-send) | with Obtainium / Firebase nudges | yes (Play auto-update) | yes | yes |
| JS updates (EAS Update) | yes | yes | yes | yes | yes |
| Crash visibility | none (Sentry fixes this on any route) | none | Android vitals (aggregate) | Android vitals | Xcode organizer / TestFlight crashes |
| Who can find it | nobody | nobody | invited only | anyone | invited / anyone |
| Fits the post-pivot goal ("people can try it") | no — scales with Nathan's time | no — keeps the warning Nathan named as the blocker (Q1) | **yes — decided (Q1)** | yes — later decision, gated by §3 and product work | deferred/unfunded (Q2, Q3) |
| Exposure of Nathan's identity | none | none unless public download page | name + email on a listing testers see | public listing | public listing |
| Sideload-verification risk | exposed | exposed | covered | covered | n/a |
| Reversible? | — | fully | mostly (listing can be unpublished; package name and signing key choices are permanent) | unpublishing is easy, reputation isn't | cancel the subscription |

### Honest reading of the table (after Nathan's answers)
- Column 3 is the decision, not a recommendation any more. Column 1 keeps running only
  for Nathan's own phone until the Play build replaces it; it was never a tester
  population (Q10).
- Column 2 is off the path entirely: Nathan named the unknown-sources warning as the
  friction to remove (Q1), and nothing in §2 removes it. §2c/2d survive as the fallback
  if Play *rejects* the app — a bad background-location review being the realistic way.
- **Nothing in this table is still open.** The signing-key choice (Q6: Google generates
  it) and the keystore backup (Q7: no) were the last two, decided 2026-09-10. A second,
  incompatible install line remains the one avoidable way to make the rollout rough, and
  under Q6 it is avoided by a permanent rule rather than a temporary one: no sideloaded APK
  of the clean package, ever (§0/§6).
- The cost of column 3 went *up* from the previous draft (background location is
  confirmed, §3) and the transition cost went *down* (no existing testers to migrate).
  Net: more paperwork, fewer people inconvenienced.
- §4 is a later decision with product work attached, not a deployment task — and §3 is how
  that product work gets discovered. 5–10 testers may be under Google's production gate;
  if public ever matters, the circle grows first.
- **iOS** is deferred and unfunded (Q3), not merely unscoped.
- The sideloading-verification rollout matters less than it did — the plan no longer relies
  on sideloading, and Q6 closed the "sideload door" for the clean package outright — but
  its status is still worth one check before the next deployment session, for Nathan's own
  `.preview` install.
