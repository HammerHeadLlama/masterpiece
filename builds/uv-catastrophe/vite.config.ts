import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../../docs/uv-catastrophe',
    emptyOutDir: true,
  },
});
