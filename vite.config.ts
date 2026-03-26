import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }

          if (id.includes('node_modules/jszip')) {
            return 'zip-vendor'
          }

          if (id.includes('/src/lib/export/')) {
            return 'export-tools'
          }

          if (id.includes('/src/lib/api/')) {
            return 'backend-tools'
          }

          if (id.includes('/src/stores/')) {
            return 'workspace-store'
          }

          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
