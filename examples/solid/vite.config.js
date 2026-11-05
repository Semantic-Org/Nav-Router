import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const repo = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

// vite with solid's compiler, so the views are the jsx a solid app is written in. the router and the
// integration are this repo's own source, aliased to it rather than reached through their links in
// node_modules, so vite serves them as source, never pre-bundled or cached as a dependency; solid-js
// is deduped so the integration and the app share this example's one copy, which solid requires
export default defineConfig({
  root: 'client',
  plugins: [solid()],
  resolve: {
    alias: [
      { find: /^nav-router\/plugins\/(.*)$/, replacement: repo('src/plugins/$1.js') },
      { find: 'nav-router/reactive', replacement: repo('src/reactive-router.js') },
      { find: 'nav-router', replacement: repo('src/index.js') },
      { find: '@nav-router/solid', replacement: repo('integrations/solid/index.js') },
    ],
    dedupe: ['solid-js', 'solid-js/web', 'solid-js/store'],
  },
});
