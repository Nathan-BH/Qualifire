# Execution escalations — virgin-cycle7

## BRIEF-red-light-removal.md — R2 code vs. Acceptance-criteria grep (self-contradiction in the brief)

**What the brief says (R2):** replace the load effect with an exact code block that includes
the literal line:
```ts
        delete (saved as Record<string, unknown>).redLight; // virgin-cycle7: setting retired; scrub old files
```
This is an unambiguous, verbatim instruction — implemented exactly as given at
`app/src/ui/settings.tsx:99`.

**What the brief also says (Acceptance criteria):**
> `grep -rn "redLight\|RedLight\|redFlag\|HOLD CLOCK" app/src` → **no output**.

**Why this is a contradiction, not a normal line-shift issue:** R2's own exact code snippet
necessarily contains the substring `redLight` (it has to reference the JSON key by name to
delete it from `saved`). Running the acceptance grep after R2 is applied will always show
exactly one hit — the R2 line itself — no matter how faithfully R2 is implemented. The brief
does not resolve which instruction wins (e.g. by scoping the acceptance grep to exclude that
one line, by phrasing R2's code without the literal identifier, or by accepting "no output
except the R2 scrub line" as the real bar).

**What I did:** implemented R2 exactly as written (it is unambiguous on its own), left the
acceptance-criteria grep un-relaxed, and am reporting the resulting single-line grep hit
verbatim rather than deciding myself whether that's an accepted exception or a brief text
that needs correcting. Everything else in the brief (R1, R3, R4, R5/R6 non-edits) has zero
remaining hits and needs no ruling.

**Verbatim current grep result** (`grep -rn "redLight\|RedLight\|redFlag\|HOLD CLOCK" app/src`):
```
app/src/ui/settings.tsx:99:        delete (saved as Record<string, unknown>).redLight; // virgin-cycle7: setting retired; scrub old files
```

Not implemented pending this ruling: nothing was left undone — R2's code is in place. What's
open is only whether the acceptance-criteria wording needs a fresh Fable to amend it (e.g. to
say "no output other than the R2 scrub line") so a future coordinator/tester isn't confused by
a "failing" acceptance grep that is actually R2 working as designed.

---

### Resolution — 2026-09-15, Inspect pass (fable, fresh context) — CLOSED

**Ruling: expected exception. The code is correct as committed (`64d34bb`); the brief's
acceptance wording was imprecise, and has been amended.**

Why the code stays as it is:
- The grep criterion's purpose is "no *live* reference to the retired feature" — no type, field,
  default, row, button or style. The R2 line is the opposite of a live reference: it is the one
  line whose whole job is to erase the feature's trace from phones' disks. You cannot delete a
  JSON key without naming it.
- Avoiding the identifier was considered and rejected. Obfuscating it (`['red' + 'Light']`) makes
  the code worse to satisfy a grep. A generic "drop every key not in `DEFAULTS`" filter would
  avoid the name, but is a different policy with wider behaviour (an older build launched after
  a newer one would silently strip keys it doesn't know) — R2 deliberately chose a targeted,
  versionless scrub, and the brief's footprint rule forbids the redesign. The comment itself
  contains no `redLight`; only the identifier does, so no wording change helps.

What changed: `BRIEF-red-light-removal.md` → Acceptance criteria, first bullet, now reads
"exactly one hit: the R2 scrub line … any *other* hit is a failure". No code touched.

Re-verified by the Inspect pass itself on the current tree (post-`64d34bb`):
`grep -rn "redLight\|RedLight\|redFlag\|HOLD CLOCK" app/src` → the R2 line only;
same grep over `app/tests` and `app/core` → nothing; `./node_modules/.bin/tsc --noEmit` → exit 0;
`node --experimental-strip-types tests/run.ts` → 586 tests: 583 pass, 0 fail, 3 skip.
Executor's stop was correct procedure — the brief was self-contradictory — not an error.
