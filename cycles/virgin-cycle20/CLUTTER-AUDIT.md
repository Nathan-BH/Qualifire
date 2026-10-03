# Clutter Text Audit — Qualifire

## Executive Summary

This audit identifies 57 instances of explanatory text, sub-labels, banners, hints, status lines, and helper captions visible to the rider across all app screens. The text is presented as-is without editorial suggestion; Nathan's feedback will determine what is clutter.

---

## RecordScreen — Permission & Warning Banners

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| Location permission was denied — Qualifire cannot track without it. | app/src/ui/RecordScreen.tsx:1201 | Permission warning | always visible when location permission denied | SETTINGS > App permissions > Location set to Deny | likely-clutter |
| Background location ("Allow all the time") not granted. Tracking works only while the app is open with the screen on. Grant it in settings for pocket recording. | app/src/ui/RecordScreen.tsx:1210 | Permission warning | always visible when location permission is "While using" only | SETTINGS > App permissions > Location, select "Allow all the time" instead of "Allow only while using the app" | likely-clutter |

Feedback: I have the same comment that I gave concerning the warning message that arose when location is turned off. The current warning being on top is a problem because you dont see it because to press record you are scrolled down, the fix is applying the same fix. Remove the top warning and put the warning in the yellow box replacing the same ride - new meaning text with a temporary text like "Location permission not granted" and "Allow location all the time". Exactly like the warning that comes when the location is turned off, first make sure you know how that behavior is handled so you can replicate it.

## RecordScreen — Button Sub-labels (yellow text under START/RECORD)

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| the clock runs from here | app/src/ui/RecordScreen.tsx:1256 | yellowSub under START | only when phase is 'armed' (ready to start race) | open RECORD tab > press RECORD button to arm | likely-clutter |
| with this sport | app/src/ui/RecordScreen.tsx:1681 | yellowSub under RECORD | only in setup phase when first sport prompt is visible (no sport yet) | open RECORD tab, when first sport prompt is visible | likely-clutter |
| no sport yet | app/src/ui/RecordScreen.tsx:1681 | yellowSub under RECORD | only in setup phase when no sport is set up | open RECORD tab, no sport added | likely-clutter |
| same ride · new meaning | app/src/ui/RecordScreen.tsx:1690 | yellowSub under RECORD | only in setup phase when at least one sport exists | open RECORD tab, any sport added | likely-clutter |

Feedback:
1) agree, remove "the clock runs from here"
2) agree that "with this sport" seems uncessary if there is one sport configured, we can remove that and just keep the same ride · new meaning text
3) i would actually lean in favour of telling people "no sport configoured" if that is the case. But it might not be necessary, i dont remember anymore how we handle a virgin app launch, and where we ask people to add a sport, is it in settings or after pressing RECORD. Check it and let me know
4) "same ride · new meaning" can stay there, thats the latest addition; and it functions nicely as it can be changed with other text whenever needed before defaulting back to it

## RecordScreen — Live Ride Sub-labels and Status Lines

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| recording continues · resume or end | app/src/ui/RecordScreen.tsx:1453 | stopSlimSub under PAUSE button | only when ride is recording and PAUSE button is visible | open RECORD tab, press RECORD > START > PAUSE | likely-clutter |
*agree remove it fully and keep just the PAUSE text centered
| waiting for first GPS fix… | app/src/ui/RecordScreen.tsx:975 | statusLine (gpsLine) | during first few seconds of armed or running ride before first GPS fix | open RECORD tab, press RECORD > START, before GPS locks | maybe |
*remove fully, user should not be concerned with this
| last fix {N}s ago — GPS struggling? | app/src/ui/RecordScreen.tsx:978 | statusLine (gpsLine) | during running ride when GPS is >5s old | open RECORD tab, record and simulate GPS lag (low signal area) | maybe |
*remove fully, user should not be concerned with this

