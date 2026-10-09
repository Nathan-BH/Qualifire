/**
 * virgin-cycle27 12 (Nathan 2026-10-09): the pure decision behind the themed map cover
 * (mapCover.tsx). The native MapLibre view paints its own light load colour until its first
 * fully rendered frame, and a maplibre-react-native 11.3.6 app cannot change that colour from
 * JS, so each map sits under a cover in the theme map colour until it is safe to show.
 * The cover lifts when:
 *  - the style failed (the view is on, or about to remount on, the offline fallback, which must
 *    never be hidden), or
 *  - the style has loaded AND one frame has rendered (onDidFinishLoadingStyle + the FIRST of
 *    onDidFinishRenderingFrame / onDidFinishRenderingFrameFully): after the style's own background
 *    layer has painted once there is no white left to hide, and the tiles then paint in
 *    progressively, as they did before the cover existed (virgin-cycle29 01, Nathan 2026-10-09:
 *    the cover waiting for all tiles read as a black screen), or
 *  - the safety timeout has elapsed (a cover may never hide a map forever).
 * Pure: no react, no native.
 */
export const MAP_COVER_FADE_MS = 200;
export const MAP_COVER_TIMEOUT_MS = 2500;

export interface MapCoverInput {
  styleFailed: boolean;
  styleLoaded: boolean;
  firstFrame: boolean;
  timedOut: boolean;
}

export function mapCoverLifts(i: MapCoverInput): boolean {
  return i.styleFailed || i.timedOut || (i.styleLoaded && i.firstFrame);
}
