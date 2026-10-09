# Tier colours on the ACTIVITIES tab: digest

Date: 2026-10-08
Scope: app/src (read-only). Anchors are repo-relative line numbers as read on the device. Device behaviour was NOT run; everything is from source.

## TL;DR
- Day (daylight card): map green #00D000 vs text green #007A00; map yellow #F5C542 vs text yellow #8C6900; map purple #9000C8 vs text purple #9000C8 (identical by code).
- Night (night card): map green #00D000 vs text green #00D000; map yellow #F5C542 vs text yellow #F5C542; map purple #9000C8 vs text purple #C364FF.
- The map and text are two different palettes by design (tierColour.ts:32 vs :67). Only the text palette has day/night variants.
- Map sector colours are OFF by default (settings.tsx:65 sectorColours: false), so the activity map line is plain #F5C542 unless the toggle was turned on.
- Map colours skip interrupted sectors; text colours do not (sectorTrailModel.ts:64 vs rideHistoryModel.ts:30). A tier mismatch per sector is therefore possible without any colour bug.

## 1. Where tier colours are defined

Palette tokens (src/ui/theme.ts):
- theme.ts:15 grey #6f6e6a (no-data only)
- theme.ts:16 purple #9000C8 (filled tier, "fastest of the ranking pool")
- theme.ts:17 purpleDeep #65008C (unreferenced; comment says keep in step with purple)
- theme.ts:18 green #00D000 (outlined tier)
- theme.ts:19 neutral #F5C542 (flat tier / yellow accent; used as YELLOW_TIER)

Theme text tokens (src/ui/theme.ts):
- daylight.accentText #B98A0A (theme.ts:74); daylight.textDim #8A8577 (theme.ts:71); daylight.card #FFFFFF (theme.ts:67)
- night.accentText = colors.neutral #F5C542 (theme.ts:88); night.textDim = colors.inkDim #9a978f (theme.ts:85); night.card #212127 (theme.ts:81)

Tier-specific constants (src/ui/tierColour.ts):
- YELLOW_TIER = colors.neutral #F5C542 (tierColour.ts:15)
- PURPLE_TEXT_NIGHT #C364FF (tierColour.ts:44)
- GREEN_TEXT_DAY #007A00 (tierColour.ts:47)
- YELLOW_TEXT_DAY #8C6900 (tierColour.ts:50)

Ink for text drawn ON a chip (not used for ACTIVITIES text or map): PURPLE_INK #120521 (src/ui/chips.tsx:26)

Map casing: CASING #14120C (src/ui/wayMapView.tsx:178)

Tier type: src/ui/chips.tsx:18 `'none' | 'neutral' | 'yellow' | 'green' | 'purple' | 'est'`; UiTier in src/ui/colourModel.ts:55 `'purple' | 'green' | 'neutral' | 'yellow' | 'est'`.

Helper functions (the single palette API):
- tierLineColour(tier) -> map line colour, src/ui/tierColour.ts:32-39
  purple -> colors.purple #9000C8; green -> colors.green #00D000; yellow -> YELLOW_TIER #F5C542; none/neutral/est -> null (transparent)
- tierTextColour(tier, t) -> text colour on a card, src/ui/tierColour.ts:67-76. Dark ground detected as `t.statusBar === 'light'` (tierColour.ts:68, true only for night).
  Day: purple #9000C8, green #007A00, yellow #8C6900, neutral t.accentText #B98A0A, other t.textDim #8A8577
  Night: purple #C364FF, green #00D000, yellow #F5C542, neutral t.accentText #F5C542, other t.textDim #9a978f
- chipColors(tier, t) -> src/ui/chips.tsx:35-52 (legacy chip palette; comments at chips.tsx:38 and tierColour.ts:58-60 say not to use it for lines or card text). Still used by other screens (e.g. PreviewScreen.tsx:481).

Tier computation (not colour):
- tierFor(value, history) -> src/ui/colourModel.ts:172-178: purple if value < best; green if < mean; else yellow; neutral if history < MIN_HISTORY (=1, colourModel.ts:53); est if value null.

