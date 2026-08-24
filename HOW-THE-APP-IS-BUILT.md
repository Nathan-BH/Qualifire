# How the app is built

**Updated 2026-08-24, after cycle 024.** One page, no code names left unexplained. Kept
up to date whenever the structure below changes — see `process/CONVENTIONS.md` →
"Nathan-facing docs."

The app folder (`app/`) has a handful of working parts, each doing one job.

**The engine** (`app/core`) is the pure timing brain. It takes a stream of GPS points,
projects them onto a route line, detects gate crossings, and computes sector and lap
times. It has no idea about phones, screens, or storage — just numbers in, numbers out
— which is what makes it provable: it has been checked against a large batch of
archive rides and produces the same answer every time for the same input.

**Location** is the piece that talks to Android's GPS in the background (a foreground
service, so it keeps running with the screen off) and hands each fix to the engine as
it arrives.

**Storage** writes every ride's raw GPS to disk, append-only, forever — "raw is truth":
what actually happened is never edited, only ever added to. It also does the GPX and
GPX+ export (GPX+ is a GPX file with an extra block of diagnostic information — gate
times, route lock, GPS outages — bolted on for troubleshooting, never for the timing
itself).

**The store** (`app/src/store`) is the app's catalog and results memory. It holds the
list of your landmarks, ways and routes and their gate positions (the catalog), plus
the derived per-ride results — lap and sector times — that ghosts and colours are
computed from. When someone on the team says "the store," this catalog-and-results
layer is what they mean.

**The UI** (`app/src/ui`) is what you actually see: six tabs across the bottom —
Record (start and run a ride, with the live map), Rides (your ride history), Routes
(your places and ways), Result (your last ride's board and Personal Bests), Settings,
and Demo. Record itself is a small flow inside one screen: set up → armed → running →
the finish moment.

**The live engine** (`app/src/live`) is what runs *while you're riding*: it watches
your GPS fixes against every route in the catalog at once, works out which one you're
actually on (leaning on whichever one you picked, but never fooled by a pick that
turns out wrong), and fires gate events as you cross them — which is what makes the
sector colours appear mid-ride instead of only at the end.

**Dev client vs. build.** Day to day, your phone runs a "dev client" — it streams the
latest code straight from the PC over the same WiFi (this is "Fast Refresh"), so most
changes show up on your phone within a second or two, no reinstall needed. A "build" —
a real new APK — is only needed when something *native* changes, like the map module.
The current build is a rebuildable "Qualifire Preview" standalone APK that can run
without the PC at all, alongside the dev client.

**Mockup vs. app.** `demos/mockup.html` is a browser prototype: a design reference that
mirrors what the app looks like, built to try out screen ideas quickly. It is never the
real app — nothing you do in the browser mockup touches your real rides, your real GPS,
or your real data.
