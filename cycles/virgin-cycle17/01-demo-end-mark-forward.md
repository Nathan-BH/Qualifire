# 01 — DEMO: draw the end-of-run Qualifire mark forward, not backwards

**Source: Nathan, 2026-09-29.** His words: "some new features did not make it to the demo. For
example i asked for the post ride logo animation to not be reversed but still drawn but that
has not been updated in the demos."

**This is the DEMO-tab mirror of cycle15 brief 15** (`cycles/virgin-cycle15/15-logo-forward-on-stop.md`,
Nathan 2026-09-27: "drawing the logo like at the start instead of removing it backwards").
That brief removed the `reverse` prop from RecordScreen's end-of-ride `<LaunchAnimation>`
and landed; its Out-of-scope list did not mention `DemoScreen.tsx`, and nobody noticed that
the DEMO tab has its own `<LaunchAnimation reverse …>` render site. So the real app draws
the end mark forward and the demo still undraws it. Not a regression — a missed second
call site — and it is written down here so the fix is read as completing brief 15, not as
new behaviour.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `c98a4a5`). Executor: Sonnet, cold, this file only. Brief 01 of
`virgin-cycle17`. **It shares `app/src/ui/DemoScreen.tsx` with brief 02** of this folder —
the coordinator should run 01 and 02 in ONE executor pass, 01 first (it is four one-line
edits, all of them far from 02's regions). Whichever runs second must match on the
**quoted text**, not the line numbers: brief 02 inserts lines above the render site below
and shifts it down by roughly 40 lines.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. No change to `app/src/ui/launchAnimation.tsx` or
  `app/src/ui/launchChoreo.ts` (the `reverse` prop and the `REV_*` constants stay, unused —
  cycle15 brief 15 decision 4 still holds).
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief here, or anything under `cycles/virgin-cycle15/` /
  `cycles/virgin-cycle16/` (history).
- **Do not touch `App.tsx` or `RecordScreen.tsx`** (boot mark and real end mark — already
  forward, unaffected).

## Goal

When a DEMO run ends (the card's skip/save, the gate card's keep/save, or the saved-line
hold running out) the full-screen Qualifire mark **draws itself forward** — ring sweep, then
the yellow slash — exactly as at app boot, at ride start and (since brief 15) at real ride
end, then fades, then the demo returns to its idle chooser. It no longer starts from the
completed mark and undraws it. What happens *after* the mark (`exitToIdle`) is unchanged.

## Current state (verified 2026-09-29 against the tree)

### `app/src/ui/DemoScreen.tsx`

- Line 105: `import { LaunchAnimation } from './launchAnimation';`
- Line 217: `const [showAnim, setShowAnim] = useState<'rev' | null>(null);` — the demo has
  only the end value (there is no ride-start mark in the demo; RUN DEMO RIDE goes straight
  to the running column).
- **The one render site**, line 723, inside the `phase === 'ending'` return, directly after
  the closing `</ScrollView>`:

  ```tsx
        {showAnim === 'rev' && <LaunchAnimation reverse onDone={exitToIdle} />}
  ```

  This is the only `LaunchAnimation` element in the file (`grep -n "<LaunchAnimation"` →
  one hit) and the only occurrence of the word `reverse` outside comments.
- **`exitToIdle`**, lines 316-334 — the `onDone`. Read in full: it clears both hold timers,
  stops the clock, resets trail/savedLine/busy/showAnim/reveal/revealDone/endedAtMs/adjust/
  pendingNames and sets `phase` to `'idle'`. **It never reads the animation's direction and
  nothing in it depends on where the mark starts** — it is the same callback for any
  direction. No change needed there.
- The five `setShowAnim('rev')` trigger sites — 550 (`onDemoNamingSkip`), 560 (belt-and-
  braces saved-line hold), 571 (`finishWithLine`), 584 (`onDemoAddWaySave`), and the
  fullscreen effect at 518 reading `showAnim != null`. **None is edited** — same reasoning
  as brief 15 decision 2: `'rev'` is the *moment* (end of run), not the direction.
- Comments that describe the mark as reversed, which become wrong after this brief:
  - line 206: `  // Nathan (2026-09-19): after a full run -> ending -> reverse-launch -> idle -> re-run`
  - line 515: `  // while the reverse launch mark is still playing on the way out of it —`
  - line 524: `  // without the reverse-mark ceremony.`

### `app/src/ui/launchAnimation.tsx`

- Lines 45-48, the cycle15 brief 15 header paragraph, ends with: `RecordScreen no longer
  passes \`reverse\`; the prop and the REV_* choreography` / `stay in place, unused, in case
  the undraw ever comes back.` After this brief that sentence is true of DemoScreen too.
  **Not edited** (rule above) — the sentence stays accurate as written ("RecordScreen no
  longer passes" remains true); it just under-describes. Open question 2 logs it.

## Decisions (pre-resolved — do not re-open)

1. **The fix is dropping the `reverse` prop at the one render site — one token.** The
   element becomes `<LaunchAnimation onDone={exitToIdle} />`. Forward-from-0 is the
   component's default path (`reverse = false`); no new geometry, no timing change, no new
   state.
2. **`exitToIdle` is untouched.** Verified above: it is direction-agnostic. The `onDone`
   contract (fires after the fade, whichever way the mark played) is the same.
3. **`'rev'` stays as the state value** — exactly brief 15 decision 2. The union on line 217
   gets a one-line comment saying what `'rev'` means now. No rename (Open question 1).
4. **Comments are updated where they say "reverse".** Three sites (206, 515, 524): wording
   only, replacing "reverse-launch" / "reverse launch mark" / "reverse-mark" with "end-mark"
   / "end mark". A missing comment line is a skip, not a stop (see Files to touch).
5. **Reduced-motion** now follows the forward branch (jump to completed mark, hold, fade) —
   visually identical to the old reverse branch's reduced-motion hold. No ruling needed;
   same as brief 15 decision 5.
6. **No change to what triggers the mark.** Nathan's ask is about direction only. Brief 02
   changes *when* TENTH RIDE reaches the mark; that is its business, not this one's.

## Files to touch

### 1. `app/src/ui/DemoScreen.tsx` — the only file

**Edit A — line 723.** Replace

```tsx
        {showAnim === 'rev' && <LaunchAnimation reverse onDone={exitToIdle} />}
```

with

```tsx
        {showAnim === 'rev' && <LaunchAnimation onDone={exitToIdle} />}
```

Indentation unchanged (8 spaces). Nothing else on that line or around it changes.

**Edit B — line 217.** Above

```tsx
  const [showAnim, setShowAnim] = useState<'rev' | null>(null);
```

add

```tsx
  // 'rev' = the end-of-run mark (onDone = exitToIdle). It plays the SAME forward
  // draw as boot/ride-start since virgin-cycle17 brief 01 (Nathan 2026-09-29),
  // mirroring cycle15 brief 15 on RecordScreen; 'rev' is a historical name from
  // cycle 024 WP-A2, when the end mark undrew itself.
```

**Edit C — comments.** Wording only:

- line 206: `  // Nathan (2026-09-19): after a full run -> ending -> reverse-launch -> idle -> re-run`
  → `  // Nathan (2026-09-19): after a full run -> ending -> end-mark -> idle -> re-run`
- line 515: `  // while the reverse launch mark is still playing on the way out of it —`
  → `  // while the end mark is still playing on the way out of it —`
- line 524: `  // without the reverse-mark ceremony.`
  → `  // without the end-mark ceremony.`

If any of the three quoted comment lines is not found verbatim, report it and **skip that
comment** (a missing comment is not a reason to stop the whole brief — but a missing Edit A
line *is*: stop and report).

## Verification

From `app/` (paths relative to the repo root):

- `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL**. No suite renders
  `DemoScreen` (`app/tests/demo_suite.ts` tests `demoModel.ts` only), so nothing asserts on
  the prop; if a test does fail on it, report — that is a stop, not a test to edit.
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0.
- `grep -n "reverse" app/src/ui/DemoScreen.tsx` → **no hits** (the word only ever appeared
  at the prop and in the three comments).
- `grep -n "<LaunchAnimation" app/src/ui/DemoScreen.tsx` → exactly one hit, and that line
  contains `onDone={exitToIdle}` and does **not** contain `reverse`.
- `grep -n "setShowAnim('rev')" app/src/ui/DemoScreen.tsx` → still four hits (550, 560,
  571, 584 ± brief 02's offset if it ran first; brief 02 adds a fifth — see its own grep).
- `grep -n "reverse" app/src/ui/RecordScreen.tsx` → no hits (unchanged since brief 15; a
  hit means someone touched the wrong file).
- `grep -n "reverse" app/src/ui/launchAnimation.tsx` → the prop, the value mounts, the two
  branches and the comments are all still there (decision 1: the component is untouched).

## On-device checklist (Nathan, after publish)

1. DEMO → FIRST RIDE → RUN → let it play out → skip on the naming card: the mark now **draws
   itself forward** (ring, then slash), fades, and the idle chooser returns. Nothing undraws.
2. Same, but CREATE ROUTE → KEEP on the gate card → saved line → forward mark after the
   hold.
3. DEMO → SECOND RIDE → RUN → reveal → card → skip: forward mark.
4. DEMO → TENTH RIDE → RUN → reveal → (whatever brief 02 makes the end of TENTH) → forward
   mark.
5. Android → Settings → Accessibility → Remove animations ON: the completed mark held still,
   then fade — same as before.
6. RECORD tab: start and stop a real ride — unchanged (already forward since brief 15).

## Out of scope

- Renaming `'rev'` (Open question 1).
- Deleting `LaunchAnimation`'s `reverse` prop / `REV_*` (brief 15 decision 4 still stands).
- Amending `launchAnimation.tsx`'s header (Open question 2).
- Anything about *when* the demo's end mark fires — brief 02.
- iOS (no iOS build). `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the
  coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (one prop removed, four
comments; no dependency, no `app.json`/`eas.json` change), so it ships to the Preview APK
over EAS Update via `scripts/publish-preview.cmd` — no new numbered build, no reinstall.
Visible every time a DEMO run ends: the Qualifire mark draws itself forward (as at boot, at
ride start and at real ride end) instead of undrawing backwards. Everything else on the DEMO
tab is unchanged by this brief.

## Open questions / assumptions (logged, not blocking)

1. **Rename `'rev'` → `'end'`** in both `DemoScreen.tsx` (union at 217, four trigger sites,
   the fullscreen effect, the render site) and `RecordScreen.tsx` (brief 15's Open question
   1). Mechanical; a separate chore if Nathan wants the name honest.
2. **`launchAnimation.tsx` header** says "RecordScreen no longer passes `reverse`". After
   this brief no caller does. A one-word amendment ("No screen passes `reverse` any more")
   would be nice; left out to keep this brief's blast radius to one file.
3. **Assumption:** `exitToIdle` is the correct `onDone` for a forward mark. It resets every
   piece of ending-screen state and returns to idle; the mark's direction never fed into it.
   Verified by reading lines 316-334, not by running the app.
