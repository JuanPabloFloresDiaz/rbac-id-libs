import type { RequestHandler } from 'express'
import axios from 'axios'
import type { RbacNodeCtx } from '../types'

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isPublicRoute(path: string, publicRoutes: string[]): boolean {
  return publicRoutes.some((route) => path.startsWith(route))
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates the `sessionCheck` middleware from the resolved `RbacNodeCtx`.
 *
 * The middleware:
 * 1. Bypasses verification for public routes and when `debugMode` is `true`.
 * 2. Calls `GET {authApiUrl}/api/v1/user-sessions/verify-active-session`.
 * 3. If the auth server returns a refreshed token via `Set-Cookie`, propagates
 *    it to the client transparently (silent token refresh).
 * 4. On session failure → forwards the error to the Express error handler.
 *
 * Fixes vs the original implementation:
 * - Uses `ctx.authApiUrl` instead of the hardcoded `http://localhost:8015`.
 *   This was a real bug: if `AUTH_API` pointed anywhere other than localhost,
 *   session verification silently failed.
 * - Applies a configurable `timeout`.
 * - Respects `publicRoutes` and `debugMode`.
 *
 * Use this middleware on specific routers that need it — `authGuard` already
 * validates the token implicitly, so `sessionCheck` is typically only needed
 * where you also want to perform the silent token refresh.
 *
 * ```ts
 * // In a layout router that should refresh tokens:
 * router.use(rbac.sessionCheck)
 * ```
 */
export function makeSessionCheck(ctx: RbacNodeCtx): RequestHandler {
  return async (req, res, next) => {
    // ── Bypass ──────────────────────────────────────────────────────────────
    if (ctx.debugMode || isPublicRoute(req.path, ctx.publicRoutes)) {
      return next()
    }

    const token = ctx.tokenExtractor(req)

    try {
      const authResponse = await axios.get(
        `${ctx.authApiUrl}/api/v1/user-sessions/verify-active-session`,
        {
          headers:         { Cookie: `access_token=${token ?? ''}` },
          withCredentials: true,
          timeout:         ctx.timeout
        }
      )

      // ── Silent token refresh ───────────────────────────────────────────────
      // If itr-authenticator rotated the token, it returns the new one in
      // Set-Cookie. Propagate it to the client so the browser picks it up
      // without the user noticing.
      const setCookie = authResponse.headers['set-cookie'] as string[] | undefined
      if (setCookie?.length) {
        setCookie.forEach((cookie) => res.append('Set-Cookie', cookie))
      }

      next()
    } catch (err) {
      // Forward to Express error handler.
      // The consumer's errorHandler is responsible for responding with 401.
      next(err)
    }
  }
}
