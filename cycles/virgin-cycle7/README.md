# virgin-cycle7 — F1 tier colours, one help-icon switch, and two answers (earcons, red lights)

**Status (2026-09-15): all three briefs landed.** Colours (`c9db5d5`), the help-icon toggle
(`ea191a7`) and the red-light removal (`64d34bb`, authorized same day) are committed and
Inspect-clean. Two of Nathan's four notes turned out to be questions, not builds; both are
answered in `QUESTIONS.md` (Q3 earcon length has a follow-up chore, Q2 asks for a rename —
see STATE.md for current status of both). Renders and `website/assets/map.png` are the one
remaining Nathan-PC item. Note: the red-light commit was a race between two Cowork sessions
open on the same PC folder at once (see the Status table below) — same result, flagged for
awareness, not a defect.

## Three briefs in this folder

| Brief | What | Status |
|---|---|---|
| `BRIEF-colours-update.md` | Tier purple → `#9000C8`, tier green → `#00D000` (F1 broadcast values), yellow unchanged — app, website, marketing render sources, docs; D-030 palette firewall re-centred on the new hues | **Ready for execution** |
| `BRIEF-settings-help-toggle.md` | One persisted `showHelp` switch in SETTINGS → APPEARANCE that shows/hides every row's "?" at once; default on (today's behaviour) | **Ready for execution** |
| `BRIEF-red-light-removal.md` | Remove the "Red lights" setting (auto / button / off) and the RECORD-screen "RED LIGHT – HOLD CLOCK" button | **Executed — committed `64d34bb`.** Nathan authorized 2026-09-15 (`QUESTIONS.md` Q1) |

