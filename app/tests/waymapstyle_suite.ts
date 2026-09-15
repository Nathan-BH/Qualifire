/**
 * patchMapStyle suite (B-51) — pure, no native module. Builds a small
 * synthetic MapLibre style and checks both jobs: label visibility toggling
 * and the D-030 palette firewall.
 *
 * NOTE on the swatches (virgin-cycle8, 2026-09): the firewall bands are ±20°
 * around QUALIFIRE's actual tier hues — colors.green #8BCD39 (hue ~87) →
 * [67,107], colors.purple #6D4E9C (hue ~264) → [244,284] — i.e. the firewall
 * protects the app's own tier colours, not "green"/"purple" in general. The
 * in-band green swatch below is '#88CC44' (hue 90, S ~57%) for that reason.
 */
import { assert, test } from './lib.ts';
import { patchMapStyle } from '../src/ui/wayMapStyle.ts';

function buildStyle() {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#88CC44' }, // in-band green (hue 90), S ~57% -> must desaturate
      },
      {
        id: 'park',
        type: 'fill',
        paint: { 'fill-color': '#DCDCD2' }, // low-saturation grey -> untouched regardless of hue
      },
      {
        id: 'water',
        type: 'fill',
        paint: { 'fill-color': 'hsl(200, 40%, 70%)' }, // hue outside both bands -> untouched
      },
      {
        id: 'admin-purple',
        type: 'line',
        paint: { 'line-color': 'hsl(270, 60%, 50%)' }, // in-band purple -> desaturate to S 20%
      },
      {
        id: 'place-labels',
        type: 'symbol',
        layout: { 'text-field': ['get', 'name'] },
        paint: { 'text-color': '#ffffff' },
      },
      {
        id: 'road-casing',
        type: 'line',
        paint: {
          // an expression, not a plain colour string -> must pass through untouched
          'line-color': ['interpolate', ['linear'], ['zoom'], 5, '#888', 14, '#40bf6a'],
        },
      },
    ],
  };
}

interface StyleLayer {
  id: string;
  type: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}
interface Style { layers: StyleLayer[] }

function layerOf(style: unknown, id: string): StyleLayer {
  const l = (style as Style).layers.find((x) => x.id === id);
  assert(l !== undefined, `layer ${id} missing from patched style`);
  return l as StyleLayer;
}

test('routemapstyle: palette firewall desaturates an in-band green background', () => {
  const patched = patchMapStyle(buildStyle(), { hideLabels: false });
  const bg = layerOf(patched, 'background').paint!['background-color'];
  assert(typeof bg === 'string' && /^hsl\(/.test(bg), `expected an hsl() string, got ${bg}`);
  const m = /^hsl\(([\d.]+), ([\d.]+)%, ([\d.]+)%\)$/.exec(bg as string);
  assert(m !== null, `background-color did not match hsl() shape: ${bg}`);
  const [, h, s] = m!;
  assert(Math.abs(parseFloat(h) - 90) < 1, `hue drifted: expected ~90, got ${h}`);
  assert(Math.abs(parseFloat(s) - 20) < 0.01, `saturation not flattened to 20%, got ${s}%`);
});

test('routemapstyle: palette firewall desaturates an in-band purple line to S 20%, keeps hue/lightness', () => {
  const patched = patchMapStyle(buildStyle(), { hideLabels: false });
  const line = layerOf(patched, 'admin-purple').paint!['line-color'];
  assert(line === 'hsl(270, 20%, 50%)', `expected hsl(270, 20%, 50%), got ${line}`);
});

test('routemapstyle: a low-saturation grey hex is left untouched regardless of hue', () => {
  const patched = patchMapStyle(buildStyle(), { hideLabels: false });
  const fill = layerOf(patched, 'park').paint!['fill-color'];
  assert(fill === '#DCDCD2', `grey fill must pass through unchanged, got ${fill}`);
});

test('routemapstyle: an hsl() colour outside both hue bands is left untouched', () => {
  const patched = patchMapStyle(buildStyle(), { hideLabels: false });
  const fill = layerOf(patched, 'water').paint!['fill-color'];
  assert(fill === 'hsl(200, 40%, 70%)', `out-of-band hsl must pass through unchanged, got ${fill}`);
});

test('routemapstyle: an expression array paint value is left untouched', () => {
  const patched = patchMapStyle(buildStyle(), { hideLabels: false });
  const casing = layerOf(patched, 'road-casing').paint!['line-color'];
  assert(Array.isArray(casing), `expression must stay an array, got ${typeof casing}`);
  assert(JSON.stringify(casing) === JSON.stringify(['interpolate', ['linear'], ['zoom'], 5, '#888', 14, '#40bf6a']),
    'expression array must be byte-for-byte unchanged (firewall does not reach into expressions)');
});

test('routemapstyle: symbol layers are hidden only when hideLabels is set', () => {
  const hidden = patchMapStyle(buildStyle(), { hideLabels: true });
  const shown = patchMapStyle(buildStyle(), { hideLabels: false });
  assert(layerOf(hidden, 'place-labels').layout!.visibility === 'none', 'symbol layer must be hidden');
  assert(layerOf(shown, 'place-labels').layout === undefined
    || layerOf(shown, 'place-labels').layout!.visibility !== 'none',
  'symbol layer must NOT be hidden when hideLabels is false');
  // Non-symbol layers are never touched by the label switch, either way.
  assert(layerOf(hidden, 'park').layout === undefined, 'a non-symbol layer must not gain a layout block');
});

test('routemapstyle: the palette firewall applies regardless of hideLabels', () => {
  const hidden = patchMapStyle(buildStyle(), { hideLabels: true });
  const line = layerOf(hidden, 'admin-purple').paint!['line-color'];
  assert(line === 'hsl(270, 20%, 50%)', 'firewall must run even when hideLabels is true');
});

test('routemapstyle: input style is never mutated', () => {
  const original = buildStyle();
  const snapshot = JSON.parse(JSON.stringify(original));
  patchMapStyle(original, { hideLabels: true });
  assert(JSON.stringify(original) === JSON.stringify(snapshot), 'patchMapStyle must not mutate its input');
});

test('routemapstyle: patching twice is idempotent', () => {
  const once = patchMapStyle(buildStyle(), { hideLabels: true });
  const twice = patchMapStyle(once, { hideLabels: true });
  assert(JSON.stringify(once) === JSON.stringify(twice), 'a second patch pass must not change the output');
});
