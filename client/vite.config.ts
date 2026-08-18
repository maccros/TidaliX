import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves a project site from /<repo>/, not the domain root, so
  // every asset URL has to carry that prefix. VITE_BASE lets local `vite build`
  // and `vite preview` keep working at `/` for anyone who isn't deploying.
  base: process.env['VITE_BASE'] ?? '/',
  server: {
    // Codespaces forwards the port only if Vite listens on all interfaces.
    host: true,
    port: 5173,
  },
});
