import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// vite with preact's preset, so the views are the jsx a preact app is written in. the router and
// the integration are workspace packages of this repo, linked in node_modules, so vite serves them
// as source; preact and its signals are deduped so the integration and the app share this
// example's one copy, which the signals' render tracking requires
export default defineConfig({
  root: 'client',
  plugins: [preact()],
  resolve: {
    dedupe: ['preact', '@preact/signals', '@preact/signals-core'],
  },
});
