import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// vite with svelte's compiler, for the views and for the modules that use runes: the store here
// and the integration itself. the router and the integration are workspace packages of this repo,
// linked in node_modules, so vite serves them as source
export default defineConfig({
  root: 'client',
  plugins: [svelte()],
});
