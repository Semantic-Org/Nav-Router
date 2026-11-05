import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// vite with solid's compiler, so the views are the jsx a solid app is written in. the router and
// the integration are workspace packages of this repo, linked in node_modules, so vite serves them
// as source; solid-js is deduped so the integration and the app share this example's one copy,
// which solid requires
export default defineConfig({
  root: 'client',
  plugins: [solid()],
  resolve: {
    dedupe: ['solid-js', 'solid-js/web', 'solid-js/store'],
  },
});
