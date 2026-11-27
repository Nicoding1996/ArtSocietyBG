import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { sharedSourceHash } from './src/server/sourceHash';

export default defineConfig({
  define: {
    // The server sends the same hash of src/shared; the page warns when the two differ.
    __SHARED_HASH__: JSON.stringify(sharedSourceHash(fileURLToPath(new URL('./src/shared', import.meta.url)))),
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
