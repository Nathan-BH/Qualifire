# Test Review — Qualifire (2026-09-03)

## Positives
- **Map rendering:** Blue location dots display correctly across all views
- **Route save flow:** App correctly prompts to save new routes; work>>home route was successfully created

---

## Issues

### 1. Yellow line visibility on existing routes [HIGH]
**Severity:** UX confusing  
**Description:** Yellow "writing history" line renders on already-mapped routes when user is recording. It should only appear when writing history for new routes.  
**Root cause:** Route state not properly gating yellow line visibility based on whether route is new or existing.  
**Expected behavior:** 
- New/unknown route → show nothing, enable yellow line writing
- Known route → show route overlay, disable yellow line overlay

---

### 2. Route selection not recognized on recording [HIGH]
**Severity:** Core feature broken  
**Description:** User selected `work>>home` as a new route on the RECORD screen. App did not recognize it as new and incorrectly displayed the `home>>work` reference route overlay instead.  
**Root cause:** Route selection state not properly passed through to recording/playback logic; app defaults to first/only known route.  
**Expected behavior:** 
- If route doesn't exist yet, show nothing and allow writing history
- If route exists, show correct route overlay and lock yellow line

---

### 3. Gate placement bug in new route [MEDIUM]
**Severity:** Data visualization broken  
**Route ID:** `20260903-182911-3c34` (work>>home)  
**Description:** Gates display bunched at the center of the route instead of distributed along the path. Route is not usable in current state.  
**Root cause:** Likely gate coordinate mapping or scaling issue during route creation/playback.  
**Action:** Investigate gate position calculation in playback pipeline.

---

## Follow-up Notes
- **Testing date:** 2026-09-04  
- Nathan flagged the recording behavior needs reconciliation: When pressing "record," the app always shows the yellow route reference for `home>>work` regardless of which route option is selected on the RECORD screen.
- Suggested fix approach: Route existence check should gate visibility and interaction state independently.

---

## Next Steps
1. Fix route state detection in recording flow (issues #1, #2 related)
2. Investigate gate coordinate handling for route `20260903-182911-3c34`
3. Test with multiple route combinations (new→new, new→existing, existing→new)
