/**
 * Runtime MapLibre style patcher (B-51). Pure — no react-native, no maplibre
 * imports here, same headless-testable discipline as routeMapGeo.ts.
 *
 * Two jobs, both applied to the fetched vector-tile style JSON before it
 * reaches the Map component:
 *
 *  1. Label visibility: hide every symbol layer's text/icons when
 *     `hideLabels` is set — the locked live ribbon is heading-up and
 *     control-free (D-006); a road name on it is a distraction the rider
 *     cannot safely read.
 *  2. Palette firewall (D-030, ALWAYS applied, independent of hideLabels):
 *     colors.green (#3ED598, hue ~156) and colors.purple (#A667F0, hue
 *     ~268) in theme.ts are score-only colours — the basemap may never wear
 *     a colour close enough to read as a tier verdict. Any '*-color' paint
 *     value landing in that hue neighbourhood, with enough saturation to
 *     actually read as a colour rather than a near-grey, gets its
 *     saturation flattened; hue, lightness and alpha are left alone.
 */

export interface PatchStyleOptions {
  hideLabels: boolean;
}

const GREEN_HUE_MIN = 130;
const GREEN_HUE_MAX = 165;
const PURPLE_HUE_MIN = 260;
const PURPLE_HUE_MAX = 290;
const SAT_THRESHOLD = 25; // percent — above this a colour reads as a colour, not a near-grey
const FLATTENED_SAT = 20; // percent — the value the firewall clamps down to

interface Hsl { h: number; s: number; l: number; a: number }

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function parsePercentOrUnit(raw: string, unit: number): number {
  return raw.endsWith('%') ? clamp01(parseFloat(raw) / 100) : clamp01(parseFloat(raw) / unit);
}

function rgbToHsl(r: number, g: number, b: number, a: number): Hsl {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = 60 * (((g - b) / d) % 6); break;
      case g: h = 60 * ((b - r) / d + 2); break;
      default: h = 60 * ((r - g) / d + 4); break;
    }
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100, a };
}

function parseHex(v: string): Hsl | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return rgbToHsl(r, g, b, 1);
}

function parseRgb(v: string): Hsl | null {
  const m = /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*(?:,\s*([\d.]+%?)\s*)?\)$/i
    .exec(v.trim());
  if (!m) return null;
  const r = parsePercentOrUnit(m[1], 255);
  const g = parsePercentOrUnit(m[2], 255);
  const b = parsePercentOrUnit(m[3], 255);
  const a = m[4] !== undefined ? parsePercentOrUnit(m[4], 1) : 1;
  return rgbToHsl(r, g, b, a);
}

function parseHslString(v: string): Hsl | null {
  const m = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+%?)\s*)?\)$/i
    .exec(v.trim());
  if (!m) return null;
  const h = ((parseFloat(m[1]) % 360) + 360) % 360;
  const s = clamp01(parseFloat(m[2]) / 100) * 100;
  const l = clamp01(parseFloat(m[3]) / 100) * 100;
  const a = m[4] !== undefined ? parsePercentOrUnit(m[4], 1) : 1;
  return { h, s, l, a };
}

/** Hex / rgb() / rgba() / hsl() / hsla() only — anything else (named colours,
 * newer CSS colour syntaxes, garbage) is left untouched by the caller. */
function parseColorString(v: string): Hsl | null {
  return parseHex(v) ?? parseRgb(v) ?? parseHslString(v);
}

function formatHsl(c: Hsl): string {
  const h = Math.round(c.h * 100) / 100;
  const s = Math.round(c.s * 100) / 100;
  const l = Math.round(c.l * 100) / 100;
  return c.a >= 1
    ? `hsl(${h}, ${s}%, ${l}%)`
    : `hsla(${h}, ${s}%, ${l}%, ${Math.round(c.a * 1000) / 1000})`;
}

function inFirewallBand(h: number): boolean {
  return (h >= GREEN_HUE_MIN && h <= GREEN_HUE_MAX) || (h >= PURPLE_HUE_MIN && h <= PURPLE_HUE_MAX);
}

/** Applies the firewall to one paint-property value. Arrays/objects
 * (style-spec expressions) and anything that doesn't parse as a plain
 * colour string pass through byte-for-byte untouched. */
function firewallValue(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const hsl = parseColorString(v);
  if (hsl === null) return v;
  if (inFirewallBand(hsl.h) && hsl.s > SAT_THRESHOLD) {
    return formatHsl({ ...hsl, s: FLATTENED_SAT });
  }
  return v;
}

function patchPaint(paint: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(paint)) {
    out[k] = k.endsWith('-color') ? firewallValue(v) : v;
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Deep-copies `style` (never mutates the input), hides every symbol layer's
 * labels when `hideLabels` is set, and always applies the palette firewall
 * to every paint property whose key ends in '-color'. Idempotent — patching
 * an already-patched style produces the same output.
 */
export function patchMapStyle(style: unknown, opts: PatchStyleOptions): unknown {
  const copy = JSON.parse(JSON.stringify(style)) as Record<string, unknown>;
  const layers = copy.layers;
  if (!Array.isArray(layers)) return copy;
  copy.layers = layers.map((layerRaw) => {
    if (!isPlainObject(layerRaw)) return layerRaw;
    const next: Record<string, unknown> = { ...layerRaw };
    if (isPlainObject(next.paint)) {
      next.paint = patchPaint(next.paint);
    }
    if (opts.hideLabels && next.type === 'symbol') {
      const layout = isPlainObject(next.layout) ? { ...next.layout } : {};
      layout.visibility = 'none';
      next.layout = layout;
    }
    return next;
  });
  return copy;
}
