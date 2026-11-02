import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'


// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Files load from the site's root ("/assets/…"), so a page opened deeper in
  // the app (/designer/<id>, refreshed or linked) still finds them; a relative
  // base made the browser look in /designer/assets/… and the page stayed blank
  base: '/',
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
    },
  },
})
