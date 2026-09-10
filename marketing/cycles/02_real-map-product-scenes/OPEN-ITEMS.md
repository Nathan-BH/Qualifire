# Open items — cycle 02 (2026-09-10)

Judgment calls made without interrupting Nathan. He reads this whenever; nothing here needs
a reply unless he wants something different from what was picked.

## Judgment calls (flagged by the planning tier, carried into each scene's `rounds/v2/FEEDBACK.md` too)

1. **Ride choice:** `qualifire-20260903-1828.gpx` (Leuven, 5.8 km, point-to-point). Nathan said
   any real ride or a random location was fine. Any of the other five available rides works by
   re-running the GPX→frame-pixel projection; a shorter/tighter ride at a higher zoom would show
   more map detail if that's preferred.
2. **Map style:** OpenFreeMap **dark** (the app's night theme — matches the rest of the teaser's
   near-black palette). Switching to the day/positron style is a one-line change in
   `_map/map-capture.html`.
3. **Line/dot/gate scale:** the app's real phone-sized values (route 7/4px, dot r7, gate ticks
   ~7px at this zoom) scaled ×1.5 for legibility on a 1920px frame — a phone-accurate scale would
   read as hairlines on a full screen.
4. **START button placement:** centred over a dimmed map, at exactly 2x the app's real button
   dimensions. The app itself puts this button in a panel below the map, not overlaid on it —
   the overlay-on-map treatment is a video-framing choice, not a copy of the app's layout.
5. **Ranking numbers:** "Today" 16:41.3 / "Mon" 17:02.8 (realistic pace for the 5.8km reference
   ride) replacing v1's implausible 4:05.3/4:12.8 (that would be an 85 km/h average). "P1 of 2"
   became "P1 of 10" so the rank fragment and the ten-row timing tower describe the same ride
   history consistently — if Nathan would rather keep "of 2" (only one prior ride, matching the
   original tour's story), that's a small edit (change `#rank-pos` text, delete tower rows 3-10).
6. **Sector verdicts:** purple / yellow / purple / purple for the three gates-saving/ranking
   sectors — with only one prior ride on record, beating it is purple by the tier rules (no green
   is possible with a pool of one). The start/end "landmark" ring glyph on the map is invented
   (an ink-filled ring) since the app's actual saved-start/end marker wasn't part of what the
   digest step read from the app's source.
7. **OpenStreetMap/OpenFreeMap attribution** is shown on-screen (small, bottom-right) in all
   three scenes — required by the tile provider's licence for any published use of the map,
   not optional. Coordinator fix after inspection: it was originally drawn under the map's
   dimming overlay (looked washed-out); moved to draw on top so it stays legible throughout.
8. **map.png in git:** each captured basemap PNG will be a few MB, ×3 scenes. Not committed or
   ignored by this session — left for Nathan to decide (commit them so a fresh clone renders
   without re-capturing, or add `marketing/hyperframes/*/map.png` to `.gitignore`).
9. **Unverified until Nathan renders** (nothing here could be tested without a shell on his PC):
   that HyperFrames' renderer actually resolves the relative `map.png` path at render time
   (its own docs only say "missing media → wrong path", implying local media generally works);
   MapLibre GL JS's `pixelRatio: 2` option in the capture page; whether `map-capture.html` needs
   to be served over `http://localhost` rather than opened as `file://` for the CDN/tile fetch
   to work cleanly (a fallback `python -m http.server` command is in `_map/README.md` in case).
10. **Not done, deliberately:** a live elapsed-time HUD, camera pan/zoom following the rider, a
    day-theme variant of the map. None of these were part of Nathan's feedback.

## Blockers this session

**`device_bash` (the remote-devices shell to Nathan's PC) was unreachable the entire session** —
every call failed with `sandbox-helper: no Plan9 drive shares mounted under
/mnt/.virtiofs-root/shared`, from the very first attempt through the end (same failure mode
cycle 01 hit). All file read/write/edit was done through the `device_stage_files` /
`device_commit_files` / `device_list_dir` fallbacks instead — those worked throughout, including
for every file this cycle touched.

**Consequence: nothing could be rendered, previewed, or checked with `npx hyperframes` this
session.** Three things need Nathan (or a future session once `device_bash` is back):

1. **Capture the basemap** (needs Chrome + internet, ~1 minute) — double-click
   `marketing\hyperframes\_map\map-capture.html`, wait for "READY", click "Download map.png",
   then:
   ```powershell
   $src = "$env:USERPROFILE\Downloads\map.png"
   $hf  = "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
   foreach ($c in 'start-ride','gates-saving','ranking') { Copy-Item $src (Join-Path $hf "$c\map.png") -Force }
   ```
   If the capture page shows only black / an error (Chrome refusing tiles from a `file://`
   page), serve it instead — see `_map/README.md` for the one-line `python -m http.server`
   fallback.

2. **Render all three scenes:**
   ```powershell
   cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
   powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name start-ride -Render
   powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
   powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name ranking -Render
   ```
   If a preview/render shows the route on plain black instead of a map, `map.png` is missing
   from that folder — `npx hyperframes check` inside the folder will name the missing media.

3. **Copy the finished MP4s** into `<scene>\rounds\v2\<scene>_v2.mp4` for review, and leave
   feedback in each scene's `rounds/v2/FEEDBACK.md`.