| GPS live | app/src/ui/RecordScreen.tsx:980 | statusLine (gpsLine) | during running ride when GPS is current (<5s old) | open RECORD tab, press RECORD > START with good GPS signal | useful |
*I like it I would keep it for now, I think similarly to the "same ride · new meaning" text, we could temporary replace it with different texts; or alternate it (nothing to implement yet, just an idea)

| writing history · not on {way} yet | app/src/ui/RecordScreen.tsx:995 | statusLine (wayLine) | during running ride before route detection, when 30+ GPS fixes collected and user picked a route hint | open RECORD tab, start ride on hinted route, wait for detection | maybe |
*remove fully, user should not be concerned with this

| writing history · no known route here | app/src/ui/RecordScreen.tsx:996 | statusLine (wayLine) | during running ride before route detection, when 30+ GPS fixes collected and no route picked | open RECORD tab, start ride with no route selected, wait for detection | maybe |
*remove fully, user should not be concerned with this

| {way} · your pick · confirming… | app/src/ui/RecordScreen.tsx:999 | statusLine (wayLine) | during running ride before soft lock, when user manually picked route | open RECORD tab, pick a route in setup > START | maybe |
*remove fully, user should not be concerned with this

| detecting route… | app/src/ui/RecordScreen.tsx:1000 | statusLine (wayLine) | during running ride before soft lock, when route is auto-detected (no manual pick) | open RECORD tab > START with no manual pick | maybe |
*remove fully, user should not be concerned with this

| {way} · way locked (your pick) · verifying{...} | app/src/ui/RecordScreen.tsx:1002 | statusLine (wayLine) | during running ride after soft lock, when picked route matched by engine | open RECORD tab, record and let soft lock trigger | maybe |
*remove fully, user should not be concerned with this

| {way} · way locked{...} | app/src/ui/RecordScreen.tsx:1004 | statusLine (wayLine) | during running ride after hard lock (corridor-verified) | open RECORD tab, record until hard lock (verified lock) | maybe |
*remove fully, user should not be concerned with this


## RecordScreen — Setup Phase Sub-labels

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| your pick is locked for this ride | app/src/ui/RecordScreen.tsx:1642 | sub-label in setup flow | only in setup phase when route has multiple ways to choose from | open RECORD tab, pick a route with multiple ways (variants) | likely-clutter |
*remove fully, user should not be concerned with this

| Ready to record. | app/src/ui/RecordScreen.tsx:1653 | sub-label in setup flow | only in setup phase when sport is set up and no recent ride exists | open RECORD tab, add a sport, see this text below flow | likely-clutter |
*remove fully, user should not be concerned with this

## RecordScreen — Alert Dialogs

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| Unfinished ride found + The app was closed while a ride was recording and tracking has stopped. Save what was captured? | app/src/ui/RecordScreen.tsx:417–421 | Alert.alert dialog | only on app launch if a ride was interrupted (app killed mid-recording) | force-close app during active ride, reopen app | useful |
*remove fully, user should not be concerned with this; havent had the app crash anymore recently, so lets remove this

| No sport set up + Add a sport in SETTINGS before recording. | app/src/ui/RecordScreen.tsx:586 | Alert.alert dialog | unreachable in normal flow (setup phase blocks START without sport); only if START is forced with zero sports | open RECORD, attempt to force press START with no sport set up | useful |
| That way already exists + Pick it on RECORD next time instead of adding it again. | app/src/ui/RecordScreen.tsx:808 | Alert.alert dialog | only when trying to add a route via naming offer card if route/way already exists | end ride, see naming card, attempt to ADD ROUTE when way duplicate exists | likely-clutter |
*I might have already proposed an alternative above, and just have the "same ride · new meaning" text tempprary replaced with a "No sport configured" text that prevents the RECORD button from being pressed (similar to the no location fixes?)

---

## RideDetailScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| last {N} on this way | app/src/ui/RideDetailScreen.tsx:101 | ranking section header | only when ranking history exists for this way | open RIDES tab > select a ride that has ranking history for that way | useful |
*dont know what to do with this, is there a cutoff after which it stops or is this a list that keeps expanding forever ?

