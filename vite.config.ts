import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    open: true,
  },
  plugins: [react()],
  base: '/descent/',          // ← CHANGE THIS
  // If your repo is named exactly yourusername.github.io, use base: '/' or remove this line
})


