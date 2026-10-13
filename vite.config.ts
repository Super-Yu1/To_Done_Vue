import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  /*
   * 开发期把 /api 转给后端（生产由 Nginx 反代，见系统设计说明书 11.1）。
   * 后端端口是 8081（见 docs/前端修改说明.md 第 1 节）；图片走 MinIO 的预签名直链，
   * 不再经过前端的 /media 中转——那条代理已作废，去掉。
   */
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8081', changeOrigin: true },
    },
  },
})
