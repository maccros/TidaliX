import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Codespaces forwards the port only if Vite listens on all interfaces.
    host: true,
    port: 5173,
  },
});
