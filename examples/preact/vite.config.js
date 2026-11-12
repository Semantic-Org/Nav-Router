import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// vite with preact's preset, so the views are the jsx a preact app is written in. the router and
// the integration are workspace packages of this repo, linked in node_modules, so vite serves them
// as source
export default defineConfig({
  root: 'client',
  plugins: [preact()],
});
