# Open items — cycle 01 (2026-09-09)

Judgment calls made without interrupting Nathan. He reads this whenever; nothing here needs a reply.

- Restructure (Part A.2 step 5 / Section 5 of PLAN.md): kept the idea-7 row in the summary table marked "merged into 3" rather than deleting it outright, so the slate's numbering history stays legible, per the brief's own suggestion.
- Route-dot colour for the `tour` composition: used `#58B7FF` (a blue distinct from every tier colour, since tier colours are earned/never decorative per `frame.md`) — not specified as an exact hex anywhere else in the brand docs, so this is a new value scoped to this one composition only.
- FLAG FOR REVIEW: the tour's route-dot/halo colour (#58B7FF, light blue) is off the documented brand palette (chrome is ink/yellow/charcoal/black only, purple/green are earned-only) — kept because nothing in the existing palette reads clearly as "a rider" without clashing with the tier colours, but this is a deviation worth a deliberate yes/no from Nathan, not just a default to wave through.
- All four compositions (teaser, gate, purple, tour) are silent by design — no audio track, no VO, no SFX. Captions and animation carry the meaning, consistent with how the teaser already worked. A music/SFX pass is a separate later job if Nathan wants one; nothing here should be read as an oversight.
- `tour` composition, beat 3 (`#route-ghost`): left this path at `opacity:0` for the whole video rather than ever showing it, since "new route, nothing to see in front" — there is no planned/ghost route to preview against on a first-ever ride, per Nathan's own framing of the story.
- `tour` composition, rank-fragment beat (30-35s): the result shown is "P1 of 2", purple — chosen deliberately over "P2 of 2" so the slot-in choreography (the reference row travelling up while the new row steps in from below) is actually visible in the 0.7s window; with the reference ride as the only prior ride, beating it lands purple per `tierFor` (best and mean coincide at a pool of one).
- `tour` composition, tower-fill beat (35-45s): simplified to a per-row pop-in (not the real bottom-to-rank slot-in animation) because animating all 10 rows sliding into rank within a 10-second beat would be unreadable at this pace; the real slot-in choreography is already shown once, earlier, in the rank fragment.
- Idea 3 (`tour`) deliberately leaves colour/tier explanation, sport choice, and day/night mode to other videos (idea 4 covers colour) — treating Nathan's "seems fair?" in review as agreement, per the brief's framing of that beat split.

## Blockers this session

- **`device_bash` (the remote-devices shell to Nathan's PC) never recovered this session.** Every call — including trivial ones with no file I/O — failed with `sandbox-helper: no Plan9 drive shares mounted under /mnt/.virtiofs-root/shared`, across roughly a dozen attempts spread through the whole run. This is worse than the documented "mount hiccup on a file op": the shell itself never came up, so there was no way to run `powershell`/`npx` remotely at all. All file reads/writes/moves were done successfully via the `device_stage_files` / `device_commit_files` / `device_list_dir` fallbacks instead — those are unaffected. Two things are still outstanding because of this and need Nathan to run them (or a future session once `device_bash` is back):
  1. **Render all four compositions.** From `marketing/hyperframes/` on Nathan's PC:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name teaser -Render
     powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gate -Render
     powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name purple -Render
     powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name tour -Render
     ```
     After each, check the console output for `gsap_exit_missing_hard_kill` — there should be zero occurrences for all four (teaser, gate, purple and tour were all written using the `.inner`-wrapper + `tl.set` hard-kill pattern throughout). If any composition still shows one, its exit fade doesn't end exactly at the clip boundary — worth a look before trusting the render.
  2. **Delete three now-superseded files that a move should have removed but couldn't:**
     - `marketing/HYPERFRAMES-PLAN.md` (superseded by `marketing/PLAN.md`, same content plus the edits in this cycle — the old copy is stale and should not be treated as current)
     - `marketing/HYPERFRAMES-IDEAS-DETAILED.md` (superseded by `marketing/cycles/01_first-slate/IDEAS-AND-FEEDBACK.md`, byte-identical copy)
     - `marketing/VIDEO-EDITING-GUIDE.md` (superseded by `marketing/guides/VIDEO-EDITING-GUIDE.md`, byte-identical copy)
     These are stale duplicates left behind only because `device_bash` couldn't reach the filesystem to remove them after the copies landed at their new paths. Safe to delete by hand, or next session once `device_bash` is reachable again — `rm "marketing\HYPERFRAMES-PLAN.md" "marketing\HYPERFRAMES-IDEAS-DETAILED.md" "marketing\VIDEO-EDITING-GUIDE.md"` from the repo root.
