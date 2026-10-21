// Builds the report engine (src/engine/reportEngine.ts) as one plain script
// for the report server's GraalJS: npm run build:engine
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ECharts checks NODE_ENV; there is no process object in GraalJS
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  // The app's public/ folder (fonts, XSD) isn't part of the engine
  publicDir: false,
  build: {
    outDir: 'dist-engine',
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: path.resolve(__dirname, 'src/engine/reportEngine.ts'),
      name: 'CdpReportEngine',
      formats: ['iife'],
      fileName: () => 'cdp-report-engine.js',
    },
  },
})
