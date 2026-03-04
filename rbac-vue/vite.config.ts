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
      // peerDependencies + rbac-core are not bundled — provided at runtime
      external: ['vue', 'pinia', 'vue-router', '@oscardevpr/rbac-core'],
      output: {
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          'vue-router': 'VueRouter',
          '@oscardevpr/rbac-core': 'RbacCore'
        }
      }
    }
  }
})