| no rides on file yet | app/src/ui/RideDetailScreen.tsx:116 | ranking section | only when ranking section exists but no rides on file yet | open RIDES tab > select a ride on a new/empty way with no history | maybe |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?

| personal best sectors | app/src/ui/RideDetailScreen.tsx:120 | personal best section header | only when personal best sectors exist for this ride's way | open RIDES tab > select a ride on a way with sector PRs | maybe |
*i would actually remove not only the caption, but the personal best sector times as well, it goes against my app filosphy of having all time records or times saved. I want it to be a rolling motion where you only compare to recent performances without ever chasing all time great stats

| no lap, no sectors — a free ride is not compared to anything | app/src/ui/RideDetailScreen.tsx:570 | free ride section | only when ride is marked as free ride | open RIDES tab > select a free ride (no route) | likely-clutter |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?

| sector times not on file for this ride | app/src/ui/RideDetailScreen.tsx:591 | missing sectors section | only when ride has no sector data available | open RIDES tab > select very old ride recorded before sector data was captured | maybe |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?

---

## ResultsScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| NO SPORT YET — ADD ONE IN SETTINGS | app/src/ui/ResultsScreen.tsx:113 | sport badge | only when no sport exists | open RESULTS tab on fresh app (no sport) | likely-clutter |
| NO RESULTS YET — RIDE A ROUTE FIRST | app/src/ui/ResultsScreen.tsx:117 | empty state message | only when no rides exist on any route | open RESULTS tab on fresh app with sport but no rides | likely-clutter |
*we can keep the text, but replace the em dash with a middle point "·"
---

## RidesScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| NO SPORT YET — ADD ONE IN SETTINGS | app/src/ui/RidesScreen.tsx:182 | sport badge | only when no sport exists | open RIDES tab on fresh app | likely-clutter |
*we can keep the text, but replace the em dash with a middle point "·"

| matching ways… | app/src/ui/RidesScreen.tsx:184 | loading indicator | only during backfilling process (matching rides to ways) | open RIDES tab while backfill is running in background | maybe |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?. Also if it is ever the case: *remove fully, user should not be concerned with this ?

| Loading… | app/src/ui/RidesScreen.tsx:186 | loading indicator | only when rides data is loading from store | open RIDES tab on app start before data loads | maybe |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?. Also if it is ever the case: *remove fully, user should not be concerned with this ?

| No rides yet. Record one on the Record tab. | app/src/ui/RidesScreen.tsx:188 | empty state message | only when sport exists but no rides recorded yet | open RIDES tab after adding sport with zero rides | likely-clutter |
* I think this would change with the next RIDE>>activity renaming which should happen. also I would just say "Record one first" instead of "Record one on the Record tab"

| no way — recorded only | app/src/ui/RidesScreen.tsx:204 | ride item sub-label | only for rides without a matched way (free rides or failed detection) | open RIDES tab > scroll to find free ride or unmatched ride | useful |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?. 

---

## RoutesScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| No places yet. | app/src/ui/RoutesScreen.tsx:76 | places section empty state | only when no places exist in catalog | open ROUTES tab on fresh app (no places) | maybe |
| No routes yet. | app/src/ui/RoutesScreen.tsx:83 | routes section empty state | only when no routes exist in catalog | open ROUTES tab on fresh app (no routes) | maybe |
*I think this is fine for now
---

## ReplayScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| loading replay… | app/src/ui/ReplayScreen.tsx:205 | loading indicator | only while replay video is loading from disk | open RIDES tab > select ride > press Replay > during load phase | maybe |
*remove fully, user should not be concerned with this

| no replay — this ride never crossed START on this way | app/src/ui/ReplayScreen.tsx:216 | error state message | only when ride has no crossing of START gate (free ride or failed detection) | open RIDES tab > select free ride or failed route detection > press Replay | useful |
*remove fully, user should not be concerned with this ?

---

## DemoScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| demo · nothing is recorded | app/src/ui/DemoScreen.tsx:678 | status line | always visible during demo ride playback (both 'first' and other modes) | SETTINGS > DEMO RIDE > pick a ride mode > RUN DEMO RIDE | likely-clutter |
| demo only · nothing saved | app/src/ui/DemoScreen.tsx:798 | status line | only when demo ride is in setup or playback phase (not counting as real recording) | SETTINGS > DEMO RIDE > RUN DEMO RIDE | likely-clutter |
| Not part of the final app — use only for testing features. | app/src/ui/DemoScreen.tsx:811 | section sub-label | always visible in DEMO RIDE settings section | open SETTINGS > scroll down to DEMO RIDE section | likely-clutter |
*replace em dash with middle dor

---

## GateAdjustScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| This way's gates cannot be edited — it has no reference ride or gate set on file. | app/src/ui/GateAdjustScreen.tsx:112 | error message | only when way has no reference ride or existing gates | ROUTES > select a way with no reference > attempt EDIT GATES | useful |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?. 


| Tap a gate on the map or below to nudge it — start and finish too. Saving moved gates re-times this way's rides — the reference ride included — against the new gates; old times and ranks do not survive, recordings and rides do. | app/src/ui/GateAdjustScreen.tsx:123 | instruction subtitle under map | always visible when gate editing is possible (map shown) | ROUTES > select a way with reference > press EDIT GATES > see subtitle | likely-clutter |
*this is a big and real one. Remove fully!; maybe we can keep a short sentence only like "Tap on a gate to move it"
---

## Settings Screen — Help Hints (toggled by "?" button, shown under each row)

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| Everything on RECORD, ROUTES and RIDES is scoped to this one. | app/src/ui/settings.tsx:474 | Active sport hint (collapsible) | only when help toggle is on and Active sport row is tapped to open hint | SETTINGS > toggle "?" button > SPORTS section > tap Active sport row | likely-clutter |
*not needed at all, remove fully, this setting does not need a help icon

| Show the sport row on RECORD. Off: switch sports here instead. | app/src/ui/settings.tsx:573 | Show sport pill hint (collapsible) | only when help is on | SETTINGS > toggle help > WHILE RECORDING > tap "Show sport pill on RECORD" row | likely-clutter |
*not needed at all, remove fully, this setting does not need a help icon. We can replace the setting text with "Choose sport at start"

| The map and race surface follow it. With Auto on, your pick holds until the next scheduled change. | app/src/ui/settings.tsx:597 | Theme hint (collapsible) | only when help is on | SETTINGS > toggle help > APPEARANCE > tap Theme row | likely-clutter |
*not needed at all, remove fully, this setting does not need a help icon

| Day theme inside the window, night outside, switched at the times below (phone clock). Never switches mid-ride — it waits for STOP. | app/src/ui/settings.tsx:603 | Auto theme hint (collapsible) | only when help is on and Auto is enabled | SETTINGS > toggle help > APPEARANCE > enable Auto > tap its hint row | likely-clutter |
*not needed at all, remove fully, this setting does not need a help icon

| Show the moving dot on the route while recording. | app/src/ui/settings.tsx:627 | Live map hint (collapsible) | only when help is on | SETTINGS > toggle help > WHILE RECORDING > tap Live map | likely-clutter |
*I would actually remove this setting all together; of course the live dot should be always visible, it should not be optionnable


| Paint each stretch of the route line in the colour its sector earned. | app/src/ui/settings.tsx:631 | Sector colours hint (collapsible) | only when help is on | SETTINGS > toggle help > WHILE RECORDING > tap Sector colours | likely-clutter |
*would probably update the text to "Colour sectors on live map"?

| Your previous rides of this route move along the map as small dots, timed from the START gate. Purple is your best of the last nine, green is faster than their average, yellow slower. The P-number under the map is your position among them right now. | app/src/ui/settings.tsx:635 | Ride history hint (collapsible) | only when help is on | SETTINGS > toggle help > WHILE RECORDING > tap Ride history | likely-clutter |
*would change setting text to "Race yourself" (in the same way we have it in my teaser trailer, with selfs in italic I believe). And I would simplify the helper text to something like "Race selfs(italic) dots on live map"