Theme selection (day vs night):
- src/ui/themeContext.tsx:14 `ThemeMode = 'daylight' | 'night'`; :58-59 default; :95 `t: mode === 'daylight' ? daylight : night`
- src/ui/theme.ts:66 daylight, :80 night.

## 2. ACTIVITIES tab, DAY mode: colour source per element

Entry point: src/ui/RidesScreen.tsx:214 title "Activities"; :233-240 renders ActivityCard with `sectorColoursOn={s.sectorColours}` (s = settings).

Card component: src/ui/activityCard.tsx (ActivityCard, line 60). Props `card.heroTier`, `card.sectors[i].tier`, `card.sectorColours`.

(a) Map line (route variant only, `card.variant === 'route'`):
- Data: feedModel.ts:96 `sectorColours: detail.sectorColours`; rideDetailModel.ts:140 `sectorColours: sectorColoursFor(res, secHist)`; rideDetailModel.ts:105-106 `storedSectorColours(result, hist, tierLineColour)`.
- Per-sector: sectorTrailModel.ts:43-46 earnedColour -> tierFor -> tierLineColour; only 'purple'|'green'|'yellow' paint. Only `sec.quality === 'clean'` with a scored time paints (sectorTrailModel.ts:64-66).
- Gate: activityCard.tsx:98 `sectorColours={sectorColoursOn ? card.sectorColours : ALL_YELLOW}`; ALL_YELLOW = [] (sectorTrailModel.ts:41). With [] every span is transparent.
- Lead-in/out: activityCard.tsx:99 `leadColour={... sectorColoursOn ? colors.grey : undefined}` -> #6f6e6a (grey).
- Layer stack in src/ui/wayMapView.tsx (bottom to top):
  - route-casing: line-color CASING #14120C, line-width 7 (wayMapView.tsx:792-794), line-cap round, line-join round, opacity none
  - route-core: line-color colors.neutral #F5C542, line-width 4 (wayMapView.tsx:795-797)
  - trail-casing/core (only if a trail exists; activities 'route' cards draw no trail per activityCard.tsx:14 and card.needsTrail)
  - sector-spans-core: line-color `['case',['has','colour'],['get','colour'],'rgba(0,0,0,0)']` (wayMapView.tsx:858), line-width 4 (:859), cap/join round (:861), opacity none
  - Resolved hex for a tier: purple #9000C8, green #00D000, yellow #F5C542 (from tierLineColour). Unearned spans show base #F5C542 underneath.
- Fill vs stroke: stroke only. No fill, no opacity on sector-spans.
- Basemap under the line: day = OpenFreeMap positron (wayMapView.tsx:189, selected at :390). Basemap is not coloured by tiers, but wayMapStyle.ts applies a palette firewall to basemap `*-color` paints in hue bands 100-140 and 263-303 (wayMapStyle.ts:25-28). That only touches basemap, not route layers.
- Dimming: wayMapView.tsx:715 `dimmed && st.dimmedFrame` (opacity 0.4). ActivityCard does not pass `dimmed` (activityCard.tsx:86-100), so no dimming on the card map.

(b) Sector time text (chip time next to the sector label):
- activityCard.tsx:109 `style={[st.chipTime, { color: tierTextColour(sec.tier, t) }]}`; style activityCard.tsx:150 fontSize 15, weight 800, tabular-nums.
- sec.tier comes from feedModel.ts:97 `tier: r.tier`, which is rideDetailModel.ts:132-140 -> rideHistoryModel.ts:30/244 `tierFor(v, h)` over `scoredS(sec)`.
- Day resolved: purple #9000C8, green #007A00, yellow #8C6900. Non-scored: #B98A0A (neutral) or #8A8577 (est/none, textDim). Sector labels (activityCard.tsx:149) are t.textDim #8A8577, not tier-coloured.

