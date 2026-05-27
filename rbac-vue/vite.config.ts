import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RbacVue',
      fileName: 'rbac-vue'
    },
    rollupOptions: {
      // rbac-core is bundled in — one singleton, no deduplication issues
      external: ['vue', 'pinia', 'vue-router'],
      output: {
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          'vue-router': 'VueRouter'
        }
      }
    }
  }
})
