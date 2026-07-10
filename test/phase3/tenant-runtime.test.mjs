import test from 'node:test'
import assert from 'node:assert/strict'
import {
  rbacConfig, setRbacConfig, setInstitutionId,
} from '../../rbac-core/dist/rbac-core.js'
import {
  createRbacNode, permissionCacheKey,
} from '../../rbac-node/dist/rbac-node.node.mjs'

test('core accepts v2 object configuration and keeps v1 aliases', () => {
  setRbacConfig({ authApiUrl: 'https://auth.test', appKey: 'PAYROLL', institutionId: 'tenant-a' })
  assert.equal(rbacConfig.appKey, 'PAYROLL')
  assert.equal(rbacConfig.applicationId, 'PAYROLL')
  assert.equal(rbacConfig.institutionId, 'tenant-a')
  setInstitutionId('tenant-b')
  assert.equal(rbacConfig.institutionId, 'tenant-b')
})

test('core preserves positional v1 configuration', () => {
  setRbacConfig('https://auth.test', 'LEGACY', true, 'signin')
  assert.equal(rbacConfig.applicationId, 'LEGACY')
  assert.equal(rbacConfig.appKey, 'LEGACY')
  assert.equal(rbacConfig.institutionId, null)
  assert.equal(rbacConfig.debugMode, true)
})

test('node cache keys are isolated by application and institution', () => {
  const base = permissionCacheKey('token', 'PAYROLL', 'tenant-a')
  assert.notEqual(base, permissionCacheKey('token', 'PAYROLL', 'tenant-b'))
  assert.notEqual(base, permissionCacheKey('token', 'HR', 'tenant-a'))
})

test('node accepts v2 object configuration while keeping middleware API', () => {
  const rbac = createRbacNode({
    authApiUrl: 'https://auth.test',
    appKey: 'PAYROLL',
    institutionId: 'tenant-a',
  })
  assert.equal(typeof rbac.guard, 'function')
  assert.equal(typeof rbac.loadPermissions, 'function')
  assert.equal(typeof rbac.can, 'function')
})
