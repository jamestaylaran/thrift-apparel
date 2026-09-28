import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev + preview servers forward API calls to the Express backend.
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
