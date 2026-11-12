// the playground's sandbox (tooling worker, service worker) into public/sandbox/, where it serves as
// static files and never enters vite's transform pipeline, as next/docs does. and, until nav-router is
// on a cdn, the libraries examples import into public/libs/: the nav-router package's source beside these
// docs, and the one-file
// build of @semantic-ui/utils it depends on (its importmap export), reached through the examples'
// import map
import { existsSync, promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../public');
// the repo root above these docs in the monorepo, else the sibling nav-router checkout
const NAV_ROUTER = [resolve(here, '../..'), resolve(here, '../../../nav-router')]
  .find((dir) => existsSync(resolve(dir, 'src/index.js')));

const copy = async (from, to) => {
  await fs.rm(to, { recursive: true, force: true });
  await fs.cp(from, to, { recursive: true });
  console.log(`[site] ${from} → ${to}`);
};

const playgroundAssets = resolve(dirname(require.resolve('@semantic-ui/playground/package.json')), 'dist/assets');
await copy(playgroundAssets, resolve(pub, 'sandbox'));
await copy(resolve(NAV_ROUTER, 'src'), resolve(pub, 'libs/nav-router'));
await copy(resolve(NAV_ROUTER, 'packages/plugins/src'), resolve(pub, 'libs/plugins'));
// the package doesn't export its package.json, so it's found from its entry
const utilsEntry = require.resolve('@semantic-ui/utils');
const utilsDir = utilsEntry.slice(0, utilsEntry.lastIndexOf('@semantic-ui/utils') + '@semantic-ui/utils'.length);
const utils = JSON.parse(await fs.readFile(resolve(utilsDir, 'package.json'), 'utf8'));
await fs.rm(resolve(pub, 'libs/utils'), { recursive: true, force: true });
await fs.mkdir(resolve(pub, 'libs/utils'), { recursive: true });
await fs.copyFile(resolve(utilsDir, utils.exports['.'].importmap), resolve(pub, 'libs/utils/index.js'));
console.log(
  `[site] @semantic-ui/utils@${utils.version} (${utils.exports['.'].importmap}) → public/libs/utils/index.js`,
);
