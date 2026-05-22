import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'ZeroLink — Learning Expedition',
        short_name: 'ZeroLink',
        description: 'Your learning expedition — no internet required',
        theme_color: '#c08040',
        background_color: '#f9f4e8',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/v1\/categories/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-categories', expiration: { maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /\/v1\/courses/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-courses', expiration: { maxAgeSeconds: 43200 } },
          },
          {
            urlPattern: /\/v1\/lessons\/[^/]+\/content/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-lesson-content', expiration: { maxAgeSeconds: 604800 } },
          },
          {
            urlPattern: /\/v1\/daily-plan/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-daily-plan', expiration: { maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
