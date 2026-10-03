import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/favicon-512.png', 'brand/logo-mark.png'],
      manifest: {
        name: 'Presensia — Absensi Cerdas',
        short_name: 'Presensia',
        description: 'Absensi GPS geofencing ketat, selfie berkode anti-titip-absen, shift, cuti berjenjang, dan payroll otomatis: slip gaji, PPh 21, BPJS & THR.',
        theme_color: '#00C2A8',
        background_color: '#0A0F1A',
        display: 'standalone',
        start_url: './#/app',
        scope: './',
        icons: [
          { src: 'brand/favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'brand/favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Semua aset build diprecache (app shell) → buka tanpa jaringan tetap tampil.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Private responses must not survive logout or be shared by URL
            // across accounts. Only the application shell is available offline.
            urlPattern: ({ url, request }: { url: URL; request: Request }) =>
              request.headers.has('Authorization') || url.pathname === '/api' || url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // Tile peta OpenStreetMap — offline tetap terlihat peta terakhir.
            urlPattern: /^https:\/\/[a-z]+\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  server: {
    proxy: {
      // Dev: API lokal wrangler (presensia-api, port 8787).
      '/api': 'http://localhost:8787',
    },
  },
});
