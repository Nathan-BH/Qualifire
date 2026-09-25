import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function load(url, ctx, next) {
  if (url.endsWith('.json')) {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return { format: 'module', shortCircuit: true, source: 'export default ' + readFileSync(fileURLToPath(url),'utf8') };
  }
  return next(url, ctx);
}`));
