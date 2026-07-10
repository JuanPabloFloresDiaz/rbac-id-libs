import type { Institution, InstitutionApplication, Permission } from '@oscardevpr/rbac-core'
import { createHash } from 'crypto'

export interface CachedPermissions {
  userId: string
  appKey: string
  institutionId?: string
  institutionApplicationId?: string
  institution?: Institution
  institutionApplication?: InstitutionApplication
  permissions: Permission[]
  expiresAt: number
}
export interface InvalidatePermissionsFilter {
  appKey?: string
  institutionId?: string
  institutionApplicationId?: string
}
const store = new Map<string, CachedPermissions>()
export function permissionCacheKey(token: string, appKey = '', institutionId = 'legacy'): string {
  return createHash('sha256').update(`${token}\0${appKey}\0${institutionId}`).digest('hex')
}
export function getCached(token: string, appKey = '', institutionId?: string): CachedPermissions | null {
  const key = permissionCacheKey(token, appKey, institutionId)
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { store.delete(key); return null }
  return entry
}
export function setCache(
  token: string, userId: string, permissions: Permission[], ttlSeconds = 300,
  appKey = '', institutionId?: string, metadata: Pick<CachedPermissions, 'institutionApplicationId' | 'institution' | 'institutionApplication'> = {}
): void {
  store.set(permissionCacheKey(token, appKey, institutionId), {
    userId, appKey, institutionId,
    institutionApplicationId: metadata.institutionApplicationId,
    institution: metadata.institution,
    institutionApplication: metadata.institutionApplication,
    permissions,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}
export function invalidateByUserId(
  userId: string,
  appKeyOrFilter?: string | InvalidatePermissionsFilter,
  institutionId?: string
): number {
  const filter = typeof appKeyOrFilter === 'object'
    ? appKeyOrFilter
    : { appKey: appKeyOrFilter, institutionId }
  let removed = 0
  for (const [key, entry] of store) {
    if (entry.userId === userId &&
      (!filter.appKey || entry.appKey === filter.appKey) &&
      (!filter.institutionId || entry.institutionId === filter.institutionId) &&
      (!filter.institutionApplicationId || entry.institutionApplicationId === filter.institutionApplicationId)) {
      store.delete(key); removed++
    }
  }
  return removed
}
