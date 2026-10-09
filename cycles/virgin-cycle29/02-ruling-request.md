# Ruling request for Fable

You are the Plan tier. Read 00-nathan-direction.md (binding) then 01-findings-digest.md, then VERIFY the digest's key
claims against the real code (repo root = the Qualifire folder; read-only; do not change any file except writing 03-fable-ruling.md here).
Do not trust the digest where it says UNVERIFIED or where your own reading differs; say so.

## Questions to rule on
1. Mount only visible ACTIVITIES cards (radius 0, higher viewability threshold, lower initialNumToRender). Is this right? What exact values? Effect on scroll-in?
2. Snapshot cards: replace the live map on ACTIVITIES cards with a cached image made by createStaticMapImage.
   a. Is it the best way to meet "visually identical to the real map"? Any better idea within JS-only/OTA? (Nathan rejected staggered mounting and static trail-shape placeholders.)
   b. Where/how is the snapshot made (off-screen live map, queued one at a time?), keyed by what (ride, theme, sector-colours toggle, size), stored where, evicted when?
   c. What if snapshot fails or is not yet made: the live map as today? Define the exact fallback and the hand-off without a flash.
   d. Android risks. Name the minimal on-device test that proves or kills it BEFORE the feed is converted.
3. Keep tab screens mounted: for which tabs, in what order, how are hidden maps paused (display none vs detach vs unmount-the-map-only),
   what must refresh on "became visible" (RidesScreen list, RoutesScreen location, RecordScreen setup state), memory/battery risk. If snapshots (2) land, does this still matter for ACTIVITIES? Recommend a minimal version or recommend against.
4. FREEZE RULE: colours (sector + lap tier) and rank text for a ride are fixed to the ranking state at the time it was ridden, in the feed card AND the ride detail page.
   a. Define "as of then" exactly (pool = rides with start <= this ride? ties? MIN_HISTORY floor for early rides?). Can it be derived from stored data with no new persisted field, or must it be stored at ride end? If stored, migration for existing rides.
   b. Gate edits: does a later gate edit currently change old rides' sector colours or rank? What does the rule give, and is that acceptable?
   c. The ride's own ignore/count toggle: confirm it still applies to its own card. Does ignoring a ride change the rank text of OTHER (later) rides? Rule it (Nathan: no retroactive change by other rides).
   d. Which other surfaces read the same calculation (REPLAY, DEMO, route focus trend, results) and must stay consistent? List them; rule on each.
   e. Consequence for snapshot invalidation.
5. Cover and cache from c93f406: keep, shorten (timeout), or change the lift signal? Fix the inspector's minor 1? Do the snapshot/mount changes make the cover redundant for cards?
6. Anything in Nathan's direction or the coordinator's diagnosis you think is wrong or missing. Profiling needed before any change? If yes, define the cheapest profile.

## Constraints
- Rider-facing text budget (CLAUDE.md #9): no new rider strings.
- Prefer JS-only/OTA. Flag anything needing a native build.
- Tests: node --experimental-strip-types tests/run.ts zero FAIL; tsc --noEmit clean.
- Stop-on-ambiguity applies to later executors: your ruling must settle every undecided call so no executor has to guess.

## Output: write `03-fable-ruling.md` in this folder
1. Verdict: is Nathan's direction right? (one paragraph, blunt)
2. Per question 1-6: RULING (decision + exact parameters) and REASON (short), plus anything UNVERIFIED you could not settle.
3. Corrections to the digest (anchors that were wrong).
4. Ordered work plan: briefs to write (name, scope, files, risk, OTA or native), with dependencies and the on-device test gating each.
5. Open questions only Nathan can answer (keep it to genuine product calls).
Return a short summary (under 200 words) to the coordinator.
