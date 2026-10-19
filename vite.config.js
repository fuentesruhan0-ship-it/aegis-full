import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { createAegisSyncPlugin } from './src/api/aegisSyncPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    createAegisSyncPlugin(),
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BASE44_APP_BASE_URL || 'https://app.base44.com',
        changeOrigin: true,
        secure: false, // Disable SSL verification for proxy
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[vite proxy notice]: Base44 backend proxy connection error:', err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend temporarily unreachable', details: err.message }));
            }
          });
        }
      },
      '/gemini-api': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gemini-api/, '')
      },
      '/xkiro-api': {
        target: 'https://api.xkiro.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/xkiro-api/, '')
      }
    }
  }
});
