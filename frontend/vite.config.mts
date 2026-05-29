import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const isAnalyze = process.env.ANALYZE === 'true';

/**
 * Custom Vite plugin that injects a Content-Security-Policy meta tag into
 * the HTML <head>. Uses Report-Only mode so violations are logged to the
 * browser console without blocking resources.
 *
 * Dev mode relaxes script-src (inline scripts for HMR) and connect-src
 * (WebSocket for hot-reload). Production uses a strict policy.
 *
 * To switch from report-only to enforcement, change the meta tag's
 * http-equiv from "Content-Security-Policy-Report-Only" to
 * "Content-Security-Policy".
 */
function cspMetaTagPlugin(): Plugin {
  return {
    name: 'html-csp-meta-tag',
    transformIndexHtml(html, ctx) {
      const isDev = ctx.server != null;

      const scriptSrc = isDev
        ? "'self' 'unsafe-inline'"
        : "'self'";

      const connectSrc = isDev
        ? "'self' https://soroban-testnet.stellar.org ws:"
        : "'self' https://soroban-testnet.stellar.org";

      const directives = [
        "default-src 'none'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' https: data:",
        `connect-src ${connectSrc}`,
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');

      const metaTag =
        `<meta http-equiv="Content-Security-Policy-Report-Only" content="${directives}">`;

      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    ${metaTag}`,
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    cspMetaTagPlugin(),
    ...(isAnalyze
      ? [
          visualizer({
            open: true,
            filename: 'dist/bundle-analysis.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          }),
        ]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-stellar': ['@stellar/stellar-sdk'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
