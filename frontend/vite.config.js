import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
