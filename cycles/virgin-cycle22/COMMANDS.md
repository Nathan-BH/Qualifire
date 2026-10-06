# virgin-cycle22 — COMMANDS.md (Nathan's copy-paste PowerShell)

Nothing here is ready to run yet: briefs 01-08 are written (2026-10-05) but NOT executed. Run these only
after the coordinator says they are executed and Opus-inspected (tests green, tsc exit 0). Same
publish path as `cycles\virgin-cycle21\COMMANDS.md`; this cycle rides on the same JS bundle.

## 1. Cycle 22 publishes as an OTA (briefs 01-06 JS-only; brief 07 expected OTA-safe too — § 3 has the check)
Briefs 01-06 and 08 touch only `app/src/ui/*` and tests (07 keep-awake: see its own § 3 note, added by its executor): no native module, plugin, manifest or asset. Build 8
is the native base (cycle 20's notification changes). If build 8 is not installed on the phone yet,
build it first (see `scripts\README.md`); the OTA then rides on top of it. If the publish script reports
a fingerprint drift, stop and send me the output (`scripts\OTA-TROUBLESHOOTING.md`).

Dry run first (checks node, tests, tsc, fingerprint; publishes nothing):
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File .\scripts\publish-preview.ps1 -DryRun
```

Publish the JS (cycle 20 JS + cycle 21 + cycle 22, whatever is in the tree):
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File .\scripts\publish-preview.ps1
```

Then on the phone: fully close "Qualifire Preview" and reopen it twice (the first launch downloads
the update, the second runs it).

## 2. On-device checklist (one existing ride + one short new ride)

**Brief 01 — one yellow line on ACTIVITIES.**
1. ACTIVITIES > open the bus ride (qualifire-20261004-0906) or any ride on a way. The map shows ONE
   yellow line with gate ticks; the roundabout is circled as the reference circles it (twice), no
   second line parting from it at bends. Compare with ROUTES > the same way at the same zoom: identical line.
2. Settings > Sector colours ON, back to the same ride: the sector stretches paint on that one line
   as before (purple/green stretches visible, yellow stretches same as the base). OFF: plain yellow.
3. ACTIVITIES > a free activity (or an unmatched ride): its own trail is still drawn (nothing else to show).

**Brief 02 — no ‖, no "GPS live".**
4. RECORD > pick a way, START, ride through at least one gate with a real stop (red light) inside the
   sector. The strip label of that sector reads `S1` (no ‖); the gate flash shows the sector label
   without ‖; the line under the live pane is empty (no "GPS live"). Turn location off briefly before
   START: "Location (GPS) is turned off" still flashes in the yellow button's sub-label.
5. After STOP: the SECTORS list on the activity detail shows S1..S4 with no ‖; times and colours are as before.
   Open an OLD ride that had a ‖: it is gone there too (same model), time and tier unchanged.

**Brief 03 — readable tier colours.**
6. Dark mode, ACTIVITIES > a ride with a purple sector: the SECTORS row label is white, the TIME is a
   light readable purple (not near-black); green/yellow times as before; avg dim. The big lap time in
   purple is the same light purple.
7. ON THIS WAY: P1, P2... white; old rides' dates dim; the `today` row's date AND time in this ride's
   result colour (purple/green/yellow; yellowish accent when there is no verdict yet). Gap stays dim.
8. Switch to day mode (RECORD screen theme toggle), same ride: big lap time and sector times readable
   on the white card (deep gold for yellow, dark green for green, brand purple for purple).
9. Anything odd (a colour you dislike, a line you miss): write it in `cycles\virgin-cycle22\PROGRESS.md`
   (create it). The three new colour constants are one line each in `app/src/ui/tierColour.ts`.

**Brief 04 — the gate flash AND the finish flash are time only (your "proper test with immediate note taking").**
Until brief 08 lands, only a REAL ride on RECORD flashes (DEMO and REPLAY never did, D8); after 08 the
DEMO > TENTH RIDE run is a valid dry A/B (see the 08 block below) — but the real ride is the test that
counts. Rules from D8 F2: pick the way at START (no pick = everything neutral = yellow text in dark
mode), and use a way that already has **at least 2 stored rides** (with 1 prior ride a sector can only be
purple or yellow; green needs >= 2). Flip "Sector colours" and the theme between rides, never mid-ride
(the tab bar is hidden while recording). Android's quick-settings screen recorder is the easiest way to
"take notes immediately": start it before START, then read the flashes back at each gate.

What you should see at EVERY gate, whatever the toggle or theme: the big clock digits are replaced for
2.5 s by the sector time in the SAME size and font, coloured by its tier, and nothing else: no
rectangle, no filled box, no outline, no dashed frame, no `S1` label, no `– –` under it. Then the white
clock returns. The sector's STRIP BAR (stays on screen after the gate) is the reference: its colour must
equal the flash's colour family (purple/green/yellow; grey bar = dim flash = estimated or no verdict).
Night: purple is a LIGHT purple (not the deep fill), green neon, yellow brand yellow. Day: purple brand
purple, green dark green, yellow deep gold.

At the FINISH gate (S4 on a 4-sector way): the S4 time flashes, then ~1 s later the LAP time (no
decimal, e.g. `13:56`) flashes the same way in the lap's colour for 2.5 s — no "LAP" chip, no box, no
rank — and then the clock RUNS AGAIN (whole-ride time) until you press STOP. Before this cycle the lap
chip stayed put until STOP. The lap colour to compare with: the tower reveal after STOP / the big lap
time on the activity.

10. Fill one row per gate (copy the table into `cycles\virgin-cycle22\PROGRESS.md`, create it if needed):

| ride | theme (dark/day) | Sector colours (ON/OFF) | gate (S1..S4, LAP) | reference colour (strip bar; for LAP: tower/activity lap colour) | what the flash showed (colour, box?, label?, size vs clock; for LAP: did the clock run again?) | matches the rule? (Y/N) | note |
|---|---|---|---|---|---|---|---|
| A | dark | OFF | S1 |  |  |  |  |
| A | dark | OFF | S2 |  |  |  |  |
| A | dark | OFF | S3 |  |  |  |  |
| A | dark | OFF | S4 |  |  |  |  |
| A | dark | OFF | LAP |  |  |  |  |
| B | dark | ON | S1 |  |  |  |  |
| B | dark | ON | S2 |  |  |  |  |
| B | dark | ON | S3 |  |  |  |  |
| B | dark | ON | S4 |  |  |  |  |
| B | dark | ON | LAP |  |  |  |  |
| C | day | ON | S1 |  |  |  |  |
| C | day | ON | S2 |  |  |  |  |
| C | day | ON | S3 |  |  |  |  |
| C | day | ON | S4 |  |  |  |  |
| C | day | ON | LAP |  |  |  |  |

11. If any flash shows a box, a label, a "LAP" word, a rank, or a different size than the clock, or a
    colour that does not match the reference's family, or the clock does NOT come back after the lap
    flash: write the row's note and the time of day, and send me the screen recording. The colours are
    one line each in `app/src/ui/tierColour.ts` (planner's default palette — you said you will not
    decide colours; change a line if one displeases); the flash component is `LiveFlash` in
    `app/src/ui/liveView.tsx`, the timings `FLASH_HOLD_MS` (2.5 s) and `LAP_HANDOVER_MS` (1.1 s) there too.

**Brief 08 — DEMO and REPLAY flash too.**
12. DEMO > TENTH RIDE (dark, then day; Sector colours OFF, then ON): at each gate the small demo clock is
    replaced by the sector time with one decimal in its colour — purple 3:05.0, green 3:27.0, yellow
    3:57.0, green 3:27.0 — then the clock; at the line `13:56` flashes GREEN, then the clock runs on for a
    few seconds before the ending screen. SECOND RIDE: same mechanics, colours per its 1-lap history.
    Same shape in all four combinations = the dry A/B that D8 § 5 wanted (now valid because the demo
    flashes). Note anything odd in PROGRESS.md.
13. ACTIVITIES > a ride on a way > REPLAY: each crossed gate flashes that sector's time/colour from the
    SECTORS list (an estimated sector flashes a dim `~m:ss`); the finish flashes the lap time in the colour
    of the big lap time above; then the parked clock returns under "replay over". Drag the scrub bar back
    and forth: the flash re-fires for the gate you land after — expected.

## 3. Brief 07 — keep the screen on while riding (expo-keep-awake)

The module `expo-keep-awake` 56.0.3 was ALREADY in `app\node_modules` (a dependency of `expo`) and
already linked into build 8 (autolinking lists it), so adding it to package.json should NOT change the
native fingerprint. Confirm before publishing — the dry run below runs the fingerprint check:

```
cd "C:\Users\natha\Claude personal projects\Qualifire\app"
npm install --no-audit --no-fund
```
(expected: "up to date", and `git status` shows no change to package-lock.json — the executor already
wrote the one line npm would write)

```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```
- Dry run clean (no fingerprint drift) -> publish as in § 1; brief 07 rides in the same OTA. On the
  phone: fully close "Qualifire Preview", reopen twice.
- Dry run reports a FINGERPRINT DRIFT -> the module was not in build 8 after all. Do NOT publish. Build
  instead (one EAS build slot, ~10-20 min, answer REUSE for the keystore), install the APK over the
  Preview, then send me the new fingerprint for `scripts\OTA-TROUBLESHOOTING.md`:
```
cd "C:\Users\natha\Claude personal projects\Qualifire"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1" -DryRun
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\build8.ps1"
```
  If you have a DEV CLIENT installed (`dev-phone.ps1`), it already has the module too (same tree).

On-device check (brief 07):
1. RECORD > pick a way > RECORD > START. Put the phone in the holder and do not touch it for longer
   than your screen timeout (Settings > Display; set it to 30 s for the test). The screen stays on
   for the whole ride, including a red-light stop.
2. STOP. From the moment the end mark plays (phase `ending`) the screen is allowed to dim again:
   leave the phone alone on the naming/result card for the timeout — it dims/locks as usual.
3. Setup and armed: on the RECORD tab before START, and on every other tab, the screen dims as usual.
4. Discard: START a ride, open the pause menu, Discard — the screen dims as usual afterwards.
5. Optional: force-stop the app during a ride and reopen — the ride resumes (virgin-cycle21 04 rules)
   or is filed free; either way the screen behaves per 1-3 for the state you land in.
6. Anything odd: `cycles\virgin-cycle22\PROGRESS.md`.
