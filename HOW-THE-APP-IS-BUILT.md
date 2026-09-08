# How the app is built

**`virgin` branch — refreshed 2026-09-08 (virgin-cycle5).** One page, no code names left
unexplained. Kept up to date whenever the structure below changes — see
`process/CONVENTIONS.md` → "Nathan-facing docs." The story of *how* each part got here is in
`cycles/<name>/README.md`, not on this page.

The app folder (`app/`) has a handful of working parts, each doing one job.

**The engine** (`app/core`) is the pure timing brain. It takes a stream of GPS points,
projects them onto a way's line, detects gate crossings, and computes sector and lap times.
It has no idea about phones, screens, or storage — just numbers in, numbers out. It was
proven on `main` against the 624-ride Strava archive (same input, same answer, every time);
that archive and its tooling stay on `main`, but the engine code hasn't changed since
2026-08-14, so the proof still applies to what runs here.

**Location** (`app/src/location`) talks to Android's GPS in the background (a foreground
service, so it keeps running with the screen off) and hands each fix to the engine as it
arrives. It also plays the earcons.

**Storage** (`app/src/storage`) writes every ride's raw GPS to disk, append-only, forever —
"raw is truth": what actually happened is never edited, only ever added to; a schema change
gets a migration, never a rewrite. It also does the GPX and GPX+ export. "Reset to virgin"
(SETTINGS → DATA) moves the whole storage folder aside rather than deleting it.

**The store** (`app/src/store`) is the app's memory. It holds your sports and, for the
active sport, the catalog — landmarks, routes, the ways on each route, and each way's gate
positions — plus the derived per-ride results (lap and sector times) that ghosts and colours
are computed from, and the timing-mode rule (raw vs. moving) every score goes through. The
store starts genuinely empty everywhere — Preview, dev client, all of it — unless Nathan
opts his own Leuven seed back in with an environment flag on the dev client.

**The UI** (`app/src/ui`) is what you actually see: six tabs across the bottom —
RECORD (set up → armed → running → the finish moment, with the live map; a sport pill row on
top once you have two sports; the naming card at STOP for a ride between unknown places),
RIDES (your ride history; tap a ride for its detail screen with the sector-coloured trail),
ROUTES (your places and routes; tap one for a full-screen detail where ways can be inspected,
their gates edited on a real zoomable map, or deleted), RESULTS (a board of your ways,
most-ridden first; tap one for its ranked history and last-nine-rides scatterplot),
SETTINGS (sports, timing mode, theme, data: debug export and reset), and DEMO (an
accelerated replay of one frozen commute so the race-mode screen can be checked without
riding).

**The live engine** (`app/src/live`) is what runs *while you're riding*: it watches your
GPS fixes against every way in the catalog at once, works out which one you're actually on
(leaning on whichever you picked, but never fooled by a pick that turns out wrong — first a
soft lock, then verified once enough of the way's corridor is covered), and fires gate events
as you cross them — which is what makes the sector colours appear mid-ride instead of only at
the end. A free ride between unknown places is recorded but never locks or scores.

**Dev client vs. build.** Day to day, Nathan's phone runs a "dev client" — it streams the
latest code straight from the PC over the same WiFi (this is "Fast Refresh"), so most changes
show up within a second or two, no reinstall needed. A "build" — a real new APK — is only
needed when something *native* changes, like the map module. The standalone build is
"Qualifire Preview": it runs without the PC, and since build 7 (virgin-cycle4) it is
permanently blank on first launch — no sports, no places, nobody's data — so it is the
install a stranger gets. Build scripts live in `scripts/` and run on Nathan's PC.
