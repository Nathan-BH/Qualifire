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
