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
}

// ─── Internal shared context ──────────────────────────────────────────────────

/**
 * Contexto resuelto que se comparte entre los middlewares internamente.
 * No forma parte de la API pública — sólo para uso interno del package.
 * @internal
 */
export interface RbacNodeCtx {
  authApiUrl: string
  applicationId: string | number
  publicRoutes: string[]
  timeout: number
  debugMode: boolean
  tokenExtractor: TokenExtractor
  logger: Pick<Console, 'info' | 'warn' | 'error'>
}
