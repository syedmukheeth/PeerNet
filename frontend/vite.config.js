import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Settings displayed a hard-coded "v1.0.0" that had drifted from the real
  // version. Injected from package.json so the two cannot disagree.
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    rollupOptions: {
      output: {
        // Split the vendor libraries out of the entry chunk. These change far
        // less often than app code, so they stay cached across deploys.
        manualChunks: {
          // react-dom/client is listed explicitly: the app only ever imports
          // that entry, and naming the bare react-dom package is not enough to
          // pull it into this chunk.
          react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
          query: ['@tanstack/react-query'],
          motion: ['framer-motion'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // `vite preview` serves the real build output. It needs the same proxy as the
  // dev server, otherwise the app it serves cannot reach the API and only the
  // logged-out screens are reachable.
  //
  // Worth having because the dev server and the bundle do not agree on CSS
  // order once the stylesheet is split across modules with @import: the dev
  // server also serves stale CSS after edits to the import graph. When a change
  // has to be verified rather than eyeballed, build and check it here.
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
