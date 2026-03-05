import type { Request } from 'express'

// ─── Token extraction ─────────────────────────────────────────────────────────

/**
 * Función que extrae el JWT de una Express Request.
 * La implementación por defecto lee `req.cookies.access_token`.
 * Se puede sobreescribir en `createRbacNode({ tokenExtractor })` para soportar
 * Authorization Bearer, headers custom, etc.
 */
export type TokenExtractor = (req: Request) => string | undefined

// ─── Middleware options ───────────────────────────────────────────────────────

export interface AuditMiddlewareOptions {
  /**
   * Rutas que NO se auditarán.
   * Se evalúa con `req.path.startsWith(route)`.
   * Default: `[]`
   */
  exclude?: string[]
  /**
   * Campos del body que se ocultarán en el log de auditoría.
   * Se suma a los campos sensibles por defecto:
   * `['password', 'token', 'access_token', 'refresh_token', 'secret', 'cvv', 'pin']`
   */
  sensitiveFields?: string[]
}

// ─── Factory options ──────────────────────────────────────────────────────────

export interface RbacNodeOptions {
  /**
   * URL base del servicio itr-authenticator.
   * Ejemplo: `'http://localhost:8015'` o `process.env.AUTH_API`
   * **Requerido.**
   */
  authApiUrl: string

  /**
   * ID de la aplicación registrada en itr-authenticator.
   * Se envía como `appKey` en la verificación de permisos.
   * **Requerido.**
   */
  applicationId: string | number

  /**
   * Rutas que saltarán `guard` y `sessionCheck` sin verificación.
   * Se evalúa con `req.path.startsWith(route)`.
   * Default: `['/health']`
   *
   * Soluciona el bug donde `/health` quedaba protegido por `authGuard`
   * impidiendo que K8s y load balancers validen el estado del servicio.
   */
  publicRoutes?: string[]

  /**
   * Timeout en milisegundos para todas las llamadas HTTP a itr-authenticator.
   * Default: `3000`
   */
  timeout?: number

  /**
   * Cuando es `true`, todos los middlewares llaman `next()` sin verificar.
   * Útil para entornos de desarrollo donde itr-authenticator no está corriendo.
   * Default: `false`
   */
  debugMode?: boolean

  /**
   * Cómo extraer el JWT de la request.
   * Default: `(req) => req.cookies?.access_token`
   *
   * Ejemplo para soportar también Authorization Bearer:
   * ```ts
   * tokenExtractor: (req) =>
   *   req.cookies?.access_token ??
   *   req.headers.authorization?.replace('Bearer ', '')
   * ```
   */
  tokenExtractor?: TokenExtractor

  /**
   * Logger inyectable. Acepta cualquier objeto con métodos `info`, `warn`, `error`.
   * Compatible con `winston`, `pino`, `console`, etc.
   * Default: `console`
   */
  logger?: Pick<Console, 'info' | 'warn' | 'error'>

  /**
   * TTL en segundos para el cache de permisos de `loadPermissions()`.
   * Debe coincidir con el TTL de `PermissionCacheService` en itr-authenticator.
   * Default: `300` (5 minutos)
   */
  permissionsTtl?: number

  /**
   * Secret compartido para autenticar el webhook de invalidación de cache.
   * Si se define, el endpoint `POST /rbac/cache/invalidate` exige el header
   * `x-rbac-secret: <webhookSecret>`.
   * Se recomienda para entornos de producción.
   */
  webhookSecret?: string
}

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
  audit: (opts?: AuditMiddlewareOptions) => RequestHandler
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
