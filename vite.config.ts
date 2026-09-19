import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // im WSL-Netzwerk erreichbar
    port: 5173,
  },
});
