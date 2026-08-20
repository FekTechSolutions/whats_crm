import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tanstackRouter(),
    tailwindcss(),
    react(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },

  server: {
    port: 3000,

    allowedHosts: true,
    // ou:
    // allowedHosts: ['unsophomorical-unsheer-kandra.ngrok-free.dev']
  },
})