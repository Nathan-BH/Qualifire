// Qualifire -- Metro config (virgin-cycle19 brief 01, 2026-10-03).
// The ONLY thing this does: wire metro.seedRedirect.js into the resolver so that
// non-shipped bundles (EXPO_PUBLIC_SEED_MODE !== 'shipped') never contain the
// Leuven seed files. The runtime guard in src/store/seed.ts stays; this closes
// the "bytes still ship" hole it documents. tests/seedstubs_suite.ts pins this
// file, the stubs and the redirect behaviour.
const { getDefaultConfig } = require('expo/metro-config');
const { seedModeFromEnv, redirectResolution } = require('./metro.seedRedirect.js');

const config = getDefaultConfig(__dirname);
const SEED_MODE = seedModeFromEnv(process.env);
const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = previousResolveRequest ?? context.resolveRequest;
  const resolution = resolve(context, moduleName, platform);
  return redirectResolution(resolution, __dirname, SEED_MODE);
};

module.exports = config;
