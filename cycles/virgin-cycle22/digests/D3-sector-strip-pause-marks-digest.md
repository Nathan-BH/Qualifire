# Sector Strip Pause Marks (||) — Digest

**Haiku Digest, 2026-10-04, unverified by Inspect; for Fable to plan from**

---

## Summary

The two vertical lines (||) that appear above sector labels (S1, S2, S3...) in the sector strip render as a pause glyph (‖, Unicode U+2016) **appended to the sector label text** when that sector contains ≥1.0 second of stationary/stopped time. The feature is entirely **live**; the `interrupted` flag comes from the offline timing pipeline run on-demand each gate-fire, not from post-ride analysis.

---

## Render Code

**Component:** `StripSlot` — app/src/ui/chips.tsx:124

**Label generation:** app/src/ui/liveView.tsx:165–176, in `viewModelFromEngine()`:
```typescript
label: sec.interrupted ? `${label} ‖` : label,
```

When `sec.interrupted` is true, the sector label text (e.g., "S1") becomes "S1 ‖".

The ‖ character is U+2016 (double vertical line), not two separate pipe characters.

---

## Trigger Condition

**Threshold:** Stopped time ≥ 1.0 second **inside the sector boundaries** (gate-to-gate).

**Source:** app/core/src/timing.ts:7–8
```typescript
export const INTERRUPTED_STOP_S = 1.0;
```

**Logic:** app/core/src/timing.ts:68–70
```typescript
const st = stoppedTimeBetween(ride.t, ride.stopped, tA, tB);
const flag: SectorFlag = st >= INTERRUPTED_STOP_S ? 'interrupted' : 'clean';
```

The `stoppedTimeBetween()` function (app/core/src/kinematics.ts:41–51) sums the durations of all points within the sector boundaries where the `stopped` Uint8Array flag is set to 1.

---

## Data Flow

1. **Live during recording:** Engine fires a gate → `recompute()` runs (app/src/live/engine.ts:958)
2. **Offline pipeline:** Core timing module computes sector flags over the buffer of fixes recorded so far
3. **Flag mapping:** `row.flag === 'interrupted'` → `interrupted: true` in sector state (app/src/live/engine.ts:1010)
4. **UI:** `viewModelFromEngine()` checks `sec.interrupted` and appends ‖ to label (app/src/ui/liveView.tsx:172)

---

## When It Appears

- **Live only:** Renders during recording as each gate fires and the offline pipeline recomputes sector quality
- **Per sector:** One sector at a time; a sector may have ‖ before the rider enters the next gate
- **Post-ride:** The flag persists in stored results and renders in ride detail/replay via the same `sector.interrupted` field

---

## Related Data

**Stopped time breakdown:** Each sector in state also carries:
- `rawS`: total elapsed time (gate-to-gate)
- `stoppedS`: duration of stopped/stationary phases within the sector
- `movingS`: rawS − stoppedS (used for D-008 colouring)

**Stop source:** The `stopped` Uint8Array comes from the location module and reflects fix-by-fix kinematics (speed ≤ threshold). The stationary run collapsing and chainage projection in `app/src/live/userRefs.ts` (stopChainageM) is used only for gate seeding, not for rendering the interrupted mark.

---

## Tests & Comments

**Test fixtures:** app/tests/fixtures/detour_eveningb.json shows sector 1 with `"flag":"interrupted"` and `"stoppedS":136` (136 s of stopped time).

**Test cases:**
- app/tests/live_suite.ts:110–111: Asserts `offline.flag === 'interrupted'` ↔ `sector.interrupted`
- app/tests/live_colour_suite.ts:604–616: Documents that founding rides with internal stops are marked 'interrupted'
- app/tests/live_colour_suite.ts:750: Timing-mode test for interrupted sectors

**UI strings:** No string entry for ‖ in app/tests/ui-strings.allow.json — it is a static Unicode glyph, never localised.

---

## Quality Mapping (for context)

From app/store/derive.ts:11–14 (offline quality classification):
- `clean` → no stop, or stop < 1.0 s inside
- `interrupted` → stop ≥ 1.0 s inside; **moving time still real** (D-008 difference)
- `excluded_offroute` / `excluded_nocross` → missed (D-015 detour or gate not crossed)

The ‖ glyph appears only for `interrupted`; `clean` has no glyph; `missed`/`estimated` render no sector at all or with grey text and no bar.

