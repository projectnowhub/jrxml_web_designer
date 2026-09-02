import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'


// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Configure the base path, for compatibility with GitHub Pages
  // If your repository name is not pdf_template_designer, change this to your actual repository name
  base: '',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 1420,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-i18n')) return 'vue-vendor';
          if (id.includes('node_modules/@codemirror')) return 'codemirror';
          if (id.includes('node_modules/naive-ui')) return 'naive-ui';
        },
      },
      external: (id) => {
        // Exclude test files
        return id.endsWith('.test.ts') || id.endsWith('.spec.ts');
      },
    },
  },
})
