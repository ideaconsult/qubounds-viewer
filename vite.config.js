import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/qubounds/',
  server: {
    port: 5174,
    proxy: {
      // ramanchada-api (query, JSON/image download, h5grove) is mounted under /db
      '/db': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
