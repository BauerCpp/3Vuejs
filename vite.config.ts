import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vite.dev/config/
export default defineConfig({
  base: '/3Vuejs',
  build: {
    outDir: './dist'
  },
  publicDir: './public',
  plugins: [
    vue(),
    vueJsx(),
    // vueDevTools(),
  ],
  assetsInclude: ['**/*.JPG'],
})
