# Draft palette contrast report

Formula: WCAG 2.x relative luminance (sRGB, gamma 2.4, coefficients
0.2126/0.7152/0.0722) and contrast ratio (L_hi+0.05)/(L_lo+0.05), rounded to 2 dp.
Gate A thresholds: 4.5:1 normal text, 3.0:1 UI component / large text (WCAG AA).

## pink

### Gate A - chrome pairs this draft introduces (must all PASS)

| foreground | background | ratio | threshold | result |
|---|---|---:|---:|---|
| text `#241A1E` | bg `#FDF2F6` | 15.47 | 4.5 | PASS |
| text `#241A1E` | card `#FFFFFF` | 16.91 | 4.5 | PASS |
| text `#241A1E` | raceBg `#FFFFFF` | 16.91 | 4.5 | PASS |
| text `#241A1E` | raceCard `#FCEDF3` | 14.94 | 4.5 | PASS |
| text2 `#5E4E55` | bg `#FDF2F6` | 7.12 | 4.5 | PASS |
| text2 `#5E4E55` | card `#FFFFFF` | 7.79 | 4.5 | PASS |
| textDim `#6E5C63` | bg `#FDF2F6` | 5.69 | 4.5 | PASS |
| textDim `#6E5C63` | card `#FFFFFF` | 6.22 | 4.5 | PASS |
| onAccent `#FFFFFF` | accent `#C2185B` | 5.87 | 4.5 | PASS |
| accent `#C2185B` | bg `#FDF2F6` | 5.37 | 3.0 | PASS |
| accent `#C2185B` | card `#FFFFFF` | 5.87 | 3.0 | PASS |

### Gate B - inherited verdict pairs (must be NOT-WORSE than day, tol 0.10)

| foreground | background | draft | day | result |
|---|---|---:|---:|---|
| accentText `#B98A0A` | bg | 2.87 | 2.92 | NOT-WORSE |
| accentText `#B98A0A` | card | 3.13 | 3.13 | NOT-WORSE |
| purple `#A667F0` | bg | 3.30 | 3.37 | NOT-WORSE |
| purple `#A667F0` | card | 3.61 | 3.61 | NOT-WORSE |
| purple `#A667F0` | raceCard | 3.19 | 3.20 | NOT-WORSE |
| tierGreen `#3ED598` | bg | 1.72 | 1.75 | NOT-WORSE |
| tierGreen `#3ED598` | card | 1.88 | 1.88 | NOT-WORSE |
| tierGreen `#3ED598` | raceCard | 1.66 | 1.66 | NOT-WORSE |
| tierYellow `#F5C542` | bg | 1.48 | 1.51 | NOT-WORSE |
| tierYellow `#F5C542` | card | 1.62 | 1.62 | NOT-WORSE |
| tierYellow `#F5C542` | raceCard | 1.43 | 1.44 | NOT-WORSE |
| noData `#6f6e6a` | bg | 4.67 | 4.76 | NOT-WORSE |
| noData `#6f6e6a` | card | 5.10 | 5.10 | NOT-WORSE |
| noData `#6f6e6a` | raceCard | 4.51 | 4.52 | NOT-WORSE |

## lightblue

### Gate A - chrome pairs this draft introduces (must all PASS)

| foreground | background | ratio | threshold | result |
|---|---|---:|---:|---|
| text `#16202B` | bg `#EFF6FC` | 15.10 | 4.5 | PASS |
| text `#16202B` | card `#FFFFFF` | 16.46 | 4.5 | PASS |
| text `#16202B` | raceBg `#FFFFFF` | 16.46 | 4.5 | PASS |
| text `#16202B` | raceCard `#E8F2FA` | 14.51 | 4.5 | PASS |
| text2 `#47535E` | bg `#EFF6FC` | 7.22 | 4.5 | PASS |
| text2 `#47535E` | card `#FFFFFF` | 7.87 | 4.5 | PASS |
| textDim `#5A6B78` | bg `#EFF6FC` | 5.06 | 4.5 | PASS |
| textDim `#5A6B78` | card `#FFFFFF` | 5.51 | 4.5 | PASS |
| onAccent `#FFFFFF` | accent `#0B5FA5` | 6.57 | 4.5 | PASS |
| accent `#0B5FA5` | bg `#EFF6FC` | 6.03 | 3.0 | PASS |
| accent `#0B5FA5` | card `#FFFFFF` | 6.57 | 3.0 | PASS |

