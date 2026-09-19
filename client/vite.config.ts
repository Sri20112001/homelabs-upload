import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    // DEV ONLY — Vite strips `server` from production builds, so none of
    // this ships to Vercel. Prod API base comes from VITE_API_URL
    // (src/config/app.ts). Targets match local `air` defaults (:8080).
    proxy: {
      '/api': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
      '/metrics': 'http://localhost:8080',
    },
    port: 3456,
    host: true,
  },
})
