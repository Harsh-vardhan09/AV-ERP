import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // Sprint 7: manual code splitting for optimal chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          query:   ['@tanstack/react-query'],
          charts:  ['recharts'],
          ui:      ['lucide-react', 'react-hot-toast'],
        },
      },
    },
    // Warn if any chunk exceeds 600 KB
    chunkSizeWarningLimit: 600,
  },
  // Dev server proxy — makes PDF files appear same-origin (port 5173)
  // so the iframe in SheetViewer is not blocked by backend's CSP frame-ancestors
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/oases-file': {
        target: 'http://localhost:4000',
        rewrite: (p) => p.replace(/^\/oases-file/, '/uploads'),
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Strip headers that block cross-origin framing
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            // Allow cross-origin embeds
            proxyRes.headers['cross-origin-resource-policy'] = 'cross-origin';
          });
        },
      },
    },
  },
});
