import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // `process.cwd()` is standard in Node.js environments, so casting to `any` resolves potential TypeScript conflicts
  // if `process` is incorrectly typed in some configurations for this file.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer', // Force resolution to the installed package
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'global': 'window',
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      include: ['buffer', 'long', 'graphology', 'sigma', 'lucide-react', 'react-hook-form', 'zod', '@hookform/resolvers/zod'],
      exclude: ['@xenova/transformers']
    }
  };
});