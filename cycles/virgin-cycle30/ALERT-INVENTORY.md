# Alert inventory (2026-10-10)

All 50 Alert.alert popups in the Qualifire app with their exact title and body text (runtime values filled with samples). Purpose: Nathan marks each Keep / Remove / Replace / Merge before a themed in-app dialog is built. Error bodies show example messages; real text is whatever the failing step reports.

| ID | file:line | kind | title | body | buttons | suggested |
|---|---|---|---|---|---|---|
| P01 | catalogDeleteActions.ts:34 | error | Could not delete | landmarks p3 and p7 overlap: 12 m apart, radii 30 + 30 m | OK | Consolidate: one shared themed error dialog |
| P02 | catalogDeleteActions.ts:49 | confirm | [2a way] Delete "Fast" on Home → Work?<br>[2b route] Delete the route Home → Work?<br>[2c place] Delete "Park"? | [2a way] This is the only way on Home → Work, so the route is removed too.<br>Its gates and reference line go with it. 3 scored activities on this way will be re-matched against your other ways; the activity recordings themselves are kept.<br>Home is no longer used by any route and will be removed as places.<br><br>[2b route] 2 ways, its gates and reference lines go with it. 5 scored activities will be re-matched against your other ways; the activity recordings themselves are kept.<br>Home is no longer used by any route and will be removed as places.<br><br>[2c place] This place is no longer used by any route. | Cancel / Delete (destructive) | Keep (destructive confirm) |
| P03 | CatalogDetailScreen.tsx:121 | error | Could not rename | A place called "Home" already exists | OK | Consolidate: one shared themed error dialog |
| P04 | CatalogDetailScreen.tsx:123 | error | Could not rename | landmarks p3 and p7 overlap: 12 m apart, radii 30 + 30 m | OK | Consolidate: one shared themed error dialog |
| P05 | CatalogDetailScreen.tsx:133 | error | Could not merge | ways "Fast" on Home → Work would exist twice after the merge (w4 and w9) — rename or delete one of them first | OK | Consolidate: one shared themed error dialog |
| P06 | CatalogDetailScreen.tsx:141 | confirm | Merge "Park" into "Home"? | 2 routes from or to "Park" will use "Home" instead, and "Park" is removed.<br>1 route becomes the same as an existing one and folds into it — its ways, gates, reference lines and results are kept.<br>1 route becomes a loop.<br>Ride recordings are never touched. | Cancel / Merge (destructive) | Keep (destructive confirm) |
| P07 | CatalogDetailScreen.tsx:149 | error | Could not merge | landmarks p3 and p7 overlap: 12 m apart, radii 30 + 30 m | OK | Consolidate: one shared themed error dialog |
| P08 | CatalogDetailScreen.tsx:168 | error | Could not rename | "Fast" is already a way on this route | OK | Consolidate: one shared themed error dialog |
| P09 | CatalogDetailScreen.tsx:170 | error | Could not rename | landmarks p3 and p7 overlap: 12 m apart, radii 30 + 30 m | OK | Consolidate: one shared themed error dialog |
| P10 | GateAdjustScreen.tsx:60 | confirm | [with activities (n=3)] Move the gates of "Fast"?<br>[no activities (n=0)] Move the gates of "Fast"? | [with activities (n=3)] Its 3 timed activities are re-timed from the recordings against the new gates — old times and ranks do not survive, the activities do. The reference activity is kept and re-timed too, so it still races you as a dot. Recordings are never touched.<br><br>[no activities (n=0)] There are no timed activities on this way yet. The reference activity is kept and re-timed too, so it still races you as a dot. Recordings are never touched. | Cancel / Save & re-time (destructive) | Keep (destructive confirm) |
| P11 | GateAdjustScreen.tsx:75 | error | Could not save the gates | gate 2 at 340 m is not on the line or not after gate 1 | OK | Consolidate: one shared themed error dialog |
| P12 | GateAdjustScreen.tsx:88 | info | Gates saved — reference not re-timed | The gates are saved, but this way's reference activity could not be timed against them (its recording is missing or unreadable), so it will not race you as a dot. | OK | Replace: yellow button sub-label instead |
| P13 | GateAdjustScreen.tsx:96 | error | Could not save the gates | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P14 | RecordScreen.tsx:688 | error | Could not check permissions | Location services are disabled | OK | Consolidate: one shared themed error dialog |
| P15 | RecordScreen.tsx:743 | error | Could not start tracking | Location services are disabled | OK | Consolidate: one shared themed error dialog |
| P16 | RecordScreen.tsx:850 | error | Could not stop cleanly | Location services are disabled | OK | Consolidate: one shared themed error dialog |
| P17 | RecordScreen.tsx:955 | error | Could not create the route | start and end cannot share a name | OK | Consolidate: one shared themed error dialog |
| P18 | RecordScreen.tsx:973 | error | Could not create the route | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P19 | RecordScreen.tsx:998 | error | Could not save the gates | gate 2 at 340 m is not on the line or not after gate 1 | OK | Consolidate: one shared themed error dialog |
| P20 | RecordScreen.tsx:1013 | error | Could not save the gates | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P21 | RecordScreen.tsx:1029 | confirm | Discard activity? | This stops recording and permanently removes the raw trace. Nothing is saved. | Cancel / Discard (destructive) | Keep (destructive confirm) |
| P22 | RecordScreen.tsx:1043 | error | Could not stop cleanly | Location services are disabled | OK | Consolidate: one shared themed error dialog |
| P23 | RecordScreen.tsx:1078 | error | Could not discard | Permission denied: could not write file<br>The activity was ended and kept instead — you can delete it from ACTIVITIES. | OK | Consolidate: one shared themed error dialog |
| P24 | rideActions.ts:32 | confirm | Delete activity? | 9 Oct, 08:12 · 24m05s<br>This permanently removes the raw trace. | Cancel / Delete (destructive) | Keep (destructive confirm) |
| P25 | rideActions.ts:48 | error | Could not delete | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P26 | rideActions.ts:63 | error | Could not update | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P27 | rideActions.ts:75 | info | Exported | 20261009-0812.gpx saved to the folder you picked. | OK | Replace: drop it, OS sheet/folder picker already confirms |
| P28 | rideActions.ts:77 | info | Shared | GPX sent as text via the share sheet. | OK | Replace: drop it, OS sheet/folder picker already confirms |
| P29 | rideActions.ts:80 | error | Export failed | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P30 | RideDetailScreen.tsx:274 | info | That way already exists | Pick it on RECORD next time instead of adding it again. | OK | Replace: inline text instead |
| P31 | RideDetailScreen.tsx:281 | error | Could not create the route | start and end cannot share a name | OK | Consolidate: one shared themed error dialog |
| P32 | RideDetailScreen.tsx:295 | error | Could not create the route | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P33 | RideDetailScreen.tsx:338 | error | Could not save the gates | gate 2 at 340 m is not on the line or not after gate 1 | OK | Consolidate: one shared themed error dialog |
| P34 | RideDetailScreen.tsx:347 | error | Could not save the gates | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P35 | RideDetailScreen.tsx:383 | error | Could not set the reference | no reference line can be built from this activity (recording unreadable, or under 200 m) | OK | Consolidate: one shared themed error dialog |
| P36 | RideDetailScreen.tsx:396 | error | Could not set the reference | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P37 | RideDetailScreen.tsx:409 | confirm | [with past results (n=4)] Overwrite the reference of "Fast"?<br>[no past results (n=0)] Overwrite the reference of "Fast"? | [with past results (n=4)] This way will be overwritten and past ghosts will be lost.<br><br>Its reference line and gates are rebuilt from this activity (9 Oct 08:12). Its 4 past results are discarded and re-timed from the recordings against the new reference — old times and ranks do not survive. Activity recordings are kept.<br><br>[no past results (n=0)] This way will be overwritten and past ghosts will be lost.<br><br>Its reference line and gates are rebuilt from this activity (9 Oct 08:12). There are no past results on this way yet. Activity recordings are kept. | Cancel / Overwrite (destructive) | Keep (destructive confirm) |
| P38 | RidesScreen.tsx:80 | error | Could not load activities | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P39 | settings.tsx:265 | info | Nothing to export yet | No places, routes or reference lines on this phone yet. | OK | Replace: grey out the button instead |
| P40 | settings.tsx:284 | info | Exported | qualifire-export.json saved to the folder you picked. | OK | Replace: drop it, OS sheet/folder picker already confirms |
| P41 | settings.tsx:285 | info | Exported | qualifire-export.json sent as text via the share sheet. | OK | Replace: drop it, OS sheet/folder picker already confirms |
| P42 | settings.tsx:287 | error | Export failed | Permission denied: could not write file | OK | Consolidate: one shared themed error dialog |
| P43 | settings.tsx:340 | info | Reset done | Qualifire is back at its first launch. Close it fully and reopen it to see the launch animation and a clean RECORD tab.<br>Your old data is in <documents>/qualifire-old-20261010 on the phone. | OK | Keep (instructs restart) |
| P44 | settings.tsx:348 | error | Reset failed | Permission denied: could not write file<br>Your old data was moved aside to <documents>/qualifire-old-20261010, but finishing the reset failed. Restart the app. | OK | Consolidate: one shared themed error dialog |
| P45 | settings.tsx:357 | info | An activity is being recorded | Stop it on the RECORD tab first. | OK | Replace: disable the Reset button instead |
| P46 | settings.tsx:366 | confirm | Reset app? | 42 activities, 6 places, 9 routes, 11 ways, every sport and every result will be moved out of the app. Your settings and theme stay. Export anything you want to keep first (ACTIVITIES → Export GPX+, or Export app above). | Cancel / Continue… | Keep (destructive confirm) |
| P47 | settings.tsx:374 | confirm | Really reset? | This cannot be undone from inside the app. | Cancel / Reset (destructive) | Keep (destructive confirm) |
| P48 | settings.tsx:455 | error | Cannot delete | sport "walk" has 3 routes · 12 activities — delete those first | OK | Consolidate: one shared themed error dialog |
| P49 | settings.tsx:460 | error | Cannot delete | sports.json could not be read at boot — not saved | OK | Consolidate: one shared themed error dialog |
| P50 | settings.tsx:468 | confirm | Delete "Walk"? | This cannot be undone from inside the app. | Cancel / Delete (destructive) | Keep (destructive confirm) |

How to use: open popup-gallery.html (same folder) in a browser, see each popup, mark Keep / Remove / Replace / Merge, then press "Copy my decisions". Suggested tags are the coordinator's first pass, not decisions. The mock-up is not in the app.
