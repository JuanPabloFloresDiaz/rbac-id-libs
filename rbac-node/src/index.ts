// ─── Factory principal ────────────────────────────────────────────────────────
export { createRbacNode } from './createRbacNode'

// ─── Tipos públicos ───────────────────────────────────────────────────────────
export type {
  RbacNodeOptions,
  AuditMiddlewareOptions,
  TokenExtractor
} from './types'
// RbacNodeCtx es interno — no se exporta

// ─── Utilidades (para casos avanzados / testing) ──────────────────────────────
export { defaultTokenExtractor } from './utils/extractToken'
export { sanitizeBody }          from './utils/sanitizeBody'

// ─── Re-exports de rbac-core útiles en el servidor ────────────────────────────
// Evita que el consumer tenga que importar directamente de @oscardevpr/rbac-core
// para los tipos más comunes de negocio.
export { defineRbacSeed, runSeeder } from '@oscardevpr/rbac-core'
export type {
  Permission,
  User,
  UserType,
  Application,
  ApiError,
  RbacSeedEntry,
  RbacSeedMap,
} from '@oscardevpr/rbac-core'
