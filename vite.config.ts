
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This shims process.env for the browser environment
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
