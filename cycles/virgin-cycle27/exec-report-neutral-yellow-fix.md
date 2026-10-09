# Executor report: neutral (reference ride) time = brand yellow

Cause: tierTextColour 'neutral' and chipColors 'neutral' returned t.accentText (daylight #B98A0A).
Sites where a no-verdict time took its colour (day mode): tierColour.ts tierTextColour neutral (feeds activityCard hero/sector chips, liveView clock, RideDetail lap + sector rows + today row, replay); chips.tsx chipColors neutral (RecordScreen lap chip, PreviewScreen chips); RideDetailScreen.tsx x4 `st.big` durationLabel (unranked route, reference-founder, free, plain).
Changed: src/ui/tierColour.ts (neutral -> tierHex.yellow + comments), src/ui/chips.tsx (neutral text -> YELLOW_TIER), src/ui/RideDetailScreen.tsx (4 sites -> tierTextColour('neutral', t)), src/ui/theme.ts (comment only; daylight.accentText NOT changed), tests/ridedetail_suite.ts (neutral assertion rewritten; ACCEPTED_LOW_CONTRAST + neutral/day/card and neutral/day/race.bg 1.60, dated 2026-10-09; contrast tests read the table; new test: no accentText in RideDetailScreen/chips, 4 neutral sites).
Left on accentText (non-time): placePicker.tsx:39, RoutesScreen.tsx:143/158, RecordScreen.tsx:1794 pillTextOn, resultsPlot.tsx:251 link, PreviewScreen.tsx:765 hlinkNum (preview-tab link number; question: confirm it is not a time).
Tests: 967 tests, 964 pass, 0 fail, 3 skip. tsc --noEmit exit 0. Allow-list untouched. No commit.
