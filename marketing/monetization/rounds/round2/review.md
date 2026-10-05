# Monetization: Round 2 review (Claude)

Date: 2026-10-04
Responds to: `ideas.md` in this folder (Nathan's round 2 questions)
Method: three independent Opus web deep dives (distribution, feedback and launch strategy, IP), merged here. I am not a lawyer; fees and rules marked "unverified" could not be confirmed from official pages and must be checked before paying or signing anything.

---

## Short answers

| Your question | Answer |
|---|---|
| Rewrite the app for the stores? | **No.** An Expo / React Native app goes to both stores unchanged. Only accounts, signing, listings, a privacy policy and permission paperwork are needed. |
| Is the Play Store "too public"? | **No.** Play's internal and closed testing tracks are invisible in search and work only through an opt-in link. |
| Is the App Store crucial? | Important but second. Belgium is about 57% Android / 43% iOS (StatCounter, Sep 2026). iPhone people are reached through TestFlight, also hidden from the store. |
| How to get feedback? | Talk to 5 to 8 users 1:1, add a one-tap prompt after a ride, run a Signal/WhatsApp group. A small web page is needed, social media is optional. |
| Global or local? | **Leuven first.** Locality does not help the product (you race your own rides), but it helps cheap reach, in-person feedback and word of mouth. |
| Protect the idea first? | **The idea cannot be protected** and is not new anyway. Copyright is automatic and free. Contracts with helpers are the real protection. One cheap step needs your attention first: the **name "Qualifire"** (see 4). |

---

## 1. Distribution: your "tension" dissolves

Your worry was: raw APK is bad, Play Store is too public. A closed test fixes both.

**Android: Play closed testing**
- Testers tap an opt-in link, press "Become a tester", install from the normal Play page. No unknown-source warnings, automatic updates.
- Not discoverable: "testers cannot find your app by searching Google Play". You can stay in closed testing indefinitely; nothing forces production.
- Capacity: lists of up to 2,000 people each, or a Google Group (for example `qualifire-testers`) so you never edit lists by hand.
- A **new personal developer account must run a closed test with at least 12 testers opted in for 14 continuous days** before it can apply for production. So the Leuven soft launch and the compliance step are the same thing. Recruit about 15 to 20 to cover drop-outs. Keep notes: the production application asks what feedback you got and what you changed.
- Costs: USD 25 once, plus ID verification. A free app on a personal account does not show your home address (only merchant accounts do, i.e. once you sell).

**iOS: TestFlight**
- Apple Developer Program: about EUR 99/year.
- External testers: up to 10,000 through a public link you can cap and switch off. Not visible on the App Store.
- The first build of each version goes through Beta App Review (about a day). **Builds expire after 90 days**, so upload a new one at least quarterly.
- Testers: install the free TestFlight app, tap your link, tap Install (about 1 minute).
- No Mac needed: EAS builds in the cloud.

**Stop sending raw APKs.** Besides being scary today, Google's developer-verification scheme goes global in 2027 and will force unregistered sideloaded apps through a 24-hour "advanced flow". The Play route is also the future-proof one.

**Likely first rejection: background location.** A ride tracker almost certainly tracks with the screen off. Play wants a permissions declaration form, a video of 30 seconds or less, an in-app "prominent disclosure" dialog and the runtime prompt. Budget one resubmission. Also check your Expo SDK targets API 36 (required for new apps since 31 Aug 2026).

**Widening later is a setting, not a re-release.** Production can be limited by country (based on the user's Play account country) and widened in a few clicks. Caveat: Play has no "unlisted" production mode; once in production, anyone in the allowed countries can search for you.

**Suggested order**

| When | Do | Cost |
|---|---|---|
| Week 0 | Play account + ID check, one-page privacy policy (GitHub Pages is fine), target SDK 36, background-location disclosure screen | USD 25, about 1 day |
| Week 1 | EAS production build, internal track with 2 to 3 colleagues, data safety form, content rating, location declaration video | about 1 day |
| Weeks 1 to 3 | Closed test via Google Group, 15+ testers, ship 1 to 2 updates during the test | none |
| Week 2 (parallel) | Apple enrolment, EAS iOS build, TestFlight public link capped at about 50 | EUR 99/yr |
| Week 4+ | Apply for Play production (about 7 days review). Then choose: stay in closed testing, or publish Belgium-only. iOS stays on TestFlight until stable. | none |

Both platforms in testers' hands in about 2 weeks; Play production eligibility in about 4 to 5 weeks.

**Not verified:** whether TestFlight-only distribution triggers Apple's EU "trader" address declaration (it is clearly required for App Store listings); the EU date of Google's verification rollout; whether you actually request background location (this decides how hard both reviews are); iOS/Android split among cyclists specifically (students and academics may lean iPhone).

---

## 2. Feedback, website and social media

**What gives the most signal per hour (in order):**
1. **1:1 conversations or ride-alongs with 5 to 8 users.** Around 5 users surface most usability problems. Talk to both groups: student commuters and staff or "sporty" commuters.
2. **One-tap prompt in the app after a ride** ("How was that race?" emoji scale + optional text). Ask after rides 1, 3 and 10, not every time.
3. **A Signal group** (a better fit than WhatsApp for a privacy-sensitive location app). Cap the soft launch at about 50 users and answer in fixed slots twice a week.
4. **A Tally form** (Belgian, EU-hosted, free) in weeks 4 to 5 for the "how would you feel if you could no longer use it?" survey. With under 40 responses treat it as qualitative, not a score.
5. **Sentry for crashes**, EU region, personal data off, coordinates stripped before sending.

**Analytics: recommend none from third parties.** Anonymous tools cannot measure retention (no user identifiers); tools that can are pseudonymous and need opt-in consent under ePrivacy rules. Better: compute the metrics on the phone from ride history, and offer an opt-in "share my anonymous stats" button that sends counts only, never coordinates. At 30 users you can also just ask. This also fits a "no trackers" positioning.

**What to look at:**
- time from install to first ride
- share who ride a 2nd time within 7 days and a 3rd within 14 days
- rides per active user per week (a commuter should reach 4 to 10)
- share of rides with a ghost race active
- mount use (ask, you cannot measure it)

**What 20 to 50 users can and cannot tell you:** they can show onboarding and usability problems, whether ghost racing gets a reaction, and which bugs matter on real phones. They cannot give reliable percentages (at 30 users, plus or minus 15 points is noise). Rely on patterns and quotes. Also note colleagues are polite, which biases feedback.

**Website: yes, one minimal page** (Dutch + English): one-line pitch ("Race your own past commute, live"), a 15 to 30 second clip of a live race, 3 screenshots, tester links, privacy policy (both stores require a URL), contact email, feedback form link.

**Social media: optional.** Worth the time if anything: short vertical videos of a live ghost race (your feature is visual, "me vs. me from last Tuesday"), posted once to Reels, TikTok and Shorts; one honest post on r/Leuven and r/belgium disclosing it is your app. A useful hook: Strava Live Segments only races your all-time PR or the KOM, while Qualifire races your recent rides. Skip the rest for now.

---

## 3. Global vs local

- **Product fit:** locality barely matters, because you race your own rides (no network effect). Commuters everywhere have repeat routes.
- **Marketing and learning:** locality matters a lot: word of mouth ("my colleague races herself to the lab"), ride-alongs, seeing real mounts and phones.
- **Leuven assets:** over 64,000 KU Leuven students, about 4 in 10 Leuven residents commute mainly by bike, Velo student bike rentals, LOKO (coordinates the student societies), Fietsersbond Leuven, bike shops.
- **Downsides to manage:** Leuven commutes are short (about 10 min), so races may feel trivial; test some longer commutes too. Add a small "remote" group of 5 to 10 people elsewhere (r/cycling, friends abroad) to check results are not Leuven-specific.

**Local partners to approach (one email: GIF of the race on top, 3 bullets, one concrete ask with a date, landing page link; pitch it as a researcher's side project):**

| Partner | Ask | Offer |
|---|---|---|
| Your lab and building colleagues | 10 to 15 testers | Early access (also the cheapest way past Play's 12-tester rule) |
| KU Leuven mobility / sustainability office | Mention in a newsletter | Free, privacy-first tool |
| Fietsersbond Leuven | Newsletter or Facebook mention | No tracking, cycling-positive. They run "Bike to Work", so pitch as motivation, not a replacement. |
| Velo / bike shops | QR flyer | Logo on landing page, later a discount code |
| A science or engineering student society | Post, a "beat your own commute" week | Small prize, leaderboard of improvement, not raw speed |

Cautions: do not brand anything as KU Leuven without permission; frame it as consistency / "beat yesterday", not "race through traffic" (safety and liability for partners); design the ride screen to be glanceable.

**4 to 8 week plan with decision rule**

| Week | Do | Checkpoint |
|---|---|---|
| 0 | Landing page, privacy policy, Sentry scrubbing, in-app prompt, Signal group | Crash-free on 5+ different phones (test 3 to 4 brands: Samsung and Xiaomi background-kill apps) |
| 1 to 2 | Wave 1: 10 to 15 colleagues and friends, 3 ride-alongs | 80% reach a first ride within 24 h |
| 3 | Fix top 3 issues, email partners | 2+ partner replies |
| 4 to 5 | Wave 2: 20 to 40 via partners, r/Leuven, 2 short videos, 5 interviews | 50%+ ride a 2nd time within 7 days |
| 6 | Survey | 30+ responses |
| 7 to 8 | Decide | see below |

Go wider (public store listing in BE/NL) if at least 40% of activated users are still riding in week 3, at least 25% of rides use a ghost race, no data-loss or crash bug is open, and 30%+ say "very disappointed" (40%+ is strong). Below 20% retention: iterate locally. If support takes more than 3 hours a week, fix that before widening. (Thresholds are the researchers' suggestions, yours to adjust. Typical health-and-fitness apps see about 10% at day 7, so hand-recruited users should do much better.)

**Risks:** GDPR (location traces reveal home and work: keep processing on the phone, explain permissions plainly, offer delete-all and export, make any upload opt-in; turn it into a selling point), first-impression bugs (GPS drift, battery drain), your time (plan 3 to 5 hours a week).

---

## 4. Protecting your idea and IP

**What is and is not protected**
- **Ideas and mechanics: not protectable.** Someone can legally build "race your past commute" from scratch. It is also not new: Garmin ("Race a previous activity" / Virtual Partner), Strava Live Segments and the discontinued Ghostracer all do something similar.
- **Copyright: automatic and free** in Belgium and the EU. It covers your code, UI screens, logo artwork, icons, text and sound. It does not cover the mechanic or a similar-looking app written independently.
- **Patent: not worth it.** Software "as such" is excluded in Europe, ghost-racing GPS is not novel, Europe has no grace period (the soft launch would destroy novelty), and costs are tens of thousands of euros over the life of a patent.
- **Trade secrets** (EU directive, Belgian law since 2018): protect your private logic (live-engine matching, route-variant logic, tuning) as long as you take reasonable steps: private repo, 2FA, NDAs. Anything visible in the UI is not secret. **Do not publish the source.**

**Cheap proof of authorship**
- i-DEPOT at BOIP: about EUR 37 (5 years) or 53 (10 years), NDA add-on EUR 15 (prices from business.gov.nl, unverified on BOIP's own page). Proves a file existed on a date; creates no IP right. One deposit (design doc, logo source files, code snapshot hash) is enough.
- GitHub's server-side push records and dated releases are better evidence than local commit dates. OpenTimestamps is a free extra.

**Important: the name "Qualifire"**
- **Qualifire Ltd (Tel Aviv)** has operated qualifire.ai since 2023: real-time guardrails for LLM applications, about USD 4.6M in funding. The researcher could not query the trademark registers (TMview, EUIPO, BOIP blocked automated access), so **it is unknown whether they hold an EU or Benelux registration**. If they have a broad class 9 / 42 (software) registration, they could oppose your filing even though the markets differ.
- **Do this before launch** (free, about 30 minutes): search tmdn.org/tmview for "QUALIFIRE" and variants, then the WIPO Global Brand Database, app stores and domains. A professional clearance opinion costs about EUR 300 to 1,000.
- Renaming costs almost nothing now and a lot after launch (store listing, reviews, domain, your audio and teaser assets, flame brand story). This is the single most time-sensitive finding in this round. A rename would not touch the flame pictogram idea itself, but it affects everything that carries the name.

**Trademark facts (fees from law-firm and secondary sources, unverified on official pages)**

| Route | 1 class | 2 classes | 3 classes | Time |
|---|---|---|---|---|
| BOIP (Benelux) | EUR 244 | 271 | 352 | about 4 to 5 months |
| EUIPO (EU-wide) | EUR 850 | 900 | 1,050 | about 4 to 6 months |

- Classes: 9 (downloadable app, essential), 42 (online platform), 41 (optional).
- Benelux is "first to file": using a name gives you essentially no trademark right, whoever registers first usually wins.
- File the word mark first; the flame logo can follow as a separate filing since logos change.
- **EUIPO SME Fund 2026** refunds 75% of trademark fees (up to EUR 700) but needs self-employed status and the voucher **before** filing; deadline 4 Dec 2026, first-come first-served. Ties into the status question from round 1.

**Working with designers and helpers**
- **Ownership does not pass automatically.** A Belgian freelancer keeps the copyright in commissioned work unless there is a **written** transfer. Transfers are read restrictively: the contract must list each mode of exploitation, the remuneration, scope and duration/territory. Moral rights cannot be transferred (only limited waivers). There is no US-style "work for hire".
- Minimum contract: assignment of economic rights in all deliverables including source files; modes listed explicitly (app stores, web, marketing, merchandise, adaptation, registering the logo as a trademark); fee covers everything; warranty of originality and disclosure of any AI-generated or third-party material; font/stock licences transferred; confidentiality clause; rights transfer on payment.
- **AI-generated logos probably have no copyright** (EU needs a human author's own intellectual creation). A trademark registration does not depend on copyright, so for a logo that is the better protection.
- **Keep accounts in your name:** GitHub, Expo/EAS, Apple and Google developer accounts, domains, map/API keys, social handles. Give helpers role-based access only.
- Free Belgian templates: Meemoo's "Handboek auteursrecht" part 11 and Project TRACKS' freelancer models. One lawyer review of a template set: roughly EUR 200 to 600.
- **Revenue-share or equity helpers:** write down IP assigned to you or a future company, the share, vesting with a cliff, leaver terms, who decides, what happens if the project dies.
- **"What if they run with the idea?"** Legally almost nothing stops that, because ideas are free. Mitigate: show the UI, not the engine; NDA before sharing code; choose helpers with a relationship; and speed. Being the one in Leuven with real users first is the actual moat.

**KU Leuven angle (important, partly unverified)**
- Flemish higher-education law gives the university ownership of inventions made by paid staff **"within their research tasks"**; Belgian case law treats unrelated "free inventions" as the employee's. For software, the employer owns economic rights only for software made in the exercise of duties or on its instructions.
- A cycling app unrelated to C. elegans, made in your own time on your own equipment, **should fall outside** both rules.
- The researcher could not open KU Leuven's own IP regulation, side-activity rules or LRD pages. Unknown: whether your status (employee, doctoral bursary, FWO fellowship) changes this, and whether your contract has broader IP or side-activity clauses.
- To do: (1) read your contract or bursary agreement for IP and side-activity clauses, (2) email LRD, copy your promotor: one paragraph saying the project is unrelated, built on your own time and equipment, with no KU Leuven resources, data or name, and ask them to confirm KU Leuven claims no rights, (3) report it as a side activity if required, (4) never use university laptops, accounts, servers or working hours. This ties in with the round 1 status question; one conversation can cover both.

**Open source:** Expo and React Native are MIT, so commercial use is fine, but you must ship the licence notices (add an "Open-source licences" screen, generate it with a license-checker). Check for GPL/AGPL packages. OpenStreetMap data (ODbL) needs on-map attribution; Mapbox and Google have their own terms.

**Tiered budget (answer to your chicken-and-egg)**

| Tier | What | Cost | Trigger |
|---|---|---|---|
| 0 | Name clearance search, private repo + 2FA, accounts in your name, contract/NDA templates, KU Leuven email, licence screen | EUR 0 | now |
| 1 | One i-DEPOT, domain | under EUR 100 | before sharing with outside helpers |
| 2 | Benelux word mark, class 9 (+42) | EUR 244 to 352 (about 60 to 90 if SME Fund applies) | clean clearance + a public launch date |
| 3 | EUIPO mark, flame figurative mark, lawyer for contracts or company, patent decision | about EUR 1 to 3k | paid tier live, expansion beyond Benelux, co-founder/investor, or a few thousand active users |

You do not have to buy protection up front. The only early registration worth it is the trademark, and the reason is the cost of a forced rename, not an expectation of success.

---

## Combined next steps (suggested order)

1. **This week, free:** check the name "Qualifire" in TMview and WIPO; read your contract for IP and side-activity clauses; email LRD and your promotor.
2. **Decide** keep or rename based on the clearance result, before any public asset (store listing, landing page) carries the name.
3. **Week 0 to 1:** Play account, privacy policy page, background-location disclosure, EAS production build, internal track.
4. **Weeks 1 to 3:** Play closed test with 15+ testers (colleagues first), Apple enrolment and TestFlight in parallel, Signal group, in-app one-tap prompt.
5. **Weeks 4 to 8:** partners, 5 interviews, short videos, survey, then apply the widen-or-iterate rule.
6. **When a helper joins:** contract with assignment and NDA first, accounts stay in your name.
7. **Round 1 items still apply:** stay free during the soft launch; sort out status and tax before any revenue.

## Open questions for you

- Are you a doctoral bursary holder or employed by KU Leuven? It decides the side-activity and IP route (also asked in round 1).
- Does Qualifire track in the background (screen off or phone in pocket)? It decides how hard the store reviews are.
- If the name clashes with Qualifire Ltd, are you open to renaming, or is the name part of the flame brand story you want to keep?
- Do you already have a Google Play or Apple developer account?

## Caveats
- Fees for BOIP and i-DEPOT come from secondary sources; EUIPO's EUR 850 matches several 2026 sources. Confirm on official pages before paying.
- Several Belgian sites (KU Leuven, LRD, Fietsersbond, mobility office, BOIP) could not be loaded, so local partner details and university rules need direct checking.
- Retention and survey thresholds are the researchers' suggestions, not hard rules.
- This is research, not legal advice.

## Key sources
- Play testing tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- Play 12-tester rule: https://support.google.com/googleplay/android-developer/answer/14151465
- Play background location: https://support.google.com/googleplay/android-developer/answer/9799150
- Android developer verification: https://android-developers.googleblog.com/2026/06/android-developer-verification.html
- TestFlight external testers: https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/
- Apple Developer Program: https://developer.apple.com/programs/enroll/
- Expo submit docs: https://docs.expo.dev/submit/android/
- StatCounter Belgium: https://gs.statcounter.com/os-market-share/mobile/belgium
- Nielsen, 5 users: https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/
- Sentry sensitive data: https://docs.sentry.io/platforms/react-native/data-management/sensitive-data/
- EDPB ePrivacy guidelines: https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf
- Leuven bike use (VRT): https://www.vrt.be/vrtnws/nl/2026/08/27/leuven-10-jaar-circulatieplan-veranderd-fietsers-autos-handel/
- KU Leuven students: https://nieuws.kuleuven.be/en/content/2025/over-64-000-students-registered-at-ku-leuven-2-000-more-than-last-year
- Velo: https://student.velo.be/en/what-we-offer/
- Bike to Work: https://www.biketowork.be/nl/home
- i-DEPOT: https://business.gov.nl/products-services-and-innovation/protecting-your-product-or-idea/protecting-your-idea-in-an-i-depot/
- BOIP fees: https://www.boip.int/en/entrepreneurs/ideas/fees
- EUIPO SME Fund 2026: https://www.euipo.europa.eu/en/sme-corner/sme-fund/2026/vouchers/trademarks-and-designs
- EUIPO trademark availability check: https://www.euipo.europa.eu/en/trade-marks/before-applying/availability
- Qualifire Ltd: https://qualifire.ai/about
- Garmin race a previous activity: https://www8.garmin.com/manuals/webhelp/forerunner945/EN-US/GUID-30FAA18A-31DF-4CFB-9A1B-F52075FB5438.html
- Strava Live Segments: https://support.strava.com/en-us/articles/15401854-strava-live-segments-on-garmin-devices
- Belgian trade secrets: https://cms.law/en/int/expert-guides/cms-expert-guide-to-trade-secrets/belgium201
- Transferring copyright in Belgium: https://www.cultuurloket.be/kennisbank/auteursrechten/hoe-auteursrechten-goed-overdragen
- Meemoo model agreements: https://kennisbank.meemoo.be/toolbox/handboek-auteursrecht-deel-11-modelovereenkomsten-voor-een-licentie-een-overeenkomst-tot-overdracht-en-een-vrijwaringsclausule
- Project TRACKS freelancer models: https://www.projecttracks.be/overzicht-toolbox/rechten/modelovereenkomsten-voor-opdrachten-aan-freelancers
- Who owns the invention, Belgium: https://www.vo.eu/news/who-owns-the-invention-belgium/
