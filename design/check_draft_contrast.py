#!/usr/bin/env python3
"""Computed WCAG contrast report for the cycle-025 draft palettes.

Writes design/drafts/CONTRAST.md and prints a three-line summary.

Gate A -- the text/background and UI pairs each draft INTRODUCES, judged against absolute
WCAG AA thresholds (4.5:1 normal text, 3.0:1 large text / UI components).

Gate B -- the pairs each draft INHERITS but redraws on its own ground: the fixed verdict
colours from make_screens.COLORS, plus accentText. These are not the drafts' to change, and
the shipped day theme already fails several of them absolutely (the family the open B-149
contrast bug belongs to; fixing that is app work, out of scope here). The honest test is
non-regression: each draft ratio must be >= the day theme's ratio for the same pair, minus
a 0.10 tolerance.
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import make_screens as ms
from draft_palettes import DRAFT_THEMES

DAY = ms.THEMES["day"]
TOL = 0.10


def _lin(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(h: str) -> float:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(x * 2 for x in h)
    return (0.2126 * _lin(int(h[0:2], 16))
            + 0.7152 * _lin(int(h[2:4], 16))
            + 0.0722 * _lin(int(h[4:6], 16)))


def ratio(a: str, b: str) -> float:
    la, lb = lum(a), lum(b)
    hi, lo = (la, lb) if la >= lb else (lb, la)
    return round((hi + 0.05) / (lo + 0.05), 2)


CHROME = [
    ("text", "bg", 4.5), ("text", "card", 4.5), ("text", "raceBg", 4.5),
    ("text", "raceCard", 4.5), ("text2", "bg", 4.5), ("text2", "card", 4.5),
    ("textDim", "bg", 4.5), ("textDim", "card", 4.5), ("onAccent", "accent", 4.5),
    ("accent", "bg", 3.0), ("accent", "card", 3.0),
]
VERDICT_HEX = {
    "purple": ms.COLORS["purple"],
    "tierGreen": ms.COLORS["green"],
    "tierYellow": ms.COLORS["neutral"],
    "noData": ms.COLORS["grey"],
}


def main() -> int:
    out_dir = os.path.join(HERE, "drafts")
    os.makedirs(out_dir, exist_ok=True)
    lines: list[str] = []
    a_pass = a_tot = b_ok = b_tot = 0

    lines.append("# Draft palette contrast report")
    lines.append("")
    lines.append("Formula: WCAG 2.x relative luminance (sRGB, gamma 2.4, coefficients")
    lines.append("0.2126/0.7152/0.0722) and contrast ratio (L_hi+0.05)/(L_lo+0.05), rounded to 2 dp.")
    lines.append("Gate A thresholds: 4.5:1 normal text, 3.0:1 UI component / large text (WCAG AA).")
    lines.append("")

    for name in ("pink", "lightblue", "green"):
        T = DRAFT_THEMES[name]
        lines.append("## " + name)
        lines.append("")
        lines.append("### Gate A - chrome pairs this draft introduces (must all PASS)")
        lines.append("")
        lines.append("| foreground | background | ratio | threshold | result |")
        lines.append("|---|---|---:|---:|---|")
        for fg, bg, thr in CHROME:
            r = ratio(T[fg], T[bg])
            a_tot += 1
            ok = r >= thr
            a_pass += 1 if ok else 0
            lines.append(f"| {fg} `{T[fg]}` | {bg} `{T[bg]}` | {r:.2f} | {thr:.1f} | "
                         f"{'PASS' if ok else 'FAIL'} |")
        lines.append("")
        lines.append("### Gate B - inherited verdict pairs (must be NOT-WORSE than day, tol 0.10)")
        lines.append("")
        lines.append("| foreground | background | draft | day | result |")
        lines.append("|---|---|---:|---:|---|")
        pairs = [("accentText", g) for g in ("bg", "card")]
        for v in VERDICT_HEX:
            for g in ("bg", "card", "raceCard"):
                pairs.append((v, g))
        for fg, g in pairs:
            hx = T[fg] if fg in T else VERDICT_HEX[fg]
            dr = ratio(hx, DAY[g])
            fr = ratio(hx, T[g])
            b_tot += 1
            ok = fr >= dr - TOL
            b_ok += 1 if ok else 0
            lines.append(f"| {fg} `{hx}` | {g} | {fr:.2f} | {dr:.2f} | "
                         f"{'NOT-WORSE' if ok else 'REGRESSED'} |")
        lines.append("")

    overall = "PASS" if (a_pass == a_tot and b_ok == b_tot) else "FAIL"
    lines.append(f"GATE A: {a_pass}/{a_tot} PASS")
    lines.append(f"GATE B: {b_ok}/{b_tot} NOT-WORSE")
    lines.append(f"OVERALL: {overall}")

    with open(os.path.join(out_dir, "CONTRAST.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"GATE A: {a_pass}/{a_tot} PASS")
    print(f"GATE B: {b_ok}/{b_tot} NOT-WORSE")
    print(f"OVERALL: {overall}")
    return 0 if overall == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
