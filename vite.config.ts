/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Helper plugin to copy content/public-books to dist on build and serve in dev
function copyPublicContentPlugin() {
  return {
    name: 'copy-public-content',
    configureServer(server: any) {
      if (server.watcher) {
        server.watcher.on('error', (err: any) => {
          console.warn('[vite:watcher] Watcher warning handled safely:', err?.message || err);
        });
      }
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && (req.url.startsWith('/content/') || req.url.includes('/content/'))) {
          const cleanUrl = req.url.split('?')[0];
          const relativeContentPath = cleanUrl.substring(cleanUrl.indexOf('/content/') + 1);
          const fullPath = path.resolve(__dirname, relativeContentPath);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            let contentType = 'text/plain';
            if (fullPath.endsWith('.json')) contentType = 'application/json';
            else if (fullPath.endsWith('.jpg') || fullPath.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (fullPath.endsWith('.png')) contentType = 'image/png';
            else if (fullPath.endsWith('.webp')) contentType = 'image/webp';
            res.setHeader('Content-Type', contentType);
            return fs.createReadStream(fullPath).pipe(res);
          }
        }
        next();
      });
    },
    closeBundle() {
      const srcDir = path.resolve(__dirname, 'content/public-books');
      const destDir = path.resolve(__dirname, 'dist/content/public-books');
      if (fs.existsSync(srcDir)) {
        fs.cpSync(srcDir, destDir, { recursive: true });
        console.log('[copy-public-content] Successfully copied public books to dist/content/public-books');
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Check if this build is strictly for public reading (GitHub Pages)
  const isPublic =
    process.env.VITE_APP_MODE === 'public' ||
    process.env.VITE_ENABLE_MANAGER === 'false' ||
    (mode === 'production' && process.env.VITE_ENABLE_MANAGER !== 'true');

  const managerRoutesTarget = isPublic
    ? path.resolve(__dirname, './src/routes/ManagerRoutes.public.tsx')
    : path.resolve(__dirname, './src/routes/ManagerRoutes.tsx');

  console.log(`[vite.config] Mode: ${mode}, isPublic: ${isPublic}, managerRoutesTarget: ${managerRoutesTarget}`);

  return {
    plugins: [react(), copyPublicContentPlugin()],
    base: './', // Ensures relative assets work smoothly on GitHub Pages subpaths
    resolve: {
      alias: [
        { find: '@/routes/ManagerRoutes', replacement: managerRoutesTarget },
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            markdown: ['react-markdown', 'remark-gfm'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 3000,
      watch: {
        ignored: [
          '**/content/public-books/**',
          '**/dist/**',
          '**/.git/**',
          '**/pids/**',
        ],
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      fileParallelism: false,
      include: ['tests/**/*.test.{ts,tsx}'],
    },
  };
});

