import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RbacCore',
      fileName: 'rbac-core'
    },
    rollupOptions: {
      // axios is bundled — consumers of rbac-vue don't need to install it directly
      external: []
    }
  }
})
