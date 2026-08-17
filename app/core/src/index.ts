/** @qualifire/core — the timing engine.
 * Everything here is platform-free TypeScript: no Node, DOM or React Native
 * APIs. The Expo app and the PC harness import the same code (D-012 Phase 0).
 * Parity with the validated Python pipeline is proven in PARITY.md. */
export * from './types.ts';
export * from './geo.ts';
export * from './stats.ts';
export * from './gpx.ts';
export * from './reference.ts';
export * from './projection.ts';
export * from './kinematics.ts';
export * from './timing.ts';
export * from './gates.ts';
export * from './live.ts';
