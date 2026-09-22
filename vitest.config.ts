import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/.kilo/**', '**/dist/**'],
    // Ignore TypeScript errors in test files
    typecheck: {
      enabled: false
    }
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
    },
  },
  // Ensure test files use ES modules
  esbuild: {
    target: 'esnext'
  }
})