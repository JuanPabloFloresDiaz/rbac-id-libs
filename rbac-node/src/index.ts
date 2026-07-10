// ─── Factory principal ────────────────────────────────────────────────────────
export { createRbacNode } from './createRbacNode'

// ─── Tipos públicos ───────────────────────────────────────────────────────────
export type {
  TokenExtractor,
  InstitutionResolver,
  RbacNodeOptions
} from './types'
// RbacNodeCtx es interno — no se exporta

// ─── Utilidades (para casos avanzados / testing) ──────────────────────────────
export { defaultTokenExtractor }  from './utils/extractToken'
export { sanitizeBody }           from './utils/sanitizeBody'
export { getCached, invalidateByUserId, permissionCacheKey, setCache } from './utils/permissionsCache'

// ─── Re-exports de rbac-core útiles en el servidor ────────────────────────────
// Evita que el consumer tenga que importar directamente de @oscardevpr/rbac-core
// para los tipos más comunes de negocio.
export { defineRbacSeed, runSeeder } from '@oscardevpr/rbac-core'
export type {
  Permission,
  User,
  UserType,
  Application,
  Institution,
  InstitutionApplication,
  ApiError,
  RbacSeedEntry,
  RbacSeedMap,
} from '@oscardevpr/rbac-core'
