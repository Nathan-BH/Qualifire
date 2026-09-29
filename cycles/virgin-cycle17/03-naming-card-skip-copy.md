# 03 — Naming card: "no — it was Home → Work" becomes "keep it as Home → Work"

**Source: Nathan, 2026-09-29.** His words: "the 'No- it was Home >> Work' text should be
absolutely replaced. I actually do not know when this shows in the app, in which context.
But the text should probably be simplified to just 'Save as From>>To' instead of having
'No-it was...' bullshit."

**Where that text shows (the context Nathan asked about).** It is the skip button of the
naming card in ONE of its three variants: the ride was scored as an existing way of a route
the rider already has (WP-G's "New way on Home → Work" card — `existingRoute` set AND
`matchedWayLabel` set). On the RECORD tab, since cycle15 brief 05, that card never appears by
itself: the rider sees a dim `not Home → Work?` link under the ranking reveal, taps it, and
only then gets the card with ADD WAY and this skip button. On the DEMO tab it is the card
SECOND RIDE (and, until brief 02 lands, TENTH RIDE) shows after the reveal — which is where
Nathan met it. The wording was deliberate in WP-G's day ("no, this isn't a new way — it was
X", the answer to the card's question), and it has been unchanged since virgin-cycle1. It
is not a bug; it is copy that reads badly, and this brief only changes the copy.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-29 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `c98a4a5`). Executor: Sonnet, cold, this file only. Brief 03 of
`virgin-cycle17`; independent of briefs 01 and 02 (different file — they touch
`DemoScreen.tsx`, this touches `routeNamingCard.tsx` only; DemoScreen and RecordScreen pass
props into the card and do not duplicate the string — verified by grep, see Current state).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-29. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency. **The only file touched is `app/src/ui/routeNamingCard.tsx`.** Do not
  touch `RecordScreen.tsx`, `DemoScreen.tsx`, `store/routeCreation.ts`, or any test.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  any other `NN-*.md` brief here, or anything under `cycles/virgin-cycle1/` /
  `cycles/virgin-cycle15/` (history — the WP-G spec stays as it was).
- **Change the one ternary branch only.** The two `'skip — keep it as a plain ride'` branches
  are not Nathan's complaint and stay byte-for-byte.

## Goal

On the "New way on <route>" card, the dim skip line under ADD WAY reads
`keep it as Home → Work` (with the real way label) instead of `no — it was Home → Work`.
Same button, same handler, same style, same position. Nothing else on the card changes.

## Current state (verified 2026-09-29 against the tree)

### `app/src/ui/routeNamingCard.tsx`

- Lines 17-18 of the header: `SKIP is always available and loses` / `nothing — the ride
  itself was already saved before this card exists.` — the contract the new copy must not
  contradict.
- Lines 20-26, the cycle15 brief 05 header paragraph (ends `different.` on line 26, then
  ` */` on line 27).
- Line 46: `matchedWayLabel?: string | null;` — line 50:
  `existingRoute?: { label: string; knownSpecLists: string[][] } | null;` — line 54:
  `onSkip: () => void;`.
- Line 68: `const existingRoute = props.existingRoute ?? null;`
- Lines 94-96, the card title — in this variant it reads `New way on ${existingRoute.label}`.
- Line 97: `{!(existingRoute && props.matchedWayLabel) && (` — the body sentence is dropped
  in exactly the variant whose skip label this brief changes.
- Line 208: `{existingRoute ? 'ADD WAY' : 'CREATE ROUTE'}` — the primary button above the
  skip line.
- **The skip button, lines 210-218:**

  ```tsx
        <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onSkip}>
          <Text style={[st.skipText, { color: t.textDim }]}>
            {existingRoute
              ? props.matchedWayLabel
                ? `no — it was ${props.matchedWayLabel}`
                : 'skip — keep it as a plain ride'
              : 'skip — keep it as a plain ride'}
          </Text>
        </Pressable>
  ```

### What pressing it does (read only — nothing here changes)

- `app/src/ui/RecordScreen.tsx` lines 737-740:
  `const onNamingSkip = useCallback(() => { setNaming(null); setShowAnim('rev'); }, []);` —
  dismisses the offer and starts the end mark. The ride was saved (`rememberRide`) in
  `onEnd`, before the reveal, scored as `matchedWayLabel`. **Nothing new is written on
  skip.**
- `app/src/ui/DemoScreen.tsx` line 550: `const onDemoNamingSkip = useCallback(() => setShowAnim('rev'), []);`
  — same, and the demo writes nothing anyway.

### The string exists nowhere else

`grep -rn "no — it was\|keep it as a plain ride" app/src app/tests` → exactly three hits,
all in `routeNamingCard.tsx` lines 214-216. No test asserts on either string. No screen
duplicates it.

## Decisions (pre-resolved — do not re-open)

1. **New copy: `` `keep it as ${props.matchedWayLabel}` ``** → renders as
   `keep it as Home → Work`. Why this and not Nathan's literal `Save as Home → Work`: the
   button saves nothing (the ride was stored as Home → Work before the card existed —
   header lines 17-18, `onNamingSkip` above), so "save as" would promise a write that does
   not happen; "keep it as" has Nathan's shape (verb + "as" + the way), tells the truth
   about what the press does, and is the same verb as the neighbouring branch's
   "skip — keep it as a plain ride", so the card's two skip lines now read as one family.
   Flagged as Open question 1 — this is a copy call, and Nathan said he does not know the
   context, so his first look at it on the phone is the real review.
