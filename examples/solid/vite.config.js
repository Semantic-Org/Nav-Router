import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// vite with solid's compiler, so the views are the jsx a solid app is written in. the integration
// is a link into the repo, and resolved through the link it finds nav-router and solid-js in this
// example's node_modules, the same solid-js the app uses, which solid requires
export default defineConfig({
  root: 'client',
  plugins: [solid()],
  resolve: {
    preserveSymlinks: true,
  },
  // the router and the integration are links into the repo, served from source rather than
  // pre-bundled, so a change in src shows on the next load
  optimizeDeps: {
    exclude: ['nav-router', '@nav-router/solid'],
  },
});
