import type { RequestHandler } from 'express'
import axios from 'axios'
import type { RbacNodeCtx } from '../types'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns `true` when the request path matches any entry in `publicRoutes`.
 * Uses `startsWith` so `/health` also matches `/health/live`.
 */
function isPublicRoute(path: string, publicRoutes: string[]): boolean {
  return publicRoutes.some((route) => path.startsWith(route))
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates the `authGuard` middleware from the resolved `RbacNodeCtx`.
 *
 * The middleware:
 * 1. Bypasses the check for public routes and when `debugMode` is `true`.
 * 2. Extracts the JWT with the configured `tokenExtractor`.
 * 3. Sends `POST {authApiUrl}/api/v1/permissions/check` to itr-authenticator.
 * 4. On a successful response → calls `next()`.
 * 5. On a 401/403/network error → forwards the error to the Express error handler
 *    so the consumer's `errorHandler` middleware decides the response shape.
 *
 * Fixes vs the original implementation:
 * - Uses `ctx.authApiUrl` (not `process.env.AUTH_API` directly).
 * - Applies a configurable `timeout` — no more hung requests.
 * - Respects `publicRoutes` so `/health` and `/api-docs` are never blocked.
 * - `tokenExtractor` is configurable (cookie AND/OR Bearer header).
 */
export function makeAuthGuard(ctx: RbacNodeCtx): RequestHandler {
  return async (req, res, next) => {
    // ── Bypass ──────────────────────────────────────────────────────────────
    if (ctx.debugMode || isPublicRoute(req.path, ctx.publicRoutes)) {
      return next()
    }

    const token = ctx.tokenExtractor(req)
    const path  = (req.baseUrl ?? '') + (req.path ?? '')
    const method = req.method

    try {
      await axios.post(
        `${ctx.authApiUrl}/api/v1/permissions/check`,
        {
          appKey: ctx.applicationId,
          method,
          path
        },
        {
          headers:         { Cookie: `access_token=${token ?? ''}` },
          withCredentials: true,
          timeout:         ctx.timeout
        }
      )

      next()
    } catch (err) {
      // Forward to Express error handler — it owns the response shape.
      // axios wraps HTTP errors (401, 403) in AxiosError with err.response.status.
      next(err)
    }
  }
}
