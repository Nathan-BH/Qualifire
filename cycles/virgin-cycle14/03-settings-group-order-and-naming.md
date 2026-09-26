# 03 — SETTINGS: sport group second, "ON THE BIKE" renamed

**Source: Nathan, ideas #3 + #4 (tester feedback; tester not named).** #3: put the
'choose sport' setting directly below APPEARANCE so a new user finds it without scrolling
through unfamiliar settings. #4: the group "ON THE BIKE" is superseded now the app supports
several sports — give it a name that applies to every sport.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-25 by the Plan
tier (Fable) from anchor checks against the working tree. Executor: Sonnet, cold, this file
only. Small task: two line moves, one label, one hint word.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor was read from the tree on 2026-09-25. If a quoted line
  is not where the brief says, **stop and report the mismatch verbatim** (file, line,
  expected, found). Never guess, never patch around it.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside, never deleted. Never delete anything —
  `safe_to_delete/` is the bin.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  or any `cycles/virgin-cycle1..13/` doc (they are history and may keep the old label).

## Goal

On a fresh install SETTINGS reads, top to bottom: APPEARANCE, **SPORTS**, **WHILE RECORDING**,
STARTING A RIDE, SCORING, DATA. The SPORTS card (add / rename / switch sport) is visible
right under APPEARANCE without scrolling; no group name assumes a bicycle.

## Context

Everything lives in one file, `app/src/ui/settings.tsx` (667 lines). Group headers are plain
`<Text style={[st.h2, …]}>` lines inside `SettingsScreen` (line 535), each followed by a
`st.card` `View`. Current order, with anchors:

| # | header | anchor |
| --- | --- | --- |
| 1 | `APPEARANCE` | line 546, card closes at 557 `      </View>` |
| 2 | `ON THE BIKE` | line 559 `      <Text style={[st.h2, { color: t.textDim }]}>ON THE BIKE</Text>` — rows: Live map (561), Sector colours (564), Race your past rides (568), Earcons (572); card closes 575 |
| 3 | `STARTING A RIDE` | line 577 |
| 4 | `SCORING` | line 585 |
| 5 | `SPORTS` | rendered by `<SportsSection t={t} help={help} />` at line 606 — the component (line 331) prints its own `SPORTS` header (line 421) and card; rows: Active sport Seg (425), one management row per sport, add-sport input, "Sport picker on RECORD" (523) |
| 6 | `DATA` | line 608 |

The 'choose sport' setting is #5's whole card: the active-sport `Seg` plus the per-sport
management rows and the add row. It is not a single `Row` — it is a self-contained component
with its own header, so **moving one JSX line moves the whole group** and nothing needs
extracting. That is the smallest change and the right one: a new user needs the *add sport*
row first (RECORD blocks with "SET UP A SPORT FIRST — GO TO SETTINGS", `RecordScreen.tsx:1379`;
RIDES/ROUTES/RESULTS show "NO SPORT YET — ADD ONE IN SETTINGS"), and that row is in the same
card as the picker.

Nothing depends on group order: no scroll anchors or `scrollTo` in the file, no deep links,
no test asserts on any settings header or row label (`grep -rn "APPEARANCE\|ON THE BIKE\|SPORTS"
app/tests` → nothing), and every in-app hint says "SETTINGS" or "SETTINGS -> SPORTS" without
a position. `st.h2` carries `marginTop: 16` (line 651), so spacing above SPORTS is identical
wherever it sits.

`ON THE BIKE` appears exactly once in the app (`settings.tsx:559`). Outside `app/` it is only
in history: `cycles/virgin-cycle1/WP-K-sector-coloured-trail-phase2.md:102`,
`cycles/virgin-cycle7/BRIEF-red-light-removal.md:45,86,130`, `cycles/virgin-cycle7/README.md:82`
— leave those. `STATE.md`, `OPEN-ITEMS.md`, `GLOSSARY.md`, `HOW-THE-APP-IS-BUILT.md` never
name the group (they say SETTINGS → DATA / SCORING / Sports / "Race your past rides").

**Desired order:** APPEARANCE, SPORTS, WHILE RECORDING, STARTING A RIDE, SCORING, DATA.

## Decisions (already made — do not reopen)

1. **New name: `WHILE RECORDING`.** Every row in the group gates something that only exists
   while the recorder runs (live map dot, live sector paint, self dots, gate buzz); it is
   sport-neutral, matches the other headers' style (short, uppercase, gerund like
   STARTING A RIDE), and does not lean on "ride" — which is still the app's global word
   for a recording (RIDES tab, "Ride saved") and may or may not survive a later
   vocabulary pass. Nathan can tweak; runner-ups if he prefers a pairing with STARTING A
   RIDE: `DURING A RIDE`, `ON THE MOVE`.
2. **Move `SportsSection`, don't extract.** See Context.
3. One trivially mechanical hint word goes with it (change C). All other "ride/riding"
   wording is reported below, not changed.

## Changes (all in `app/src/ui/settings.tsx`)

**A. Move SPORTS to second.** Line 606 is exactly `      <SportsSection t={t} help={help} />`,
with a blank line 605 above and 607 below, then line 608 `      <Text style={[st.h2, { color: t.textDim }]}>DATA</Text>`.
Lines 557-559 are exactly:

```tsx
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>ON THE BIKE</Text>
```

