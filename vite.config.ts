import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const PRODUCTION_BASE = '/FinanceManager/';

// The deploy workflow builds this repo twice — main at the Pages root and beta
// at /beta/ — so both the base path and the channel come from the environment.
// Unset means production, which is what a plain `npm run build` produces.
const overrideBase = process.env.BASE_PATH;
const isBeta = process.env.VITE_CHANNEL === 'beta';

export default defineConfig(({ command, isPreview }) => {
  // GitHub Pages serves the app from a sub-path, so every asset URL needs that
  // prefix. `npm run preview` must use it too, or it serves a build whose asset
  // paths it cannot resolve. Only `npm run dev` is exempt, at the server root.
  const base = overrideBase ?? (command === 'serve' && !isPreview ? '/' : PRODUCTION_BASE);

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // The app is pure client-side over localStorage, so once the shell is
        // cached it works with no network at all.
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          // Distinct identity so an installed beta app is never mistaken for
          // the real one sitting next to it on the home screen.
          name: isBeta ? 'Finance Manager (Beta)' : 'Finance Manager',
          short_name: isBeta ? 'Finance β' : 'Finance',
          description: isBeta
            ? 'Beta build of Finance Manager. Separate data from the live app.'
            : 'Per-month budgeting with categories, subscriptions and automatic rollover.',
          theme_color: isBeta ? '#b45309' : '#4f46e5',
          background_color: '#f7f8fa',
          display: 'standalone',
          orientation: 'portrait',
          // Must match the base, or the installed app opens a 404.
          start_url: base,
          scope: base,
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
          // while offline still opens the app rather than a browser error page.
          navigateFallback: `${base}index.html`,
          // Production's scope (/FinanceManager/) contains beta's (/FinanceManager/beta/),
          // so without this the production worker would answer beta navigations
          // with the production shell before beta's own worker installs.
          navigateFallbackDenylist: isBeta ? [] : [/^\/FinanceManager\/beta\//],
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
  };
});
