import { defineConfig } from 'vite';

// vite because a browser cannot resolve the bare nav-router import on its own: it serves the app
// with hot reload in dev and bundles it for a build. nav-router is a workspace package of this
// repo, linked in node_modules, so vite serves it as source
export default defineConfig({
  root: 'client',
});