(c) Total / hero lap time:
- activityCard.tsx:68 `const hero = tierTextColour(card.heroTier, t)`; :79 applied as `[st.lap, { color: hero }]`; style activityCard.tsx:134 fontSize 34, weight 800.
- heroTier: feedModel.ts:91 `route ? detail.lapTier : 'neutral'`; rideDetailModel.ts:132 `lapTier: ignored ? 'neutral' : tierFor(lapS, hist)`.
- Day resolved: purple #9000C8, green #007A00, yellow #8C6900; ignored/neutral #B98A0A.
- Plain (free) cards: heroTier 'neutral' -> #B98A0A (feedModel.ts:91).

(d) Other tier-coloured elements on the ACTIVITIES card:
- Rank label (activityCard.tsx:81, style :136): t.text2 #6D6759 (day). Not tier-coloured.
- "Not ranked" label (activityCard.tsx:78, style :137): t.textDim. Not tier-coloured.
- Sector strip bars and PB dots: none on ACTIVITIES (the bar-style strip is in chips.tsx:62-80 StripSlot, used by the live Record screen, not by activityCard.tsx).
- Ride-menu dots (MenuButton, activityCard.tsx:114): no tier colour.

## 3. ACTIVITIES tab, NIGHT mode

Mechanism: the same components read `useTheme()` (activityCard.tsx:65). themeContext.tsx:95 switches `t` to `night` (theme.ts:80). Map style: wayMapView.tsx:390 `styleUrl = themeMode === 'night' ? MAP_STYLE_NIGHT : MAP_STYLE_DAY`, with MAP_STYLE_NIGHT = https://tiles.openfreemap.org/styles/dark (wayMapView.tsx:188). The route/span colours are NOT theme-dependent (no night variant in the map layers).

Resolved night values:
- (a) Map line: green #00D000, purple #9000C8, yellow #F5C542 (same as day; no night variant). Casing #14120C. Basemap = dark style (tile style, not hex-controlled in this repo).
- (b) Sector time text: purple #C364FF (tierColour.ts:44), green #00D000 (tierColour.ts:71 colors.green), yellow #F5C542 (tierColour.ts:72 YELLOW_TIER), neutral #F5C542 (theme.ts:88), est/none #9a978f (theme.ts:85).
- (c) Hero lap time: same mapping as (b).
- (d) Other: no tier-coloured element beyond (a)-(c) on this tab.
- Elements with no night variant that reuse the day value: none for the tier line colours (map). Text tier colours do have a night variant (tierColour.ts:70-72).

## 4. Duplication and hardcoded values

Single source for runtime colours: theme.ts colors object (:11-29) and tierColour.ts helpers. Runtime app code uses tokens; no runtime hex for tiers outside theme.ts and tierColour.ts (except below).

Literal hex occurrences in app source (case-insensitive grep across app/ excluding node_modules, dist, safe_to_delete, _to_delete):
- #00D000: theme.ts:18 (definition); tierColour.ts:45 (comment), :71 (uses colors.green); wayMapStyle.ts:13 (comment); tests only as fixtures/comments (see section 6).
- #9000C8: theme.ts:16 (definition); tierColour.ts:41 (comment); wayMapStyle.ts:13 (comment); tests only.
- #F5C542: theme.ts:19 (definition), :45 (comment); tierColour.ts:48 (comment); tests only.
- #8C6900: tierColour.ts:50 (only in source; the value is not duplicated in app code).
- #007A00: tierColour.ts:47 (value), :45-47 comments.
- #C364FF: tierColour.ts:44 (value).
- #B98A0A: theme.ts:74 (value), tierColour.ts:49 (comment).
- #65008C: theme.ts:17 (unreferenced).
- #120521: chips.tsx:26 (value); tests/ridedetail_suite.ts:18 (mirror, because chips.tsx is JSX and not loadable headless).

