# 15 — Ride STOP: draw the Qualifire mark forward, not backwards

**Source: Nathan, 2026-09-27.** His words: "i also do not like anymore that when you stop a
ride the qualifire logo animation is reversed; i think it should be drawn forward as well at
the end; so drawing the logo like at the start instead of removing it backwards!"

**This brief reverses an earlier explicit ruling by Nathan.** Cycle 024 WP-A2 (Nathan,
2026-08-19) added the reversed end-of-ride mark on his own request — "the yellow line gets
undrawn and then the circle gets undrawn as well" — and the code comment in
`app/src/ui/launchAnimation.tsx` lines 33-39 records that. Nothing was broken; this is a
change of mind ("do not like anymore"), and it is written down here so nobody later reads
the reverse path's removal as a regression or a bug fix.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-27 by the Plan
tier (Fable) from a Haiku digest plus one anchor check against the working tree (branch
`virgin`, HEAD `c3e92ef`). Executor: Sonnet, cold, this file only. Brief 15 of
`virgin-cycle15`; independent of every other brief in this folder. It shares
`app/src/ui/RecordScreen.tsx` with brief 14 (which edits line 955 and the import block,
nothing near the lines below) — either order, but whichever runs second must match on the
**quoted text**, not the line numbers, because the other brief shifts them by a few lines.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-27. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. No change to `app/src/ui/launchChoreo.ts` (the timing constants,
  including the `REV_*` ones, stay — see decision 4).
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief here, or anything under `cycles/virgin-cycle14/` /
  `cycles/cycle-024-briefs/` (history — the WP-A2 brief stays as it was).
- **Do not touch `App.tsx`** (the boot-time `LaunchAnimation` mount; it never used
  `reverse` and is unaffected).

## Goal

When a ride ends, the full-screen Qualifire mark **draws itself forward** — ring sweep,
then the yellow slash — exactly the same choreography as when a ride starts (and as at app
boot), then fades out. It no longer starts from the completed mark and undraws it. What
happens *after* the mark (board cleared, screen back to setup, ride-detail overlay opened)
is unchanged.

## Current state (verified 2026-09-27 against the tree)

### `app/src/ui/launchAnimation.tsx`

- Line 61: `export function LaunchAnimation({ onDone, reverse = false }: { onDone: () => void; reverse?: boolean }) {`
- Lines 67-68: both animated values mount at `reverse ? 1 : 0`.
- Lines 87-100: the reduced-motion branch — forward jumps to 1 and holds; reverse holds the
  already-completed mark ("no reversed motion at all under reduced-motion", Nathan's
  pre-resolved WP-A2 ruling).
- Lines 102-122: `const anim = reverse ? Animated.parallel([slash→0, delay+ring→0]) : Animated.parallel([ring→1, delay+slash→1])`.
- Lines 33-39: the WP-A2 comment quoted above.

### `app/src/ui/RecordScreen.tsx`

- Line 37: `import { LaunchAnimation } from './launchAnimation';`
- Line 162: `const [showAnim, setShowAnim] = useState<'fwd' | 'rev' | null>(null);`
- Line 419: `onFullscreenChange?.(isFullscreen(phase) || showAnim != null);` — either value
  puts the screen fullscreen while the mark plays; unaffected.
- **Ride START render site**, lines 1518-1524:

  ```tsx
    {showAnim === 'fwd' && (
      <LaunchAnimation
        onDone={() => {
          setShowAnim(null);
          setPhase('armed');
        }}
      />
    )}
  ```

- **Ride STOP render site**, lines 1162-1175 (continues to the `openRide` call):

  ```tsx
        {showAnim === 'rev' && (
          <LaunchAnimation
            reverse
            onDone={() => {
              setShowAnim(null);
              setReveal(null); // a board must never survive into the next ride's 'ending'
              setPhase('setup');
              // WP-H: post-STOP now opens the ride detail overlay instead of
              // the retired RESULT tab. No session id (should not happen for
              // a real ride) simply leaves the screen on RECORD setup.
              const ended = endedRef.current;
              endedRef.current = null;
              if (ended) {
                tabNav.openRide({ rideId: ended.rideId, source: 'post-stop', startedAtMs: ended.startedAtMs });
  ```

  **The two `onDone` bodies are materially different** (start → `'armed'`; stop → clear
  board, `'setup'`, open the ride overlay). That settles decision 1: the stop site keeps
  its own render branch and its own `onDone`; only the `reverse` prop goes.