Remove lines 606-607 (the SportsSection line and the blank after it) and insert
`      <SportsSection t={t} help={help} />` plus a blank line after line 558, so the region reads:

```tsx
      </View>

      <SportsSection t={t} help={help} />

      <Text style={[st.h2, { color: t.textDim }]}>ON THE BIKE</Text>
```

and SCORING's closing `      </View>` is followed by one blank line then the DATA header.
Net line count unchanged (667).

**B. Rename the group.** On the header line just moved to ~561, replace the text node
`ON THE BIKE` with `WHILE RECORDING`. Nothing else on the line changes.

**C. One hint word.** Line 561 (now ~563) is
`        <Row label="Live map" hint="Show the moving dot on the route while riding." help={help} t={t}>`
→ `hint="Show the moving dot on the route while recording."`.

**D. Breadcrumb.** In the `SportsSection` doc comment (lines 322-330, ends `this screen is a
different module from the store.` / ` */`) add one line before ` */`:
` * virgin-cycle14 brief 03 (Nathan #3): rendered second, under APPEARANCE, so a fresh install finds it without scrolling.`

## Verification (executor runs all; report the actual numbers)

```
cd app && grep -rn "ON THE BIKE" src App.tsx tests          # expect: no output
cd app && grep -n "WHILE RECORDING\|<SportsSection t" src/ui/settings.tsx   # header at ~561, component at ~559 and 331
cd app && node --experimental-strip-types tests/run.ts       # 0 FAIL
cd app && ./node_modules/.bin/tsc --noEmit                    # clean, exit 0
GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/src/ui/settings.tsx   # one file
```

Baseline (cycle13, 2026-09-24): 638 tests, 635 pass, 0 fail, 3 skip — no test touches this
screen, so the counts must be unchanged. If `tsc` blows the call budget, retry once with a
longer timeout, then report — never substitute a syntax-only check silently.

## On-device checklist (Nathan, after OTA — not the executor)

1. Fresh install (or SETTINGS → DATA → Reset app, then relaunch): open SETTINGS. The
   SPORTS card with "Add at least one sport to record" and the add-sport input sits directly
   under APPEARANCE, on screen without scrolling.
2. With 2+ sports: Active sport Seg and "Sport picker on RECORD" still work from the new spot.
3. The third group reads WHILE RECORDING; with a non-bike sport active (e.g. "Run") every
   row in it still reads right. Order below it: STARTING A RIDE, SCORING, DATA.
4. RECORD's "SET UP A SPORT FIRST — GO TO SETTINGS" still leads somewhere obvious.

## Bike-flavoured wording still in the app (report only — not changed here)

Nothing says "bike". "Ride/riding" is the app's sport-neutral-by-convention word for a
recording (RIDES tab, GLOSSARY.md), so it stays until Nathan rules on the vocabulary:

- `settings.tsx:568` label "Race your past rides"; `:569` hint "Your previous rides of this
  route…"; `:565` hint "…in the ride view and on the RIDES list … an ordinary lap".
- `settings.tsx:577` header `STARTING A RIDE`; `:579` hint "…when a ride starts…".
- `settings.tsx:601` Rankings hint "…each ride placed…"; `:636` Reset hint "every ride…".
- Elsewhere: RIDES tab name, "Ride saved" (`RecordScreen.tsx`), `RideMeta`/`listRides` types.

## Out of scope / follow-up

- The "ride" vocabulary pass above (a product decision, not a string swap).
- Any onboarding screen; RECORD's nudge text is unchanged.
- Historic `cycles/virgin-cycle1|7/` docs that quote "ON THE BIKE".
- `STATE.md` / `OPEN-ITEMS.md` / this folder's `README.md` — the coordinator's.

## Interaction with brief 01 (auto day/night) — run in the same session, 03 first

Brief 01 also edits `settings.tsx`: it inserts ~12 lines in APPEARANCE between lines 552 and
553, a `TimeRow` component (~25 lines) after line 159, and interface/DEFAULTS/import lines
near 26, 55, 67 and 102. Every anchor in *this* brief is at line 557 or later, so running
01 first shifts all of them by roughly +40 and the executor would have to stop. Running
**03 first** touches nothing above line 557 except the comment at 322-330 (+1 line, which
shifts 01's anchors at 536-553 by one — 01's anchors are quoted lines, so tell the executor
of 01 to expect that +1 and to match on text). Recommended: one executor, 03 then 01, both
reports before Inspect; or, if run separately, re-anchor whichever goes second by text.

## What this changes on Nathan's phone

Nothing yet — parked. Once executed: JS-only, one file, no dependency change, so it ships to
the Preview APK via `scripts/publish-preview.cmd` (EAS Update) — no numbered build, no
reinstall. Behaviour is identical; only the order of two cards and one header/hint string.

## Open questions / assumptions (logged, not blocking)

- **Name.** `WHILE RECORDING` chosen (decision 1). Nathan may prefer `ON THE MOVE` /
  `DURING A RIDE` — a one-word edit on the same line, no other change.
- **"Second group" read as "second card"**, i.e. SPORTS directly under APPEARANCE and above
  the renamed group. If Nathan meant SPORTS *first*, move the same line above line 546
  instead — same mechanics.
- **The hint-word change C** is assumed inside scope as trivially mechanical (task allowance);
  drop it if Nathan wants the rename alone.
- Tester not named in the source; recorded as such.
