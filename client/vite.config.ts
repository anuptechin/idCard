import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Modular monolith: in dev, Vite serves the UI and proxies /api to the Express server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        cookieDomainRewrite: '', // make the session cookie apply to localhost:5173
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
