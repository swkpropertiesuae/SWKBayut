import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@shared': path.resolve('src/shared'),
      '@': path.resolve('src/web'),
    },
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT ?? 8090}`,
        changeOrigin: false,
      },
    },
  },
})