- **The six `setShowAnim('rev')` trigger sites** — 606 (stop with no naming card / no
  reveal), 627 (`onRevealPlayed`, after the reveal hold), 636 (`onNamingSkip`), 669 (stop
  without a gate-adjust offer), 684 (`onAdjustKeep`), 701 (adjust saved). Line 627 also
  reads `postRevealRef.current === 'rev'`, so the `'rev'` literal is additionally a
  `postRevealRef` value assigned somewhere the anchor check did not read. **None of the six
  is edited** (decision 2).
- Comments that describe the mark as reversed, which become wrong after this brief:
  - line 604-605: `// No reveal: the reverse mark plays at once, exactly as before. With a reveal it`
  - line 665: `// SETUP-UX §4: offer tap-then-nudge before the reversed mark plays;`
  - line 1113: `pattern, mirrored here. The reversed LaunchAnimation stays an` (inside a
    longer JSX comment — read 1108-1118 for the full sentence before editing it).

## Decisions (pre-resolved — do not re-open)

1. **The fix is dropping the `reverse` prop at the stop site — one line.** Because the two
   `onDone` bodies differ, the stop site cannot reuse the `'fwd'` render branch; it keeps
   its branch and its callback and simply mounts `<LaunchAnimation onDone={...} />` like the
   start site. Forward-from-0 is the component's default path; no new geometry, no new
   choreography, no change to the values' interpolations.
2. **`'rev'` stays as the state value.** It now means "the end-of-ride mark", which is a
   different *moment* with a different `onDone`, not a different *direction*. Renaming it
   (`'end'`, with `'fwd'` → `'start'`) would be more honest but touches the six trigger
   sites plus the `postRevealRef` plumbing that this brief did not read; it is logged as
   Open question 1 and is **not** done here. Instead, the state declaration gets a one-line
   comment saying what `'rev'` now means.
3. **Comments are updated where they say "reverse(d) mark".** Three sites (604-605, 665,
   1113): replace "reverse mark" / "reversed mark" / "reversed LaunchAnimation" with
   "end mark" / "end-of-ride LaunchAnimation". Wording only; no logic.
4. **`LaunchAnimation`'s `reverse` prop and the `REV_*` constants stay in the code, now
   unused.** Removing them is a clean-up with a bigger blast radius (`launchChoreo.ts`, its
   tests, the reduced-motion branch) and Nathan may yet change his mind back; a dead,
   default-false prop costs nothing. The WP-A2 header comment in `launchAnimation.tsx` is
   amended (not deleted) so the history is readable.
5. **Reduced-motion at ride end** now follows the forward branch: jump to the completed
   mark, hold `REDUCED_MOTION_HOLD_MS`, fade. Visually identical to before (the old reverse
   branch also held the completed mark), so no separate ruling is needed.
6. **This is a pure preference reversal.** Nothing in the code suggests the reversed
   direction carried a functional meaning (the same fullscreen flag, the same fade, the
   same `onDone` contract); WP-A2's own comment gives only the visual rationale. Open
   question 2 records the one place a reader might disagree.

## Files to touch

### 1. `app/src/ui/RecordScreen.tsx`

**Edit A — line 1164.** Delete the line

```tsx
            reverse
```

inside the `showAnim === 'rev'` `<LaunchAnimation` element (lines 1163-1165) so it reads

```tsx
          <LaunchAnimation
            onDone={() => {
```

Nothing else in that JSX block changes.

**Edit B — line 162.** Above

```tsx
  const [showAnim, setShowAnim] = useState<'fwd' | 'rev' | null>(null);
```

add

```tsx
  // 'fwd' = the mark at ride START (onDone arms), 'rev' = the mark at ride END
  // (onDone clears the board, returns to setup, opens the ride). Both play the
  // SAME forward draw since cycle15 brief 15 (Nathan 2026-09-27); 'rev' is a
  // historical name from cycle 024 WP-A2, when the end mark undrew itself.
```

**Edit C — comments.** Wording only:

- line 604: `// No reveal: the reverse mark plays at once, exactly as before. With a reveal it`
  → `// No reveal: the end mark plays at once, exactly as before. With a reveal it`
- line 665: `// SETUP-UX §4: offer tap-then-nudge before the reversed mark plays;`
  → `// SETUP-UX §4: offer tap-then-nudge before the end mark plays;`
