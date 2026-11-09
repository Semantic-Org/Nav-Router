// min+br sizes, measured at build from the nav-router source above these docs, so the site's numbers
// are the package's: esbuild minifies, brotli at quality 11 compresses, as browsers receive it.

import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

// from the working directory (docs/), not this file: the build bundles this module elsewhere
const ROOT = resolve('..');
const cache = new Map();

async function measure(options) {
  const result = await build({
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
    ...options,
  });
  return brotliCompressSync(result.outputFiles[0].contents, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
    .length;
}

// 'core' is the router with everything it imports; a plugin is its own file, the router and
// utils external because the core already carries them
function measureFromSource(name) {
  return name === 'core'
    ? measure({
      stdin: { contents: "import { router } from './src/index.js'; console.log(router);", resolveDir: ROOT },
    })
    : measure({
      entryPoints: [resolve(ROOT, 'packages/plugins/src', `${name}.js`)],
      external: ['@semantic-ui/utils', 'nav-router'],
    });
}

// a size that can't be measured fails the build: a stale or missing number is worse than none
export function sizeOf(name) {
  if (!existsSync(resolve(ROOT, 'src/index.js'))) {
    throw new Error(`nav-router source not found at ${ROOT}. Run the docs from docs/ in the nav-router repo.`);
  }
  if (!cache.has(name)) {
    cache.set(name, measureFromSource(name));
  }
  return cache.get(name);
}

export const formatSize = (bytes) => (bytes == null ? null : `${(bytes / 1000).toFixed(1)} kB`);
