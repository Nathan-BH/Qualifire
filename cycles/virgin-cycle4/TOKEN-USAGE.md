# virgin-cycle4 -- token/tool-call reference

Approximate -- from each subagent's own reported usage. Earlier diagnosis/first-attempt
dispatches in this cycle ran before a context-window compaction in the coordinating chat;
their outcomes are accurate (carried forward in the compaction summary) but exact
token/tool-call figures were not preserved for them.

| Dispatch | Tier | Model | Tokens (reported) | Tool calls | Outcome |
|---|---|---|---|---|---|
| Diagnosis -- fingerprint drift (`eas-cli update:list`/`build:list` comparison, git diff of native-relevant files) | Digest+Plan (informal, in-chat) | Fable/Sonnet mix | not preserved (pre-compaction) | not preserved | Root cause found: expo-updates bump + new virgin app.config.js variant drifted preview's fingerprint past build 6 |
| Coordinator direct -- fixed 4x bare `npx` -> `npx.cmd` in `publish-preview.ps1` | Chore | -- (coordinator, no subagent) | -- | ~4 | Bare npx blocked by Windows execution policy; npx.cmd bypasses it |
| Coordinator direct -- fixed 8 stale pre-WP-3 paths in `build4.ps1` (`routeMapView.tsx`/`routes.json` -> `wayMapView.tsx`/`ways.json`) | Chore | -- (coordinator, no subagent) | -- | ~8 | Preflight was checking pre-rename paths; assets themselves were fine |
| Execute -- first attempt: separate "Qualifire Virgin" app (`-BuildProfile virgin` in build4.ps1, build7.ps1/build7.cmd delegating to it) | Execute | Sonnet | not preserved (pre-compaction) | not preserved | Built and fresh-Fable-inspected clean -- then explicitly REJECTED by Nathan as the wrong shape of fix ("not a separate APK") |
| Inspect -- first attempt (fresh-context Fable) | Inspect | Fable | not preserved (pre-compaction) | not preserved | Found the wiring logically sound; superseded before any further action, since the whole approach was rejected |
| Plan -- redesign brief for "rebuild Preview in place" (eas.json one-liner, full build7.ps1 rewrite, build7.cmd relabel) | Plan | Fable | not preserved (pre-compaction) | not preserved | Brief written: D1-D8 design decisions table, full replacement script, verification plan, stop-on-ambiguity list |
| Execute -- implement the redesign brief | Execute | Sonnet | ~69k | ~15 | Made the 3 edits; stopped once on a harmless line-number mismatch in its own brief (290 vs 291), resumed after coordinator confirmed it was informational only, then completed all 9 verification checks clean |
| Inspect -- fresh-context re-inspection of the redesign (no memory of the execute work) | Inspect | Opus (Fable) | ~103k | 20 | PASS with concerns -- found one real bug (build7.cmd LF line endings, should be CRLF like siblings) plus 5 non-blocking design notes, all logged into this cycle's docs |
| Coordinator direct -- fix build7.cmd LF->CRLF | Chore | -- (coordinator, no subagent) | -- | ~3 | Verified byte-for-byte identical content otherwise |
| Coordinator direct -- scaffold `cycles/virgin-cycle4/` (README/CONTEXT/TOKEN-USAGE/BUILD7-PREVIEW-BLANK-SEED), add "Where documentation lives" to `process/CONVENTIONS.md`, trim device-side project memory to short pointers | Chore | -- (coordinator, no subagent) | -- | ~15 | At Nathan's explicit request: per-build documentation moved into the repo instead of device project memory |
| Coordinator direct -- second correction: `publish-preview.ps1` now also sets `EXPO_PUBLIC_SEED_MODE=empty` (mirrors existing `APP_VARIANT` line) | Chore | -- (coordinator, no subagent) | -- | ~4 | Nathan clarified the blank seed is permanent, not travel-scoped; closed the one previously-open gap that could have silently reintroduced Leuven data on a future OTA publish |

**Test suite: 560 tests, 557 pass / 0 fail / 3 skip. `tsc --noEmit`: exit 0.** Verified
repeatedly throughout -- before the redesign, after the redesign's 3 edits, after the
build7.cmd line-ending fix, and after the publish-preview.ps1 env-var fix. Unchanged
throughout (every edit in this cycle is config/scripts-only, never `app/src` or
`app/tests`).

**Still to run:** a live `build7.ps1 -DryRun` on Nathan's own machine -- no `pwsh`/
`powershell.exe` is reachable from the device_bash bridge used for this cycle's work, so
everything above was verified by direct file inspection, JSON/brace/encoding checks, and
careful manual control-flow tracing, never a live execution.
