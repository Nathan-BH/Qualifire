# Monday — first live-v2 commute

**Before leaving (on home WiFi):**
1. PC: `npx.cmd expo start` (or `--tunnel` if you want mid-ride crash recovery to work away from home — first run installs ngrok).
2. Phone: open Qualifire, confirm Fast Refresh picked up the new Record screen.
3. Tap **START** at the door, wait for "GPS live", pocket/mount it. Don't reload the app after this.

**Glance points (mounted or at a stop — never in traffic):**
- One small line under the clock now **rotates** every 6 s between route / fix count / GPS state (it no longer stacks three lines — IDEAS §24). A line that just *changed* holds the slot for 20 s before rotation resumes, so you can't miss the lock.
- ~400 m in: that line flips to "MORNING · route locked" and holds.
- Each gate: one short buzz, checkpoint time flashes over the lap clock ~2.5 s in its colour, strip fills a slot.
- Everything NEUTRAL, no deltas — correct by design (no benchmark store yet).
- Lap clock ticking smoothly at 0.1 s? (jank = report it)
- Final gate: LAP result appears; no position chip yet — correct (tower stub).

**At work:**
4. **STOP** — now a slim amber bar at the bottom, not the old slab (§24) → "Ride saved". Rides tab → **Export GPX** → Downloads.
5. Note battery % used.

**Back home (evening):**
6. Copy the GPX into the Qualifire project root — it ratifies route matching + the D-024 comparability tripwire, and unlocks the next cycle.
7. Tell me: clock feel, flash duration (2.5 s right?), route-lock timing, battery, anything odd.

Bonus if inclined: play `demos/earcons-audition.html` sounds on the phone speaker outdoors — B-27's wind question.
