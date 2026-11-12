import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// vite with vue's compiler, so the views are the single-file components a vue app is written in.
// the router and the integration are workspace packages of this repo, linked in node_modules, so
// vite serves them as source; vue is deduped so the integration and the app share this example's
// one copy, which vue's reactivity requires
export default defineConfig({
  root: 'client',
  plugins: [vue()],
  resolve: {
    dedupe: ['vue'],
  },
});
