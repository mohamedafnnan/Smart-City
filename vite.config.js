import { defineConfig } from 'vite';

/**
 * Vite configuration for the Smart City 3D project.
 *
 * WHY VITE:
 * - Native ES module dev server (no bundling in dev → millisecond HMR).
 * - Rollup-based production build (excellent tree-shaking for Three.js,
 *   which is otherwise ~600 KB unminified).
 * - Zero-config for our use case; we only tweak the base path + assets dir.
 */
export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'gsap'],
  },
});
