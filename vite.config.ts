import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Clean Industrial configuration for TCN Operations Suite
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'lucide-react', 'clsx', 'tailwind-merge'],
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
});
