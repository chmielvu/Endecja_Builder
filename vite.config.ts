import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        buffer: 'buffer',
        long: 'long'
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'global': 'window',
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      include: ['buffer', 'long', 'graphology', 'sigma', 'lucide-react'],
      exclude: ['@xenova/transformers']
    }
  };
});