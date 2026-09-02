**Status: NOT STARTED. Blocked on Q2 (see QUESTIONS-FOR-NATHAN.md) — needs Nathan's ruling before a Plan brief is written.**
**Review doc item: 7. Size: medium-large.**

## What it is

The naming card at STOP only takes two names (start/end labels). Nathan wants more: "Dry"/"Left"/"Right"-style specifications on a route. The data model already supports this — a Way can hold several Routes, and RECORD already lists a Way's routes as separate pick options. What's missing: (a) a way to create a SECOND Route on an EXISTING Way from a ride (`draftWayCreation()` currently returns `null` whenever a Way with the ride's exact directed endpoints already exists, so a repeat ride on a known Way can never become a new variant today), and (b) a place to type/pick tags, with recognition of previously-used ones.

## Why it's blocked

Review open question 2: **"free-text tags, a fixed condition vocabulary (Dry/Wet + a free variant name), or both? And are conditions per-route (a new Route under the Way) or per-ride attributes?"** This decides the size of the whole work package — a per-ride attribute is much smaller than a full new-Route-creation flow. Do not plan this until answered.

## Once answered

If variants-as-Routes: this depends on nothing else in this cycle but is meaningfully related to WP-C (drawable user routes) and WP-F (post-stop offer) — a variant-creation flow and the "new way" flow share a lot of the same naming-card/`wayCreation.ts` surface, so sequencing after both would avoid rework.
