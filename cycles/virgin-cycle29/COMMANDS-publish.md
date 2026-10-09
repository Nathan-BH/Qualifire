# Commands — publish virgin-cycle29 briefs to the Preview app (template, Fable 2026-10-09)

Same script and pattern as `cycles/virgin-cycle27/COMMANDS-publish-all-nine.md`. Publish ONE brief at a time (01 first: its
on-device check is the profile that decides the rest); every brief is JS-only, so each is an OTA update, no new APK.
Publish only after the brief's Opus inspect report says "safe to ship OTA" and the suite/tsc are clean. Nothing is committed by
the executors; committing is Nathan's call afterwards (`scripts/` batch-commit template).

## 1. Dry run (publishes nothing)
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```

## 2. Publish (replace NN and the message)
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -Message "cycle29 brief 01: map cover lifts on first frame, ACTIVITIES mounts visible cards only"
```
Messages per brief:
- 01: `cycle29 brief 01: map cover lifts on first frame, ACTIVITIES mounts visible cards only`
- 02: `cycle29 brief 02: snapshot probe (long-press Activities title)`
- 03: `cycle29 brief 03: freeze rule, colours and ranks as ridden`
- 04: `cycle29 brief 04: ACTIVITIES cards are snapshot pictures`
(05 is a document; nothing to publish.)

## 3. On the phone (two launches is normal: the update downloads on the first, applies on the second)
- After 01: night + day: switch RECORD / ACTIVITIES / ROUTES: frame colour for a fraction of a second, then the map with tiles
  filling in; no white flash. ACTIVITIES: two cards carry maps, a third gets one at 40 % visible. Re-rank the tabs by speed.
- After 02: ACTIVITIES, long-press the title (0.6 s): card 1's map becomes a picture; compare in 4 states (day/night x sector
  colours on/off). The "i" credit button is on both sides (part of the comparison, not a difference); only the FIRST press per
  state makes the picture (`[snap] made`), a repeat is the cache (`[snap] hit`) and does not count for the time. PASS =
  indistinguishable, first picture per state within ~1.5 s. `[snap] failed … timeout` after ~10 s = FAIL (snapshotter broken).
  Long-press again to go back. (Amended 2026-10-10, ruling-02-inspect-fixes.md.)
- After 03: ignore an older ride from its card menu: only its own card changes; later cards keep colours and rank; count it
  again: back as before. A new ride never recolours an old card. Detail page: P-rank and "ON THIS ROUTE" agree.
- After 04: ACTIVITIES opens with pictures; scroll never shows a black map; toggle/day-night crossfade; airplane mode shows
  cached pictures; a LIVE map on a card (short cover) = that card's snapshot failed - report which.
