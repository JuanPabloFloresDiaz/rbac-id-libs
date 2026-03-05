import { setRbacConfig } from '@oscardevpr/rbac-core'
import type { RbacNodeOptions, RbacNodeCtx, RbacNodeInstance, AuditMiddlewareOptions } from './types'
import { defaultTokenExtractor } from './utils/extractToken'
import { makeAuthGuard }         from './middlewares/authGuard'
import { makeAuditMiddleware }   from './middlewares/auditMiddleware'
import { makeSessionCheck }      from './middlewares/sessionCheck'
import { makeLoadPermissions }   from './middlewares/loadPermissions'
import { makeCan }               from './middlewares/canMiddleware'
import { makeCacheRouter }       from './middlewares/cacheRouter'

/**
 * Factory principal de `@oscardevpr/rbac-node`.
 *
 * Crea y retorna los tres middlewares de autenticación configurados con una
 * única fuente de verdad. Espejo de `RbacPlugin` en `@oscardevpr/rbac-vue`.
 *
 * @example
 * ```ts
 * // server.ts / server.js
 * import { createRbacNode } from '@oscardevpr/rbac-node'
 *
 * const rbac = createRbacNode({
 *   authApiUrl:    process.env.AUTH_API,
 *   applicationId: process.env.APPLICATION_ID,
 *   publicRoutes:  ['/health', '/api-docs'],
 *   debugMode:     process.env.NODE_ENV !== 'production',
 *   logger:        logger, // tu instancia de winston/pino
 * })
 *
 * app.use(rbac.audit())   // registra todas las acciones (fire-and-forget)
 * app.use(rbac.guard)     // verifica permisos en cada request
 *
 * // Solo en routers donde también quieras refresh silencioso de token:
 * router.use(rbac.sessionCheck)
 * ```
 *
 * @param options - Configuración de la librería. Ver `RbacNodeOptions`.
 * @returns Objeto con los tres middlewares listos para montar en Express.
 *
 * @throws {Error} Si `authApiUrl` o `applicationId` no están definidos.
 */
export function createRbacNode(options: RbacNodeOptions): RbacNodeInstance {
  const {
    authApiUrl,
    applicationId,
    publicRoutes   = ['/health'],
    timeout        = 3000,
    debugMode      = false,
    tokenExtractor = defaultTokenExtractor,
    logger         = console,
    permissionsTtl = 300,
    webhookSecret,
  } = options

  // ── Validación de opciones requeridas ────────────────────────────────────
  if (!authApiUrl) {
    throw new Error(
      '[rbac-node] authApiUrl es requerido. Pásalo en createRbacNode({ authApiUrl }).'
    )
  }

  if (!applicationId) {
    throw new Error(
      '[rbac-node] applicationId es requerido. Pásalo en createRbacNode({ applicationId }).'
    )
  }

  // ── Sincroniza el singleton de rbac-core (igual que RbacPlugin) ──────────
  // Permite que las funciones de rbac-core lean la misma config si se usan
  // en el mismo proceso (e.g., runSeeder, checkPermission en capa de servicio).
  setRbacConfig({ authApiUrl, applicationId, debugMode })

  // ── Contexto interno compartido entre middlewares ────────────────────────
  const ctx: RbacNodeCtx = {
    authApiUrl,
    applicationId,
    publicRoutes,
    timeout,
    debugMode,
    tokenExtractor,
    logger,
    permissionsTtl,
    webhookSecret,
  }

  // ── Construye los middlewares ─────────────────────────────────────────
  const guard        = makeAuthGuard(ctx)
  const sessionCheck = makeSessionCheck(ctx)
  const auditFactory = makeAuditMiddleware(ctx)
  const canFactory   = makeCan(ctx)

  return {
    /**
     * Middleware de autorización.
     *
     * Verifica que el usuario tenga permiso para acceder al endpoint actual
     * llamando a `POST {authApiUrl}/api/v1/permissions/check`.
     *
     * Monta como middleware global justo antes de las rutas de negocio:
     * ```ts
     * app.use(rbac.guard)
     * app.use('/api/v1/', routes)
     * ```
     */
    guard,

    /**
     * Factory de middleware de auditoría.
     *
     * Registra cada acción del usuario en `POST {authApiUrl}/api/v1/audit-logs`.
     * **Nunca bloquea la request** — el envío ocurre en background (fire-and-forget).
     *
     * ```ts
     * app.use(rbac.audit())
     * // con opciones:
     * app.use(rbac.audit({ exclude: ['/health'], sensitiveFields: ['myField'] }))
     * ```
     */
    audit: (opts?: AuditMiddlewareOptions) => auditFactory(opts ?? {}),

    /**
     * Middleware de verificación de sesión activa.
     *
     * Llama a `GET {authApiUrl}/api/v1/user-sessions/verify-active-session` y
     * propaga el token refrescado al cliente si itr-authenticator lo rota.
     *
     * Úsalo en routers específicos donde también necesites el silent refresh:
     * ```ts
     * router.use(rbac.sessionCheck)
     * ```
     */
    sessionCheck,

    /**
     * Middleware de carga de permisos para el nuevo enfoque per-ruta.
     *
     * Hidrata `req.rbac.permissions` con los permisos del usuario.
     * - Cache HIT  (token ya visto) → 0 llamadas HTTP.
     * - Cache MISS (primer request) → 1 llamada a `GET /api/v1/permissions/my-permissions`.
     *
     * Monta una sola vez ANTES de las rutas protegidas:
     * ```ts
     * app.use(rbac.loadPermissions())
     * router.post('/empleados', rbac.can('Empleados', 'Agregar empleados'), handler)
     * ```
     */
    loadPermissions: () => makeLoadPermissions(ctx),

    /**
     * Factory de middleware por ruta.
     *
     * Verifica que `req.rbac.permissions` contenga la acción requerida.
     * Es puro y síncrono — 0 llamadas HTTP.
     *
     * ```ts
     * router.post('/empleados',       rbac.can('Empleados', 'Agregar empleados'), handler)
     * router.delete('/empleados/:id', rbac.can('Empleados', 'Eliminar'),          handler)
     * ```
     */
    can: canFactory,

    /**
     * Router Express con el endpoint de invalidación de cache.
     *
     * itr-authenticator llama a `POST /rbac/cache/invalidate` cuando los
     * permisos de un usuario cambian para forzar el re-fetch en el próximo request.
     *
     * Monta una sola vez en el servidor:
     * ```ts
     * app.use(rbac.cacheRouter)
     * ```
     */
    cacheRouter: makeCacheRouter(ctx),
  }
}
