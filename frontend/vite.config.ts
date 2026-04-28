import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // The session WebSocket endpoint needs ws:true so vite proxies the
      // HTTP upgrade handshake. Listed before the catch-all /api proxy.
      '/api/session': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
      '/api': 'http://localhost:3001',
    },
  },
})
