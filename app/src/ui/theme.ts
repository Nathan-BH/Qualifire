/**
 * Qualifire visual identity — ported from demos/mockup.html (:root tokens).
 * Single source of truth for colors/typography in the app.
 *
 * Rules carried over from the mockup:
 * - D-013: NO RED ANYWHERE. Warnings are amber. Stop is amber-accented.
 * - `grey` is reserved for NO-DATA states only — never for de-emphasis
 *   (use inkDim for that).
 * - Labels are uppercase + letterspaced; numbers are heavy (800) and tabular.
 */
/** The brand yellow — buttons, the ridden reference line, the MAP/ROUTES tab lines,
 * night accent text, AND (since the virgin-cycle27 FINAL ruling, Nathan 2026-10-09)
 * the yellow TIER. One literal, two names: `colors.neutral` and `tierHex.yellow`. */
export const BRAND_YELLOW = '#F5C542';

/** virgin-cycle27 brief 02, FINAL (Nathan 2026-10-09 00:24): THE tier palette — the
 * three colours a scored sector / lap paints, for the MAP LINE and for TEXT on a card,
 * in BOTH themes (Nathan: "keep both the day mode green and purple for the dark mode
 * as well"; "the app yellow is better than the intermediate one"). Change a value here
 * and every surface follows: tierColour.ts, tower.tsx, chips.tsx, the live strip, the
 * gate flash, the sector-coloured trail, the ghost dots, PreviewScreen.
 * Earlier trials, all dropped: purple #9000C8 / #C364FF, green #00D000, yellow #8C6900
 * / #B98A0A. A yellow sector on the map is therefore the SAME hex as the un-scored base
 * line again (wayMapView.tsx's note) — Nathan's call.
 * Contrast (WCAG, computed 2026-10-09) on the day / night card: purple 6.73 / 2.38,
 * green 5.55 / 2.89, yellow 1.62 / 9.87 — the three low values are an on-device trial
 * Nathan accepted; ridedetail_suite lists them as explicit, dated exemptions. */
export const tierHex = {
  purple: '#7B3FA8',
  green: '#007A00',
  yellow: BRAND_YELLOW,
} as const;

export const colors = {
  bg: '#0A0A0A', // --bg-screen
  ink: '#F4F2EC', // --ink
  inkDim: '#9a978f', // --ink-dim
  grey: '#6f6e6a', // --grey — NO-DATA only
  purple: tierHex.purple, // filled tier — fastest of the ranking pool (colourModel.ts); alias of tierHex
  purpleDeep: '#562C76', // darker purple (channels x0.7 of `purple`) — unreferenced today; keep in step with `purple`
  green: tierHex.green, // outlined tier — above the pool's recent average; alias of tierHex
  neutral: BRAND_YELLOW, // BRAND yellow / accent — warm, never grey; ALSO the yellow tier (tierHex.yellow) since the cycle27 FINAL ruling
  white: '#FFFFFF', // structural markers (gates) — not a tier colour
  amber: '#E8A33D', // warnings (D-013: this, not red)
  riderBlue: '#2F7DE1', // rider dot — the universal "you are here" hue; never a tier colour (D-030), never red (D-013)
  card: '#141414',
  cardBorder: '#232323',
  panel: '#1e1e23',
  panelBorder: '#2c2c33',
  btnBorder: '#2e2e2e',
  linkText: '#b5b3ac',
} as const;

/**
 * Two-mode identity (BRAND.md P1, Nathan 2026-08-15): PADDOCK for browsing
 * (warmer charcoal, yellow allowed in chrome), RACE for the live/recording
 * surfaces (near-black, tier colours are the only colour). The switch is
 * automatic — recording/live screens opt into race; everything else paddock.
 */
/**
 * Paddock themes (Nathan, 2026-08-15 palette round 2): DAYLIGHT won and is
 * the default; NIGHT is kept as a user-selectable dark mode (toggle on the
 * Record screen, persisted). Race mode is black in BOTH — the daylight
 * paddock makes pressing START a literal day→night flip.
 *
 * `accentText` exists because the structural yellow fails contrast as TEXT
 * on a light ground — daylight uses a darker gold for yellow *text* while
 * yellow *surfaces* (START, Export) stay #F5C542 everywhere.
 */
export interface PaddockTheme {
  bg: string;
  card: string;
  cardBorder: string;
  text: string; // primary ink
  textDim: string;
  text2: string; // brightened secondary
  accent: string; // yellow surfaces
  accentText: string; // yellow used as text/numerals
  onAccent: string; // text ON yellow surfaces
  statusBar: 'light' | 'dark';
  /**
   * Race-mode surface (Nathan 2026-08-15: race follows the theme; tier
   * colours are visible on both grounds). Night race = near-black; daylight
   * race = clean white — more focused than the cream paddock either way.
   */
  race: { bg: string; card: string; border: string };
}

export const daylight: PaddockTheme = {
  bg: '#FAF7EE',
  card: '#FFFFFF',
  cardBorder: '#E0D9C4',
  text: '#201F24',
  textDim: '#8A8577',
  text2: '#6D6759',
  accent: colors.neutral,
  accentText: '#B98A0A',
  onAccent: '#17171b',
  statusBar: 'dark',
  race: { bg: '#FFFFFF', card: '#F5F1E6', border: '#E4DECB' },
};

export const night: PaddockTheme = {
  bg: '#17171b',
  card: '#212127',
  cardBorder: '#41414c',
  text: colors.ink,
  textDim: colors.inkDim,
  text2: '#b5b3ac',
  accent: colors.neutral,
  accentText: colors.neutral,
  onAccent: '#17171b',
  statusBar: 'light',
  race: { bg: colors.bg, card: colors.card, border: colors.cardBorder },
};

/** Legacy alias — PreviewScreen renders in night regardless of app theme. */
export const paddock = {
  bg: night.bg,
  card: night.card,
  cardBorder: night.cardBorder,
  text2: night.text2,
  onYellow: night.onAccent,
} as const;

/**
 * Identity = the mark's own palette: ground / ink / structural yellow
 * (Art Director, approved by Nathan 2026-08-15). The earlier livery red was
 * tried and DROPPED the same day — do not reintroduce red anywhere.
 */

/** Race mode = the base `colors` near-black values. */
export const race = { bg: colors.bg, card: colors.card, cardBorder: colors.cardBorder } as const;

/** Uppercase letterspaced label, mockup `.pagetitle` / `.panel h2` family. */
export const label = {
  color: colors.inkDim,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
};

export const radius = { card: 16, big: 24, pill: 99, btn: 10 } as const;
