"""Draft chrome palettes for the cycle-025 palette draft pass.

DRAFT ONLY. These are mockup token sets for Nathan to look at; they are not an app
setting, not a theme switcher, and not referenced by any app code.

Key structure is identical to make_screens.THEMES["day"] / ["night"] (same twelve keys),
so the existing screen builders consume them unchanged.

Constraint (D-030): a theme recolours CHROME only. The scoring verdict colours live in
make_screens.COLORS and are never touched here. `accentText` is listed in
INHERITED_FROM_DAY because make_screens.chip_palette() (line 646) uses it as the text
colour of the "neutral" VERDICT tier as well as for chrome accents -- so it must stay
identical to the day theme in every palette. make_draft_screens.py asserts this.
"""

INHERITED_FROM_DAY = ("accentText",)

DRAFT_THEMES = {
    "pink": {
        "bg": "#FDF2F6", "card": "#FFFFFF", "cardBorder": "#EBCFD9",
        "text": "#241A1E", "textDim": "#6E5C63", "text2": "#5E4E55",
        "accent": "#C2185B", "accentText": "#B98A0A", "onAccent": "#FFFFFF",
        "raceBg": "#FFFFFF", "raceCard": "#FCEDF3", "raceBorder": "#EBCFD9",
    },
    "lightblue": {
        "bg": "#EFF6FC", "card": "#FFFFFF", "cardBorder": "#C9DCEC",
        "text": "#16202B", "textDim": "#5A6B78", "text2": "#47535E",
        "accent": "#0B5FA5", "accentText": "#B98A0A", "onAccent": "#FFFFFF",
        "raceBg": "#FFFFFF", "raceCard": "#E8F2FA", "raceBorder": "#C9DCEC",
    },
    "green": {
        "bg": "#F0F7F0", "card": "#FFFFFF", "cardBorder": "#C8DEC8",
        "text": "#17231A", "textDim": "#5A6B5E", "text2": "#46564A",
        "accent": "#1B6E3C", "accentText": "#B98A0A", "onAccent": "#FFFFFF",
        "raceBg": "#FFFFFF", "raceCard": "#E9F3EA", "raceBorder": "#C8DEC8",
    },
}
