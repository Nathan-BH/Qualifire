# Commands — tier colour preview (idea 2), FINAL palette, 2026-10-09

What this publishes: the CURRENT app JS (working tree) as an over-the-air update to the "Qualifire Preview" app on your phone. Publish only AFTER brief 02 (11-brief-tier-colours.md, FINAL rewrite) has been executed and inspected — the tree before that still carries the dropped trial values.
What it changes on your phone: the tier colours — purple #7B3FA8, green #007A00, yellow = the brand yellow #F5C542 — ONE palette in day AND night, on the map line (sector colours must be ON in Settings to see it), on sector / total time text, the live sector strip, gate / finish flashes, the timing tower and the ghost dots. Purple filled chips and the purple ceremony row now carry WHITE text. The yellow tier is the brand yellow again, so a yellow sector on the map looks like the reference line. Known and accepted by you as a trial: purple 2.4:1 and green 2.9:1 on the night card, yellow 1.6:1 on the white day card. Day-mode "no verdict yet" chips keep the darker gold #B98A0A (not a tier colour; say so if you want one day yellow).
JS-only change: no new build needed. Values can be changed again after you have looked (one place: tierHex in app/src/ui/theme.ts, plus the pin test in app/tests/ridedetail_suite.ts). If the working tree also holds the other cycle27 briefs when you publish, they ship too — the publish is the whole tree.

## 1. Dry run (preflight only, publishes nothing)
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -DryRun
```

## 2. Publish
```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
powershell -ExecutionPolicy Bypass -File "C:\Users\natha\Claude personal projects\Qualifire\scripts\publish-preview.ps1" -Message "tier colours FINAL: purple 7B3FA8, green 007A00, yellow = brand F5C542, white chip ink"
```

## 3. On the phone
Open the app on network, close it fully, open it again (two launches is normal for EAS Update). Then: Settings -> sector colours ON, open an ACTIVITIES card (day mode) and compare map line vs times; check night mode too; check a purple (PB) chip and the purple ceremony row read white on purple.

## 4. To go back
Tell Claude; reverting is a one-place edit (tierHex + PURPLE_INK) plus a publish.
