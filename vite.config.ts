import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.mistral.ai https://vitals.vercel-insights.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');

  return {
    plugins: [
      {
        name: 'darktimer-csp',
        apply: 'build',
        transformIndexHtml(html) {
          return {
            html,
            tags: [
              {
                tag: 'meta',
                attrs: {
                  'http-equiv': 'Content-Security-Policy',
                  content: contentSecurityPolicy,
                },
                injectTo: 'head-prepend',
              },
            ],
          };
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        injectRegister: false,
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-192x192.png', 'maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'DarkTimer',
          short_name: 'DarkTimer',
          description: 'A utilitarian darkroom timer for analog film development.',
          lang: 'en',
          categories: ['utilities', 'photo'],
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          scope: '/',
          start_url: '/',
          launch_handler: {
            client_mode: 'navigate-existing',
          },
          handle_links: 'preferred',
          shortcuts: [
            {
              name: 'New Timer',
              short_name: 'Timer',
              url: '/?view=manual',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'AI Recipe Search',
              short_name: 'AI Search',
              url: '/?view=ai',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Library',
              short_name: 'Library',
              url: '/?view=library',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          // iOS fetches launch images itself at install time; precaching all
          // 36 of them would double the SW payload for every platform.
          globIgnores: ['**/splash/**'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'darktimer-gemini-runtime',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                networkTimeoutSeconds: 5,
              },
            },
            {
              urlPattern: /^https:\/\/api\.mistral\.ai\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'darktimer-mistral-runtime',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                networkTimeoutSeconds: 5,
              },
            },
          ],
        },
      }),
    ],
    clearScreen: false,
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR === 'true' ? false : true,
    },
    build: {
      target: 'safari13',
      minify: 'esbuild',
      sourcemap: false,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      clearMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
      },
    },
  };
});