- line 1113: within the sentence containing `The reversed LaunchAnimation stays an`,
  replace `reversed LaunchAnimation` with `end-of-ride LaunchAnimation`. Read 1108-1118
  first; do not re-wrap the surrounding lines.

If any of the three quoted comment lines is not found verbatim, report it and **skip that
comment** (a missing comment is not a reason to stop the whole brief — but the missing
Edit A line *is*).

### 2. `app/src/ui/launchAnimation.tsx`

**Edit D — header comment, lines 33-39.** Keep the existing paragraph and append directly
below it (still inside the `/** … */` block):

```
 *
 * Cycle15 brief 15 (Nathan 2026-09-27): the END mark is drawn FORWARD again
 * ("drawing the logo like at the start instead of removing it backwards").
 * RecordScreen no longer passes `reverse`; the prop and the REV_* choreography
 * stay in place, unused, in case the undraw ever comes back.
```

No code change in this file.

## Verification

From `app/`: the typecheck and unit-test scripts as `package.json` `scripts` defines them
(read that block first). All suites stay green — no test asserts on the `reverse` prop being
passed from RecordScreen (if one does, report it: that is a stop, not a test to edit). Then:

- `grep -n "reverse" app/src/ui/RecordScreen.tsx` → **no hits** (the word only ever
  appeared at the prop and in the three comments).
- `grep -n "setShowAnim('rev')" app/src/ui/RecordScreen.tsx` → still exactly six hits
  (606, 627, 636, 669, 684, 701 ± the offset brief 14 introduced if it ran first).
- `grep -n "reverse" app/src/ui/launchAnimation.tsx` → the prop, the value mounts, the two
  branches and the comments are all still there (decision 4).

## On-device checklist (Nathan, after publish)

1. Start a ride: the mark draws ring-then-slash and fades, screen arms. Unchanged.
2. Stop a ride that needs no naming card and has no reveal (a known route, nothing new):
   the mark now **draws itself forward** — ring, then slash — fades, and the ride-detail
   overlay opens exactly as before. Nothing undraws.
3. Stop a ride that shows a **reveal board** first: board, hold, then the forward mark, then
   the overlay. Same sequence as today except the mark's direction.
4. Stop a ride that offers the **naming card**: "skip" → forward mark. Save → whatever the
   save path did before, then forward mark.
5. Stop a ride that offers **gate adjust**: keep → forward mark; save → forward mark.
6. Android → Settings → Accessibility → Remove animations ON: start and stop both show the
   completed mark held still, then fade. Same as before at both moments.
7. Cold-start the app: boot mark unchanged.

## Out of scope

- Renaming `'rev'` / `'fwd'` (Open question 1).
- Deleting the `reverse` prop, the reverse branches, or `REV_SLASH_MS` /
  `REV_RING_DELAY_MS` / `REV_RING_MS` from `launchChoreo.ts` (decision 4).
- Any different end-of-ride choreography (a distinct end mark, colour, or timing) — Nathan
  asked for "like at the start", i.e. identical.
- The boot animation in `App.tsx`, the marketing hyperframes teaser's mark, the
  `audio-studio` earcons.
- iOS (no iOS build).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (one prop removed, four
comments; no dependency, no `app.json`/`eas.json` change), so it ships to the Preview APK
over EAS Update via `scripts/publish-preview.cmd` — no new numbered build, no reinstall.
Visible every time a ride is stopped: the Qualifire mark draws itself forward (as at start
and at boot) instead of undrawing backwards. Ride start, boot and everything after the mark
are unchanged.

## Open questions / assumptions (logged, not blocking)

1. **Rename `'rev'` → `'end'` and `'fwd'` → `'start'`** for naming honesty. Touches the
   union on line 162, the six trigger sites, both render branches and the `postRevealRef`
   value (assigned somewhere the anchor check did not read — grep `postRevealRef.current =`
   first). Mechanical, ~10 lines; a separate chore if Nathan wants it.
2. **Did the reversed direction ever signal "ride ended" functionally?** The code says no:
   the same fullscreen flag (line 419), the same fade, no consumer reads the direction. The
   only place the distinction is *used* is the two different `onDone` callbacks, which key
   off the state value, not the animation direction. If Nathan ever felt the reverse helped
   him tell "stopped" from "started", the start/stop moments are still distinguishable by
   what follows (armed screen vs ride overlay).
3. **Delete the dead reverse path** (prop, both branches, `REV_*`, their tests). Left in on
   purpose (decision 4); flag if the coordinator prefers the tree not to carry unused code.
