import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Offline backup: the whole presentation in ONE html file.
// Double-click dist-offline/index.html — no server, no internet needed.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist-offline',
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: 100_000_000,
  },
});
