import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
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