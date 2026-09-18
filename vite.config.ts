import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev: API lokal wrangler (hadirku-api, port 8787).
      '/api': 'http://localhost:8787',
    },
  },
});
