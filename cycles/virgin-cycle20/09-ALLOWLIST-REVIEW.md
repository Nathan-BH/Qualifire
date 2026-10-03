# 09 — allowlist bootstrap, 2026-10-02, HEAD ae911bb

Nathan: this file is yours from here on. LEGACY = texts still over a hard budget after brief 08 — shorten them or leave them frozen; LONG = over 40 chars, review; LITERAL = heuristic catches, glance for false positives.

```
wrote tests/ui-strings.allow.json: 467 entries, 0 banners, HEAD ae911bb, 2026-10-02
per kind: alert-body=16, alert-title=36, attr:accessibilityLabel=9, attr:hint=2, attr:label=17, attr:placeholder=3, attr:subtitle=1, literal=200, prop:empty=2, prop:notificationTitle=1, prop:text=15, prop:title=1, text=164

LEGACY (hard-rule breakers frozen at bootstrap — Nathan to shorten or accept) (33)
  src/ui/CatalogDetailScreen.tsx:137  [literal]  "{…} route{…} become{…} the same as an existing one and fold{…} into it — its ways, gates, reference lines and results are kept."  violates: em-dash
  src/ui/DemoScreen.tsx:715  [literal]  "Activity saved — {…}."  violates: em-dash
  src/ui/GateAdjustScreen.tsx:90  [alert-body]  "The gates are saved, but this way's reference activity could not be timed against them (its recording is missing or unreadable), so it will not race you as a dot."  violates: alert-words
  src/ui/GateAdjustScreen.tsx:89  [alert-title]  "Gates saved — reference not re-timed"  violates: em-dash
  src/ui/GateAdjustScreen.tsx:59  [literal]  "Its {…} timed activit{…} re-timed from the recordings against the new gates — old times and ranks do not survive, the activities do."  violates: em-dash
  src/ui/RecordScreen.tsx:1014  [alert-body]  "{…} The activity was ended and kept instead — you can delete it from ACTIVITIES."  violates: em-dash
  src/ui/RideDetailScreen.tsx:457  [alert-body]  "This way will be overwritten and past ghosts will be lost. Its reference line and gates are rebuilt from this activity ({…}). {…} Activity recordings are kept."  violates: alert-words
  src/ui/RideDetailScreen.tsx:454  [literal]  "Its {…} past result{…} discarded and re-timed from the recordings against the new reference — old times and ranks do not survive."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:631  [literal]  "Moved gates are preview-only — nothing is stored yet (B-20)."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:629  [text]  "Drag the handles — a gate IS a chainage value; the map only previews it (D-011). Proposed gates sit in measured stop_frac = 0.00 zones, median crossing speed 19–30 km/h."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:571  [text]  "MAP PREVIEW (cosmetic — D-002) · real"  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:360  [text]  "Reference defended — 15:03 stands."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:334  [text]  "best sectors, trailing 28 d — not a real lap"  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:277  [text]  "completed sectors only — no benchmark, no name, nothing upcoming (D-006)"  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:446  [text]  "mostly flat — that is correct. A month scans like the season graphic: purple visibly rare (D-008's intent made visible). No streaks, no averages. Lap tier colours the time itself (D-022): one green 14:46 pops out of a column of plain laps, like the F1 tower."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:635  [text]  "⚠ example: a gate within ~50 m of a junction exit gets this banner — "move it downstream so queues wait BEFORE the gate". None of the proposed gates trigger it."  violates: em-dash
  src/ui/preview/data.ts:423  [literal]  "(deliberately silent — a neutral lap makes no sound)"  violates: em-dash
  src/ui/preview/data.ts:456  [literal]  "estimated sector — not ranked · 16:02 elapsed · ‖ 2 stops"  violates: em-dash
  src/ui/preview/data.ts:58  [literal]  "🔊 buzz + earned tier’s sound — ‖ carries the asterisk"  violates: em-dash
  src/ui/preview/data.ts:48  [literal]  "🔊 buzz + one soft note — time posted"  violates: em-dash
  src/ui/preview/data.ts:89  [literal]  "🔊 buzz + rising arpeggio ♪ — beats 28-day best (+ PB grace note)"  violates: em-dash
  src/ui/preview/data.ts:68  [literal]  "🔊 buzz + rising fifth — beats 7-day best"  violates: em-dash
  src/ui/preview/data.ts:451  [literal]  "🔊 buzz + silence — lap estimated (gap in the trace), recorded not scored"  violates: em-dash
  src/ui/preview/data.ts:78  [literal]  "🔊 buzz + silence — recorded, not scored"  violates: em-dash
  src/ui/preview/data.ts:437  [literal]  "🔊 lap voice: rising arpeggio an octave fuller — 28-day lap best"  violates: em-dash
  src/ui/preview/data.ts:104  [literal]  "🔊 lap voice: rising fifth an octave fuller — beats 7-day lap best"  violates: em-dash
  src/ui/settings.tsx:343  [alert-body]  "Qualifire is back at its first launch. Close it fully and reopen it to see the launch animation and a clean RECORD tab. {…}"  violates: alert-words
  src/ui/settings.tsx:369  [alert-body]  "{…} activit{…}, {…} place{…}, {…} route{…}, {…} way{…}, every sport and every result will be moved out of the app. Your settings and theme stay. Export anything you want to keep first (ACTIVITIES → Export GPX+, or Export app above)."  violates: alert-words
  src/ui/settings.tsx:348  [literal]  "Nothing was moved — the reset did not start. Your data is untouched."  violates: em-dash
  src/ui/settings.tsx:340  [literal]  "There was nothing on this phone to move — it was already at first launch."  violates: em-dash
  src/ui/settings.tsx:625  [text]  "Times must be different — auto is paused until they are."  violates: em-dash
  src/ui/settings.tsx:581  [text]  "sports.json could not be read at boot — saving is disabled this session. Reset the app (DATA → Reset app) or fix the file (debug export) to recover."  violates: em-dash
  src/ui/wayMapView.tsx:1153  [text]  "MAP IMAGE FAILED — drawing the line"  violates: em-dash

LONG (>40 chars, waived with long:true — review) (59)
  src/ui/CatalogDetailScreen.tsx:137  [literal]  "{…} route{…} become{…} the same as an existing one and fold{…} into it — its ways, gates, reference lines and results are kept."  violates: em-dash
  src/ui/CatalogDetailScreen.tsx:135  [literal]  "{…} route{…} from or to "{…}" will use "{…}" instead, and "{…}" is removed."
  src/ui/CatalogDetailScreen.tsx:285  [text]  "Pick the place to keep. Every route from or to "{…}" will use it instead, and "{…}" is removed."
  src/ui/DemoScreen.tsx:807  [text]  "Not part of the final app · use only for testing features."
  src/ui/GateAdjustScreen.tsx:59  [literal]  "Its {…} timed activit{…} re-timed from the recordings against the new gates — old times and ranks do not survive, the activities do."  violates: em-dash
  src/ui/GateAdjustScreen.tsx:58  [literal]  "There are no timed activities on this way yet."
  src/ui/RideDetailScreen.tsx:454  [literal]  "Its {…} past result{…} discarded and re-timed from the recordings against the new reference — old times and ranks do not survive."  violates: em-dash
  src/ui/RideDetailScreen.tsx:453  [literal]  "There are no past results on this way yet."
  src/ui/catalogDeleteActions.ts:65  [literal]  "Its gates and reference line go with it. {…} scored activit{…} on this way will be re-matched against your other ways; the activity recordings themselves are kept."
  src/ui/catalogDeleteActions.ts:63  [literal]  "This is the only way on {…} → {…}, so the route is removed too."
  src/ui/catalogDeleteActions.ts:89  [literal]  "This place is no longer used by any route."
  src/ui/catalogDeleteActions.ts:79  [literal]  "{…} way{…}, its gates and reference line{…} go with it. {…} scored activit{…} will be re-matched against your other ways; the activity recordings themselves are kept."
  src/ui/catalogDeleteActions.ts:68  [literal]  "{…} {…} no longer used by any route and will be removed as places."
  src/ui/demoModel.ts:187  [literal]  "{…} → {…} created · {…}demo only, nothing saved"
  src/ui/demoModel.ts:336  [literal]  "{…}{…} added as a new way · demo only, nothing saved"
  src/ui/gateAdjustCard.tsx:193  [text]  "tap a gate on the map or below to nudge it"
  src/ui/mapCreditModel.ts:19  [literal]  "Esri, HERE, Garmin, © OpenStreetMap contributors"
  src/ui/mapCreditModel.ts:15  [literal]  "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"
  src/ui/preview/PreviewScreen.tsx:631  [literal]  "Moved gates are preview-only — nothing is stored yet (B-20)."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:649  [literal]  "Sector medians for this track land with the B-19 rerun."
  src/ui/preview/PreviewScreen.tsx:648  [text]  "Benchmarks start colouring after 5 clean rides (D-008 warm-up)."
  src/ui/preview/PreviewScreen.tsx:629  [text]  "Drag the handles — a gate IS a chainage value; the map only previews it (D-011). Proposed gates sit in measured stop_frac = 0.00 zones, median crossing speed 19–30 km/h."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:242  [text]  "arms the gates · screen goes inert while moving"
  src/ui/preview/PreviewScreen.tsx:334  [text]  "best sectors, trailing 28 d — not a real lap"  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:277  [text]  "completed sectors only — no benchmark, no name, nothing upcoming (D-006)"  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:390  [text]  "lap moving time · last 28 rides · dashed = ref 15:03"
  src/ui/preview/PreviewScreen.tsx:446  [text]  "mostly flat — that is correct. A month scans like the season graphic: purple visibly rare (D-008's intent made visible). No streaks, no averages. Lap tier colours the time itself (D-022): one green 14:46 pops out of a column of plain laps, like the F1 tower."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:281  [text]  "real app: zero touch targets while moving. Final gate pushes the board automatically."
  src/ui/preview/PreviewScreen.tsx:366  [text]  "▶ demo: board after an armed quali attempt (D-021)"
  src/ui/preview/PreviewScreen.tsx:635  [text]  "⚠ example: a gate within ~50 m of a junction exit gets this banner — "move it downstream so queues wait BEFORE the gate". None of the proposed gates trigger it."  violates: em-dash
  src/ui/preview/data.ts:423  [literal]  "(deliberately silent — a neutral lap makes no sound)"  violates: em-dash
  src/ui/preview/data.ts:456  [literal]  "estimated sector — not ranked · 16:02 elapsed · ‖ 2 stops"  violates: em-dash
  src/ui/preview/data.ts:157  [literal]  "home → work · 5.7 km · 4 sectors · ref 15:03"
  src/ui/preview/data.ts:428  [literal]  "moving · +0:16 vs ref · 15:34 elapsed · ‖ 1 stop"
  src/ui/preview/data.ts:470  [literal]  "moving · −0:11 vs ref · 15:03 elapsed · ‖ 1 stop"
  src/ui/preview/data.ts:414  [literal]  "moving · −0:17 vs ref · 15:12 elapsed · ‖ 1 stop"
  src/ui/preview/data.ts:442  [literal]  "moving · −0:32 vs ref · 14:44 elapsed · 0 stops"
  src/ui/preview/data.ts:158  [literal]  "work → home · 5.6 km · 4 sectors · ref 15:12"
  src/ui/preview/data.ts:159  [literal]  "work → home · 5.8 km · 4 sectors · ref 15:48"
  src/ui/preview/data.ts:58  [literal]  "🔊 buzz + earned tier’s sound — ‖ carries the asterisk"  violates: em-dash
  src/ui/preview/data.ts:89  [literal]  "🔊 buzz + rising arpeggio ♪ — beats 28-day best (+ PB grace note)"  violates: em-dash
  src/ui/preview/data.ts:68  [literal]  "🔊 buzz + rising fifth — beats 7-day best"  violates: em-dash
  src/ui/preview/data.ts:451  [literal]  "🔊 buzz + silence — lap estimated (gap in the trace), recorded not scored"  violates: em-dash
  src/ui/preview/data.ts:437  [literal]  "🔊 lap voice: rising arpeggio an octave fuller — 28-day lap best"  violates: em-dash
  src/ui/preview/data.ts:104  [literal]  "🔊 lap voice: rising fifth an octave fuller — beats 7-day lap best"  violates: em-dash
  src/ui/routeNamingCard.tsx:200  [literal]  "Scored as {…}, but no route of yours runs between these two places. Name them to make this a way of its own."
  src/ui/routeNamingCard.tsx:201  [literal]  "This activity does not match any route you have. Name its start and end to make it a real way."
  src/ui/routeNamingCard.tsx:198  [literal]  "This activity looped from and back to one new place."
  src/ui/routeNamingCard.tsx:197  [literal]  "This activity looped from and back to {…}."
  src/ui/routeNamingCard.tsx:194  [literal]  "{…} is a route you have, but this activity did not follow any of its ways. Name what made it different to save it as a new way."
  src/ui/settings.tsx:348  [literal]  "Nothing was moved — the reset did not start. Your data is untouched."  violates: em-dash
  src/ui/settings.tsx:340  [literal]  "There was nothing on this phone to move — it was already at first launch."  violates: em-dash
  src/ui/settings.tsx:339  [literal]  "Your old data is in <documents>/{…} on the phone."
  src/ui/settings.tsx:347  [literal]  "Your old data was moved aside{…}, but finishing the reset failed. Restart the app."
  src/ui/settings.tsx:503  [text]  "Add at least one sport to record. Name it what you like."
  src/ui/settings.tsx:625  [text]  "Times must be different — auto is paused until they are."  violates: em-dash
  src/ui/settings.tsx:581  [text]  "sports.json could not be read at boot — saving is disabled this session. Reset the app (DATA → Reset app) or fix the file (debug export) to recover."  violates: em-dash
  src/ui/wayMapView.tsx:190  [literal]  "https://tiles.openfreemap.org/styles/dark"
  src/ui/wayMapView.tsx:191  [literal]  "https://tiles.openfreemap.org/styles/positron"

LITERAL (tier-B catches — check each is really rider-visible; a false positive is harmless but worth knowing) (200)
  src/location/index.ts:335  [literal]  "foreground-only"
  src/location/index.ts:504  [literal]  "no-permission"
  src/location/index.ts:505  [literal]  "no-services"
  src/location/index.ts:42  [literal]  "qualifire-ride-tracking"
  src/location/index.ts:316  [literal]  "services-off"
  src/location/positionRetryPolicy.ts:69  [literal]  "app-active"
  src/location/positionRetryPolicy.ts:69  [literal]  "record-press"
  src/location/session.ts:49  [literal]  "{…}qualifire-active-ride.json"
  src/ui/CatalogDetailScreen.tsx:219  [literal]  "ROUTES FROM HERE"
  src/ui/CatalogDetailScreen.tsx:140  [literal]  "Ride recordings are never touched."
  src/ui/CatalogDetailScreen.tsx:215  [literal]  "not offered at START"
  src/ui/CatalogDetailScreen.tsx:215  [literal]  "offered at START"
  src/ui/CatalogDetailScreen.tsx:422  [literal]  "on file, not scored"
  src/ui/CatalogDetailScreen.tsx:139  [literal]  "{…} route{…} become{…} a loop."
  src/ui/CatalogDetailScreen.tsx:137  [literal]  "{…} route{…} become{…} the same as an existing one and fold{…} into it — its ways, gates, reference lines and results are kept."  violates: em-dash
  src/ui/CatalogDetailScreen.tsx:135  [literal]  "{…} route{…} from or to "{…}" will use "{…}" instead, and "{…}" is removed."
  src/ui/CatalogDetailScreen.tsx:340  [literal]  "· asks which one at START"
  src/ui/DemoScreen.tsx:715  [literal]  "Activity saved — {…}."  violates: em-dash
  src/ui/DemoScreen.tsx:715  [literal]  "Activity saved."
  src/ui/DemoScreen.tsx:191  [literal]  "demo:first-ride"
  src/ui/DemoScreen.tsx:192  [literal]  "writing history · no known route here"
  src/ui/GateAdjustScreen.tsx:59  [literal]  "Its {…} timed activit{…} re-timed from the recordings against the new gates — old times and ranks do not survive, the activities do."  violates: em-dash
  src/ui/GateAdjustScreen.tsx:58  [literal]  "There are no timed activities on this way yet."
  src/ui/GateAdjustScreen.tsx:122  [literal]  "discard nudges"
  src/ui/GateAdjustScreen.tsx:59  [literal]  "ies are"
  src/ui/RecordScreen.tsx:1268  [literal]  "Activity saved · {…}"
  src/ui/RecordScreen.tsx:1267  [literal]  "Activity saved."
  src/ui/RecordScreen.tsx:108  [literal]  "Allow location all the time"
  src/ui/RecordScreen.tsx:1526  [literal]  "DETECTED START"
  src/ui/RecordScreen.tsx:1402  [literal]  "GPS live"
  src/ui/RecordScreen.tsx:100  [literal]  "Location (GPS) is turned off"
  src/ui/RecordScreen.tsx:107  [literal]  "Location permission not granted"
  src/ui/RecordScreen.tsx:110  [literal]  "No sport configured yet"
  src/ui/RecordScreen.tsx:1529  [literal]  "START NOT DETECTED"
  src/ui/RecordScreen.tsx:1528  [literal]  "STARTING FROM"
  src/ui/RecordScreen.tsx:340  [literal]  "app-active"
  src/ui/RecordScreen.tsx:494  [literal]  "endRide: unknown"
  src/ui/RecordScreen.tsx:1344  [literal]  "post-stop"
  src/ui/RecordScreen.tsx:612  [literal]  "record-press"
  src/ui/RecordScreen.tsx:1624  [literal]  "same activity · new meaning"
  src/ui/ReplayScreen.tsx:223  [literal]  "replay over · {…}"
  src/ui/ResultsScreen.tsx:113  [literal]  "NO SPORT YET · ADD ONE IN SETTINGS"
  src/ui/RideDetailScreen.tsx:465  [literal]  "BACK TO ACTIVITIES"
  src/ui/RideDetailScreen.tsx:465  [literal]  "BACK TO RESULTS"
  src/ui/RideDetailScreen.tsx:465  [literal]  "BACK TO ROUTE"
  src/ui/RideDetailScreen.tsx:623  [literal]  "Count in ranking"
  src/ui/RideDetailScreen.tsx:616  [literal]  "Export GPX+"
  src/ui/RideDetailScreen.tsx:623  [literal]  "Ignore in ranking"
  src/ui/RideDetailScreen.tsx:454  [literal]  "Its {…} past result{…} discarded and re-timed from the recordings against the new reference — old times and ranks do not survive."  violates: em-dash
  src/ui/RideDetailScreen.tsx:272  [literal]  "Make this the reference of a new route"
  src/ui/RideDetailScreen.tsx:465  [literal]  "RECORD ANOTHER"
  src/ui/RideDetailScreen.tsx:271  [literal]  "Save as a new way on {…}"
  src/ui/RideDetailScreen.tsx:453  [literal]  "There are no past results on this way yet."
  src/ui/RideDetailScreen.tsx:226  [literal]  "rides/{…}.events.jsonl"
  src/ui/RideDetailScreen.tsx:566  [literal]  "saved as a free activity"
  src/ui/RideDetailScreen.tsx:271  [literal]  "this route"
  src/ui/RidesScreen.tsx:179  [literal]  "NO SPORT YET · ADD ONE IN SETTINGS"
  src/ui/RidesScreen.tsx:120  [literal]  "rides/{…}.events.jsonl"
  src/ui/RoutesScreen.tsx:46  [literal]  "NO SPORT YET · ADD ONE IN SETTINGS"
  src/ui/RoutesScreen.tsx:102  [literal]  "· asks which one at START"
  src/ui/RoutesScreen.tsx:62  [literal]  "· not used by {…}"
  src/ui/catalogDeleteActions.ts:70  [literal]  "Delete "{…}" on {…} → {…}?"
  src/ui/catalogDeleteActions.ts:84  [literal]  "Delete the route {…} → {…}?"
  src/ui/catalogDeleteActions.ts:65  [literal]  "Its gates and reference line go with it. {…} scored activit{…} on this way will be re-matched against your other ways; the activity recordings themselves are kept."
  src/ui/catalogDeleteActions.ts:63  [literal]  "This is the only way on {…} → {…}, so the route is removed too."
  src/ui/catalogDeleteActions.ts:89  [literal]  "This place is no longer used by any route."
  src/ui/catalogDeleteActions.ts:79  [literal]  "{…} way{…}, its gates and reference line{…} go with it. {…} scored activit{…} will be re-matched against your other ways; the activity recordings themselves are kept."
  src/ui/catalogDeleteActions.ts:68  [literal]  "{…} {…} no longer used by any route and will be removed as places."
  src/ui/demoModel.ts:206  [literal]  "demo:prior-{…}"
  src/ui/demoModel.ts:76  [literal]  "demo:today"
  src/ui/demoModel.ts:186  [literal]  "gates adjusted ·"
  src/ui/demoModel.ts:186  [literal]  "gates kept ·"
  src/ui/demoModel.ts:187  [literal]  "{…} → {…} created · {…}demo only, nothing saved"
  src/ui/demoModel.ts:336  [literal]  "{…}{…} added as a new way · demo only, nothing saved"
  src/ui/demoWayFixture.ts:19  [literal]  "demo:second-ride"
  src/ui/gateAdjustCard.tsx:202  [literal]  "KEEP GATES"
  src/ui/gateAdjustCard.tsx:202  [literal]  "SAVE GATES"
  src/ui/gateAdjustCard.tsx:143  [literal]  "Tap a gate to move it"
  src/ui/gateAdjustCard.tsx:207  [literal]  "discard nudges"
  src/ui/gateAdjustCard.tsx:81  [literal]  "gate-card"
  src/ui/lastRide.ts:269  [literal]  "index.json"
  src/ui/mapCreditModel.ts:36  [literal]  "Esri, HERE, Garmin"
  src/ui/mapCreditModel.ts:19  [literal]  "Esri, HERE, Garmin, © OpenStreetMap contributors"
  src/ui/mapCreditModel.ts:15  [literal]  "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"
  src/ui/mapCreditModel.ts:30  [literal]  "© OpenStreetMap contributors"
  src/ui/preview/PreviewScreen.tsx:406  [literal]  "Fri 15 Aug"
  src/ui/preview/PreviewScreen.tsx:631  [literal]  "Moved gates are preview-only — nothing is stored yet (B-20)."  violates: em-dash
  src/ui/preview/PreviewScreen.tsx:649  [literal]  "Sector medians for this track land with the B-19 rerun."
  src/ui/preview/PreviewScreen.tsx:284  [literal]  "■ riding…"
  src/ui/preview/PreviewScreen.tsx:284  [literal]  "▶ demo ride"
  src/ui/preview/data.ts:423  [literal]  "(deliberately silent — a neutral lap makes no sound)"  violates: em-dash
  src/ui/preview/data.ts:121  [literal]  "Campus rise"
  src/ui/preview/data.ts:120  [literal]  "Canal straight"
  src/ui/preview/data.ts:351  [literal]  "Fri 01 Aug"
  src/ui/preview/data.ts:136  [literal]  "Fri 08 Aug"
  src/ui/preview/data.ts:357  [literal]  "Fri 18 Jul"
  src/ui/preview/data.ts:135  [literal]  "Mon 11 Aug"
  src/ui/preview/data.ts:366  [literal]  "Mon 14 Jul"
  src/ui/preview/data.ts:362  [literal]  "Mon 21 Jul"
  src/ui/preview/data.ts:341  [literal]  "Mon 28 Jul"
  src/ui/preview/data.ts:385  [literal]  "NO TIME"
  src/ui/preview/data.ts:137  [literal]  "Thu 07 Aug"
  src/ui/preview/data.ts:132  [literal]  "Thu 14 Aug"
  src/ui/preview/data.ts:361  [literal]  "Thu 17 Jul"
  src/ui/preview/data.ts:338  [literal]  "Tue 05 Aug"
  src/ui/preview/data.ts:134  [literal]  "Tue 12 Aug"
  src/ui/preview/data.ts:352  [literal]  "Tue 22 Jul"
  src/ui/preview/data.ts:364  [literal]  "Tue 29 Jul"
  src/ui/preview/data.ts:119  [literal]  "Vaartdijk drag"
  src/ui/preview/data.ts:118  [literal]  "Village exit"
  src/ui/preview/data.ts:138  [literal]  "Wed 06 Aug"
  src/ui/preview/data.ts:133  [literal]  "Wed 13 Aug"
  src/ui/preview/data.ts:365  [literal]  "Wed 16 Jul"
  src/ui/preview/data.ts:342  [literal]  "Wed 23 Jul"
  src/ui/preview/data.ts:359  [literal]  "Wed 30 Jul"
  src/ui/preview/data.ts:456  [literal]  "estimated sector — not ranked · 16:02 elapsed · ‖ 2 stops"  violates: em-dash
  src/ui/preview/data.ts:157  [literal]  "home → work · 5.7 km · 4 sectors · ref 15:03"
  src/ui/preview/data.ts:400  [literal]  "mixed day"
  src/ui/preview/data.ts:428  [literal]  "moving · +0:16 vs ref · 15:34 elapsed · ‖ 1 stop"
  src/ui/preview/data.ts:470  [literal]  "moving · −0:11 vs ref · 15:03 elapsed · ‖ 1 stop"
  src/ui/preview/data.ts:414  [literal]  "moving · −0:17 vs ref · 15:12 elapsed · ‖ 1 stop"
  src/ui/preview/data.ts:442  [literal]  "moving · −0:32 vs ref · 14:44 elapsed · 0 stops"
  src/ui/preview/data.ts:421  [literal]  "ordinary day"
  src/ui/preview/data.ts:435  [literal]  "purple day"
  src/ui/preview/data.ts:463  [literal]  "quiet green"
  src/ui/preview/data.ts:449  [literal]  "scrappy day"
  src/ui/preview/data.ts:158  [literal]  "work → home · 5.6 km · 4 sectors · ref 15:12"
  src/ui/preview/data.ts:159  [literal]  "work → home · 5.8 km · 4 sectors · ref 15:48"
  src/ui/preview/data.ts:58  [literal]  "🔊 buzz + earned tier’s sound — ‖ carries the asterisk"  violates: em-dash
  src/ui/preview/data.ts:48  [literal]  "🔊 buzz + one soft note — time posted"  violates: em-dash
  src/ui/preview/data.ts:89  [literal]  "🔊 buzz + rising arpeggio ♪ — beats 28-day best (+ PB grace note)"  violates: em-dash
  src/ui/preview/data.ts:68  [literal]  "🔊 buzz + rising fifth — beats 7-day best"  violates: em-dash
  src/ui/preview/data.ts:451  [literal]  "🔊 buzz + silence — lap estimated (gap in the trace), recorded not scored"  violates: em-dash
  src/ui/preview/data.ts:78  [literal]  "🔊 buzz + silence — recorded, not scored"  violates: em-dash
  src/ui/preview/data.ts:437  [literal]  "🔊 lap voice: rising arpeggio an octave fuller — 28-day lap best"  violates: em-dash
  src/ui/preview/data.ts:104  [literal]  "🔊 lap voice: rising fifth an octave fuller — beats 7-day lap best"  violates: em-dash
  src/ui/recordFlow.ts:97  [literal]  "no-sport"
  src/ui/replayModel.ts:183  [literal]  "rides/{…}.jsonl"
  src/ui/resultsListModel.ts:262  [literal]  "ALL {…} {…} · fastest first"
  src/ui/resultsListModel.ts:263  [literal]  "ALL {…} {…} · rankings off in SETTINGS"
  src/ui/resultsListModel.ts:248  [literal]  "NO TIME"
  src/ui/resultsPlot.tsx:234  [literal]  "tap a point for that activity"
  src/ui/rideDetailModel.ts:82  [literal]  "P{…} of {…} on this way"
  src/ui/rideDetailModel.ts:86  [literal]  "no lap"
  src/ui/rideDetailModel.ts:71  [literal]  "no rank"
  src/ui/rideDetailModel.ts:86  [literal]  "no time"
  src/ui/rideDetailModel.ts:69  [literal]  "not ranked"
  src/ui/rideDetailModel.ts:84  [literal]  "too few to rank"
  src/ui/rideHistoryModel.ts:63  [literal]  "Free activity"
  src/ui/rideHistoryModel.ts:46  [literal]  "no lap"
  src/ui/rideHistoryModel.ts:231  [literal]  "– did not traverse –"
  src/ui/rideHomes.ts:72  [literal]  "index.json"
  src/ui/routeNamingCard.tsx:378  [literal]  "ADD WAY"
  src/ui/routeNamingCard.tsx:378  [literal]  "CREATE ROUTE"
  src/ui/routeNamingCard.tsx:189  [literal]  "New route"
  src/ui/routeNamingCard.tsx:189  [literal]  "New way on {…}"
  src/ui/routeNamingCard.tsx:317  [literal]  "SPECIFICATIONS (optional)"
  src/ui/routeNamingCard.tsx:317  [literal]  "SPECIFICATIONS (required)"
  src/ui/routeNamingCard.tsx:200  [literal]  "Scored as {…}, but no route of yours runs between these two places. Name them to make this a way of its own."
  src/ui/routeNamingCard.tsx:201  [literal]  "This activity does not match any route you have. Name its start and end to make it a real way."
  src/ui/routeNamingCard.tsx:198  [literal]  "This activity looped from and back to one new place."
  src/ui/routeNamingCard.tsx:197  [literal]  "This activity looped from and back to {…}."
  src/ui/routeNamingCard.tsx:194  [literal]  "{…} is a route you have, but this activity did not follow any of its ways. Name what made it different to save it as a new way."
  src/ui/routeNamingCard.tsx:250  [literal]  "· picked at START"
  src/ui/saveGpx.ts:78  [literal]  "application/octet-stream"
  src/ui/saveGpx.ts:71  [literal]  "share-text"
  src/ui/selfRaceModel.ts:332  [literal]  "rides/{…}.jsonl"
  src/ui/settings.tsx:348  [literal]  "Nothing was moved — the reset did not start. Your data is untouched."  violates: em-dash
  src/ui/settings.tsx:340  [literal]  "There was nothing on this phone to move — it was already at first launch."  violates: em-dash
  src/ui/settings.tsx:339  [literal]  "Your old data is in <documents>/{…} on the phone."
  src/ui/settings.tsx:347  [literal]  "Your old data was moved aside{…}, but finishing the reset failed. Restart the app."
  src/ui/settings.tsx:284  [literal]  "application/json"
  src/ui/settings.tsx:186  [literal]  "number-pad"
  src/ui/settings.tsx:276  [literal]  "qualifire-export"
  src/ui/settings.tsx:667  [literal]  "qualifire-export-{…}.json"
  src/ui/settings.tsx:324  [literal]  "settings.json"
  src/ui/settings.tsx:347  [literal]  "to <documents>/{…}"
  src/ui/settings.tsx:80  [literal]  "{…}settings.json"
  src/ui/theme.ts:67  [literal]  "#FAF7EE"
  src/ui/themeContext.tsx:17  [literal]  "settings.json"
  src/ui/towerModel.ts:119  [literal]  "NO TIME"
  src/ui/wayMapView.tsx:844  [literal]  "gate-selected"
  src/ui/wayMapView.tsx:845  [literal]  "gate-selected-ring"
  src/ui/wayMapView.tsx:817  [literal]  "gate-ticks"
  src/ui/wayMapView.tsx:826  [literal]  "gate-ticks-casing"
  src/ui/wayMapView.tsx:190  [literal]  "https://tiles.openfreemap.org/styles/dark"
  src/ui/wayMapView.tsx:191  [literal]  "https://tiles.openfreemap.org/styles/positron"
  src/ui/wayMapView.tsx:787  [literal]  "place-centre"
  src/ui/wayMapView.tsx:781  [literal]  "place-disc-fill"
  src/ui/wayMapView.tsx:784  [literal]  "place-disc-line"
  src/ui/wayMapView.tsx:696  [literal]  "ride-trace"
  src/ui/wayMapView.tsx:697  [literal]  "ride-trace-core"
  src/ui/wayMapView.tsx:887  [literal]  "rider-dot"
  src/ui/wayMapView.tsx:706  [literal]  "route-casing"
  src/ui/wayMapView.tsx:709  [literal]  "route-core"
  src/ui/wayMapView.tsx:770  [literal]  "sector-spans"
  src/ui/wayMapView.tsx:771  [literal]  "sector-spans-core"
  src/ui/wayMapView.tsx:864  [literal]  "self-dot"
  src/ui/wayMapView.tsx:721  [literal]  "trail-casing"
  src/ui/wayMapView.tsx:724  [literal]  "trail-core"
```
