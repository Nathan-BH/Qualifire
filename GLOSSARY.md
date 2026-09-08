# Glossary

**`virgin` branch — refreshed 2026-09-08 (virgin-cycle5).** Plain 1–3 sentence definitions,
no bare IDs. These are the words used in chat with Claude — if a term shows up in
conversation and isn't here, that's a gap worth flagging. Updated whenever the vocabulary
changes — see `process/CONVENTIONS.md` → "Nathan-facing docs."

**Two words swapped on 2026-09-06 (WP-3, virgin-cycle3):** "route" and "way" now mean the
opposite of what they meant before. Anything dated earlier — old briefs, old comments, the
`legacy-virgin` branch — uses the old meanings. The definitions below are the current ones.

**Route.** The from→to path between two landmarks — home to work, say — ridden in one
direction only. A route is the parent: it groups every way you've ridden it by.

**Way.** One particular way of riding a route — its own line on the map, its own gates, its
own history, ghosts and personal bests, and optionally a spec like "Dry" or "Fast". One route
can have several ways ("multiple ways to take the same route"). Everything that gets timed
and scored is tied to a way, not a route.

**Landmark.** A named place in your catalog — home, work, a station — that a route runs
between.

**Sport.** A category you name yourself — bike, e-bike, run, walk. Every landmark, route,
way, ride and result belongs to exactly one sport, and the app shows one *active* sport at a
time: switch it in SETTINGS → Sports, or with the pill row at the top of RECORD (shown only
with 2+ sports and the SETTINGS "Sport picker on RECORD" toggle on — on by default). A
fresh install has no sports at all until you name one,
and RECORD says so instead of recording.

**Ghost.** The past version of yourself the app is comparing you against right now — your
own recent rides on that way, not a stranger and not a made-up number.

**Gate.** An invisible line drawn across the road at a fixed spot. The moment your GPS
trace crosses it, that's a timed event — the start, end, or boundary of a sector.

**Sector.** One stretch of a way between two gates. A ride's lap time is really four sector
times added together, and each one gets its own colour.

**Tier (purple / green / yellow).** How a sector's colour is decided. Purple beats the best
of your recent comparable rides on that way (the window is the last 9 plus today's). Green
beats their average. Yellow — the app's neutral, default colour — just means the sector
happened, honestly reported: not a warning, not a failure. Gate markers themselves never
change colour; only sectors do.

**Tower.** The live scoreboard that lists every sector's time and colour as it happens,
mid-ride — built to be readable at a glance, like a race timing tower.

**Reference ride.** The ride a way's official line and gates are built from. On a blank
install the first ride you save on a new route becomes its way's reference automatically;
the gates are seeded from it at 25/50/75 % of the distance and you can nudge them.

**Lock (soft / verified).** The moment the live commmits to the way you're riding.
Before lock it's still gathering evidence: no lock of any kind until a way has about 400 m
of corridor-verified travel behind it. If you picked a way on RECORD, that pick is the only
way the ride can ever lock. A *soft* lock (pick rides only) comes as soon as the picked way
has its 400 m: from then on it is shown on screen **and** scored — sector colours, the
tower, everything — exactly as a verified lock would be; the only difference is that the
engine hasn't yet confirmed it as the clear leader over every other way it watches, and the
screen says so. Once it is, the lock is promoted to *verified* with no second lock event.
Without a pick there's no soft stage — the clear leader locks verified straight away. A
lock never switches to another way, however far ahead one pulls; leaving the picked road
scores as missed sectors on the pick. A free ride never locks.

**Free ride ("new>>new").** A ride whose start and end match no landmark you know. The app
records it and shows nothing to compare against — no reference line, no colours — and at
STOP offers to name the two places, which turns the ride into a real route + way with that
ride as its reference.

**Results board / scatterplot.** The RESULTS tab: a board of your ways, most-ridden first;
tap one for its all-time ranked history (fastest first) and a plot of your last nine rides
on it — faster is higher, each dot purple/green/yellow against the window's average.

**Timing mode (raw vs. moving).** *Raw* is wall-clock time from gate to gate — red lights
count, luck counts. It's the default. *Moving* removes the time you spent stopped. SETTINGS →
Timing; colours, ranks and the tower all follow whichever is set.

**Earcon.** A short sound the app plays instead of a visual alert, so you don't have to
look at the phone while riding — one buzz, distinct tones for distinct meanings.

**Fix.** One GPS reading — a single point (with a timestamp, position and accuracy) in the
stream location hands to the engine. An internal diagnostics word; it doesn't appear in the
app.

**GPX and GPX+.** GPX is the standard file format for a GPS track — most fitness apps can
read it. GPX+ is the same file with an extra block of diagnostic information bolted on (gate
times, lock, GPS outages) — useful for troubleshooting, never used for the actual timing.
Shared per ride from RIDES; SETTINGS → DATA can also share the catalog and reference-line
files ("debug export") so a problem can be looked at off the phone.

**Paddock vs. race mode.** Two visual moods the app switches between automatically. Paddock
is the everyday browsing look (warmer, livelier) for RIDES, ROUTES, RESULTS, SETTINGS. Race
is what RECORD switches to once you're riding — near-black or bright white depending on
your theme, chrome stripped away, so nothing but the numbers and colours competes for your
glance.

**The store.** The part of the app (`app/src/store`) that holds your catalog — sports,
landmarks, routes, ways, gates — plus every ride's derived results. When someone says "the
store," this is what they mean.

**Reset to virgin.** SETTINGS → DATA. Moves the phone's entire Qualifire storage folder
aside to a timestamped sibling (nothing is deleted), keeps your theme and settings, and
starts the app again empty. Refused while a ride is recording; two-step confirm.

**Dev client vs. build.** The dev client streams the latest code from the PC to your phone
over WiFi — most changes show up in a second or two, no reinstall. A "build" is a real new
install (APK) — only needed when something native changes, like the map.

**Preview (the blank-seed build).** "Qualifire Preview" is the standalone APK that runs
without the PC. Since build 7 it is permanently blank on first launch — no sports, no
places, no routes, nobody's data — which makes it the install you hand to someone else.
The dev client is blank by default too; Nathan's own Leuven data only appears when he
opts in with an environment flag before starting it.

**`legacy-virgin`.** A git branch frozen at the last commit before WP-3 swapped "route" and
"way" (2026-09-06). Old names, old export format, old seed files — check it out if the
old shape is ever needed. `main` is a separate, older freeze: the original archive-powered
personal app.
