import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// vite with react's jsx transform. the router and the integration are workspace packages of this
// repo, linked in node_modules, so vite serves them as source; react is deduped so the integration
// and the app share this example's one copy, which hooks require
export default defineConfig({
  root: 'client',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
