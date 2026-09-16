# virgin-cycle10 -- commands

Copy-paste commands for this cycle only. Run from the repo root unless noted.

## Rerun the checks this cycle relied on

```
cd app
node ./node_modules/typescript/bin/tsc --noEmit
```

```
cd app
node --experimental-strip-types tests/run.ts
```

To see just the new test:

```
cd app
node --experimental-strip-types tests/run.ts 2>&1 | grep -i gateHalfLenM
```

## Build/run the app to eyeball the fix on device

Standard Expo dev flow (see `app/package.json`'s `scripts`) -- pick whichever you already use
day to day:

```
cd app
npm start
```

or, for a fresh native Android build:

```
cd app
npm run android
```

Once running: start or open a ride, let the live map draw, then:

1. Zoom in / follow mode (e.g. tap "me") -- gate ticks should look exactly as they did before
   this fix (short bars across the route).
2. Tap "fit" to see the whole ride -- gate ticks should now stay visible short bars instead of
   collapsing to dots.
3. Try a slow pinch-zoom from in to out -- watch for any visible "pop"/jump in tick length as
   you cross zoom levels (this only updates on gesture/animation end, not continuously
   mid-gesture, per the README's "Not done" note on the symbol-layer alternative).
