# Monetization: Round 1 review (Claude)

Date: 2026-10-04
Responds to: `ideas.md` (Nathan's three ideas)
Method: three independent Opus web deep dives, one per idea, then merged here. Figures marked "est." are modelled by the researchers, not measured data. Belgian tax and PhD points are NOT verified and must be checked with KU Leuven and an accountant.

---

## Consensus (the short version)

All three researchers independently landed on the same answer: **do not monetize yet; earn the right to first.**

1. **Now (test phase): stay free, no ads, no tip jar.** At this size every option earns roughly nothing (see tables) while adding paperwork and trust cost.
2. **The real gate is retention, not pricing.** Do testers come back for a 2nd and 3rd ride and use the ghost race? Aim for about 300 to 500 active riders with repeat use before charging anything.
3. **Do the Belgian paperwork before the first euro** (status, PhD scholarship rules, accountant). This is the biggest risk across all three ideas.
4. **First "partnership" step costs nothing and earns nothing:** a one-time, honest in-app tip about phone holders. It fixes the real problem your test user had (pocket rides never see live racing) and gives you tap data for a later pitch.
5. **When the gate is passed:** free app + one-time **Pro lifetime unlock at about EUR 9.99 (founder price), later 14.99**, free core stays useful, early users grandfathered. Then add partner discount codes with revenue share.
6. **Ads: no, probably ever at this scale.** "No ads, no trackers" is a feature for a location app.
7. **Own store: skip.**

### Where the researchers differed, and how I resolved it

| Point | Disagreement | Resolution |
|---|---|---|
| Tip jar / supporter purchase | Ads report suggested one now; paid report said none yet | **None now.** Any revenue (even tips) makes Apple treat you as an EU "trader" and publishes your address. The Pro unlock later covers the same ground. |
| Joining affiliate programs | Partnership report: join bol.com / Decathlon once public; paid report: avoid income until status is sorted | **Neutral link first (no income).** Join affiliates only after the status question is answered. |
| 1 EUR price | Only your idea; paid report calls it the worst option | See section 1. |

---

## 1. Make the app paid

**Verdict: not yet. When ready: free download + one-time Pro unlock, EUR 9.99 to 14.99. Not EUR 1.**

Why EUR 1 does not work:
- 0.99 includes 21% VAT, then the store takes 15%, so you net **about EUR 0.70 per sale**.
- Apple's developer fee is EUR 99/year, so about **140 sales a year just to cover it**; EUR 1,000 net needs about 1,430 sales.
- Paid-upfront hides the app from people who would otherwise try it, and your main feature (racing your own ghost) only makes sense after several rides. Indie example (Donny Wals' Maxine): "decent traffic, almost no sales", moved to freemium.
- It signals "throwaway app" and brings refunds and support load out of proportion to the income.

Why a higher one-time price works better:
- At **EUR 9.99 (about EUR 6.95 net)**, EUR 1,000 needs about 145 buyers, roughly 5,000 to 7,000 downloads at a 2 to 3% conversion (est.). At 14.99, about 100 buyers.
- Still far below one year of any competitor: Strava 79.99/yr, Komoot 59.99/yr, Ride with GPS 59.99 to 79.99/yr, Bikemap 49/yr. One-time pricing is itself a selling point (Komoot got backlash for limiting its one-time region packs).
- Fits your dislike of subscriptions. Single product, no renewals, no billing failures.

Suggested split (starting point, yours to decide):
- Free: record rides, race your last ride on a route.
- Pro: race any past or best ride, multiple ghosts, history and stats, future features.

Realistic expectation: only about 21% of Health & Fitness apps reach EUR 1k/month within two years. A well-made niche app typically earns tens to low hundreds of euros a month: costs covered, not an income.

Mechanics (solo dev, Belgium):
- Apple and Google are merchant of record: they collect and remit consumer VAT and pay you net. You never handle buyers' cards or VAT.
- Apple Small Business Program (15%) must be applied for; Google's 15% is automatic.
- Payouts lag: Apple about 2 months after a sale, Google about the 15th of the next month.
- Code: RevenueCat (`react-native-purchases`) or `expo-iap`, works with your EAS dev builds. Lifetime unlock is one non-consumable product. "Restore purchases" is mandatory on iOS.
- **Hidden cost:** once the app earns anything, Apple lists you as an EU trader and, for an individual, publicly shows address/phone/email. Plan a PO box or dedicated number first.

**Belgian status risks (verify, not confirmed):**
- "Diverse inkomsten" (33% flat) probably does not apply: a continuously sold, updated app looks organised and can be reclassified as professional income.
- Likely route: self-employed side activity (bijberoep), with social contributions exempt below about EUR 1,922/yr net (2026). Condition: a main job of at least half-time. Unclear whether a doctoral scholarship counts.
- VAT small-business exemption up to EUR 25,000, but you still need a VAT number and possibly an intra-community listing.
- **Biggest risk: your PhD.** If you are a scholarship holder, side activities can threaten the tax-free status and may need your supervisor's written approval. A cycling app is unrelated to C. elegans research, which helps, but it is a case-by-case call. If you are employed, KU Leuven's side-activity notification rules apply instead.
- Action: ask KU Leuven HR / PhD administration, plus a free first meeting with a social insurance fund (Liantis, Acerta, Xerius) or an accountant.

---

## 2. Partnership

**Verdict: yes to the idea, but start with the product tip, not the money. Sponsor and own-store versions are not realistic at your size.**

Your tester's story is the strongest asset here: the holder makes the core feature visible. That is a product problem worth solving regardless of income.

Earnings at small scale (est.; about EUR 2 to 3 per sale):

| Scale | Affiliate income |
|---|---|
| 100 MAU | about EUR 0 to 5 total |
| 1,000 MAU | about EUR 2 to 5 / month |
| 10,000 MAU | about EUR 15 to 40 / month (direct deal at 10 to 15%: about 25 to 70) |

Affiliate income is a product feature, not a revenue line, until roughly 50k users.

Your three options:
- **Affiliate / referral link (your option b):** feasible. bol.com Partner Program (about 4 to 8% by category, 5-day cookie), Decathlon via Awin (about 6%, 14 days). Amazon is optional (24 h cookie, app must be approved, no WebView). Quad Lock and SP Connect have no public affiliate program; contact them directly.
- **Fixed-fee sponsor (option a):** needs measurable reach. Roughly 5 to 10k engaged MAU with proof of impressions, priced around EUR 5 to 20 CPM. Not before.
- **Own store (option c):** skip. Margins look good (about EUR 8 to 12 per EUR 15 to 25 mount) but you take on EU product-safety duties (GPSR), a mandatory one-click withdrawal button (since 19 June 2026), customs changes (EUR 150 exemption ended 1 July 2026), and liability if a cheap mount drops a phone at 25 km/h. Own brand: only at tens of thousands of users.

What works before scale: a **direct deal with a small mount brand**, a discount code their shop tracks, 10 to 15% revenue share (networks pay 4 to 8%), free test mounts, co-branded content. Pitch SP Connect, Quad Lock EU, and one Belgian bike shop at a few hundred engaged users. Pitch material: your tester's story, a screenshot of live racing on a mounted phone, ride counts.

Non-annoying design:
- One contextual tip, once: after 2 to 3 rides with no screen-on time during live racing, e.g. "Live racing works best when you can see it." Keep the inference on the device, never share it with partners.
- Also an optional onboarding question ("How will you carry your phone?") and a permanent "Gear" entry in settings. Never repeat a dismissed tip.
- **Disclosure is legally required in Belgium** for affiliate links, codes or free products: a clear "Reclame / Publicite / Advertentie" label (abbreviations like "Ad" are not enough). This is rider-facing text, so it must go through your `ui-strings.allow.json` budget.
- Open links in the external browser. Recommend only quality mounts: your app's reputation rides on it.

---

## 3. Ads

**Verdict: no. Not now, and a poor fit for a location app.**

Income (est., native card on post-ride summary, about 20 impressions per user per month):

| MAU | Native card only | Aggressive (plus interstitial each ride) |
|---|---|---|
| 100 | EUR 3 to 5 / month | about 10 |
| 1,000 | EUR 30 to 50 | about 100 |
| 10,000 | EUR 300 to 500 | about 1,000, with real churn cost |

- AdMob pays out from EUR 70. At 100 MAU, ads do not even cover the EUR 99 Apple fee.
- **Privacy is the big problem.** You hold precise location by design. An EFF investigation (Aug 2026) found several mediated ad SDKs pull precise GPS automatically when the host app already has location permission and pass it into bidding and on to data brokers. Adding ads could leak riders' commute traces.
- You would need an EU consent banner (Google UMP / TCF), the iOS tracking prompt, and store labels reading "Data used to track you", a visible downgrade for a GPS app. In France's CNIL view the publisher is responsible for the SDKs it ships.
- Safety: never show anything during a ride; gate on ride state in code.
- Evidence of harm: mostly from gaming, so directional. One disruptive ad raises churn about 6 to 7%; ads on reward/end screens (like a post-ride summary) tripled quit rates.

If you ever revisit (about 5 to 10k MAU): first try one hand-picked native sponsor card (local bike shop or commuter-gear brand, flat fee, no SDK) on non-riding screens only. Only if that fails: AdMob alone, no mediation, native format only, no interstitials, plus a "Remove ads" purchase. Even then expect about EUR 300 to 500/month at 10k MAU.

Positive angle: "No ads, no trackers, your rides stay yours" in the store listing costs nothing and helps growth.

---

## Suggested path

| Stage | Trigger | Do |
|---|---|---|
| Now | test phase | Stay free. Focus on retention. Start the paperwork questions (KU Leuven HR, accountant, PO box idea). Build the neutral "use a holder" tip and count taps anonymously. |
| Gate | about 300 to 500 active riders with repeat ghost-race use, and status answered | Launch Pro lifetime at EUR 9.99 (founder price), grandfather existing users. Apply to Apple Small Business Program. Join bol.com / Decathlon and add the "Advertentie" label. |
| Growth | a few hundred engaged users | Pitch SP Connect, Quad Lock EU and a Belgian bike shop for code + revenue share + free test mounts. Raise Pro to 14.99. |
| Scale | about 5 to 10k MAU | Consider a fixed sponsor card. Ads only if sponsor fails, under the strict rules above. |

## Open questions for you

- Are you a doctoral scholarship holder or employed by KU Leuven? This decides the status route.
- Is the goal covering costs, a side income, or a growth-first free app? The plan above assumes covering costs.
- How do you feel about the "Pro" feature split above, or do you want to keep every feature free?

## Caveats

- Income tables and conversion rates are the researchers' estimates; eCPMs come from aggregator blogs weighted to gaming.
- Amazon EU commission rates and Quad Lock / Bike24 affiliate terms were not verifiable; check directly.
- Belgian tax, VAT and PhD-rule points need professional confirmation.

## Key sources

- RevenueCat State of Subscription Apps: https://www.revenuecat.com/state-of-subscription-apps
- Donny Wals, paid-upfront to freemium: https://www.donnywals.com/migrating-an-ios-app-from-paid-up-front-to-freemium/
- Komoot paywall backlash (DC Rainmaker): https://www.dcrainmaker.com/2025/03/komoots-expanded-paywalls-trying-to-make-sense-of-it.html
- Apple trader address in EU: https://9to5mac.com/2024/08/15/app-store-eu-developers-address/
- Bijberoep contributions: https://www.accountable.eu/nl-be/blog/sociale-bijdragen-zelfstandigen-in-bijberoep/
- Doctoral scholarships (UGent, similar rules): https://www.ugent.be/nl/onderzoek/doctoreren/doctoraatsbursalena-z.htm
- bol.com partner commissions: https://affiliate.bol.com/nl/handleiding/commissiemodel-affiliate-programma/
- Amazon Associates policies: https://affiliate-program.amazon.com/help/operating/policies
- Apple App Review Guidelines (3.1.3(e), 4.2.2): https://developer.apple.com/app-store/review/guidelines/
- EU withdrawal button: https://www.crowell.com/en/insights/client-alerts/from-checkout-to-opt-out-the-eu-withdrawal-button-is-here-what-e-commerce-businesses-need-to-know
- EU customs EUR 150 exemption end: https://euverify.com/resource/eu-de-minimis-e150-customs-exemption/
- Affiliate disclosure in Belgium: https://ifori.be/hoed-je-voor-je-hashtags-verplichte-info-door-de-influencer/
- EFF, ad libraries and location: https://www.eff.org/deeplinks/2026/07/developers-beware-ad-libraries-betray-your-users-location-privacy
- CNIL mobile app recommendation: https://www.cnil.fr/sites/cnil/files/2025-05/recommendation-mobiles-app.pdf
- AdMob eCPM benchmarks: https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect
- Strava brand partnerships: https://www.modernretail.co/marketing/brands-like-chipotle-duer-hoka-are-partnering-with-strava-to-make-branded-workouts/
