import test from 'node:test'
import assert from 'node:assert/strict'

import {
  checkPermission,
  checkPermissionAny,
  defineRbacSeed,
  rbacConfig,
  setRbacConfig,
} from '../../rbac-core/dist/rbac-core.js'

test('legacy permission engine keeps category and any-category behavior', () => {
  const permissions = [
    { category: 'Employees', actions: ['Read', 'Create'] },
    { category: 'Payroll', actions: ['Close'] },
  ]

  assert.equal(checkPermission(permissions, 'Employees', 'Create'), true)
  assert.equal(checkPermission(permissions, 'Employees', 'Delete'), false)
  assert.equal(checkPermissionAny(permissions, 'Close'), true)
})

test('legacy debug mode bypass remains characterized', () => {
  assert.equal(checkPermission([], 'Missing', 'Missing', true), true)
})

test('legacy seed map keeps its wire shape', () => {
  assert.deepEqual(defineRbacSeed({ Employees: ['Read', 'Create'] }), [
    { name: 'Employees', actions: ['Read', 'Create'] },
  ])
})

test('legacy positional configuration remains available', () => {
  setRbacConfig('https://auth.example.test/api/v1', 'PAYROLL', false, 'login')
  assert.equal(rbacConfig.authApiUrl, 'https://auth.example.test/api/v1')
  assert.equal(rbacConfig.applicationId, 'PAYROLL')
  assert.equal(rbacConfig.loginRoute, 'login')
})
