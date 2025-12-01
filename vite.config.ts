import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Injects the API_KEY from Netlify/System env into the browser code
      // This satisfies the Google GenAI SDK requirement for process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      
      // Injects the Facebook App ID
      'process.env.REACT_APP_FB_APP_ID': JSON.stringify(env.REACT_APP_FB_APP_ID),
    }
  };
});