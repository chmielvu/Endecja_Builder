import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to avoid TS error if types are missing
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Removed conflicting alias for 'buffer'
      },
    },
    define: {
      // Inject API Key specifically
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Fix for some libraries expecting global
      'global': 'window',
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      // Explicitly include polyfills for Node.js compatibility
      include: ['buffer', 'long'], 
      exclude: ['@xenova/transformers']
    }
  };
});