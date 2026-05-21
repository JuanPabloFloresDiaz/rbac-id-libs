import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

const globals = {
  express: 'express',
  '@oscardevpr/rbac-core': 'RbacCore',
  axios: 'axios',
  crypto: 'crypto',
  'node:crypto': 'crypto',
}

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    target: 'es2020',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RbacNode',
      fileName: 'rbac-node'
    },
    rollupOptions: {
      // Express es peerDependency — no se bundlea
      // rbac-core también se externaliza para evitar duplicados en el consumer
      // axios se externaliza para preservar el adaptador http en Node
      external: ['express', '@oscardevpr/rbac-core', 'axios', 'crypto', 'node:crypto'],
      output: [
        {
          format: 'es',
          entryFileNames: 'rbac-node.node.mjs',
          globals,
        },
        {
          format: 'cjs',
          entryFileNames: 'rbac-node.node.cjs',
          globals,
        },
        {
          format: 'es',
          entryFileNames: 'rbac-node.browser.js',
          globals,
        },
      ]
    }
  }
})
