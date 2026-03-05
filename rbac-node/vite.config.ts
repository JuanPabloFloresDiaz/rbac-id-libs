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
      name: 'RbacNode',
      fileName: 'rbac-node'
    },
    rollupOptions: {
      // Express es peerDependency — no se bundlea
      // rbac-core también se externaliza para evitar duplicados en el consumer
      external: ['express', '@oscardevpr/rbac-core', 'crypto', 'node:crypto'],
      output: {
        globals: {
          express: 'express',
          '@oscardevpr/rbac-core': 'RbacCore',
          crypto: 'crypto',
          'node:crypto': 'crypto',
        }
      }
    }
  }
})
