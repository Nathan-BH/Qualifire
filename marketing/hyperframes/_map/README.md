# _map — basemap capture for the product scenes

Not a composition. `map-capture.html` renders the app's own OpenFreeMap **dark** style in Chrome
(MapLibre GL JS from the jsdelivr CDN) at exactly the framing the three product scenes use, and saves the
canvas as `map.png` (3840×2160). `start-ride/`, `gates-saving/` and `ranking/` each need a copy of that
PNG next to their `index.html`; they draw the route, gates and rider on top of it as SVG — the same idea
as the app's PNG fallback map (`PngWayMap`).

Framing contract (the only thing that keeps the overlay on the roads): centre lon 4.663233 / lat 50.84662,
zoom 13.4, 1920×1080, no bearing, no pitch — hard-coded identically in `map-capture.html` and the three
`index.html` files. The yellow line drawn over the map in the capture page is the alignment check.

Route: `data/activities/TEST in virgin-app rides/qualifire-20260903/qualifire-20260903-1828.gpx`
(Leuven, 5.8 km, 2026-09-03). Attribution required and shown in the videos:
"© OpenStreetMap contributors · OpenFreeMap".

## Run it (once, on Nathan's PC)

1. Double-click `map-capture.html` (opens in Chrome; it needs internet for tiles).
2. Wait for **READY — tiles loaded**. Check the yellow route follows the roads.
3. Click **Download map.png** → lands in `Downloads`.
4. Copy it into the three scene folders (PowerShell, from anywhere):
   ```powershell
   $src = "$env:USERPROFILE\Downloads\map.png"
   $hf  = "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes"
   foreach ($c in 'start-ride','gates-saving','ranking') { Copy-Item $src (Join-Path $hf "$c\map.png") -Force }
   ```
5. Render — see `../COMMANDS.md` ("The three product scenes").

If step 1 shows only a black square / an ERROR line (Chrome refusing the CDN or tiles from a `file://` page),
serve the folder instead:
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\hyperframes\_map"
python -m http.server 8123
```
then open http://localhost:8123/map-capture.html and continue from step 2.

To switch to the day look, change `STYLE` in `map-capture.html` to the `positron` URL, re-download, re-copy.

## Why map-capture.html never had the drifting-route bug (2026-09-10)

The two route-candidate previews (`route-current_0903-1828.html`, `route-alt-wet-loop_0904-2144.html`) originally
drew the route the same way `map-capture.html` does: the pixel-space `ROUTE` string written once into a fixed SVG
`<polyline>` laid over the map. That only lines up at the initial view. `map-capture.html` is `interactive: false`
— its map can never pan or zoom after load, so the one-time overlay is always correct there. The previews are
`interactive: true` by design (they exist to be panned/zoomed), so the first scroll moved the map canvas and left
the SVG behind. Fix (2026-09-10): the previews now unproject `ROUTE` to lon/lat once at construction and add it as
a native MapLibre GeoJSON source with two `line` layers (casing #14120C/10px, core #F5C542/6px), which MapLibre keeps
registered under any pan/zoom. `map-capture.html` keeps its static overlay on purpose: the overlay is an alignment
check that must NOT end up in the captured PNG, and a non-interactive map cannot drift.
