# virgin-cycle1 / subcycle2 — sector-trail colour fix — token/tool-call reference

Scoped token tally for this fix only (2026-09-02 session), split out from the main cycle's
`../TOKEN-USAGE.md` per Nathan's request. Approximate — from each subagent's own reported usage.

## Part 1 — DEMO tab + Result screen (purple mismatch + grey lead-in/lead-out)

| Dispatch | Tier | Model | Tokens (reported) | Tool calls | Outcome |
|---|---|---|---|---|---|
| Digest — sector legend colours, map overlay colouring, lead-in/lead-out handling | Digest | Haiku | ~97.4k | 26 | Located the right files; digest's own summary of which side had the mismatch was self-contradictory — coordinator re-verified directly against the code before trusting it |
| Coordinator spot-check (no dispatch) | Chore | — (coordinator, Sonnet chat) | — (folded into session cost) | ~10 tool calls | Read theme.ts/chips.tsx/DemoScreen.tsx/routeMapGeo.ts/routeMapView.tsx/ResultScreen.tsx directly; found the exact `.text` vs `.bg` bug and the pre-existing `SPAN_TIER_COLOUR` precedent + warning comment in ResultScreen.tsx |
| Plan — design shared tierLineColour() helper + grey lead-span mechanism, write executor brief | Plan | Fable | ~77.9k | 5 | Full self-contained brief produced, 7 files scoped |
| Execute — land all 7 file edits | Execute | Sonnet | ~121.4k | 58 | Landed; could not run tsc/tests itself (device_bash down) |
| Inspect — fresh-context adversarial re-verification | Inspect | Fable (fresh context) | ~170.7k | 55 | Staged whole app/ tree, ran real test suite: 346/343/0/3. PASS WITH FINDINGS (found the RecordScreen + RidesScreen follow-ons below) |

**Part 1 subtotal: ~467.4k tokens across 4 subagent dispatches.**

## Part 2 — RecordScreen live gate-tick colours

| Dispatch | Tier | Model | Tokens (reported) | Tool calls | Outcome |
|---|---|---|---|---|---|
| Coordinator spot-check + direct fix (1-line chore, no dispatch) | Chore | — (coordinator, Sonnet chat) | — (folded into session cost) | ~8 tool calls | Read `RecordScreen.tsx` gateColours block + `chips.tsx`'s `chipColors()` directly; found `tierLineColour()` would have regressed 'est'/'neutral' (both already correct), so used a narrower 1-line ternary overriding only 'purple' instead of the Part-1 helper |

**Part 2 subtotal: no subagent dispatch — under the ~10-mechanical-line chore threshold once the
coordinator's own spot-check resolved the design question.**

---

**Subcycle2 running total: ~467.4k tokens across 4 subagent dispatches (Part 1) + 1 direct
coordinator chore (Part 2, not separately token-metered).**
