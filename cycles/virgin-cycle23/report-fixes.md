# Fix round: inspect findings F2-F5

Baseline (before): 911 tests, 908 pass, 0 fail, 3 skip. After: 912 tests, 909 pass, 0 fail, 3 skip; tsc --noEmit exit 0.

- F2: activityCard.tsx props now `onOpen(card)` / `onMenu(card, anchor)` (card calls them with its own card); RidesScreen.tsx creates `onOpenCard` / `onMenuCard` once with useCallback (tabNav read via a ref), so memo(ActivityCard) props are stable.
- F3: trailCache.ts queue thunk now `new Promise((res) => res(read(id))).then(decimate).catch(() => null).then(finish)`. Deviation from the suggested `Promise.resolve().then(() => read(id))`: that defers the read one microtask and broke the existing FIFO test ("order" assertion); the Promise executor catches a sync throw while keeping the read synchronous. New test in trailcache_suite.ts: sync-throwing reader resolves null, inFlight 0, later ride loads.
- F4: activityMenu.tsx: ActivityMenu returns null when items is empty.
- F5: RideDetailScreen.tsx: onToggleIgnore returns early when busy.
Allow-list untouched (no strings changed). F1/F6 untouched.
