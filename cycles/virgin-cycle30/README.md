# virgin-cycle30: the gate-edit alert (look, text, themed dialog)

**Created:** 2026-10-09
**Status:** capture only. Nothing here is planned or executed. Split off from cycle29 on purpose, to keep cycle29 on map speed + freeze rule.

## Nathan's report (2026-10-09, after testing)
The confirmation shown when saving moved gates is "a popup that is not in the app theme, it looks like a random rectangle
on top with a lot of text and em-dashes." He wants its title and text far shorter and direct, and to know why it does not fit the brand theme.

## What we know (coordinator, code read)
- Source: app/src/ui/GateAdjustScreen.tsx lines ~56-70, `confirmEditGates` -> `Alert.alert(title, body, buttons)`.
  Title: `Move the gates of "<way label>"?`
  Body: `Its N timed activities are re-timed from the recordings against the new gates — old times and ranks do not survive, the activities do. The reference activity is kept and re-timed too, so it still races you as a dot. Recordings are never touched.`
  Buttons: Cancel / Save & re-time (style destructive).
- `Alert.alert` is React Native's SYSTEM dialog: Android/iOS draws it in system style. It cannot follow the brand theme. The app has ~41 `Alert.alert` call sites (grep -c in app/src/ui).
- It breaks the rider-text rules in CLAUDE.md #9 (alert body > 20 words; em dash) but its strings are listed in app/tests/ui-strings.allow.json (lines ~548, ~576, ~592), so the test passes. Check why the rule does not catch it.
- Another gate alert exists with similar text: allow.json line ~1102 ("Its {...} past result{...} discarded and re-timed ... old times and ranks do not survive.") and "Gates saved — reference not re-timed" (line ~564). Same fix pass.

## Coordination with cycle29
Cycle29 brief 05 (scoping) may change what a gate edit does: Nathan wants OLD activities to stay untouched on a gate edit
(today they are deleted and re-timed). The alert wording depends on that outcome:
- If gate edits stay as today: body like "Old activities are re-timed on the new gates."
- If old activities stay untouched: body like "Old activities keep their gates. New ones use these."
Do the text work AFTER cycle29 brief 05 is ruled, or write both variants and switch.

## Nathan's wishes
- Title and text "waaaaay shorter and direct". No em dashes. No wall of text.
- Understand why it does not fit the theme; ideally it should fit the brand.

## Ideas to investigate here (not decided)
1. Text-only change (chore): shorter title/body/buttons, update allow.json entries with a one-line reason each.
2. A small themed in-app confirm dialog component (day/night aware, uses theme tokens, same words) replacing Alert.alert for the gate dialogs first,
   then migrating the other call sites gradually. Needs a design ruling (position, buttons, destructive style) from Nathan.
3. Audit all ~41 Alert.alert call sites: which are confirmations worth theming, which could be a yellow-button sub-label warning
   (CLAUDE.md #9: warnings flash in the yellow button's sub-label, never a banner).

## Tier rule
Digest (Haiku) -> Plan (Fable) -> Execute (Sonnet) -> Inspect (Opus), only when Nathan promotes this cycle.

---

## Round log (append-only; newest last)

### 2026-10-10 R1: audit + plan agreed
- **Audit result (coordinator, grep over app/src/ui):** 50 real `Alert.alert` call sites, NOT ~41 (the "~41" above was an undercount). Files: catalogDeleteActions.ts 2, CatalogDetailScreen.tsx 7, GateAdjustScreen.tsx 4, RecordScreen.tsx 10, rideActions.ts 6, RideDetailScreen.tsx 8, RidesScreen.tsx 1, settings.tsx 12. (Other grep hits: 5 in tests, 1 comment.)
- **Two kinds:** about 25 fixed-text popups (title and body written in code) and about 25 generic error popups (fixed title like "Could not delete", body = whatever error message the failing step returns).
- **Coordinator's first-pass sort (NOT decided, for Nathan to rule):**
  - Keep, destructive confirms (~11): Delete activity, Delete place/route/way (3 variants), Discard activity, Reset app (+ "Really reset?", consider merging into one), Delete sport, Merge places, Overwrite reference, Move gates.
  - Probably remove or replace (~6): "Exported", "Shared" (OS sheet already confirms), "Nothing to export yet" (grey out the button), "An activity is being recorded" (disable Reset), "That way already exists" (inline), "Gates saved - reference not re-timed" (yellow sub-label per CLAUDE.md #9).
  - Keep but consolidate (~25): error popups into one themed error dialog.
- **Nathan's answer to the plan (2026-10-10):** agrees with this order: (1) gallery of every popup, (2) Nathan decides keep/remove from the list, (3) build the themed in-app dialog for what remains. Do NOT theme popups that are about to be deleted.
- **Why Alert.alert cannot be themed:** it is the OS system dialog (Android draws it). Fix = small in-app themed dialog (JS only, should ship via EAS Update, no new APK; to confirm when building). All 50 sites would call 1-2 helpers; ui-strings test extractor (tests/ui_strings_extract.ts line ~156) currently matches `Alert.alert` by name and must be updated to the new helper.
- **Prototype caveat:** the gallery is a mock-up outside the app. Nothing in the app changes until step 3.
- **Tiers this round:** Haiku Digest (theme tokens + error sentences) -> Sonnet Execute (gallery + inventory files in this folder).

### 2026-10-10 R2: popup gallery built (step 1 of 3 done)
- **Files:** `popup-gallery.html` (open by double-click, works offline) and `ALERT-INVENTORY.md` (50 rows, exact text, generated from the page's own data so they cannot drift).
- **What the gallery does:** all 50 popups with exact current title/body (sample values filled in), Day/Night toggle, "Themed (proposed)" vs "Current (Android system, approximate)" look, filter chips, per-popup Keep / Remove / Replace / Merge buttons + note, "Copy my decisions" (paste into chat). Decisions are saved in the browser's localStorage. Badges flag em dashes and bodies over 20 words.
- **Proposal visible in the mock (Nathan can veto):** no red anywhere (theme.ts says NO RED); destructive confirms use the brand yellow; Cancel = outline button; title normal case, 15px/800.
- **Not in the app.** Nothing under app/ was changed this round.
- **Verification (checkable):** node --check on the page script passes; DATA has 50 entries P01..P50; inventory has 50 rows; no alert()/confirm()/prompt(), no external URLs; 10 exact strings diffed against source, no mismatch; coordinator re-rendered the page in headless Chromium (390px wide): no console errors, no horizontal scroll, theme and look toggles work.
- **Line-number note:** P38 is RidesScreen.tsx:80 (it was :73 earlier the same night). app/src has other uncommitted edits from parallel work, so re-grep lines before executing step 3.
- **Tiers:** Haiku Digest 136,084 tokens (theme tokens: no custom font, no red, one existing Modal in activityMenu.tsx; validator error sentences) -> Sonnet Execute 126,175 tokens (2 files). No Opus Inspect: no app code landed.
- **Next:** Nathan opens the gallery, marks each popup, pastes "Copy my decisions" into chat. Then step 3 (themed dialog for what remains; first the 4 gate/overwrite confirms, then migrate).