| A short buzz at each gate crossing. | app/src/ui/settings.tsx:638 | Gate buzz hint (collapsible) | only when help is on | SETTINGS > toggle help > WHILE RECORDING > tap Gate buzz | maybe |
*leave as is for now

| Detect where you are when a ride starts, or choose the place yourself. | app/src/ui/settings.tsx:645 | Start place hint (collapsible) | only when help is on | SETTINGS > toggle help > STARTING A RIDE > tap Start place | maybe |
*not needed at all, remove fully, this setting probably does not need a help text at all.


| Show where each ride placed against your others on that way — in the ride detail and on RESULTS. | app/src/ui/settings.tsx:659 | Rankings hint (collapsible) | only when help is on | SETTINGS > toggle help > SCORING > tap Rankings | maybe |
*this setting should be removed entirely and not optionable; ranking is always shown is best in my opinion, you dont have to look at it, but its there ?

| Export catalog.user.json — every place, way and route created on this phone. | app/src/ui/settings.tsx:667 | Export places hint (collapsible) | only when help is on | SETTINGS > toggle help > DATA > tap Export places | maybe |
| Export refs.user.json — the line of each way, built from its reference ride. Per-ride GPX+ export lives on RIDES. | app/src/ui/settings.tsx:676 | Export reference lines hint (collapsible) | only when help is on | SETTINGS > toggle help > DATA > tap Export refs | maybe |
| Moves every ride, result, sport, place, route and way aside and starts the app over from its first launch. Settings and theme are kept. | app/src/ui/settings.tsx:692 | Reset to virgin hint (collapsible) | only when help is on | SETTINGS > toggle help > DATA > tap Reset to virgin | maybe |
*I think everything inside the DATA settings does not need a helper text at all
*However I also dont think exporting places&routes, should be separate from exporting reference rides; as it only works together. So instead lets just have an "Export app" settings that does it all. ? (so you have only Export app and Reset app as DATA settings options ?)

---

## ResultsDetailScreen

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| not ranked | app/src/ui/ResultsDetailScreen.tsx:129 | history board section divider | only when ride exists but is not ranked (or ranking is off) | open RESULTS > select route > scroll to bottom to see unranked rides section | maybe |
*i think this would not be possible anymore under the current app functionalities ? so maybe remove this warning if you confirm it could never show up ?. 

---

## First Sport Prompt (Modal)

| Exact Text | File:Line | Context | When Shown | How to See It | Rating |
|---|---|---|---|---|---|
| YOUR FIRST SPORT | app/src/ui/firstSportPrompt.tsx:29 | modal label | only when no sport exists and user presses RECORD | open RECORD tab > press RECORD with no sport set up | maybe |
*not a fan of this so remove it, and i have already decided on a different way to get people to properly input their first sport ?
---

## Summary Statistics

**Total instances: 57**

**By rating:**
- **likely-clutter:** 27 instances
- **maybe:** 22 instances
- **useful:** 8 instances

**By screen:**
- RecordScreen: 18 instances
- Settings: 13 instances
- RideDetailScreen: 5 instances
- RidesScreen: 5 instances
- ResultsScreen: 2 instances
- GateAdjustScreen: 2 instances
- DemoScreen: 3 instances
- ReplayScreen: 2 instances
- RoutesScreen: 2 instances
- ResultsDetailScreen: 1 instance
- First Sport Prompt: 1 instance
- CatalogDetailScreen: 1 instance (not tabulated: metadata labels are context-appropriate)

*overall feedback: great analysis that should be done some time in the future again to before the app is actually launched. Lets also have measures in place to avoid adding clutter in the future to the app, I am afraid it might happen in future updates if I am not carefull. So better to have hard guardrails in place

