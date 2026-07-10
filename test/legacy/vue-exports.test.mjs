import test from 'node:test'
import assert from 'node:assert/strict'

import * as rbacVue from '../../rbac-vue/dist/rbac-vue.js'

test('legacy Vue public API remains exported', () => {
  const expectedExports = [
    'RbacPlugin',
    'useAuthStore',
    'usePermission',
    'useSessionGuard',
    'CanAccess',
    'vCan',
  ]

  for (const name of expectedExports) {
    assert.equal(name in rbacVue, true, `missing export: ${name}`)
  }
})
