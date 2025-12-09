import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the browser environment
      // This maps process.env.API_KEY to the actual value from environment variables
      'process.env': {
        API_KEY: env.API_KEY,
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    }
  };
});