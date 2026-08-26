# WP — RESULT tab ranking integrity: P10-of-11 vs P9, "10 rides on file", and the hidden PB ride (cycle 025)

**Status: PROPOSAL ONLY. Every item below is labelled UNBUILT — nothing in this document has
been implemented, and no app code was touched or read in producing it.** Prepared 2026-08-25
from the 2026-08-25 ride-day review. All code-location statements below are inherited from the
source reviews and are hypotheses until an executor verifies them at HEAD; the source review
itself states it did not re-read app code (`qualifire-20260825-review.md`, closing italics,
line 108).

**Confidence:** the bug's *existence* is CONFIRMED (Nathan's screenshot, verified point by point
in the review). The *mechanism* — two correct computations over two different populations, with
a hidden 11th ride holding the PB — is a HIGH-confidence hypothesis from screen arithmetic, with
one named rival theory to rule out in code. **Size: small-to-medium** (one decision + a
contained code pass + one label fix).

## The bug, in Nathan's words

From `qualifire-20260825-notes.md` via the review: *"RESULT tab was inconsistent … P10 out of
P11 and below it places my 'today' ride at P9?"* Verified in
`data/activities/TEST in app rides/qualifire-20260825/qualifire-20260825-review.md`:

- Anomaly 1 (line 11): header says today's Morning ride is **P10 of 11**; the list below places
  **today at P9** and says **"10 rides on file."**
- Screenshot section (lines 66–70): full transcription of the list (P1 Sun 16 Aug 13:40 … P10
  Thu 13 Aug 15:03), card PB **13:36.6**, sector PBs S1 2:57.4 / S2 3:21.5 / S3 3:55.8.

## The reconciliation hypothesis (and its rival)

From review anomaly 1 (line 11), both restated here so the executor tests them rather than
rediscovering them:

- **Primary (favoured):** an 11th, pre-10-Aug ride exists on file holding the 13:36.6 PB. The
  list shows exactly 8 rides faster than today's 14:30.7; add the hidden ride → 9 faster → P10
  of 11, exactly the header. Fastest ride *in the list* is 13:40 — a 3.4 s gap to the card's PB
  that no rounding explains. Under this reading the header is **correct**, and the list has two
  bugs: the "10 rides on file" label (there are 11 — should say 11, or "last 10 shown"), and
  P1–P10 labels that are subset ranks masquerading as route ranks.
- **Rival (weaker, must be ruled out in code):** 13:36.6 is a *composite* of sector PBs
  (S1+S2+S3 = 10:14.7, leaving a plausible 3:21.9 for S4) rather than a real ride — explains
  the PB gap but not the "of 11".

## Proposals — all UNBUILT

**P1 — UNBUILT — Code pass: what feeds the header vs. the list.** (Small.) Identify the two
data paths (last-ride card rank vs. the route-history list) and their populations. Check the
on-phone results store for a pre-2026-08-10 Morning ride at 13:36.6 — its presence/absence
settles primary vs. rival in one query. Zero-code companion check for Nathan (review line 11):
if route history can be scrolled or exported past 10 entries in the app, the 11th ride is
either there or it isn't.

**P2 — UNBUILT — Choose one ranking universe, then fix the labels.** (Small code; the decision
is the real content.) Per the review (line 90): *"the fix is a decision, not just code: either
the list's P-numbers should be global ranks (so today would show P10 and the numbers would skip
where hidden rides fall), or the list should stop using the P-word for what is really just
'position in the last 10.'"* The review's vote — global ranks — is recorded but NOT ratified;
see NEEDS-NATHAN — **now ruled, and it DOES change the window:** Nathan's 2026-08-26 ruling
makes the comparison pool the 9 most recent previous rides plus the current ride (10 total),
amending D-037's last-10. So the fix is both labelling AND a one-line window change
(last-10 → previous-9), applied identically to header and list.

**P3 — UNBUILT — Rank through the store's `ranks()`, not a new lookalike.** (Guard-rail for
P2's implementation.) **B-117** already records that both RIDES and RESULT rank via a local
lookalike of the results store's own `ranks()` and will silently mis-rank a tripwire-demoted
lap. Whoever implements P2 should route the fixed ranking through the store's `ranks()` and
close B-117 in the same pass rather than deepening it. (B-117 is cited, not re-proposed — it is
already tracked in `product/BACKLOG.md`.)

**P4 — UNBUILT — Write the headline-time definition into the spec.** (Tiny, doc-only.) First
hard proof captured this ride (review line 26): the RESULT card's 14:30.7 equals the file's
gated START→FINISH 14:30.76, while button-to-button was 15:43.4 — they differ by over a minute
on this very ride. The headline time being *gated* time is the honest choice and should be
recorded in the spec so it never regresses silently.

## Already tracked nearby — cite, don't duplicate

- **B-44** (DONE, cycle 013) — superficially similar ("10 rides read P1 of 11") but a different
  bug: today's lap sitting inside its own comparison history. Fixed and regression-locked; do
  not reopen. The current anomaly survives that fix and is arithmetically distinct.
- **B-117** (OPEN) — see P3. **B-118 / B-119** (OPEN, cosmetic) — same screens, unrelated
  defects; an executor touching `ResultScreen` may close them opportunistically but they are
  not this WP's acceptance.
- **D-037** (window = last-10) — context for P2, unchanged by this WP.

## NEEDS-NATHAN

1. ~~Ratify the ranking universe~~ — **RULED 2026-08-26: recency window, not global ranks.**
   Nathan: compare the current ride against the 9 most recent previous rides only — the current
   ride gets a position out of 10 ("P_n of 10"). A faster-but-older ride outside that window
   does not count; there is NO global route ranking anywhere on this screen. This rejects the
   review's global-ranks vote AND amends the window: previous-9-plus-current (10 total), not
   last-10-plus-current (11 total). Header and list must use this identical universe, so
   "P10 of 11" becomes impossible by construction. Principal note: this amends D-037
   (window = last-10) and needs a decision-record update in the same cycle.
2. ~~The two-minute in-app check in P1~~ — **ANSWERED 2026-08-26:** no in-app way to scroll or
   export a route's full history exists yet. Nathan's oldest *in-app* ride (both installs) is
   2026-08-16; anything older on file came from the initial Strava seed export
   (`data/activities/`, everything outside `TEST in app rides/`). So P1's hidden-11th-ride
   check runs against the seed results on the PC, not on the phone: look for a pre-2026-08-10
   Morning ride at 13:36.6 in the seed data.

## What this document is not

Not a backlog edit, not a decision, not an implementation. An explicitly UNBUILT proposal set
per `process/CYCLE.md` ("A proposal — explicitly labelled as unbuilt").
