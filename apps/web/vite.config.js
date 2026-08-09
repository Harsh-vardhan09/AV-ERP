import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Every API slice builds its base URL as `${import.meta.env.VITE_PORT}/api/...`.
  // When VITE_PORT is UNSET, Vite replaces it with `undefined`, producing the
  // literal URL "undefined/api/v1/..." — every request 404s. Defaulting to ''
  // instead yields "/api/v1/...", a relative URL that resolves against the app
  // origin. In production that hits the Vercel /api rewrite (vercel.json), which
  // proxies to Render — making the API same-origin so the httpOnly auth cookies
  // are first-party and actually get sent.
  // A VITE_PORT set in .env or in the hosting dashboard still wins — EXCEPT a
  // localhost value in a production build. `.env` is developer-local and not
  // committed, so a `vite build` run on a dev machine would otherwise bake
  // "http://localhost:4000" into the shipped bundle and every API call in
  // production would fail. Verified: this exact leak appeared in a build before
  // the guard was added.
  const raw = env.VITE_PORT ?? '';
  const isLocal = /localhost|127\.0\.0\.1/i.test(raw);
  const apiBase = mode === 'production' && isLocal ? '' : raw;

  return {
    define: {
      'import.meta.env.VITE_PORT': JSON.stringify(apiBase),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@app': path.resolve(__dirname, 'src/app'),
        '@modules': path.resolve(__dirname, 'src/modules'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@styles': path.resolve(__dirname, 'src/styles'),
      },
    },
    build: {
      // @av-erp/shared is CommonJS (Node requires it too) and symlinked by npm
      // workspaces, so it resolves outside node_modules and Rollup's commonjs
      // plugin skips it by default — named imports then fail to resolve.
      commonjsOptions: {
        include: [/packages[\\/]shared/, /node_modules/],
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            charts: ['recharts'],
            ui: ['lucide-react', 'react-hot-toast'],
          },
        },
      },
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
  };
});
