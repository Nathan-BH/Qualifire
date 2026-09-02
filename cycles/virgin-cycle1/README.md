# virgin-cycle1 — README (start here, especially in a fresh chat)

**Goal of this cycle:** work through the 17-item implementation plan in
`data/activities/TEST in virgin-app rides/qualifire-20260901/qualifire-20260901-review.md`
(Nathan's review of his first two rides on the reset "virgin" build, 2026-09-01) plus the
still-live items from `Nathan/Nathan's_notes5/Nathan's_notes5.md`. That review document is
the primary source of truth for *what* each work package is and *why* — this cycle folder
tracks *status* and carries *execution-ready briefs* so any chat (this one resumed, or a
brand new one) can pick up any unblocked item without re-reading everything from scratch.

**Why this folder exists:** Nathan rode the virgin build again on 2026-09-02 (day 2) before
any fix from day 1's review had reached his phone — a process gap, not a code gap. This
folder is the fix for *that*: real progress lands here as briefs and status, one work
package at a time, so there's always something concrete either landed on the phone to test,
or ready to hand to an Execute pass, without losing a day to re-planning.

## Status at a glance (2026-09-02, evening pause point)

| WP | What | Status | Brief |
|---|---|---|---|
| A | Ride-2 engine bug (reverse-ride false "matched"), RECORD-tab pick made a hard lock, "writing history" status line | **DONE — landed on your phone's repo just now.** 305 tests, 302 pass, 0 fail, 3 skip. | `WP-A-ride2-hardpick-writinghistory.md` (record of what shipped) |
| B | GPX+ pick + lock-change logging | Brief written, ready to execute | `WP-B-gpxplus-pick-lock-logging.md` |
| C | Drawable user-created routes (the biggest lever — unblocks D, H, I, K) | Brief written, ready to execute (large) | `WP-C-drawable-user-routes.md` |
| D | Rider-only map before START / on unmatched rides | Brief written, ready to execute — **now first in the queue** (Nathan re-asked 2026-09-02; see WP-P). Take Pieces A + B; bundle WP-N | `WP-D-rider-only-map.md` |
| F | Post-stop "save as new way" offer for any ride, not just unmatched ones | Brief written, ready to execute | `WP-F-post-stop-reference-offer.md` |
| J | Breadcrumb trail behind the rider | Brief written, ready to execute | `WP-J-breadcrumb-trail.md` |
| L | Start auto-detect as a suggestion, not an override (notes5 N5) | Brief written, ready to execute (small) | `WP-L-start-autodetect-suggestion.md` |
| E | Virgin manifest gate-leak (bundled gates drawn on new>>new free rides) | Not started — **blocked on Q6** | see `QUESTIONS-FOR-NATHAN.md` |
| G | Specifications / route variants on an existing Way | Not started — **blocked on Q2** | see `QUESTIONS-FOR-NATHAN.md` |
| H | Ride detail screen (RIDES tap + post-stop destination) | Not started — **blocked on C, plus Q4 + a nav-model call** | see `QUESTIONS-FOR-NATHAN.md` |
| I | Gate card on the map + finger scrub | Not started — map half blocked on C; scrub blocked on **Q1** | see `QUESTIONS-FOR-NATHAN.md` |
| K | Sector-coloured trail, phase 2 (live map) | Not started — blocked on C, plus **Q7** (just needs a yes) | see `QUESTIONS-FOR-NATHAN.md` |
| M | RECORD setup layout (tight-and-grows vs fixed) | Not started — **blocked on Q5** | see `QUESTIONS-FOR-NATHAN.md` |
| N | Round gate-tick line-cap ends | Not started — chore, <10 lines, no brief needed, just do it | — |
| O | DEMO tab: selectable "first ride" (dot + trail being written, no route) / "second ride" (route + gates present, sectors colour as passed) modes | Brief written. **Phase 1 (picker + second-ride mode) ready to execute now**; Phase 2 (first-ride mode) blocked on D + J landing (both briefed, no Nathan decision) | `WP-O-demo-tab-modes.md` |
| P | Live map + blue dot on RECORD / START / RACE for user-created routes (the "HomeWork" blank map) | Root-caused; **fix = WP-D as written** (this brief is the root-cause record, HomeWork acceptance script and landing order). Ready to execute via D | `WP-P-live-map-user-routes-homework.md` |
| 16 | Gate visibility at zoom, on-device re-check | Not code — on-device visual check, do after C + E land | — |
| 17 | Audio/TTS motivational library | **Explicitly parked** by Nathan 2026-09-01 — needs a new build anyway; do not pick up before the virgin path (A–N) is solid | — |

**Read next:** `CONTEXT.md` for the full framing (what "virgin build" means, the pipeline
rules this cycle follows, environment constraints hit this session). Then
`QUESTIONS-FOR-NATHAN.md` — answer inline there, the same way `cycle-025-briefs` on `main`
works, so answers stay attached to the exact question and any chat can read them back.

## How to resume this cycle (in this chat or a fresh one)

1. Read this README, then `CONTEXT.md`, then `QUESTIONS-FOR-NATHAN.md` (check for any
   answers Nathan has typed in since this was written — that unblocks E/G/H/I/K/M).
2. Pick an unblocked WP with status "brief written, ready to execute" — B, C, D, F, J, L, O
   (Phase 1) are all independent of each other and of anything still open. **Recommended
   order as of 2026-09-02 evening: D → J → O (both phases) → C** — D is the "no map at all"
   fix Nathan has asked for twice (WP-P), J needs D's guard change landed once, and O Phase 2
   then gives him a couch test for both. **C is still the highest-value pick** overall (it
   unblocks the most follow-on work) but is also the largest; B, D, L, O-Phase-1 are
   small/quick wins if you want something to land same-day.
3. Dispatch a Sonnet **Execute** agent against that WP's brief file, exactly as written — the
   brief already did the Plan-tier thinking. Point it at the actual device app folder this
   time (`device_bash` was down all of 2026-09-02's session, forcing a cloud-side git mirror
   workaround — see `CONTEXT.md` §"Environment notes" for whether that's still true).
4. Run the verification commands the brief specifies (test suite + `tsc --noEmit`).
5. **Commit the changed files straight to the device** (`C:\Users\natha\Claude personal
   projects\Qualifire\app\...`) so Nathan can build/test same-day. Don't batch multiple WPs
   before committing — land one, let him test, then move to the next. That's the whole point
   of this folder existing.
6. Update this README's status table and the relevant WP file's status line. Small, honest,
   immediate — don't let it drift stale (same rule as `STATE.md`/`OPEN-ITEMS.md` project-wide).
7. If a WP's Execute pass hits a genuine ambiguity or a surprise, don't guess — write it into
   `QUESTIONS-FOR-NATHAN.md` (new question block, same format as the existing ones) rather
   than only mentioning it in chat, so it's tracked and answerable whenever Nathan has a
   moment, per his own standing instruction (also now in `process/CONVENTIONS.md`).

## Testing WP-A today (it's already on your phone's repo)

Files changed: `app/src/live/engine.ts`, `app/src/ui/RecordScreen.tsx`,
`app/tests/live_suite.ts`, `app/tests/live_colour_suite.ts`, `app/tests/resultsstore_suite.ts`.
Nothing else touched. Before building, it's worth running the two verification commands
yourself since this session's `device_bash` bridge was down the whole time and `tsc --noEmit`
was never confirmed on a real toolchain:

```
cd app
node --experimental-strip-types tests/run.ts   # expect: 305 tests: 302 pass, 0 fail, 3 skip
./node_modules/.bin/tsc --noEmit               # expect: exit 0, no output
```

If both come back clean, rebuild/reload the app and try to reproduce yesterday's ride 2
(ride the reverse direction of an existing route) — it should now come back **unmatched**
(naming/save offer appears, exactly like a first-ever ride) instead of silently "matching"
the wrong way. You should also see the RECORD-tab pick behave as a hard lock now (per your
2026-08-29 note), and — once a ride goes a little while without recognizing any known road —
the status line where "detecting route…" used to sit should start alternating in a
"writing history"-style line instead. See `WP-A-ride2-hardpick-writinghistory.md` for the
exact wording and every test that pins this behaviour.