Duplicates outside app/src:
- design/canonical/*.svg contains #F5C542 (e.g. design/canonical/catalog_detail_day.svg:24, :26, :62; demo_day.svg:21-22, :40, :46). These are static design mockups, not loaded at runtime (not verified that the app never reads them).
- scripts/recolour-icon.py:25 and :83 use F5C542 as default for an icon recolour (not a runtime value).
- design/drafts/record_finished_draft-green.svg and record_running_draft-green.svg exist (green drafts, hex not itemised here).

Non-hex duplicates (names, logic):
- Tier names in multiple switch statements: chips.tsx:35-52, tierColour.ts:32-39, tierColour.ts:67-76, tower.tsx:85-87 (returns colors.purple / colors.green), PreviewScreen.tsx:414-415, :481, :804-810, :862.
- Map line palette is a separate function from text palette by design (tierColour.ts:17-25 and :52-66 explain why).

## 5. Map-specific colour processing

- No opacity on sector-spans-core (wayMapView.tsx:856-861); stroke only; width 4, same as route-core (wayMapView.tsx:796). Because width matches, the span fully covers the base yellow core where it has a tier colour.
- Casing: CASING #14120C width 7 sits UNDER route-core and trail, but NOT under sector-spans-core (spans are a separate source mounted after trail, wayMapView.tsx:855). So sector colours have no casing and render flat on the basemap.
- Line caps/joins: round/round for route-core, trail, and sector-spans (wayMapView.tsx:784, :794, :797, :861).
- Firewall: wayMapStyle.ts:12-18 and :25-28 flatten saturation only for basemap `*-color` values in hue bands. It does not modify route/span paint.
- No blend modes, no brightness boost, no line-gradient, no dasharray in the sector-spans layer (comment wayMapView.tsx:803-805 forbids dasharray).
- Earlier design note (wayMapView.tsx:838-845): the sector-spans layer was once width 6 and cycle9 changed it to width 4. Yellow tier spans are the same hex as base yellow core, so yellow sectors are visually indistinguishable from unscored stretches (documented, not fixed).
- Settings toggle default OFF: settings.tsx:65 `sectorColours: false`. When off: activityCard.tsx:98 passes ALL_YELLOW=[] -> all spans transparent -> line shows plain route-core #F5C542.

## 6. Tests and guardrails that assert colour values

- tests/ridedetail_suite.ts:17-18 imports tierTextColour, tierLineColour, YELLOW_TIER, PURPLE_TEXT_NIGHT, GREEN_TEXT_DAY, YELLOW_TEXT_DAY.
- tests/ridedetail_suite.ts:179 S1 line colour === colors.purple.
- tests/ridedetail_suite.ts:244-251 every tier gives a #rrggbb in both themes, not PURPLE_INK.
- tests/ridedetail_suite.ts:254-262 WCAG: scored tiers >= 4.5:1 on card; verdict-less >= 3.0:1 (computed).
- tests/ridedetail_suite.ts:266-268 night purple != #9000C8; day yellow != #F5C542; day green != #00D000.
- tests/ridedetail_suite.ts:271-277 night green === colors.green; night yellow === YELLOW_TIER; day purple === colors.purple; neutral === accentText; est/none === textDim.
- tests/ridedetail_suite.ts:281-283 tierLineColour values; null for neutral/est/none.
- tests/ridedetail_suite.ts:288-289 flash colour values (night purple PURPLE_TEXT_NIGHT, day GREEN_TEXT_DAY, YELLOW_TEXT_DAY).
- tests/ridedetail_suite.ts:292-300 contrast on race.bg; text != clock ink.
- tests/waymapgeo_suite.ts:338-344 sectorSpansFeatureCollection passes #9000C8 and #00D000 through to feature.properties.colour (fixture values, not theme-checked).
- tests/feedmodel_suite.ts:46 fixture sectorColours [null, '#00D000', null].
- tests/waymapstyle_suite.ts:7-10, :23 firewall bands (green hue 120, purple hue ~283), fixture '#44CC44'.
- tests/recordflow_suite.ts:404, :508, :511, :537-540: source-text pins requiring tierTextColour use in detail and live views (string match on source, not values).
- tests/live_colour_suite.ts:53 imports tierLineColour.
- tests/ui-strings.allow.json: strings only ("Sector colours" :3063, :1903 mentions green in copy). No colour values asserted there.
- tests/ridenotification_suite.ts:222 asserts the old red #e10600 is absent from index.ts.
- Gap: no test asserts that ActivityCard's map line colour equals its text colour for the same sector (they use different palettes by design).

## 7. Summary table

| Element | Mode | Where used | Hex | file:line |
|---|---|---|---|---|
| Green, map line | day | sector-spans-core, when sectorColours ON and sector clean and green | #00D000 | tierColour.ts:34-36 (tierLineColour -> theme.ts:18); wayMapView.tsx:858 |
| Green, text (sector and hero) | day | chipTime, lap | #007A00 | tierColour.ts:71, :47; activityCard.tsx:79, :109 |
| Green, map line | night | same as day (no night variant) | #00D000 | tierColour.ts:34-36; wayMapView.tsx:858 |
| Green, text | night | chipTime, lap | #00D000 | tierColour.ts:71 (colors.green) |
| Yellow, map line | day | route-core base (always) and sector-spans when yellow | #F5C542 | theme.ts:19; tierColour.ts:36, :15; wayMapView.tsx:796 |
| Yellow, text | day | chipTime, lap | #8C6900 | tierColour.ts:72, :50 |
| Yellow, map line | night | same as day | #F5C542 | as above |
| Yellow, text | night | chipTime, lap | #F5C542 | tierColour.ts:72 (YELLOW_TIER) |
| Purple, map line | day | sector-spans-core | #9000C8 | theme.ts:16; tierColour.ts:34 |
| Purple, text | day | chipTime, lap | #9000C8 | tierColour.ts:70 (colors.purple) |
| Purple, map line | night | same as day (no night variant) | #9000C8 | as above |
| Purple, text | night | chipTime, lap | #C364FF | tierColour.ts:44, :70 |
| Neutral (no verdict) text | day/night | chipTime, lap | #B98A0A / #F5C542 | theme.ts:74 / :88; tierColour.ts:73 |
| est/none text | day/night | chipTime, lap | #8A8577 / #9a978f | theme.ts:71 / :85; tierColour.ts:74 |
| Lead-in/out line | day/night (when on) | sector-spans lead features | #6f6e6a | activityCard.tsx:99; theme.ts:15 |
| Route casing | day/night | route-casing | #14120C | wayMapView.tsx:178, :792-794 |

## Unverified / uncertain
- Device behaviour not run. All hex values are from source; on-screen appearance (antialiasing, MapLibre rendering, phone display gamma) is not checked. "Khaki" for the day text is a perception claim; #8C6900 is a dark ochre, which may be the source of it. Not confirmed.
- Purple difference: in day mode the source gives identical hex for map and text (#9000C8). The reported mismatch for purple fits night mode (#9000C8 map vs #C364FF text) but Nathan also reported green and yellow mismatches, which in night mode are identical in source. Possible explanations: a per-sector tier mismatch (see next point), or a mode difference. Not resolved.
- Per-sector mismatch is possible: text colour uses all sectors with a scored time (interrupted included, rideHistoryModel.ts:30 and :244), while the map skips non-clean sectors (sectorTrailModel.ts:64). A sector interrupted but earned purple/green shows a coloured time and a base-yellow line. Code-derived; not seen on device.
- Sector map colours are OFF by default (settings.tsx:65). Unknown whether Nathan's device has the toggle on. If off, the map line is plain #F5C542 in both modes, and any coloured line he sees implies the toggle is on.
- Whether the design/canonical SVG files or the scripts/recolour-icon.py colours are read at runtime was not checked.
- Did not check core/ (shared model package) for colour constants; grep over app/ only, plus scripts/ and design/ for hex.
- Did not check the git state of the repo or whether the working tree matches HEAD.
