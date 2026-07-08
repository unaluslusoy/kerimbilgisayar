import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * NOT: Bu proje iki modda çalışabilir:
 *   1) UNIFIED (varsayılan) → `npm run dev` = Express + Vite middleware, port 3000
 *   2) SPLIT (opsiyonel)    → `npm run dev:split` = Express (3000) + Vite (5173) ayrı
 * Aşağıdaki `server` config sadece SPLIT modda çalışır.
 */
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:3000';

const proxyCommon = {
  target: API_TARGET,
  changeOrigin: true,
  timeout: 10_000,
  proxyTimeout: 10_000,
  configure: (proxy: any) => {
    proxy.on('error', (err: any, req: any, res: any) => {
      const msg = `[proxy] ${req?.method} ${req?.url} → ${API_TARGET} — ${err?.code || err?.message}`;
      console.warn(msg);
      if (res && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'BadGateway',
          message: 'Backend API (Express :3000) ulaşılamıyor. `npm run dev` çalışıyor mu?',
          code: err?.code,
        }));
      }
    });
  },
};

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: '127.0.0.1',
    hmr: process.env.DISABLE_HMR === 'true'
      ? false
      : { port: 24678, clientPort: 24678 },
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
    proxy: {
      '/api':         proxyCommon,
      '/uploads':     proxyCommon,
      '/robots.txt':  proxyCommon,
      '/sitemap.xml': proxyCommon,
    },
  },
}));
