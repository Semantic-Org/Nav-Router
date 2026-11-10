import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// vite with svelte's compiler, so the views are the .svelte components a svelte app is written in
// and the runes in store.svelte.js compile. the router and the integration are workspace packages
// of this repo, linked in node_modules, so vite serves them as source; the integration is a
// .svelte.js module, which the same plugin compiles wherever it is installed from
export default defineConfig({
  root: 'client',
  plugins: [svelte()],
});
