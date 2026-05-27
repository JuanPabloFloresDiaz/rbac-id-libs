import type { Request } from 'express'

// ─── Token extraction ─────────────────────────────────────────────────────────

/**
 * Función que extrae el JWT de una Express Request.
 * La implementación por defecto lee `req.cookies.access_token`.
 * Se puede sobreescribir en `createRbacNode(..., tokenExtractor, ...)` para soportar
 * Authorization Bearer, headers custom, etc.
 */
export type TokenExtractor = (req: Request) => string | undefined

// ─── Internal shared context ──────────────────────────────────────────────────

/**
 * Contexto resuelto que se comparte entre los middlewares internamente.
 * No forma parte de la API pública — sólo para uso interno del package.
 * @internal
 */
// ─── Public factory return type ─────────────────────────────────────────────

import type { RequestHandler, Router } from 'express'

export interface RbacNodeInstance {
  /** Middleware global de autorización (modo legacy — 1 HTTP call por request). */
  guard: RequestHandler
  /** Factory del middleware de auditoría (fire-and-forget). */
  audit: (exclude?: string[], sensitiveFields?: string[]) => RequestHandler
  /** Middleware de verificación de sesión activa / silent token refresh. */
  sessionCheck: RequestHandler
  /** Middleware global que hidrata `req.rbac.permissions` (1 HTTP call por sesión). */
  loadPermissions: () => RequestHandler
  /** Factory de middleware por ruta — verifica un permiso específico de forma síncrona. */
  can: (category: string, action: string) => RequestHandler
  /** Router Express con `POST /rbac/cache/invalidate` para invalidación por webhook. */
  cacheRouter: Router
}

// ─── Internal shared context ──────────────────────────────────────────────────

export interface RbacNodeCtx {
  authApiUrl: string
  applicationId: string | number
  publicRoutes: string[]
  timeout: number
  debugMode: boolean
  tokenExtractor: TokenExtractor
  logger: Pick<Console, 'info' | 'warn' | 'error'>
  permissionsTtl: number
  webhookSecret?: string
}
