import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { DEVELOPMENT_SECURITY_HEADERS, productionSecurityHeaders } from './security-headers';

export default defineConfig(({ mode }) => {
  // Only when the website calls an API on ANOTHER address does the security
  // policy need to allow it; by default the API is on the same site.
  const apiBase = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL;
  const apiOrigin = apiBase ? new URL(apiBase).origin : undefined;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      headers: DEVELOPMENT_SECURITY_HEADERS,
      // In development, the website calls "/api/…" and Vite forwards it to the
      // API server. The browser only ever talks to one address, which mirrors
      // the production setup (same site) and keeps cookies simple.
      proxy: {
        // 127.0.0.1, not "localhost": the API listens only on this IPv4
        // loopback address in development (see apps/api/src/config/env.ts).
        '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false },
      },
    },
    // `vite preview` serves the production build with the production headers,
    // so the strict security policy can be tested before deployment.
    preview: {
      port: 4173,
      strictPort: true,
      headers: productionSecurityHeaders(apiOrigin),
    },
    build: {
      sourcemap: false,
    },
  };
});
