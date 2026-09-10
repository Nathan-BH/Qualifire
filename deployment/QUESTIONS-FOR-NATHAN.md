# Questions for Nathan — deployment (asked 2026-09-09; all ten answered as of 2026-09-10)

**Status: fully resolved — nothing in this file is waiting on Nathan.** This is the canonical
record and supersedes both `QUESTIONS-FOR-NATHAN2.md` (where Q6/Q7 were answered) and the
older `QUESTIONS-FOR-NATHAN(answered before update).md` (Q1–Q5, Q8–Q10); those two are now
redundant copies and can be cleared out.

Per `process/CONVENTIONS.md`'s escalation convention the answers were given inline, and the
coordinator folds them into `STATE.md` / `OPEN-ITEMS.md`; Q1–Q5, Q8–Q10 were folded in on
2026-09-09 and Q6/Q7 are for the coordinator to fold in now. Background for every question is
in `DEPLOYMENT-OPTIONS.md`; section numbers refer to it. Each entry below records the
question as it was asked, Nathan's words verbatim, and what the answer settles.

**How it went.** Nathan answered all ten on 2026-09-09; he answered the *original* wording
of Q2/Q4 (the same-day revision hadn't reached him — the questions asked the same thing). He
said "keystore" and "EAS" were unfamiliar terms, so Q6 and Q7 were rewritten with a
plain-language primer and a worked example, and he answered those on 2026-09-10. His Q6
answer came with a real follow-up question — how app updates work once the app is on Play —
which is answered under Q6 below, and his Q7 answer contained a piece of reasoning to
confirm, which is done under Q7.

**The decided state, in one paragraph.** Google Play closed testing (Q1), 5–10 Android
testers to start (Q2), $25 fee approved and iOS deferred/unfunded (Q3), no deadline (Q4),
clean package `com.nathanbonher.qualifire` named "Qualifire" (Q5), **Play generates a fresh
app-signing key — Play-only distribution from then on** (Q6), **no keystore backup for now**
(Q7), Sentry yes (Q8), background location confirmed by code (Q9), no testers have anything
yet (Q10). Nothing about the distribution route or signing is open; what remains is work,
sequenced in `DEPLOYMENT-OPTIONS.md` §0.

---

## Q1 — Is this app ever meant to leave your phone and your testers' phones?
**Context:** `STATE.md`'s ground rules said *"Single-user, no accounts, no social, no store
distribution (except blank-install capability)."* Right now the app reaches other people
only because you build an APK and hand it over. Any Google Play route — even a private
testing track that nobody can search for — is technically store distribution and needed
that rule changed. The blank-install work was done so "someone else can use this"; the
question was *who* that someone is.

**Options:** (a) stay internal-APK-forever — me and people I hand it to, the rule stands
as written; (b) I'd like a private Play testing track so testers install it like a normal
app, but never a public listing — amend the rule to "no *public* store distribution";
(c) I could see it going public one day — drop the rule and treat public as a later
decision; (d) haven't decided, come back to it.

**Answered 2026-09-09** — first in chat (recorded by the earlier Plan pass):

> "i think i am ready to redefine what qualifire is. Its is not a personal app for myself
> anymore, but something i want people to be able to try out. This is the reason we have a
> virgin build that works autonomously within the app + efforts for marketing and
> deployment."

— then inline, in the answered file:

> "for now I would be okay to hand it to people so they can try it, but I need it to have
> less friction, it should be a proper app that does not trigger an android warning and
> force people to accept to download 'strange' apps. So maybe for that I should push to get
> to a google play route."

**What this settles:** **Decided — pursue Google Play.** Store distribution is in scope (the
"no store distribution" ground rule is recorded as superseded in `STATE.md`), and the
*reason* is now on record: the sideloading warning is the friction he wants gone. That rules
out §2 (smoother sideloading) as the destination — it doesn't remove the warning — and makes
§3 (closed testing) the route. "For now … hand it to people" is option (b); (c) — a public
listing one day — stays a later, separate decision (§4). "No accounts, no social" was not part
of what he said and still stands.

## Q2 — Who do you have in mind as the first people to try it, and roughly how many?
**Context:** The pivot says "people", not a number. The routes differ mostly in how much
friction a *newcomer* hits and how much per-person work *you* do. A few technical
friends: sideloading is fine and the Play track can wait. A dozen or more, some who've
never installed an APK: the Play track starts paying for itself immediately. Beyond that
— people you don't know personally — closed testing is the stepping stone to a public
listing anyway. Also useful: are any of them on iPhone? That's the only thing that would
put §5 on the table.

**Answered 2026-09-09:**

> "I would have between 5-10 to start with, I can ignore iPhone users for now if It makes
> it easier."

**What this settles:** **5–10 testers to start, Android only.** Small enough that Play's
internal track (≤100 emails, no review) could carry all of them, and that the closed track's
tester management is trivial. iPhone users are explicitly set aside — §5 stays scoping only
(see also Q3). One thing to know: Google's gate for *production* access on a personal
account has been a minimum tester count over 14 days (`[UNVERIFIED]` current figure — it was
20, then 12); 5–10 may sit below it, which only matters if a public listing (§4) is ever
wanted, and would mean growing the circle first.

## Q3 — Is $25 once for a Google Play developer account acceptable for a personal project? (And $99/year for Apple, if it ever came up?)
**Context:** The Play fee is one-time; the account also needs an ID check and puts a
developer name + contact email on the listing testers see. Apple is recurring. Neither is
needed for the status quo or for the smoother-sideloading ideas in §2. Worth noting: Google
has announced a developer-verification requirement for sideloaded apps on certified Android
devices, phased in by region from late 2026 — status unverified, but if it reaches your
region, some form of verified identity may be needed even to keep sideloading (Google has
described a free/limited hobbyist tier). So the $25 may end up being about identity rather
than about the store.

**Answered 2026-09-09:**

> "25 dollars once is okay by me. For the apple one, I would have to see if it makes sense
> financially."

**What this settles:** **$25 Play fee approved.** The ID check and a developer name + contact
email on the listing come with it and he didn't object; *which* name appears is a form field
to fill at console-setup time, not a question for now. **Apple / iOS is deferred and
unfunded** — considered and answered "would have to see", which is a real "not now", not
"never came up". §5 stays scoping only; nothing iOS-shaped gets scheduled or spent.

## Q4 — Any timeline pressure?
**Context:** Is there someone waiting for an install this month, a ride season you want
people on before, a point at which you'd want a public listing to exist, or is this "when
it's convenient"? This decides whether the next deployment session does the cheap wins
(§0's "now" list, Q7–Q9) and stops, or goes straight on into the Play Console setup. Note
that Google's closed-test gate for personal accounts imposes its own minimum clock (14
days of continuous testing before production access can even be requested) — if public
is a goal with a date, that clock starts at closed testing, not at the listing.

**Answered 2026-09-09:**

> "no timeline pressure."

**What this settles:** **Decided — no date.** Work is sequenced by cheapness and by what
unblocks what (§0), not by a deadline. With Q6/Q7 now decided, the next step is the repo
work in §0 Step 1 and then the Play Console setup in Step 2. The 14-day closed-test clock is
irrelevant until a public listing is wanted.

## Q5 — Which package name goes to Play: the one testers already have, or the clean one?
**Context:** Current installs are `com.nathanbonher.qualifire.preview` ("Qualifire
Preview"). A Play listing takes exactly one package name, permanently. Shipping `.preview`
keeps continuity with every current install (they can update in place, if the signing key
also matches — see Q6). Shipping the clean `com.nathanbonher.qualifire` means every current
tester uninstalls and reinstalls, and **loses their local ride history** unless an
export/import path exists first (there's GPX+ export; an import path is unverified).

**Options:** (a) `.preview` — keep continuity, odd name only you see in the console; (b)
clean name — accept a one-time reinstall for current testers; (c) clean name, but only
after ride-history import exists.

**Answered 2026-09-09:**

> "clean name, it should be called qualifire only (no preview/virgin name) as that is what
> people will know."

**What this settles:** **Decided — clean `com.nathanbonher.qualifire`, app name
"Qualifire".** Option (b), chosen without the (c) condition. "No preview/virgin name" also
closes the question the previous log entry raised about the third package
(`com.nathanbonher.qualifire.virgin`): neither variant goes to Play. Config consequence:
`eas.json` gains a Play profile with no `APP_VARIANT` (the base package) and an `.aab` build
type; the `preview` profile keeps working for your own phone until you retire it.

**You should know (not a re-ask — the decision stands; this is the consequence made
visible):** the clean package is a *different app* to Android, so nothing carries over from
a `.preview` install: ride history, routes, settings, the lot. Two things soften it. First,
per Q10 the only `.preview` install today is your own phone — no tester has one — so the
history at stake is yours, and if the rename lands before the first tester install (which
§0 now plans for), no tester ever reinstalls. Second, both packages can sit on the same phone
side by side; the old "Qualifire Preview" keeps its data until you uninstall it, so you can
keep it around until whole-app export/import (`OPEN-ITEMS.md` item 4) exists and migrate
then, rather than losing anything on a date. `OPEN-ITEMS.md` records the dependency.

## Background for Q6 and Q7 — the two words you asked about

*(Kept as reference; this is the primer Nathan asked for before answering Q6/Q7.)*

**Keystore / signing key.** Every Android app is stamped with a cryptographic signature when
it's built, made from a private key file — the "keystore". Android and Google Play use it as
proof of authorship: a phone will only install an *update* to an app if the update is signed
with the **same** key as the copy already on the phone. Different key → the phone treats it
as an unrelated app that happens to share a name and refuses to install it over the old one;
the only way forward is uninstalling the old one, which deletes that app's local data. That
rule is what stops a stranger from pushing a fake "update" of your app onto someone's phone.
It also means the key is a secret that can't be replaced: lose it and you can never again
update the copies that are already installed.

**EAS.** Expo Application Services — Expo's cloud build service, the thing
`scripts/build7.ps1` talks to when it builds an APK (`eas login` is logging into it; builds
show up on expo.dev). The first time it built Qualifire it **generated a keystore for you
automatically and kept it on Expo's servers** — the "reuses keystore" line in the build
output is this. Every APK you've built has been signed with it. EAS stores one keystore per
package name: `com.nathanbonher.qualifire.preview` has its own, and the clean
`com.nathanbonher.qualifire` either already has one (if a `development` build was ever made
— `[UNVERIFIED]`) or gets a fresh one the first time it's built.

**Play App Signing** is the one extra piece Google adds. For new apps Google insists on
holding the key that signs what testers actually install (the "app signing key"). At the
moment of the first upload you get a choice, permanent for that package name: **(1)** let
Google generate a brand-new key, or **(2)** upload the key you already have (the EAS one) so
Google uses that. Q6 was that one choice.

## Q6 — Which key should sign the Play version: a new one Google generates, or the one EAS already has?

*(Replaced the earlier wording — "are you OK with a one-time uninstall/reinstall for
existing testers if signing continuity turns out to be awkward?" — which Nathan asked to have
explained.)*

**Context, as asked.** Q5 already changed what was at stake: the Play app is the clean
package `com.nathanbonher.qualifire`; today's install is `.preview`. Android treats those as
two different apps whatever key is used, so the `.preview` copy can never be updated *into*
the Play version in any scenario, and per Q10 nobody else has the app yet. Continuity with
the **past** was therefore a non-issue. What Q6 decided is continuity with the **future** —
whether Play installs and EAS-built APKs of the clean package can ever update over each other.

**Worked example (as given to Nathan).** Suppose Play is set up and Google generated its own
key, call it **G**; the EAS account still has its key, **E**, and every APK EAS builds is
signed with E. Tester Anna installs from Play (signed with G). Tester Ben gets an EAS APK
(signed with E). Both work, but each phone is locked into the door it came in through: Ben
can't switch to the Play version without uninstalling and losing his ride history, and Anna
can't take a quick EAS APK. Had E been uploaded to Play instead, Play-installed and EAS-built
copies would be signed identically and interchangeable.

**The choice, as offered:** **(a)** let Google generate the key — simplest, nothing to
export; cost: from then on every install and update of Qualifire comes through Play, and a
sideloaded EAS APK of the clean package is a separate, incompatible line. **(b)** upload the
existing EAS key to Play — keeps sideloaded and Play installs interchangeable; cost: one
session at the keyboard exporting the key from EAS and uploading it during first setup.

**Answered 2026-09-10:**

> "since I have the idea of having a whole app export .json option, losing ride history
> should not be an issue if you can just load the file in a new app in case you switch
> copies ? So I would go with the play store route so I start from a fresh key. I just
> wonder how updates work, I can still use expo to update things and it will go through the
> play store ? or does the play store have its own tool for making updates ?"

**What this settles:** **Decided — option (a): let Google generate a fresh app-signing key
at first upload.** In the Play Console this is the default ("Let Google manage and protect
your app signing key"), so it is one click and nothing is exported. Consequences, all
already on record and accepted:

- **Qualifire's clean package is Play-only from then on.** Every install and every native
  update of `com.nathanbonher.qualifire` goes through Play. An EAS-built APK of the clean
  package, signed with EAS's key, cannot be installed over a Play copy (or vice versa)
  without uninstalling. This matches Q1's "everyone gets it from Play, full stop". The
  ordering rule in §0/§6 therefore hardens from "no sideloaded APK of the clean package
  *before* Play is set up" to **"no sideloaded APK of the clean package, period"** — if a
  tester ever can't use Play, the answer is the internal track's email list, not an APK.
- **EAS's keystore for the clean package becomes the *upload* key**, not the app-signing
  key: it signs the `.aab` Nathan uploads, Google verifies it, then re-signs the app with
  its own key before it reaches phones. Losing the upload key is recoverable (Play Console
  lets you register a replacement upload key); losing an app-signing key would not be — and
  under (a) that key is Google's problem, not Expo's. This is what makes Q7's answer safe.
- **His premise about ride history is the parked whole-app export/import item**
  (`OPEN-ITEMS.md` item 4). It's a correct instinct — with export/import in place, "switching
  copies" is an export, a reinstall and an import — but nothing in the plan *needs* it,
  because under (a) and §0's ordering no tester ever switches copies; the only migration it
  serves is Nathan's own `.preview` history onto the Play build (Step 3), which can wait
  until the feature exists. Not a new dependency; just noting his answer leans on it.

### Your follow-up question, answered: how do updates work once the app is on Play?

Short version: **yes — you keep using Expo/EAS for updates exactly as you do now, and Play
doesn't get in the way.** There are two *independent* update paths, and Play only touches one
of them.

**Path 1 — EAS Update, "over the air" (OTA). This is what you do today, unchanged.**
`scripts/publish-preview.ps1` runs `eas update`, which pushes the JavaScript and assets (the
code, screens, logic, images, sounds — everything that isn't native Android code) to Expo's
servers; each installed copy of the app checks for a new update on launch via the
`expo-updates` library that's already in the app (`~56.0.24`) and swaps it in. This
**does not go through Play**, is **not reviewed by Google**, and works the same whether the
app was sideloaded or installed from Play — Play doesn't know or care that it happened. The
only condition, same as today: the installed build's *fingerprint* (a hash of the native
code and config — `app.json` uses `runtimeVersion: { policy: "fingerprint" }`) must match the
update's fingerprint, and the update must be published to the *channel* baked into that
build. Today that channel is `preview`; the Play build gets its own (`play` in the planned
`eas.json` profile), so a `publish-play.ps1` sibling of `publish-preview.ps1` is the whole
change to your routine. For ordinary work — a fix, a new screen, a tweak to the timing logic
— this is the path, and it's minutes, not days.

**Path 2 — a new app binary, uploaded to the Play Console. Play's own mechanism; needed
only for native changes.** Some changes can't ride on Path 1 because they alter the native
part of the app and therefore the fingerprint: a new permission, a new package that brings
native code (a new `expo-*` or React Native module — Sentry for Q8 is exactly this), an Expo
SDK upgrade (which Play's yearly target-SDK bump will force once a year), a change to
`app.json`'s native config. For those you build a new binary — `eas build --profile play`,
the same step `build7.ps1` / `build4.ps1` do today, except the output is an `.aab` instead
of an APK — and **upload it to the Play Console** (manually at first; `eas submit` can do it
from the command line later). Play is then the tool: it reviews the submission (this is
where the background-location disclosure, justification and demo video from §3 are
checked — a review of *this* kind of upload, not of Path 1 updates), and once cleared it
**distributes the new binary to every tester's phone automatically, in the background**,
the way any Play app updates. Nothing for you to do beyond uploading and waiting for review,
and nothing for the tester to do at all. This is the exact thing sideloading couldn't do
(§1, "native updates don't propagate") and is the main mechanical gain from Play.

**How the two fit together.** After a Path 2 release, phones still on the old binary have
the old fingerprint, so Path 1 updates published for the new fingerprint won't apply to them
until Play delivers the new binary — which it does on its own within hours to a day or two,
depending on each phone's auto-update settings. `scripts/OTA-TROUBLESHOOTING.md` is about
that mismatch; on Play it resolves itself instead of needing a re-send. Rule of thumb for
which path a change needs: if `eas fingerprint:compare` says the fingerprint changed, it's
Path 2; otherwise Path 1. (`[UNVERIFIED]` but long-standing: Play's policy permits OTA
code updates as long as they don't change what the app fundamentally is — Expo's whole
update product depends on this, so treat Path 1 as policy-safe for the kind of changes
Qualifire makes.)

**What Play's "own tool" is, to be precise:** there isn't a separate Play update tool you'd
run — the Play Console *is* it, and "making an update" there means uploading a new `.aab`
to the track. It's Path 2 only. Play has no equivalent of Path 1, which is why Path 1 stays
Expo's job.

**The one thing that changes because of your Q6 choice:** Path 2 is now the *only* way a
native change reaches anyone's phone. You can't hand a tester an EAS APK "while review is
slow" — that APK is signed with a different key than their Play copy and won't install over
it. So plan native changes in batches (§0: Sentry + the background-location disclosure in
one build), and let Path 1 carry everything in between. Your own phone's `.preview` install
is the one exception — it's a different package, still updated by `publish-preview.ps1` on
channel `preview`, until you retire it (Step 3).

## Q7 — Do you want the next session to walk you through backing up the signing key out of your Expo account?

*(Same question as before, reworded once the terms were explained.)*

**Context, as asked.** Right now the Expo account is the **only** place the key that signed
Nathan's phone's install exists. If that account were lost, nobody could ever again produce an
update the sideloaded copies would accept. "Backing it up" is one `eas credentials` run,
writing a `.jks` file plus three passwords to a place Nathan picks — ten minutes at the
keyboard, once per package. How much it matters after Play exists: if Q6 is (a), Google holds
the Play key, so Play installs stay updatable even if the Expo account were lost — the backup
then mainly protects sideloaded installs. Offered as **yes** (first ten minutes of the next
deployment session) or **no / later**.

**Answered 2026-09-10:**

> "I would lean for no later. First of all the current apps version is far from complete so
> I would not need a backup yet. And if I use the google play route, its not needed either ?"

**What this settles:** **Decided — no backup for now.** Not scheduled; §0 Step 0's backup
item is dropped (it stays available as an optional ten-minute chore if he ever wants it).

**Checking his reasoning, since he asked ("its not needed either?"):** mostly right, with
one precise correction and one narrow exception so nothing surprises him later.

- **"If I use the Google Play route, it's not needed" — correct for everything that goes
  through Play.** Under Q6 (a), the key that signs what testers install is generated and
  held by Google. Google's own safeguarding of that key is the backup; there is nothing for
  Nathan to export or store. If he ever lost the Expo account entirely, Play installs would
  stay updatable: the EAS-held key is only the *upload* key for the clean package, and Play
  Console lets you register a replacement upload key. So for the Play population — which
  per §0 is every tester there will ever be — a keystore backup buys nothing.
- **"The app is far from complete so I don't need a backup yet" — the completeness of the
  app was never what the backup was about**, so this part of the reasoning is beside the
  point rather than wrong. The backup protects *installed copies*, however unfinished the
  app on them is; what actually makes it unnecessary is the previous bullet, plus the next
  one.
- **The one narrow exception: the `.preview` install on his own phone.** That copy is
  signed with EAS's `.preview` key, and Expo's servers hold the only copy of it. If the Expo
  account were lost, that one install could never take another native build — it would keep
  running and would keep receiving OTA updates on channel `preview` only as long as its
  fingerprint held, and then it would be stuck. Since the plan (§0 Step 3) is to replace it
  with the Play build and retire the `preview` profile, and the only data on it is Nathan's
  own history (which stays on the phone regardless — the app doesn't stop working, it just
  can't be updated natively), this is a non-issue in practice. If that install ever turns
  into something he wants to keep updating long-term, the ten-minute export is the fix, and
  it's just as available then as now.

So: **no backup is the right call for the Play route, and nothing is at risk that he cares
about.** No urgency is being manufactured here; this is recorded so the reasoning is on file
rather than assumed.

## Q8 — Do you want crash reporting (Sentry, free tier) added regardless of distribution route?
**Context:** Today a tester's crash reaches you only if they describe it. Sentry gives you
the stack trace. It's a native change (one new APK build) and works the same for sideloaded
and Play installs. Downside: crash reports leave the device, so a privacy policy would have
to mention it if the app ever goes to Play, and there's a small dependency to maintain.
This is a normal app work package (would get its own `cycles/` folder), not deployment
config — asking here because it's the one thing every route in §7's table shares as a gap.

**Answered 2026-09-09:**

> "I feel like this might be useful for improving the app without having people needing to
> explicitly text me"

**What this settles:** **Decided — yes.** Tracked in `OPEN-ITEMS.md` ("Distribution") as an
app work package with its own `cycles/` folder when picked up; not planned further here. Two
deployment-side consequences only: the Play privacy policy must say crash reports leave the
device, and the Sentry build should be the same native build that goes to Play's internal
track, so the tester count never grows on a build without it. (It is a native change, so it
travels by Path 2 under Q6 — one more reason to batch it with the disclosure UI.)

## Q9 — Does the app request *background* location, or only foreground with a running-ride notification?
**Context:** You may not know off-hand — that's fine, say "check". It's asked here because
it is the single biggest swing factor in the Play route's cost: background location
triggers a prominent-disclosure requirement, a written justification and usually a demo
video in review; foreground-only is a normal declaration. `expo-task-manager` being in the
dependencies hints at background, but nobody has verified the manifest. If you'd rather the
next session just check the manifest and report, say so.

**Answered 2026-09-09:**

> "I do not know what the difference is and how It impacts functionality so 'check' ?"

**Resolved by code check, not by Nathan (Digest pass, 2026-09-09): the app requests
background location.** `app/app.json`'s `expo-location` plugin sets
`isAndroidBackgroundLocationEnabled: true`; the Android `permissions` list includes
`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION`;
`app/src/location/index.ts` records rides through `TaskManager.defineTask` +
`Location.startLocationUpdatesAsync` with a foreground-service notification ("Qualifire —
recording ride"), and its `ensurePermissions()` asks for foreground permission first and
then background — the standard Android two-step. Details in `CURRENT-STATE.md` §7.

**The difference, since you asked:** *foreground* location means the app only gets GPS while
it's on screen; *background* means it keeps getting GPS with the screen off or another app in
front — which a ride recorder in a pocket needs. So the code's choice is the right one for
the product; it just costs more at Play review. **What it settles:** Play's
background-location requirements now apply for certain — a prominent in-app disclosure
before the permission prompt, a written justification in the console, and usually a short
demo video — see `DEPLOYMENT-OPTIONS.md` §3. That was the "weekend or a month" swing factor,
and it swung toward "more than a weekend". Nothing for you to decide; it's work.

## Q10 — Have you been sending testers the APK file, or the EAS build page/QR link?
**Context:** Purely factual, for `CURRENT-STATE.md`. The EAS link already exists for every
build and skips the file-transfer step; if you haven't been using it, that's the cheapest
improvement available (§2a). Also: has any tester hit a Play Protect warning or block?

**Answered 2026-09-09:**

> "I have not sent anyone anything so far."

**What this settles:** **Factual — there are no testers yet.** The install base of the
`.preview` package is your own phone(s); nobody has hit a Play Protect warning or any other
install friction because nobody has installed it. Three things follow: `CURRENT-STATE.md`'s
"what a tester experiences today" is a prediction, not an observation; the package rename
(Q5) and the signing choice (Q6) were made *before* a single tester install existed, which
is the cheapest they will ever be; and §2a (EAS install links) is no longer a step on the
path — the first testers come in through Play, not through a sideload that would later need
replacing (and under Q6, could never be replaced in place).
