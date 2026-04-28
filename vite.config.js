import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        guia: 'guia.html'
      }
    }
  },
  server: {
    open: true
  }
});
