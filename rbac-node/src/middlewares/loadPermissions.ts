import type { RequestHandler } from 'express'
import axios from 'axios'
import type { Permission } from '@oscardevpr/rbac-core'
import type { RbacNodeCtx } from '../types'
import { getCached, setCache } from '../utils/permissionsCache'

// ─── Module augmentation (req.rbac) ──────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      rbac?: {
        userId:      string
        permissions: Permission[]
      }
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isPublicRoute(path: string, publicRoutes: string[]): boolean {
  return publicRoutes.some((route) => path.startsWith(route))
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates the `loadPermissions` middleware from the resolved `RbacNodeCtx`.
 *
 * The middleware:
 * 1. Bypasses loading for public routes and when `debugMode` is `true`.
 * 2. Checks the in-memory cache keyed by a SHA-256 hash of the token.
 *    - Cache HIT  → attaches `req.rbac.permissions` immediately (0 HTTP calls).
 *    - Cache MISS → calls `GET {authApiUrl}/api/v1/permissions/my-permissions`
 *                   and stores the result for `permissionsTtl` seconds.
 * 3. On any auth error (401/403) → forwards to the Express error handler.
 *
 * Must be mounted BEFORE any `rbac.can()` middleware:
 * ```ts
 * app.use(rbac.loadPermissions())
 * router.post('/empleados', rbac.can('Empleados', 'Agregar empleados'), handler)
 * ```
 */
export function makeLoadPermissions(ctx: RbacNodeCtx): RequestHandler {
  return async (req, res, next) => {
    // ── Bypass ──────────────────────────────────────────────────────────────
    if (ctx.debugMode) {
      req.rbac = { userId: 'debug', permissions: [] }
      return next()
    }

    if (isPublicRoute(req.path, ctx.publicRoutes)) {
      return next()
    }

    const token = ctx.tokenExtractor(req)

    if (!token) {
      // No token at all — let authGuard / sessionCheck handle the 401,
      // or the consumer's errorHandler. We just skip loading.
      return next()
    }

    // ── Cache lookup ─────────────────────────────────────────────────────────
    const cached = getCached(token)
    if (cached) {
      req.rbac = { userId: req.rbac?.userId ?? '', permissions: cached }
      return next()
    }

    // ── Fetch from itr-authenticator ─────────────────────────────────────────
    try {
      const response = await axios.get<{ userId: string; permissions: Permission[] }>(
        `${ctx.authApiUrl}/api/v1/permissions/my-permissions`,
        {
          params:          { appKey: ctx.applicationId },
          headers:         { Cookie: `access_token=${token}` },
          withCredentials: true,
          timeout:         ctx.timeout,
        }
      )

      const { userId, permissions } = response.data

      setCache(token, userId, permissions, ctx.permissionsTtl)

      req.rbac = { userId, permissions }
      next()
    } catch (err) {
      next(err)
    }
  }
}