Earcons/vibration (Nathan's note 3): **answered — no build needed** (§C below).

## What this cycle is for

Nathan's notes of 2026-09-14 (`Nathan/Nathan's_notes7.md`), quoted:

1. *Colours:* "apparently Formula 1 uses these exact hex color codes on its official live
   timing screens, broadcasts, and graphics app for sector times: Purple (Overall Fastest):
   #9000C8 / Green (Personal Best): #00D000 / Yellow (No Improvement): #FFD000. I would try to
   change our purple and green to these colours (I would keep our yellow as it is now because
   it fits with the brand image, logo and more) this should be updated everywhere that used
   it, so in the app + marketing, renders and website"
2. *Settings:* "Now I have a question mark next to each settings option, instead lets have one
   toggle in the settings that shows or hides this question mark everywhere, this way, you can
   hide it when you know the settings and are not bothered by it!"
3. *Earcons:* "I am also wondering about the earcons feature, I dont recall the phone ever
   vibrating, is that a feature that is already implemented?"
4. *Red lights:* "I would also like to think about removing the whole red-light settings. I
   feel like it goes against what the app is about. The idea is to not pause things because
   then you comparison is not possible between rides + luck/variability is part of the
   experience. The goal is not to be perfect. (for example we dont track speed or anything
   like strava would) what do you think"

Items 1 and 2 are mechanical and got briefs. Items 3 and 4 needed reading the code before
anything else, and the reading changed the picture for both — see §C and §D.

## Headline design decisions (full reasoning in the briefs' Rulings)

- **Colours are a 1:1 literal swap, everywhere the old hex appears in live sources.** No new
  shared palette constant is introduced across the marketing HTML files — each render already
  carries its own `SECTOR_COLORS` copy and unifying them is a refactor Nathan didn't ask for.
  The app has one source of truth (`theme.ts`) and every app consumer reads it, so the app
  change is three lines plus the firewall.
- **The D-030 palette firewall (`wayMapStyle.ts`) must move with the hues.** The new green is
  hue **120** (pure green); the current guard band is `[130, 165]`, built around the old
  `#3ED598` (hue ~156). Left alone, the firewall would stop protecting the tier green
  entirely. Both bands are re-centred at ±20° around the actual tier hues: green `[100, 140]`,
  purple `[263, 303]` (new purple is hue ~283, which sat 7° from the old band's edge). One
  test swatch and its expected hue move with it.
- **`purpleDeep` is unreferenced anywhere in `app/`** (grep, this session). It is kept (never
  delete) and re-derived from the new purple with a stated formula (each channel × 0.7 →
  `#65008C`), so the token doesn't quietly lie next to its parent.
- **Frozen round snapshots are not edited** (`marketing/website/rounds/v1|v2`,
  `marketing/silent-studio/colours/rounds/v1`, `marketing/cycles/*`): they record what Nathan
  saw at each feedback round. The live `index.html` files are. If Nathan wants the snapshots
  recoloured too, it is the same one-line `sed` — listed in the brief as an opt-in.
- **Renders are a follow-up on Nathan's PC, not an executor task**: `all-renders/*.mp4`
  (HyperFrames, `render.ps1 -Render`) and `marketing/website/assets/map.png`
  (`_map/map-capture.html` in Chrome) are rasters of the old colours and need re-running once
  the sources land.
- **Help icons: one persisted boolean `showHelp`, default `true`.** It gates `Row`'s
  `hasHelp` in one place, so every "?" (including the SPORTS section's) obeys it and an
  already-open hint collapses the moment it's switched off. The switch row itself carries no
  hint (a hint that explains "?" and disappears with "?" is useless). Existing `settings.json`
  files without the key keep today's behaviour.

## C. Earcons / vibration — answered, nothing to build

**It is implemented, on by default, and fires on every gate crossing.** Facts, read this
session:

- `app/src/location/index.ts:492–508` — module-scope subscription on the live engine:
  `if (st.gateFires > buzzedFires && earconsEnabled) Vibration.vibrate(70)`. Lives in the
  tracker, not the UI, so it fires with the screen off (cycle 009 ruling in the comment).
- `app/src/ui/settings.tsx:34` `earcons: boolean`, default `true` (`:57`); the provider wires
  `setEarconsEnabled(s.earcons)` (`:103`); SETTINGS → ON THE BIKE → "Earcons" toggles it
  (`:564`).
- DEMO (`DemoScreen.tsx:85`, 60 ms) and the preview (`PreviewScreen.tsx:84`, 70 ms) buzz too.
- `android.permission.VIBRATE` has been in `app/app.json` since the initial import
  (2026-08-17, commit `2eb81c3`); Build 7 (2026-09-08) is newer, so the installed APK's
  manifest has it. The stale `[UNTESTED ON DEVICE — incl. whether VIBRATE lands in the
  manifest]` comment at `location/index.ts:484–485` predates that build.

**Most likely reasons Nathan has never felt it**, in order of plausibility:

1. **70 ms is a notification-tick.** Through a handlebar mount or a jersey pocket on a moving
   bike, road buzz swamps it. This is the one I'd bet on.
2. He hasn't crossed a gate on a real route ride with the phone since the virgin (blank) build —
   free rides fire gates only when they exist.
3. Earcons switched off at some point, or the phone's own vibration intensity / haptics setting
   is low or off.

**Suggested check (Nathan, 2 minutes, in hand not on the bike):** SETTINGS → Earcons is ON →
open DEMO and let it run past a gate. If it buzzes in hand, the mechanism works and the fix
is a *stronger* buzz on the bike (e.g. a pattern `[0, 150, 80, 150]` instead of a single
70 ms) — a five-line change, worth a brief only after that check says so (`QUESTIONS.md`
Q3). If it does not buzz in hand, report the phone model and Android version and that becomes
a real bug brief.

## D. Red-light settings — my opinion: remove it, and it's cleaner than Nathan thinks

**Short version: yes, remove it. Not because it fights the philosophy, but because it never
implemented one.** Reading the code, the "Red lights" setting is a placebo with a misleading
hint:

- `settings.redLight` (`'auto' | 'button' | 'off'`) has **exactly one consumer** in the whole
  app: `RecordScreen.tsx:1196`, `settings.redLight === 'button'`, which decides whether to
  *render* the "RED LIGHT – HOLD CLOCK" button. `'auto'` and `'off'` are behaviourally
  identical — nothing anywhere reads them.
- The button toggles a `held` boolean (`RecordScreen.tsx:193`) that is read by **nothing but
  the button's own opacity and label** (`:1198`, `:1202`). It does not touch the clock, the
  engine, the recording or the results. Its own subtitle admits it: *"self-reported stop – the
  measured clock keeps its own truth"* (`:1205`).
- The Settings hint (`settings.tsx:548`) says *"auto: a stop at a light is detected and the
  clock pauses by itself … off: the clock never pauses."* Neither half is true: the clock
  never pauses in any mode. (Cycle 6's Q3 ruling already established the same for PAUSE.)

What the app **actually** does about red lights — and this is the part that already matches
Nathan's philosophy — lives elsewhere and is untouched by the removal:

- Stop detection is automatic and unconditional: `app/core/src/timing.ts:8` marks a sector
  `interrupted` when it contains ≥ 1.0 s of stopped time, and records `stoppedS` / `movingS`
  alongside `rawS` for every sector and lap (`store/derive.ts:68–114`). It's a measurement,
  not a policy.
- The policy is the **Timing** setting (`settings.tsx:584–588`, `store/timing.ts`): *wall clock*
  (default — "every stop counts, a red light is your luck") or *moving* (opt-in — drops
  detected stopped time). That is the real, working form of what §18 asked for.
- Interrupted laps still rank (D-028) but are excluded from the sector *mean* used for the
  green/yellow line (`colourModel.ts:130–131`); the live map dims but stays locked at a stop
  ("a light is not a finish", `wayMapView.tsx:28, 236, 372, 1125`). None of this references the
  setting.

So removing "Red lights" deletes zero behaviour, one false promise, one no-op button, and a
`§18 — UNSETTLED` comment that is settled by Nathan's own note. On the philosophy: I agree
with him, and I'd add that the app already *is* the no-pause app — the wall-clock default plus
automatic stop *measurement* (kept, never acted on) is exactly "luck is part of the ride, but
we know how much of it there was". That's more honest than either §18 mechanism would have
been.

**One genuine follow-on he should look at (not folded in, not built):** by the same
reasoning, the *moving* option of the Timing setting is the thing that actually "pauses" a
ride for scoring. If his rule is "no pause, ever, because comparability", that opt-in is
the real question, and it is a bigger one — `scoredS()` is threaded through every verdict.
Raised as `QUESTIONS.md` Q2; nothing in this cycle touches it.

**Why I drafted the removal brief anyway (marked NOT AUTHORIZED):** it is a well-bounded
removal — two files, ~45 lines out, one line in (stripping the stale key from old
`settings.json`), no test touches it, no other screen or doc references the setting, and
`IDEAS.md §18` is Nathan's file and stays as it is. The brief costs nothing to hold and turns
a yes into a ten-minute execution instead of another Plan pass. It does **not** run until he
says so — this project doesn't build on spec, and he asked for an opinion, not a removal.

## Status (updated 2026-09-15, coordinator, after Execute + Inspect)

| Item | Status |
|---|---|
| `BRIEF-colours-update.md` | **Executed & inspected — committed `c9db5d5`.** Tests 583 pass / 0 fail / 3 skip, tsc clean. Fresh Inspect pass found zero blocking defects (re-derived the hue math, probed the firewall behaviourally). Renders (`all-renders/*.mp4`, `website/assets/map.png`) still owed on Nathan's PC — old colours until re-rendered. |
| `BRIEF-settings-help-toggle.md` | **Executed & inspected — committed `ea191a7`.** Same test/tsc result. Inspect confirmed the gate is total (one call site) and no dangling open-help state. On-device manual check (fresh install / toggle / relaunch persistence) still pending Nathan. |
| `BRIEF-red-light-removal.md` | **Executed & inspected — committed `64d34bb`** (Nathan authorized 2026-09-15, `QUESTIONS.md` Q1). A concurrent Cowork session on this same PC folder (`session_01HZAA8VvYSUNT6x5dePYFpD`) committed the diff a few seconds ahead of this session's own commit attempt — same file contents in both cases, no divergence. This session's fresh-Fable Inspect pass (started before the other session's commit landed) DID run against that diff: zero blocking defects, plus a ruling on one real self-contradiction in the brief's own acceptance criteria (R2's scrub line necessarily contains the literal string `redLight`, so the brief's `grep … → no output` bar as literally written could never fully pass; ruled: the code is correct, the acceptance wording was imprecise). Full report: `EXECUTION-ESCALATIONS.md`. |
| Earcons / vibration | Answered — no build needed; a 2-minute in-hand check for Nathan (§C) |
| Renders (`all-renders/*.mp4`, `website/assets/map.png`) | Not an executor task — Nathan's PC, after the colour sources land |
| `STATE.md` / `GLOSSARY.md` | `STATE.md` cycle-history updated this pass; `GLOSSARY.md` not touched (nothing in it referenced the old hex or the firewall bands) |

**Inspect findings (fresh Fable pass, both briefs, zero blocking defects):** two non-blocking
notes folded into the colours commit (`product/MAP-CONTRACT.md:110` and `product/MAP-TILES.md:86`
still quoted the retired 130–165/260–290 hue bands — fixed alongside the code). A handful of
old-hex hits in historical cycle records (`cycles/virgin-cycle1/…`, `cycles/virgin-cycle5/…`,
`design/drafts/CONTRAST.md`) were confirmed correctly left untouched — they're frozen history,
not live sources.

## Known limits / open questions

- **Purple text on the night race surface gets darker.** `#9000C8` against `#0A0A0A` is
  roughly 2.9:1 (the old `#A667F0` was ~5.5:1); against white it *improves* to ~7:1. F1 uses
  its purple mostly as a fill under white text, not as coloured text on black. Lines, dots and
  fills will be fine; purple *numerals/labels* on the night RECORD/RESULTS surfaces may read
  dim. Ruled: swap 1:1 as asked, Nathan judges by eye on the phone, and if it's too dark the
  answer is a separate lighter *text* variant, not a different purple (`QUESTIONS.md` Q4).
- The firewall bands are ±20° by rule, not by measurement against a basemap. A park fill at
  hue ~90 (typical) stays outside the new green band; a basemap green closer to 120 would now
  be flattened where it wasn't before. Only a phone shows whether that matters.
- The colours brief edits `marketing/PLAN.md`, `marketing/HYPERFRAMES-PLAN.md`,
  `marketing/guides/VIDEO-EDITING-GUIDE.md` and `product/brand/README.md` one line each so the
  written palette stays true; `design/` and `product/brand/make_*.py` (closed explorations,
  their own README says so) are left as history and listed, not edited.
- The help-icon switch hides the "?" on SETTINGS only — no other screen has "?" affordances
  (grep `helpBtn`, this session), so "all of them" and "Settings" are the same set today.
- Yellow stays `#F5C542`, not F1's `#FFD000` — Nathan's explicit call ("fits with the brand
  image, logo and more"). The brief treats any yellow change as out of scope.
- No `device_bash` problem this session: every anchor above was read from the live working
  tree on Nathan's PC on 2026-09-15, on top of the committed cycle-6 work (`92bd6ea`) and
  marketing cycle 09 (`003d4df`). Executors still re-read anchors before editing — the
  briefs share `settings.tsx`, so whichever lands second sees shifted line numbers.
- A stale `.git/index.lock` was present on the mount at the time of writing (not created by
  this session, which only ran `git status`/`git log` with `GIT_OPTIONAL_LOCKS=0`). Per
  `CLAUDE.md` rule 7 it gets `mv`-ed aside before the first real git write, never deleted.
