import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Installable, fully offline app. Everything (engine WASM, puzzles, fonts, pieces) is precached.
    // registerType 'prompt': a new version waits until the player taps "Update" (see UpdatePrompt),
    // so an update never reloads the page in the middle of a game. The service worker only exists
    // in production builds (`npm run build && npm run preview`), never in `npm run dev`.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'NextMove — Learn Chess',
        short_name: 'NextMove',
        description: 'Learn chess from your very first move: lessons, a coach that explains, computer opponents and puzzles.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#15100c',
        theme_color: '#15100c',
        categories: ['education', 'games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,json,txt}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // stockfish.wasm is ~1.8 MB
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
