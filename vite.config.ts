import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * 独立开发库的 Vite 配置。
 *
 * 关键点是下面这组 alias：home 页源码里用的是主项目的 `#/` 路径别名，
 * 这里把它们逐一映射到 `src/deps/` 下的只读副本。这样 home 页的源码
 * 可以**一字不改**地在本库和主项目之间来回搬运 —— 合并时只 diff
 * `src/views/geo/home/` 就够了。
 *
 * 注意顺序：具体路径必须排在 `#` 兜底之前，否则会被兜底规则吞掉。
 */
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: [
      // home 页引用的 5 个主项目模块（只读副本）
      {
        find: '#/api/geo/contracts',
        replacement: fileURLToPath(new URL('./src/deps/contracts.ts', import.meta.url)),
      },
      {
        find: '#/views/geo/display',
        replacement: fileURLToPath(new URL('./src/deps/display.ts', import.meta.url)),
      },
      {
        find: '#/views/geo/brand',
        replacement: fileURLToPath(new URL('./src/deps/brand.ts', import.meta.url)),
      },
      {
        find: '#/layouts/geo-menu',
        replacement: fileURLToPath(new URL('./src/deps/geo-menu.ts', import.meta.url)),
      },
      {
        find: '#/composables/useTheme',
        replacement: fileURLToPath(new URL('./src/deps/useTheme.ts', import.meta.url)),
      },
      { find: '#', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
