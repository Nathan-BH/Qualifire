# Commands — publish all nine cycle27 briefs to the Preview app (2026-10-09)

What this publishes: the whole working tree as one over-the-air update to "Qualifire Preview". JS-only, inspected (966 tests, 0 fail, tsc clean). Nothing is committed yet.

What you will see on the phone:
1. Tier colours: ONE palette day + night: purple #7B3FA8, green #007A00, yellow = brand #F5C542; white text on purple chips. (Settings -> sector colours ON to see them on map lines.)
2. RECORD slogan: "same route · new meaning".
3. Tab MAP is now ROUTES; detail back button reads BACK.
4. Activity cards: nothing negative (no "missed" / "GPS gap" / "Interrupted"); unranked shows duration + "Not ranked".
5. Current sector breathes on the live strip (phone ride).
6. RECORD: the auto-start toggle in Settings and the pill checkmark are gone; START / GOING TO are picked smartly, still changeable by tap.
7. REPLAY and DEMO get a 1x speed (REPLAY 1/5/10/25, DEMO 1/5/15/25).
8. ROUTES tab map: +, -, FIT/ME, rotate, blue dot, ME goes to last known location. The north arrow is gone on all maps; FIT squares north.
9. All maps edge to edge, including the gate editor.

## 1. Dry run (publishes nothing)
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```

## 2. Publish
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -Message "cycle27: final tier colours, ROUTES tab, smart record pairing, map controls + dot, edge-to-edge maps, replay 1x"
```

## 3. On the phone
Open the app on network, close it fully, open it again (two launches is normal). Check: both themes' colours, ROUTES tab map (dot, ME, FIT), the gate editor map edge to edge with buttons fully visible, a ride's activity card, REPLAY 1x.

## Known minor notes from inspection (not blocking)
- RECORD cold launch: if detection finishes before ride history loads, GOING TO keeps its default until you tap.
- A top destination not offered at the start does not light a GOING TO pill.
- The new 1x clock test would pass even if 1x were removed.
- Reduce-motion is read only when the breathing slot mounts.

## Added after the first publish (2026-10-09 08:xx)
- Reference-route (neutral) activity and sector times: brand yellow in day mode (commit 4836ff7).
- Map white flash on tab switch: map style cached for the session (one native map start per mount) + a themed cover that fades out once the map has drawn (day and night). Same two commands as above publish it. On the phone: switch RECORD / ACTIVITIES / ROUTES in night mode and check for the white flash; report if it persists (the cover can't be proven headlessly). Known limits: offline the cover can hold up to 5 s; a day/night flip still restarts the map twice.