### Gate B - inherited verdict pairs (must be NOT-WORSE than day, tol 0.10)

| foreground | background | draft | day | result |
|---|---|---:|---:|---|
| accentText `#B98A0A` | bg | 2.87 | 2.92 | NOT-WORSE |
| accentText `#B98A0A` | card | 3.13 | 3.13 | NOT-WORSE |
| purple `#A667F0` | bg | 3.31 | 3.37 | NOT-WORSE |
| purple `#A667F0` | card | 3.61 | 3.61 | NOT-WORSE |
| purple `#A667F0` | raceCard | 3.18 | 3.20 | NOT-WORSE |
| tierGreen `#3ED598` | bg | 1.72 | 1.75 | NOT-WORSE |
| tierGreen `#3ED598` | card | 1.88 | 1.88 | NOT-WORSE |
| tierGreen `#3ED598` | raceCard | 1.66 | 1.66 | NOT-WORSE |
| tierYellow `#F5C542` | bg | 1.49 | 1.51 | NOT-WORSE |
| tierYellow `#F5C542` | card | 1.62 | 1.62 | NOT-WORSE |
| tierYellow `#F5C542` | raceCard | 1.43 | 1.44 | NOT-WORSE |
| noData `#6f6e6a` | bg | 4.68 | 4.76 | NOT-WORSE |
| noData `#6f6e6a` | card | 5.10 | 5.10 | NOT-WORSE |
| noData `#6f6e6a` | raceCard | 4.50 | 4.52 | NOT-WORSE |

## green

### Gate A - chrome pairs this draft introduces (must all PASS)

| foreground | background | ratio | threshold | result |
|---|---|---:|---:|---|
| text `#17231A` | bg `#F0F7F0` | 14.92 | 4.5 | PASS |
| text `#17231A` | card `#FFFFFF` | 16.26 | 4.5 | PASS |
| text `#17231A` | raceBg `#FFFFFF` | 16.26 | 4.5 | PASS |
| text `#17231A` | raceCard `#E9F3EA` | 14.30 | 4.5 | PASS |
| text2 `#46564A` | bg `#F0F7F0` | 7.16 | 4.5 | PASS |
| text2 `#46564A` | card `#FFFFFF` | 7.81 | 4.5 | PASS |
| textDim `#5A6B5E` | bg `#F0F7F0` | 5.21 | 4.5 | PASS |
| textDim `#5A6B5E` | card `#FFFFFF` | 5.68 | 4.5 | PASS |
| onAccent `#FFFFFF` | accent `#1B6E3C` | 6.28 | 4.5 | PASS |
| accent `#1B6E3C` | bg `#F0F7F0` | 5.76 | 3.0 | PASS |
| accent `#1B6E3C` | card `#FFFFFF` | 6.28 | 3.0 | PASS |

### Gate B - inherited verdict pairs (must be NOT-WORSE than day, tol 0.10)

| foreground | background | draft | day | result |
|---|---|---:|---:|---|
| accentText `#B98A0A` | bg | 2.87 | 2.92 | NOT-WORSE |
| accentText `#B98A0A` | card | 3.13 | 3.13 | NOT-WORSE |
| purple `#A667F0` | bg | 3.31 | 3.37 | NOT-WORSE |
| purple `#A667F0` | card | 3.61 | 3.61 | NOT-WORSE |
| purple `#A667F0` | raceCard | 3.17 | 3.20 | NOT-WORSE |
| tierGreen `#3ED598` | bg | 1.72 | 1.75 | NOT-WORSE |
| tierGreen `#3ED598` | card | 1.88 | 1.88 | NOT-WORSE |
| tierGreen `#3ED598` | raceCard | 1.65 | 1.66 | NOT-WORSE |
| tierYellow `#F5C542` | bg | 1.49 | 1.51 | NOT-WORSE |
| tierYellow `#F5C542` | card | 1.62 | 1.62 | NOT-WORSE |
| tierYellow `#F5C542` | raceCard | 1.43 | 1.44 | NOT-WORSE |
| noData `#6f6e6a` | bg | 4.68 | 4.76 | NOT-WORSE |
| noData `#6f6e6a` | card | 5.10 | 5.10 | NOT-WORSE |
| noData `#6f6e6a` | raceCard | 4.49 | 4.52 | NOT-WORSE |

GATE A: 33/33 PASS
GATE B: 42/42 NOT-WORSE
OVERALL: PASS
