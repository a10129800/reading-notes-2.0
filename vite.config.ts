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
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && (req.url.startsWith('/content/') || req.url.includes('/content/'))) {
          const cleanUrl = req.url.split('?')[0];
          const relativeContentPath = cleanUrl.substring(cleanUrl.indexOf('/content/') + 1);
          const fullPath = path.resolve(__dirname, relativeContentPath);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            res.setHeader('Content-Type', fullPath.endsWith('.json') ? 'application/json' : 'text/plain');
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
export default defineConfig({
  plugins: [react(), copyPublicContentPlugin()],
  base: './', // Ensures relative assets work smoothly on GitHub Pages subpaths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
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
    port: 3000,
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
});

