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
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
