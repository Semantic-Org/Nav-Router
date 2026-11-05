import { defineConfig } from 'vite';

// vite because a browser cannot resolve the bare nav-router import on its own: it serves the app
// with hot reload in dev and bundles it for a build. a deep link is a page vite serves the entry for.
// the integration is a link into the repo, and resolved through the link it finds nav-router and
// solid-js in this example's node_modules, the same solid-js the app uses, which solid requires
export default defineConfig({
  root: 'client',
  resolve: {
    preserveSymlinks: true,
  },
});
