import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  // Multi-Page Application (MPA) — defines all HTML entry points
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        back: resolve(__dirname, 'back/index.html'),
      },
    },
  },
})
