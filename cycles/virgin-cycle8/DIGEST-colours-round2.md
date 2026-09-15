# Digest: Colour Round 2 — Current State (c9db5d5)

This digest captures the current colour definitions and all references to the hex codes `#9000C8` (purple), `#00D000` (green), and `#F5C542` (yellow) across the Qualifire repo as of commit c9db5d5 (2026-09-15). The colour update from round 1 is: purple `#A667F0`→`#9000C8`, green `#3ED598`→`#00D000`, yellow unchanged `#F5C542`.

Round 2 will replace these with: purple `#6D4E9C`, green `#8BCD39`, yellow `#FFDE6D`.

---

## 1. app/src/ui/theme.ts — Colors Object

**Lines 11–29: Full `colors` object with definitions**

```
11  export const colors = {
12    bg: '#0A0A0A', // --bg-screen
13    ink: '#F4F2EC', // --ink
14    inkDim: '#9a978f', // --ink-dim
15    grey: '#6f6e6a', // --grey — NO-DATA only
16    purple: '#9000C8', // filled tier — fastest of the ranking pool (colourModel.ts)
17    purpleDeep: '#65008C', // darker purple (channels x0.7 of `purple`) — unreferenced today; keep in step with `purple`
18    green: '#00D000', // outlined tier — above the pool's recent average
19    neutral: '#F5C542', // flat tier / accent — warm, never grey
20    white: '#FFFFFF', // structural markers (gates) — not a tier colour
21    amber: '#E8A33D', // warnings (D-013: this, not red)
22    riderBlue: '#2F7DE1', // rider dot — the universal "you are here" hue; never a tier colour (D-030), never red (D-013)
23    card: '#141414',
24    cardBorder: '#232323',
25    panel: '#1e1e23',
26    panelBorder: '#2c2c33',
27    btnBorder: '#2e2e2e',
28    linkText: '#b5b3ac',
29  } as const;
```

**Key points:**
- `purpleDeep` (line 17) is explicitly noted as "darker purple (channels x0.7 of `purple`) — unreferenced today; keep in step with `purple`"
- All three tier colours are defined: `purple` (filled), `green` (outlined), `neutral` (flat)

---

## 2. app/src/ui/wayMapStyle.ts — Palette Firewall Logic

**Lines 12–18: D-030 palette firewall definition and hex codes**

```
12   *  2. Palette firewall (D-030, ALWAYS applied, independent of hideLabels):
13   *     colors.green (#00D000, hue 120) and colors.purple (#9000C8, hue
14   *     ~283) in theme.ts are score-only colours — the basemap may never wear
15   *     a colour close enough to read as a tier verdict. Any '*-color' paint
16   *     value landing within ±20° of either hue, with enough saturation to
17   *     actually read as a colour rather than a near-grey, gets its
18   *     saturation flattened; hue, lightness and alpha are left alone.
```

**Lines 24–27: Firewall hue bands (numeric degree bands)**

```
24  const GREEN_HUE_MIN = 100;
25  const GREEN_HUE_MAX = 140;
26  const PURPLE_HUE_MIN = 263;
27  const PURPLE_HUE_MAX = 303;
```

**Line 28: Saturation threshold**

```
28  const SAT_THRESHOLD = 25; // percent — above this a colour reads as a colour, not a near-grey
```

**Line 29: Flattened saturation value**

```
29  const FLATTENED_SAT = 20; // percent — the value the firewall clamps down to
```

**Lines 110–113: Core firewall logic**

```
110 function inFirewallBand(h: number): boolean {
111   return (h >= GREEN_HUE_MIN && h <= GREEN_HUE_MAX) || (h >= PURPLE_HUE_MIN && h <= PURPLE_HUE_MAX);
112 }
113 
114 /** Applies the firewall to one paint-property value. Arrays/objects
115  * (style-spec expressions) and anything that doesn't parse as a plain
116  * colour string pass through byte-for-byte untouched. */
117 function firewallValue(v: unknown): unknown {
118   if (typeof v !== 'string') return v;
119   const hsl = parseColorString(v);
120   if (hsl === null) return v;
121   if (inFirewallBand(hsl.h) && hsl.s > SAT_THRESHOLD) {
122     return formatHsl({ ...hsl, s: FLATTENED_SAT });
123   }
124   return v;
125 }
```

