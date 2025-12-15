import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to avoid TS error if types are missing
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Inject API Key specifically
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Do NOT define 'process.env': {} here as it might conflict with the window.process polyfill in index.html
      // Instead, we rely on the window.process polyfill for general process access.
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      exclude: ['@xenova/transformers']
    }
  };
});