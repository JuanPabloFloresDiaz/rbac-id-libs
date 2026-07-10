import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCached, invalidateByUserId, setCache,
} from '../../rbac-node/dist/rbac-node.node.mjs'

const institution = {
  id: 'inst-1',
  code: 'ricaldone',
  name: 'Instituto Ricaldone',
  country_code: 'SV',
  currency_code: 'USD',
  timezone: 'America/El_Salvador',
  locale: 'es-SV',
  is_active: true,
}
const institutionApplication = {
  id: 'ia-1',
  institution_id: 'inst-1',
  application_id: 'app-1',
  installed_template_version: 'legacy-backfill-v1',
  settings: {},
  is_active: true,
}

test('node permission cache preserves tenant metadata for receiver applications', () => {
  setCache('token-meta', 'user-1', [{ category: 'payroll', actions: ['read'] }], 300, 'PAYROLL', 'inst-1', {
    institutionApplicationId: institutionApplication.id,
    institution,
    institutionApplication,
  })

  const cached = getCached('token-meta', 'PAYROLL', 'inst-1')
  assert.equal(cached.userId, 'user-1')
  assert.equal(cached.institutionId, 'inst-1')
  assert.equal(cached.institutionApplicationId, 'ia-1')
  assert.equal(cached.institution.currency_code, 'USD')
  assert.equal(cached.institution.country_code, 'SV')
  assert.equal(cached.institutionApplication.installed_template_version, 'legacy-backfill-v1')
})

test('node permission cache can invalidate only one institution application', () => {
  setCache('token-ia-1', 'user-2', [{ category: 'payroll', actions: ['read'] }], 300, 'PAYROLL', 'inst-1', {
    institutionApplicationId: 'ia-1',
    institution,
    institutionApplication: { ...institutionApplication, id: 'ia-1' },
  })
  setCache('token-ia-2', 'user-2', [{ category: 'payroll', actions: ['read'] }], 300, 'PAYROLL', 'inst-2', {
    institutionApplicationId: 'ia-2',
    institution: { ...institution, id: 'inst-2', code: 'tenant-2' },
    institutionApplication: { ...institutionApplication, id: 'ia-2', institution_id: 'inst-2' },
  })

  const removed = invalidateByUserId('user-2', { appKey: 'PAYROLL', institutionApplicationId: 'ia-1' })

  assert.equal(removed, 1)
  assert.equal(getCached('token-ia-1', 'PAYROLL', 'inst-1'), null)
  assert.equal(getCached('token-ia-2', 'PAYROLL', 'inst-2').institutionApplicationId, 'ia-2')
})