---

## 3. app/tests/waymapgeo_suite.ts — Colour Test References

**Lines 387–403: Sector colour span test with hex codes**

```
387   const none = sectorSpansFeatureCollection(a);
388   assert(none !== null, 'expected spans with no colours arg');
389   for (const feat of none!.features) {
390     assert(!('colour' in feat.properties), 'no sectorColours given but a span carries colour');
391   }
392   const withColours = sectorSpansFeatureCollection(a, [null, '#9000C8', null, '#00D000', null]);
393   withColours!.features.forEach((feat, k) => {
394     const sector = k + 1;
395     if (sector === 1) {
396       assert(feat.properties.colour === '#9000C8', `sector 1 expected #9000C8, got ${feat.properties.colour}`);
397     } else if (sector === 3) {
398       assert(feat.properties.colour === '#00D000', `sector 3 expected #00D000, got ${feat.properties.colour}`);
399     } else {
400       assert(!('colour' in feat.properties), `sector ${sector} should carry no colour property`);
401     }
402   });
403   const withEmpty = sectorSpansFeatureCollection(a, [null, '', '#123456', null, null]);
```

---

## 4. app/tests/waymapstyle_suite.ts — Palette Firewall Test Header

**Lines 1–11: File header with firewall band documentation and hex codes**

```
1   /**
2    * patchMapStyle suite (B-51) — pure, no native module. Builds a small
3    * synthetic MapLibre style and checks both jobs: label visibility toggling
4    * and the D-030 palette firewall.
5    *
6    * NOTE on the swatches (virgin-cycle7, 2026-09): the firewall bands are ±20°
7    * around QUALIFIRE's actual tier hues — colors.green #00D000 (hue 120) →
8    * [100,140], colors.purple #9000C8 (hue ~283) → [263,303] — i.e. the firewall
9    * protects the app's own tier colours, not "green"/"purple" in general. The
10   * in-band green swatch below is '#44CC44' (hue 120, S ~57%) for that reason.
11   */
```

---

## 5. Marketing & Product Files — Hex Code Grep Results

### marketing/HYPERFRAMES-PLAN.md

```
291   yellow `#F5C542`** (ink-on-yellow `#17171b` for text ON a yellow surface)
292   
293   - Earned only: **earned green `#00D000`**, **earned purple `#9000C8`** —
```

### marketing/PLAN.md

```
347   yellow `#F5C542`** (ink-on-yellow `#17171b` for text ON a yellow surface)
348   
349   - Earned only: **earned green `#00D000`**, **earned purple `#9000C8`** —
```

### marketing/guides/VIDEO-EDITING-GUIDE.md

```
41   - **Colours** — hex codes in the `<style>` block (ink `#F4F2EC`, yellow `#F5C542`,
42     green `#00D000`, purple `#9000C8` — copy from `app/src/ui/theme.ts`); the SECTOR_COLORS line:
43     `var SECTOR_COLORS = ['#F5C542', '#00D000', '#F5C542', '#9000C8'];`
```

### marketing/silent-studio/_map/map-capture.html

```
11     #dl { font-size: 16px; padding: 8px 18px; background: #F5C542; color: #17171b; border: 0; border-radius: 8px; font-weight: 800; letter-spacing: 1px; cursor: pointer; }
...
31       <polyline id="chk-core"   fill="none" stroke="#F5C542" stroke-width="6"  stroke-linejoin="round" stroke-linecap="round" />
...
45     var SECTOR_COLORS = ['#9000C8', '#F5C542', '#9000C8', '#9000C8'];  // sector k ends at gate k; sector 4 ends at the finish
```

### marketing/silent-studio/_map/route-alt-wet-loop_0904-2144.html

```
11     #bar b { color: #F5C542; }
...
38     var SECTOR_COLORS = ['#9000C8', '#F5C542', '#9000C8', '#9000C8'];
...
60         layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#F5C542', 'line-width': 6 } });
```

### marketing/silent-studio/_map/route-current_0903-1828.html

```
11     #bar b { color: #F5C542; }
...
38     var SECTOR_COLORS = ['#9000C8', '#F5C542', '#9000C8', '#9000C8'];
...
60         layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#F5C542', 'line-width': 6 } });
```

### marketing/silent-studio/colours/index.html

```
103       <p class="caption tier" style="color:#F5C542;">Yellow.</p>
...
110       <p class="caption tier" style="color:#00D000;">Green.</p>
...
117       <p class="caption tier" style="color:#9000C8;">Purple.</p>
...
153     tierBeat(4.0, '#nb-y', 620, '#F5C542', '#cap3', 0.7);
...
158     tierBeat(9.0, '#nb-g', 440, '#00D000', '#cap4', 0.7);
...
164     tierBeat(14.0, '#nb-p', 250, '#9000C8', '#cap5', 0.9);
```

### marketing/silent-studio/gates-saving/index.html

```
64       border-radius: 48px; border: 4px solid #F5C542; background: #F5C542;
...
80     #rank-pos { font-size: 40px; font-weight: 800; color: #9000C8; opacity: 0; }
...
85     .rrow.today .who, .rrow.today .time { color: #9000C8; }
...
93     .trow.today .rk, .trow.today .who, .trow.today .time { color: #9000C8; }
...
114           <path data-hf-id="hf-ze3x" id="route-core" fill="none" stroke="#F5C542" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" />
115           <path data-hf-id="hf-l2w9" class="sector" id="sec1" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
116           <path data-hf-id="hf-si8b" class="sector" id="sec2" fill="none" stroke="#F5C542" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
117           <path data-hf-id="hf-ofvj" class="sector" id="sec3" fill="none" stroke="#9000C8" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
118           <path data-hf-id="hf-3itu" class="sector" id="sec4" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
...
152     var SECTOR_COLORS = ['#00D000', '#F5C542', '#9000C8', '#00D000'];  // sector k ends at gate k; sector 4 ends at the finish
```

### marketing/silent-studio/ranking/index.html

```
65     border-radius: 48px; border: 4px solid #F5C542; background: #F5C542;
...
93     .trow.today .who, .trow.today .time { color: #9000C8; }
...
113       <path id="route-core"   fill="none" stroke="#F5C542" stroke-width="6"  stroke-linejoin="round" stroke-linecap="round" />
114       <path class="sector" id="sec1" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
115       <path class="sector" id="sec2" fill="none" stroke="#F5C542" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
116       <path class="sector" id="sec3" fill="none" stroke="#9000C8" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
117       <path class="sector" id="sec4" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
118       <g class="gate" id="gate1" opacity="0"><line class="gc" stroke-width="8" stroke-linecap="round" /><line class="gk" stroke="#F5C542" stroke-width="3" stroke-linecap="round" opacity="0.6" /></g>
119       <g class="gate" id="gate2" opacity="0"><line class="gc" stroke-width="8" stroke-linecap="round" /><line class="gk" stroke="#F5C542" stroke-width="3" stroke-linecap="round" opacity="0.6" /></g>
120       <g class="gate" id="gate3" opacity="0"><line class="gc" stroke-width="8" stroke-linecap="round" /><line class="gk" stroke="#F5C542" stroke-width="3" stroke-linecap="round" opacity="0.6" /></g>
...
176     var SECTOR_COLORS = ['#00D000', '#F5C542', '#9000C8', '#00D000'];  // sector k ends at gate k; sector 4 ends at the finish
```

### marketing/silent-studio/start-ride/index.html

```
63     border-radius: 48px; border: 4px solid #F5C542; background: #F5C542;
...
78     #rank-pos { font-size: 40px; font-weight: 800; color: #9000C8; opacity: 0; }
...
83     .rrow.today .who, .rrow.today .time { color: #9000C8; }
...
91     .trow.today .rk, .trow.today .who, .trow.today .time { color: #9000C8; }
...
113           <path data-hf-id="hf-ze3x" id="route-core" fill="none" stroke="#F5C542" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
114           <path data-hf-id="hf-pfcd" class="sector" id="sec1" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
115           <path data-hf-id="hf-si8b" class="sector" id="sec2" fill="none" stroke="#F5C542" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
116           <path data-hf-id="hf-ofvj" class="sector" id="sec3" fill="none" stroke="#9000C8" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
117           <path data-hf-id="hf-sgbe" class="sector" id="sec4" fill="none" stroke="#00D000" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0" />
118           <g data-hf-id="hf-f0p9" class="gate" id="gate1" opacity="0"><line data-hf-id="hf-c7by" class="gc" stroke-width="8" stroke-linecap="round" /><line data-hf-id="hf-qy5d" class="gk" stroke="#F5C542" stroke-width="3" stroke-linecap="round" opacity="0.6" /></g>
119           <g data-hf-id="hf-4pe2" class="gate" id="gate2" opacity="0"><line data-hf-id="hf-2a6a" class="gc" stroke-width="8" stroke-linecap="round" /><line data-hf-id="hf-sa5x" class="gk" stroke="#F5C542" stroke-width="3" stroke-linecap="round" opacity="0.6" /></g>
120           <g data-hf-id="hf-eh3b" class="gate" id="gate3" opacity="0"><line data-hf-id="hf-2ohb" class="gc" stroke-width="8" stroke-linecap="round" /><line data-hf-id="hf-th30" class="gk" stroke="#F5C542" stroke-width="3" stroke-linecap="round" opacity="0.6" /></g>
...
153     var SECTOR_COLORS = ['#00D000', '#F5C542', '#9000C8', '#00D000'];  // sector k ends at gate k; sector 4 ends at the finish
```

### marketing/silent-studio/teaser/index.html

```
109     color: #F5C542;
...
135     color: #F5C542;
...
157         <line data-hf-id="hf-wvr5" id="slash" x1="291.355" y1="253.355" x2="387.5206" y2="349.5206" fill="none" stroke="#F5C542" stroke-width="30" stroke-linecap="round" />
...
220     var SECTOR_COLORS = ['#F5C542', '#00D000', '#F5C542', '#9000C8'];
```

### marketing/website/index.html

```
25       --yellow: #F5C542;
...
27       --green: #00D000;
28       --purple: #9000C8;
...
419       <line x1="291.355" y1="253.355" x2="387.5206" y2="349.5206" fill="none" stroke="#F5C542" stroke-width="30" stroke-linecap="round"/>
...
434         <line id="q_tail" x1="291.355" y1="253.355" x2="387.5206" y2="349.5206" fill="none" stroke="#F5C542" stroke-width="30" stroke-linecap="round"/>
...
475           <path id="route-core" fill="none" stroke="#F5C542" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"
...
603         <line x1="291.355" y1="253.355" x2="387.5206" y2="349.5206" fill="none" stroke="#F5C542" stroke-width="30" stroke-linecap="round"/>
```

### product/MAP-CONTRACT.md

```
99   **Route/gates/dot on real tiles.** Route line: 4 pt core (#F5C542, unchanged) + 2 pt near-black casing
...
112   `colors.neutral` (#F5C542) — this is the **yellow scored-tier** colour (`chips.tsx` `YELLOW_TIER = colors.neutral`),
...
115   use ("yellow *surfaces*… stay #F5C542 everywhere" — START/Export use it as brand accent, not score); not
...
143   near-white halo (~70% opacity) → 3 pt near-black casing (up from 2 pt) → 4 pt route-colour core (#F5C542,
```

### product/MAP-TILES.md

```
97     <Layer id="route-line" type="line" paint={{ 'line-color': '#F5C542', 'line-width': 4 }} />
...
104   Both match `08_build_route_assets.py`'s constants exactly: CASING `#14120C` (RGB 20,18,12), route yellow `#F5C542` (RGB 245,197,66).
```

### product/brand/README.md

```
20   explorations closed.** `app/src/ui/theme.ts` (`#F5C542` / `#9000C8` / `#00D000`, daylight +
```

---

## 6. App Icon / Logo Assets

### app/app.json — Icon & Adaptive Icon Config

**Line 25–27: Android adaptive icon config**

```
25       "adaptiveIcon": {
26         "foregroundImage": "./assets/adaptive-icon.png",
27         "backgroundColor": "#17171b"
```

**Line 56: Icon reference**

```
56     "icon": "./assets/icon.png"
```

**Note:** app/app.json references assets at `./assets/icon.png` and `./assets/adaptive-icon.png` directly in the root `assets/` folder, NOT the `assets/icon/` subfolder (where build3-staged files live per icon/README.md).

### app/assets/icon/README.md — Full Content

```
# Launcher icon — staged for build 3 (D-026 slate)

Source: `product/brand/logos/qualifire_logo_1_gate_q.svg` (concept 1), rendered
from the 512 px PNG (no SVG renderer in the sandbox — launcher sizes render at
≤192 px so 512 is sufficient; re-render `icon-1024.png` from the SVG for a
crisper marketing asset if ever needed).

Files: `icon-1024.png` (iOS/generic), `adaptive-foreground.png` (logo at 66%
safe zone), `adaptive-background.png` (solid #17171B, the logo's own ground —
layers match, so any mask shape crops seamlessly).

Wire at build 3 in `app.json`:

```json
"icon": "./assets/icon/icon-1024.png",
"android": { "adaptiveIcon": {
  "foregroundImage": "./assets/icon/adaptive-foreground.png",
  "backgroundColor": "#17171B" } }
```
```

### File Listings

**app/assets/ directory**

```
total 140
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Sep  6 07:07 .
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Sep 15 14:33 ..
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett 53323 Aug 16 23:13 adaptive-icon.png
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Aug 14 23:42 earcons
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Aug 16 06:21 icon
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett 85704 Aug 16 23:13 icon.png
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Sep  6 07:07 ways
```

**app/assets/icon/ directory**

```
total 148
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Aug 16 06:21 .
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Sep  6 07:07 ..
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   754 Aug 16 06:21 README.md
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  5336 Aug 16 06:21 adaptive-background.png
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett 52798 Aug 16 06:21 adaptive-foreground.png
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett 85704 Aug 16 06:21 icon-1024.png
```

### product/brand/make_logos.py — Colour Constants (Lines 1–40)

```
1   #!/usr/bin/env python3
2   """
3   Qualifire logo concepts — 5 candidates from product/BRAND.md's brief.
4   
5   Single source of truth: each logo is a list of primitive dicts. The same data
6   emits (a) a labelled, Inkscape-navigable SVG (canonical deliverable) and
7   (b) a PNG via pycairo (verification render — no rsvg in this sandbox, and
8   ImageMagick's SVG delegate is untrusted per scientific-figure-building).
9   
10  Every SVG leaf/group carries id + inkscape:label (svg-labelling-conventions);
11  naming is generated here, never hand-added. Layers: background -> mark -> labels.
12  
13  Run:  python3 make_logos.py   (writes qualifire_logo_1..5.svg/.png + sheet.png)
14  """
15  import math
16  import cairo
17  
18  W = H = 512
19  BG = '#17171b'      # paddock charcoal (BRAND P1)
20  INK = '#F4F2EC'
21  YEL = '#F5C542'     # signature / neutral tier
22  GRN = '#3ED598'
23  PUR = '#A667F0'
24  CHR = '#2a2a30'     # chrome lines
25  DIM = '#9a978f'
26  ```

**Note:** The constants on lines 21–23 show the **OLD** colours from round 1:
- `YEL = '#F5C542'` (unchanged)
- `GRN = '#3ED598'` (changed from `#00D000` in c9db5d5)
- `PUR = '#A667F0'` (changed from `#9000C8` in c9db5d5)

### product/brand/make_logos.py — gate_q Function

**Lines 127–140: c1_gate_q() function definition**

```
127 def c1_gate_q():
128     """The Q as a lap ring; the tail is the yellow gate line crossing it at speed."""
129     cx, cy, r = 256, 246, 138
130     mark = [
131         dict(type='circle', cx=cx, cy=cy, r=r, stroke=INK, sw=34, fill='none',
132              id='ring', label='lap_ring_ink'),
133         # gate line = Q tail, but CROSSING the ring (inside to outside) so it
134         # reads as a gate on the lap, not a magnifier handle
135         dict(type='line', x1=cx + (r - 92) * 0.7071, y1=cy + (r - 92) * 0.7071,
136              x2=cx + (r + 92) * 0.7071, y2=cy + (r + 92) * 0.7071,
137              stroke=YEL, sw=40, id='gate', label='gate_line_yellow_crossing_ring'),
138     ]
139     return 'gate_q', 'Q with gate-line tail', {'mark': mark}
```

**Line 214: Concepts list includes c1_gate_q**

```
214 CONCEPTS = [c1_gate_q, c2_sector_strip, c3_lap_ring, c4_flying_start, c5_monogram_wordmark]
```

**Key finding:** The launcher icon ("Q" shape with yellow gate-line tail) is generated as concept 1 by `c1_gate_q()`, which uses `stroke=YEL` (line 137). The yellow is parameterized as `YEL` constant, currently `#F5C542` but scheduled to change to `#FFDE6D`.

### SVG Files in product/brand/

```
product/brand/logos/qualifire_logo_1_gate_q.svg
product/brand/logos/qualifire_logo_2_sector_strip.svg
product/brand/logos/qualifire_logo_3_lap_ring.svg
product/brand/logos/qualifire_logo_4_flying_start.svg
product/brand/logos/qualifire_logo_5_monogram_wordmark.svg
```

### gate_q Files in product/brand/

```
product/brand/logos/qualifire_logo_1_gate_q.png
product/brand/logos/qualifire_logo_1_gate_q.svg
```

### Git History — Icon PNG Files

**git log for app/assets/icon.png and app/assets/adaptive-icon.png**

```
2eb81c3 Initial project import — Qualifire at cycle 013; model-tier conventions (D-039)
```

**Finding:** Both icon files were created/imported only once, at commit `2eb81c3` (initial import). Never touched since. The README.md in `app/assets/icon/` indicates these are "staged for build 3" and notes a planned reversion to path `./assets/icon/icon-1024.png` etc.

---

## 7. Hardcoded Colours in app/src — Grep Results

**Search for `#F5C542 | #9000C8 | #00D000 | #A667F0 | #3ED598 | #65008C | #7b3fd1 | #7B3FD1` in all `.ts` and `.tsx` files**

```
app/src/ui/theme.ts:16:  purple: '#9000C8', // filled tier — fastest of the ranking pool (colourModel.ts)
app/src/ui/theme.ts:17:  purpleDeep: '#65008C', // darker purple (channels x0.7 of `purple`) — unreferenced today; keep in step with `purple`
app/src/ui/theme.ts:18:  green: '#00D000', // outlined tier — above the pool's recent average
app/src/ui/theme.ts:19:  neutral: '#F5C542', // flat tier / accent — warm, never grey
app/src/ui/theme.ts:45: * yellow *surfaces* (START, Export) stay #F5C542 everywhere.
app/src/ui/wayMapStyle.ts:13: *     colors.green (#00D000, hue 120) and colors.purple (#9000C8, hue
```

**Finding:** Only `theme.ts` defines the tier colours; `wayMapStyle.ts` references them only in a comment. No hardcoded hex values in other UI components — all colours are imported from `theme.ts`.

---

## 8. Dev-Loop Scripts

### scripts/ Directory Listing

```
total 120
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Sep  8 07:22 .
drwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   512 Sep 14 16:40 ..
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  4162 Sep  8 16:20 OTA-TROUBLESHOOTING.md
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   999 Aug 24 13:18 README.md
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  5017 Aug 16 22:52 build3-build.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  7337 Aug 16 22:56 build3-prepare.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett 17051 Sep  6 23:22 build4.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   387 Aug 19 09:13 build5.cmd
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  1628 Aug 19 09:13 build5.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   407 Aug 27 18:28 build6.cmd
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  5791 Aug 27 18:24 build6.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   457 Sep  6 23:02 build7.cmd
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett 10959 Sep  8 07:22 build7.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett    69 Aug 22 21:42 gatefield-replay.cmd
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  2798 Aug 22 21:42 gatefield-replay.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett   447 Aug 27 18:28 publish-preview.cmd
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  9364 Sep 15 14:35 publish-preview.ps1
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett  8359 Aug 27 21:36 publish-preview.ps1.bak
-rwx------ 1 rcw-01hevme7mpwe7w7sqsekfett rcw-01hevme7mpwe7w7sqsekfett 17718 Aug 17 12:53 spike-maplibre.ps1
```

### scripts/publish-preview.cmd — Full Content

```
@echo off
rem Double-clickable launcher for the Qualifire Preview OTA publish (EAS Update).
rem Usage: publish-preview.cmd        -> publish (message = last commit subject)
rem        publish-preview.cmd dry    -> preflight only (-DryRun)
cd /d "%~dp0"
if /i "%~1"=="dry" (
  powershell -ExecutionPolicy Bypass -File ".\publish-preview.ps1" -DryRun
) else (
  powershell -ExecutionPolicy Bypass -File ".\publish-preview.ps1" %*
)
pause
```

### scripts/publish-preview.ps1 — Header (Lines 1–40)

```
1   <#
2       Qualifire -- publish a JS-only OTA update to the standalone "Qualifire
3       Preview" APK over EAS Update (channel "preview"). Set up 2026-08-27
4       (Nathan's ruling: runtime-version policy = fingerprint); the first APK
5       that can receive these updates is build 6 (scripts\build6.ps1).
6   
7           cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
8           powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -DryRun                  # preflight only, publishes nothing
9           powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1                          # publish; message = last commit subject
10          powershell -ExecutionPolicy Bypass -File .\publish-preview.ps1 -Message "what changed"  # publish with an explicit message
11  
12      (Or double-click publish-preview.cmd. -ExecutionPolicy Bypass always.)
13  
14      What this does: bundles the CURRENT JS in app/ (npx expo export under the
15      hood) and uploads it to EAS Update -- ~1-2 minutes, NO build slot spent.
16      The phone downloads it on the next launch and APPLIES it on the launch
17      after that: open the app on network, close it fully, open it again. Two
18      launches is normal EAS Update behaviour -- NOT build-3-style staleness.
19  
20      When this is NOT enough: any native-surface change (new/upgraded native
21      dependency, app.json plugins/permissions/icon/package, SDK upgrade)
22      changes the FINGERPRINT runtime version. An update published after such a
23      change silently never applies to older builds -- fail-safe: the phone just
24      keeps its current JS; it can never crash on missing native code. The fix
25      is the next numbered build (clone build6.ps1). Debugging:
26          npx eas-cli update:list
27          npx eas-cli fingerprint:compare
28  
29      Commit first (same D-043 discipline as builds): this publishes whatever
30      is in the working tree. The script warns on a dirty tree but proceeds.
31  
32      SDK 55+ requires --environment on eas update; this script passes
33      "preview". If eas-cli ever rejects that environment, report it back
34      rather than hand-editing the flag.
35  #>
36  [CmdletBinding()]
37  param(
38      [switch]$DryRun,
39      [switch]$SkipTests,
40      [string]$Message = ''
```

### app/package.json — Scripts Block Only

```
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "typecheck": "tsc --noEmit"
  },
```

### Retired Dev Script — safe_to_delete/dev-virgin.*

**safe_to_delete/dev-virgin.cmd — Full Content**

```
@echo off
rem Double-clickable launcher: run the dev client against the empty/virgin seed (B-39).
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\dev-virgin.ps1" %*
pause
```

**safe_to_delete/dev-virgin.ps1 — Full Content**

```
<#
    Qualifire -- run the dev client against the EMPTY seed (B-39's virgin
    install path, cycle 025), for a peek at a blank install without an EAS
    build. Starts the same Metro/Expo dev server your regular dev client
    already talks to, just with EXPO_PUBLIC_SEED_MODE=empty for this one
    run -- your real data, catalog.seed.json, results.seed.json, and any
    already-installed dev client build are all untouched. Close this window
    and run `npx expo start` (or just re-open your usual terminal) from
    app/ to go back to normal.

        cd "C:\Users\natha\Claude personal projects\Qualifire\scripts"
        powershell -ExecutionPolicy Bypass -File .\dev-virgin.ps1

    (Nathan's machine needs the -ExecutionPolicy Bypass prefix every time --
    always write the commands that way. Or double-click dev-virgin.cmd,
    which does exactly that for you.)

    What you'll see on the phone once it reconnects and reloads (may need a
    manual Reload from the dev-client shake menu, not just Fast Refresh, so
    the newly-inlined env var actually takes): RECORD has no locked route to
    pick (free-ride only -- B-36/B-42's retroactive naming/way-creation flow
    isn't built yet, so there's no UI yet to turn a recorded ride into a
    landmark or route); ROUTES shows 0 routes, with no dedicated empty-state
    polish yet (that's B-43, unbuilt); DEMO still replays the bundled
    'Morning' ride -- the one deliberate, still-legitimate literal exception
    (a scripted asset, not the catalog).
#>
[CmdletBinding()]
param()

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $repoRoot "app")
$env:EXPO_PUBLIC_SEED_MODE = "empty"
Write-Host "EXPO_PUBLIC_SEED_MODE=empty -- starting the dev server with the blank catalog..." -ForegroundColor Yellow
npx expo start
```

**Finding:** The `dev-virgin` scripts were retired and moved to `safe_to_delete/`. They are no longer in the active `scripts/` directory. The pattern shows use of `-ExecutionPolicy Bypass` per Nathan's setup.

---

## Summary

**Colour update scope for Round 2:**
- `app/src/ui/theme.ts`: 4 lines (purple, purpleDeep, green, neutral definitions)
- `product/brand/make_logos.py`: 3 lines (YEL, GRN, PUR constants, lines 21–23)
- 18 marketing/silent-studio HTML files: ~60+ hex occurrences across SECTOR_COLORS vars, inline styles, SVG strokes
- 3 marketing root files (PLAN.md, HYPERFRAMES-PLAN.md, VIDEO-EDITING-GUIDE.md): 6 direct hex references
- 3 product files (MAP-CONTRACT.md, MAP-TILES.md, brand/README.md): 5 direct hex references
- marketing/website/index.html: 7 hex references (CSS vars + inline SVG)
- 2 test suites: 5 hex references (waymapgeo_suite.ts, waymapstyle_suite.ts)

**Icon assets:**
- Current: `app/assets/icon.png` and `app/assets/adaptive-icon.png` (root level)
- Staged for build 3: `app/assets/icon/` subfolder (icon-1024.png, adaptive-foreground.png, adaptive-background.png)
- Logo source: `product/brand/logos/qualifire_logo_1_gate_q.svg` (generated by `make_logos.py`, uses YEL constant for yellow gate-line stroke)

**Dev scripts:**
- Active: `scripts/publish-preview.*`, `scripts/build*.ps1`
- Retired: `safe_to_delete/dev-virgin.*`
- No dedicated "start Expo dev server" script in current `scripts/` — `app/package.json` has `"start": "expo start"` (use `npm start` or `npx expo start` from `app/`)

