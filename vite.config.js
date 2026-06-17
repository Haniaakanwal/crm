import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/fmapi': {
        target: 'https://fm.idiosol.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/fmapi/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('→ Proxying:', req.method, req.url);
            console.log('→ Auth header:', proxyReq.getHeader('authorization'));
          });
          proxy.on('proxyRes', (proxyRes) => {
            console.log('← Response status:', proxyRes.statusCode);
          });
        },
      },
    },
  },
});