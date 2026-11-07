import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');
  return {
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
      host: '0.0.0.0',
      fs: {
        allow: [rootDir],
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      // En desarrollo, proxy a los emuladores de Firebase Functions
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          }
        }
      }
    },
    // SEGURIDAD: NO se exponen API keys al frontend.
    // Las llamadas a APIs externas pasan por el backend (Cloud Functions).
    define: {
      // Solo variables públicas (no sensibles)
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
        '@modules': path.resolve(rootDir, './src/modules'),
        '@shared': path.resolve(rootDir, './src/shared'),
        '@context': path.resolve(rootDir, './src/context'),
        '@hooks': path.resolve(rootDir, './src/hooks'),
      }
    }
  };
});
