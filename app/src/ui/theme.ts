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
export const colors = {
  bg: '#0A0A0A', // --bg-screen
  ink: '#F4F2EC', // --ink
  inkDim: '#9a978f', // --ink-dim
  grey: '#6f6e6a', // --grey — NO-DATA only
  purple: '#A667F0', // filled tier — 28d best
  purpleDeep: '#7b3fd1',
  green: '#3ED598', // outlined tier — 7d best
  neutral: '#F5C542', // flat tier / accent — warm, never grey
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
