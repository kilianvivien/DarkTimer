import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  const tauriDevHost = process.env.TAURI_DEV_HOST;
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
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-512x512.png'],
        manifest: {
          name: 'DarkTimer',
          short_name: 'DarkTimer',
          description: 'A utilitarian darkroom timer for analog film development.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
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
      host: tauriDevHost || '0.0.0.0',
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : tauriDevHost
          ? { protocol: 'ws', host: tauriDevHost, port: 1421 }
          : true,
      watch: { ignored: ['**/src-tauri/**'] },
    },
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
      target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      minify: (!process.env.TAURI_ENV_DEBUG ? 'esbuild' : false) as 'esbuild' | false,
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
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
