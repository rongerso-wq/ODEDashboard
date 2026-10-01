import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Older phones: Vite's default target (Safari 16.4) turned `max-width` queries into range syntax
  // (`width<=900px`), which iOS 15 ignores, so phones got the desktop layout. iOS 15 / Chrome 100
  // keep plain min/max queries. (color-mix and dvh still need iOS 15.4–16.2: colours/heights degrade.)
  build: {
    target: ['es2020', 'safari15', 'chrome100'],
    cssTarget: ['safari15', 'chrome100'],
  },
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
        // Elias's recordings (public/voice, ~10 MB): kept once played, so heard lessons work offline.
        // A clip's name is a hash of its text, so a cached clip never goes stale.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/voice/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: { cacheName: 'elias-voice', expiration: { maxEntries: 3000 } },
          },
        ],
      },
    }),
  ],
})
