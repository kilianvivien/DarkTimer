import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const tauriDevHost = process.env.TAURI_DEV_HOST;

  return {
    plugins: [react(), tailwindcss()],
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
  };
});
