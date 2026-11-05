import { defineConfig } from 'vite';

// vite because a browser cannot resolve the bare nav-router import on its own: it serves the app
// with hot reload in dev and bundles it for a build. a deep link is a page vite serves the entry for
export default defineConfig({
  root: 'client',
  // the router is a link into the repo, served from source rather than pre-bundled, so a change in
  // src shows on the next load
  optimizeDeps: {
    exclude: ['nav-router'],
  },
});
