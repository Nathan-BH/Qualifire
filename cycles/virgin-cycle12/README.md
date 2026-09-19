# virgin-cycle12 — mojibake fix: em dash / punctuation corrupted in the way-naming card

**Status (2026-09-19): code change made, uncommitted.** Syntax check clean (see Tests —
full `tsc --noEmit` did not finish within a single call's budget on this mount), full test
suite passing, unchanged pass/fail/skip counts from before the fix. Not a behaviour change —
text-only.

## What was investigated

Nathan reported garbled characters on the phone screen (screenshot: the "New way on Home →
Work" card): `SPECIFICATIONS (required) â e.g. Dry, Left` and `Add what made it different to
save it as a new way on this route â this ride becomes its reference`. The `â` followed by a
space stood in for a missing character. He also flagged a second instance mid-investigation:
`no â it was Home → Work`.

## Root cause

Classic UTF-8 → Latin-1 → UTF-8 double-encoding (mojibake), confined to one file:
`app/src/ui/routeNamingCard.tsx`. Its only git commit (`1773a03`, "WP-3 Phase A") already
contains the corruption — it was authored/saved this way, not corrupted afterwards.

Confirmed byte-for-byte: an em dash `—` (U+2014) is 3 UTF-8 bytes, `E2 80 94`. Something —
most likely a Windows/PowerShell step somewhere in this project's edit/save path defaulting
to the wrong codepage — read those 3 bytes as Latin-1, producing 3 separate characters (two
of them invisible C1 control codes), then re-saved that as UTF-8, producing 6 bytes
(`C3 A2 C2 80 C2 94`) that render as `â` followed by nothing visible. Reversing the exact
transform (`text.encode('latin-1').decode('utf-8')`) recovers the original character cleanly
for every hit. The same pattern hit five other punctuation marks in the same file (see
table below).

Checked the rest of the repo (`app/**/*.{ts,tsx,js,jsx,json}`, excluding `node_modules` and
`.git`) for the same byte patterns — this file is the only one affected.

## Fix applied

`app/src/ui/routeNamingCard.tsx` — targeted replacement of the six corrupted byte sequences
back to their correct code points. Each was reversed and verified independently
(`bytes.encode('latin-1').decode('utf-8')`), so nothing else was touched — in particular one
already-correct `≥` elsewhere in the file was left alone.

| corrupted (as stored) | fixed to | occurrences |
| --- | --- | --- |
| `â` + U+0080 + U+0094 | — (em dash) | 16 |
| `â` + U+0080 + `¦` | … (ellipsis) | 1 |
| `â` + U+0089 + `¥` | ≥ | 2 |
| `Â§` | § | 1 |
| `Â·` | · | 2 |
| `Ã` + U+0097 | × | 1 |

23 occurrences across 19 lines — all inside JSX string/template-literal content and one code
comment. No logic changed.

## Tests

**Full `tsc --noEmit`**: did not complete within a single `device_bash` call on this mount
(matches `CLAUDE.md`'s own warning about tsc's call-budget here). Backgrounding it with
`nohup … & disown` and polling in a later call did not work either — each `device_bash` call
runs in its own PID namespace, so a backgrounded process from a previous call is gone by the
next one. Fell back to `ts.transpileModule` (TypeScript's own fast syntax-only parse, no
project-wide type resolution) against the changed file directly — reported zero diagnostics,
i.e. a clean parse. Given the edit is string-literal content only (no types, no imports, no
control flow touched), this is judged sufficient; the full type-check is still listed as an
open item below.

**Test suite**: `node --experimental-strip-types tests/run.ts` → **634 tests: 631 pass, 0
fail, 3 skip** — identical counts to before the fix. No new test was added; there was no new
behaviour to cover.

## Status

**Uncommitted.** Only file changed: `app/src/ui/routeNamingCard.tsx`.

## Not done / open items

- **Full `tsc --noEmit` never completed.** Only the syntax-level check above ran to
  completion. Risk is judged negligible for a string-literal-only change, but flagging per
  the project's own verification rule (`CLAUDE.md` §6).
- **Not routed through Digest → Plan → Execute → Inspect.** Treated as a chore per
  `CLAUDE.md` rule 2 (mechanical, zero ambiguity, no design judgment involved — every one of
  the 23 occurrences is the identical byte-sequence substitution) and made directly instead.
- **No on-device re-check.** Nathan should glance at the way-naming card next time it comes
  up on a ride (or the RECORD screen route-naming flow) to confirm the em dashes, ellipsis,
  `≥1 spec` line, etc. now render as intended rather than `â…`.
- **Possible recurring source not investigated.** This fix addresses the corrupted text as it
  exists today; it does not identify or fix whatever tool/step produced the double-encoding
  in the first place, so a future file authored the same way could reintroduce the same bug.
  Worth keeping an eye out if this pattern (`â` followed by an apparent missing character)
  shows up again elsewhere.

See `COMMANDS.md` in this folder for the exact commands to rerun the checks above.
