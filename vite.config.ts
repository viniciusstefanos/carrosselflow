import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (required for Docker/Cloud Run)
    port: parseInt(process.env.PORT || '8080'), // Use the PORT env var or default to 8080
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8080'),
  },
});