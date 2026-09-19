import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Subpath hosting (e.g. /nodevault) for sharing one domain between projects.
// APP_BASE_PATH is read at BUILD time only; local `npm run dev` and Vercel
// leave it unset and serve from root. The backend mirrors it at runtime via
// the same variable (see router serveSPA + docker-compose).
const appBasePath = (() => {
  const p = (process.env.APP_BASE_PATH ?? '').trim();
  if (!p || p === '/') return '/';
  const s = p.startsWith('/') ? p : `/${p}`;
  return s.endsWith('/') ? s : `${s}/`;
})();

export default defineConfig({
  base: appBasePath,
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
