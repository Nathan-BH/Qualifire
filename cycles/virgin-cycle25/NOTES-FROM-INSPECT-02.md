# Inspect-02 notes to carry (coordinator, not yet actioned)
- Way row is ~38 dp, not 36: WAY_ROWS_MAX_H 108 clips a 3rd way row by ~6 dp (scrolls). Suggested 116 (sheet ~360 of 380). On-device tuning item.
- plotSel is never cleared: switching back to a way or reopening the route shows the old caption.
- Camera pad 400 applies even when no plot is shown.
- 4 mutations uncaught by tests (way-keyed selection, sheetRoute max height, borderless inline frame, height prop): each needs a one-line pin.
Full detail: inspect-report-02.md