2. **No "no —" / "skip —" prefix.** Nathan's objection is the "No- it was…" preamble; the
   dim style and the position under ADD WAY already say "the other option". The other two
   branches keep their "skip —" prefix because they were not complained about and because
   for a *new* route/way "skip" is the honest verb there.
3. **The other two ternary branches are untouched.** Same string, same quotes, same
   indentation.
4. **No change to the header comment's behaviour text**, only a one-line dated note
   appended to the brief 05 paragraph so the file records why the copy changed (the
   repo's dating rule for durable edits to reference comments).
5. **No test added.** The card is UI; no suite renders it, and a string-equality test on
   button copy would only pin what Nathan may re-word tomorrow (Open question 1).

## Files to touch

### 1. `app/src/ui/routeNamingCard.tsx` — the only file

**Edit A — line 214.** Replace

```tsx
              ? `no — it was ${props.matchedWayLabel}`
```

with

```tsx
              ? `keep it as ${props.matchedWayLabel}`
```

Indentation (14 spaces) unchanged. Lines 210-213 and 215-218 unchanged.

**Edit B — header comment.** After line 26 (` * different.`) and before line 27 (` */`),
insert:

```
 * virgin-cycle17 brief 03 (Nathan 2026-09-29): that variant's skip line reads
 * `keep it as <way>` — it was `no — it was <way>`, which he called out. Same
 * button, same onSkip: nothing is written on skip either way.
```

Read lines 20-27 first: if line 26 is not ` * different.` followed by ` */` on 27, report
it and **skip Edit B** (a missing comment anchor is not a reason to stop — but a missing
Edit A line *is*: stop and report).

## Verification

From the repo root:

- `cd app && node --experimental-strip-types tests/run.ts` → **zero FAIL** (no suite touches
  this string; a failure here is a stop, not a test to edit).
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0.
- `grep -rn "no — it was" app/src app/tests` → **no hits**.
- `grep -rn "keep it as" app/src/ui/routeNamingCard.tsx` → exactly **three** code hits on
  lines 214-216 (the new template literal and the two untouched plain-ride strings) plus
  the one header-comment hit from Edit B; the two plain-ride lines still read
  `'skip — keep it as a plain ride'` verbatim.
- `grep -rn "keep it as\|no — it was" app/src/ui/RecordScreen.tsx app/src/ui/DemoScreen.tsx`
  → no hits (nothing else was touched).
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly one file.

## On-device checklist (Nathan, after publish)

1. DEMO → SECOND RIDE → RUN → let it play out → after the tower holds, the "New way on
   Home → Work" card: the dim line under ADD WAY reads **`keep it as Home → Work`**. Tap it →
   end mark → chooser. (Before brief 02 lands, TENTH RIDE shows the same card; after it,
   tap `not Home → Work?` during the reveal to reach it.)
2. DEMO → FIRST RIDE → card: the skip line still reads `skip — keep it as a plain ride`
   (unchanged).
3. RECORD, a real ride on a route you have: under the reveal tap `not <way>?` → the card →
   its skip line reads `keep it as <way>` → tap → the end mark plays and the ride opens,
   scored as that way, exactly as before.
4. RECORD, a real ride between two places with no way yet: the "New route" card's skip line
   still reads `skip — keep it as a plain ride` (unchanged).

## Out of scope

- The other two skip strings (decision 3).
- The card's title, body sentences, ADD WAY / CREATE ROUTE labels, the spec chips.
- The `not <way>?` link's own text on RecordScreen (cycle15 brief 05) and its demo mirror
  (brief 02).
- Any behaviour change on skip — it dismisses and plays the mark; that is not in question.
- iOS (no iOS build). `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md`.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (one string, one comment; no
dependency, no `app.json`/`eas.json` change), so it ships to the Preview APK over EAS Update
via `scripts/publish-preview.cmd` — no new numbered build, no reinstall. Visible wherever
the "New way on <route>" card appears (DEMO SECOND RIDE after the reveal; RECORD after
tapping `not <way>?` under a reveal): its dim skip line reads `keep it as Home → Work`
instead of `no — it was Home → Work`. Every other card, button and behaviour is unchanged.

## Open questions / assumptions (logged, not blocking)

1. **The exact wording is a copy call, flagged for Nathan's eyes.** Chosen: `keep it as
   Home → Work`. The alternatives considered, all one-token swaps at line 214 if he prefers
   one on first sight: `it was Home → Work` (shortest; keeps his "it was" but drops the
   "no —"); `save as Home → Work` (his literal ask; reads as a write that does not happen —
   the ride was already saved as that way); `keep as Home → Work` (same as chosen, minus
   "it"). Nathan wrote "probably", and said he did not know the context — so his first look
   at the real card is the review; a re-word is a one-line chore.
2. **Assumption:** Nathan's "Home >> Work" is the rendered `Home → Work` (the label uses a
   Unicode arrow, `DEMO_ROUTE_LABEL` in `demoModel.ts` line 318 / `wayLabelIn` on the real
   screen); nothing about the arrow glyph changes.
3. **Should the "skip —" prefix go from the other two branches too, for consistency?** Not
   asked; left as is (decision 2). A follow-up if the three lines look uneven side by side.
