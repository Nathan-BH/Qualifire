**Status: DONE. Landed on device 2026-09-02, uncommitted (device_bash down all session — written via
device_stage_files + SendUserFile + device_commit_files). Ad-hoc request from Nathan mid-session,
not a lettered WP.**

## What it was

RECORD tab, setup/idle screen: the openmap preview and the STARTING FROM / GOING TO pill rows were
clipped to the center of the screen instead of taking the full screen width.

## Root cause

`app/src/ui/RecordScreen.tsx`'s `readout` style (line ~1300) had `alignItems: 'center'` but was
missing `alignSelf: 'stretch'`. Its children (the map View, the `startFlow` selector wrapper) each
request `alignSelf: 'stretch'` to fill their parent's width — but `readout` itself, having no
`alignSelf: 'stretch'` of its own, shrank to fit its narrowest child (the logo/title) inside the
ScrollView's `alignItems: 'center'` content container. The children's stretch could then only fill
that already-shrunk box, not the real screen width.

Confirmed by direct comparison: the sibling `readoutLive` style (armed/running phases, which Nathan
confirmed work fine) already had **both** `alignSelf: 'stretch'` and `alignItems: 'center'` — that
side-by-side gave a definitive root cause with no ambiguity.

## Fix

One line. `readout: { alignItems: 'center', gap: 6 }` → `readout: { alignSelf: 'stretch',
alignItems: 'center', gap: 6 }`.

`styles.readout` has exactly one usage in the file (the setup/idle-phase view), so the fix is
isolated — no other screen touched.

## Process

Landed as a direct chore (Haiku triage/digest located the file + style block; the coordinator
spot-checked the actual code directly rather than trusting the digest at face value — worth noting,
since the digest's own summary of which side had the "dark" colour was self-contradictory on an
unrelated later task the same session, a useful reminder to always verify a subagent's factual claim
against the real file before acting on it for anything non-trivial). No Sonnet executor or Fable
inspection dispatched — a single-line style-object addition is well under the ~10-mechanical-line
chore threshold in `process/CONVENTIONS.md`.

## Verification

Could not run `tsc --noEmit` / `tests/run.ts` — `device_bash` was down for the fix itself (came back
briefly later the same session for other work). Re-staged the committed file afterward and confirmed
the edit landed correctly on disk. Risk assessed as low: pure style-object key addition, no logic or
type changes. **Nathan should visually confirm** the RECORD tab's map + selector rows now span the
full screen width on the next build/reload.
