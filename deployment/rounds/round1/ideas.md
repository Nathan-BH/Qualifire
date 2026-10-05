# Deployment: Round 1 ideas and decisions (Nathan)

Date: 2026-09-09 / 2026-09-10 (answers), collected here 2026-10-05
Status: populated from `questions-and-rulings.md` (Q1-Q10, all answered). Nathan's words verbatim, no review. Full background lives in `review.md` and `../../CURRENT-STATE.md`.

Decided state in one line: Google Play closed testing, Android only, 5-10 testers, clean package `com.nathanbonher.qualifire` ("Qualifire"), Google-generated app-signing key, USD 25 fee, no keystore backup, Sentry yes, no deadline, iOS deferred.

---

## 1. Why Play, and what Qualifire is now (Q1) — DECIDED: pursue Google Play

> "i think i am ready to redefine what qualifire is. Its is not a personal app for myself anymore, but something i want people to be able to try out. This is the reason we have a virgin build that works autonomously within the app + efforts for marketing and deployment."

> "for now I would be okay to hand it to people so they can try it, but I need it to have less friction, it should be a proper app that does not trigger an android warning and force people to accept to download 'strange' apps. So maybe for that I should push to get to a google play route."

## 2. First testers (Q2) — DECIDED: 5-10, Android only

> "I would have between 5-10 to start with, I can ignore iPhone users for now if It makes it easier."

## 3. Cost and iOS (Q3) — DECIDED: USD 25 approved, iOS deferred

> "25 dollars once is okay by me. For the apple one, I would have to see if it makes sense financially."

## 4. Timeline (Q4) — DECIDED: none

> "no timeline pressure."

## 5. Package name (Q5) — DECIDED: clean `com.nathanbonher.qualifire`

> "clean name, it should be called qualifire only (no preview/virgin name) as that is what people will know."

## 6. Signing key and updates (Q6) — DECIDED: Google generates a fresh app-signing key

> "since I have the idea of having a whole app export .json option, losing ride history should not be an issue if you can just load the file in a new app in case you switch copies ? So I would go with the play store route so I start from a fresh key. I just wonder how updates work, I can still use expo to update things and it will go through the play store ? or does the play store have its own tool for making updates ?"

Open question inside this answer, answered in `questions-and-rulings.md` under Q6: JS-only changes go by `eas update` (no review), native changes need a new `.aab` through Play.

## 7. Keystore backup (Q7) — DECIDED: no backup for now

> "I would lean for no later. First of all the current apps version is far from complete so I would not need a backup yet. And if I use the google play route, its not needed either ?"

## 8. Crash reporting (Q8) — DECIDED: yes (Sentry)

> "I feel like this might be useful for improving the app without having people needing to explicitly text me"

## 9. Background location (Q9) — RESOLVED BY CODE CHECK

> "I do not know what the difference is and how It impacts functionality so 'check' ?"

Result: the app does request background location, so Play's disclosure screen, written justification and demo video requirements apply.

## 10. Current testers (Q10) — FACT

> "I have not sent anyone anything so far."

---

## Work that follows from these decisions (not yet started)

- `play` profile in `eas.json` (`.aab`, no `APP_VARIANT`)
- Background-location disclosure UI, in the same build as Sentry
- Privacy policy page, location justification, store listing assets
- Play Console account, app, data-safety form, content rating
