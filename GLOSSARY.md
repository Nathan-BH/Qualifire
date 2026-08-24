# Glossary

**Updated 2026-08-24, after cycle 024.** Plain 1–3 sentence definitions, no bare IDs.
These are the words the team uses in chat with you too — if a term shows up in
conversation and isn't here, that's a gap worth flagging. Updated whenever the
vocabulary changes — see `process/CONVENTIONS.md` → "Nathan-facing docs."

**Ghost.** The past version of yourself the app is comparing you against right now —
your own recent rides on that route, not a stranger and not a made-up number.

**Gate.** An invisible line drawn across the road at a fixed spot. The moment your GPS
trace crosses it, that's a timed event — the start, end, or boundary of a sector.

**Sector.** One stretch of a route between two gates. A ride's lap time is really a
handful of sector times added together, and each one gets its own colour.

**Way vs. route.** A "way" is a physical stretch of road between two landmarks (say,
home to work) — it can be ridden in one direction only. A "route" is one particular
line drawn along a way, with its own gates and its own history. The same way can have
more than one route on it (small variations of the same commute).

**Tier (purple / green / neutral).** How a sector's colour is decided. Purple beats the
best of your last 10 comparable rides on that route. Green beats their average. Yellow
(the app's neutral, "default" colour) just means the sector happened, honestly
reported — not a warning, not a failure.

**Tower.** The live scoreboard that lists every sector's time and colour as it
happens, mid-ride — built to be readable at a glance, like a race timing tower.

**Seed ride / reference ride.** Two words for the same idea: the ride a route's
official line and benchmark are built from — the one that defines where the gates go.

**Dev client vs. build.** The dev client streams the latest code from the PC to your
phone over WiFi — most changes show up in a second or two, no reinstall. A "build" is
a real new install (APK) — only needed when something native changes, like the map.

**The store.** The part of the app (`app/src/store`) that holds your catalog —
landmarks, ways, routes, gates — plus every ride's derived results. When someone says
"the store," this is what they mean.

**Landmark.** A named place in your catalog — home, work, a station — that a way runs
between.

**Route lock.** The moment the live engine decides which route you're actually riding,
out of every route it was watching. Before lock, it's still narrowing down candidates;
after lock, sector colours and the tower are tied to that one route.

**Earcon.** A short sound the app plays instead of a visual alert, so you don't have to
look at the phone while riding — one buzz, distinct tones for distinct meanings.

**Fix.** One GPS reading — a single point (with a timestamp, position, and accuracy)
in the stream location hands to the engine. Mostly an internal diagnostics word; it's
been kept out of anything you see in the app since cycle 022.

**GPX and GPX+.** GPX is the standard file format for a GPS track — most fitness apps
can read it. GPX+ is the same file with an extra block of diagnostic information bolted
on (gate times, route lock, GPS outages) — useful for troubleshooting, never used for
the actual timing.

**Paddock vs. race mode.** Two visual moods the app switches between automatically.
Paddock is the everyday browsing look (warmer, livelier) for Rides, Routes, Result,
Settings. Race is what Record switches to once you're riding — near-black or bright
white depending on your theme, chrome stripped away, so nothing but the numbers and
colours competes for your glance.

**Mockup.** `demos/mockup.html` — a browser prototype that mirrors the app's design.
It is a design reference only, never the real app; nothing done there touches your
actual rides or data.
