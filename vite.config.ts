import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from https://<user>.github.io/FinanceManager/, so
// every asset URL needs that prefix. `npm run preview` must use it too, or it
// serves a build whose asset paths it cannot resolve. Only `npm run dev` is
// exempt, where the app sits at the server root.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'serve' && !isPreview ? '/' : '/FinanceManager/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The app is pure client-side over localStorage, so once the shell is
      // cached it works with no network at all.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Finance Manager',
        short_name: 'Finance',
        description:
          'Per-month budgeting with categories, subscriptions and automatic rollover.',
        theme_color: '#4f46e5',
        background_color: '#f7f8fa',
        display: 'standalone',
        orientation: 'portrait',
        // Must match Vite's base, or the installed app opens a 404.
        start_url: '/FinanceManager/',
        scope: '/FinanceManager/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Any unmatched navigation falls back to the cached shell, so a reload
        // while offline still opens the app rather than the browser error page.
        navigateFallback: '/FinanceManager/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
