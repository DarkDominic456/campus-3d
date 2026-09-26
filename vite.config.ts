import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The Rapier chunk embeds its WASM as base64 (~2.2 MB raw / ~0.85 MB gzip) and three.js is
    // ~1 MB raw; both only load in 3D mode. Anything else above this limit is a real regression.
    chunkSizeWarningLimit: 2400,
  },
})
