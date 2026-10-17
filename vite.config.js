import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Two pages: the presentation itself and the standalone fingerprint test
// that the audience opens from the QR code.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        fp: resolve(import.meta.dirname, 'fp.html'),
      },
    },
  },
});
