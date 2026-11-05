import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const repo = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

// vite because a browser cannot resolve the bare nav-router import on its own: it serves the app
// with hot reload in dev and bundles it for a build. the router is this repo's own source, aliased
// to it rather than reached through its link in node_modules, so vite serves it as source
export default defineConfig({
  root: 'client',
  resolve: {
    alias: [
      { find: /^nav-router\/plugins\/(.*)$/, replacement: repo('src/plugins/$1.js') },
      { find: 'nav-router/reactive', replacement: repo('src/reactive-router.js') },
      { find: 'nav-router', replacement: repo('src/index.js') },
    ],
  },
});
