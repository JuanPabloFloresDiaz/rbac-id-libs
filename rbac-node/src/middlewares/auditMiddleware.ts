import type { RequestHandler } from 'express'
import axios from 'axios'
import type { RbacNodeCtx } from '../types'
import { sanitizeBody } from '../utils/sanitizeBody'

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates the `audit` middleware factory from the resolved `RbacNodeCtx`.
 *
 * Returns a function `(exclude?, sensitiveFields?) => RequestHandler` so the consumer can
 * configure per-mount exclusions and extra sensitive fields:
 *
 * ```ts
 * app.use(rbac.audit())
 * // or with parameters:
 * app.use(rbac.audit(['/health', '/api-docs'], ['mySecret']))
 * ```
 *
 * Design decisions (kept from the original implementation):
 * - **Fire-and-forget**: `next()` is called immediately; the HTTP call to
 *   itr-authenticator runs in the background and never blocks the request.
 * - **Never throws**: errors are swallowed (with conditional logging) so a
 *   failing audit service never takes down the main application.
 * - Logging verbosity depends on `ctx.debugMode`:
 *   - `debugMode: true`  → full error detail (config, response, stack).
 *   - `debugMode: false` → only `err.message` to avoid log noise.
 */
export function makeAuditMiddleware(ctx: RbacNodeCtx) {
  return function audit(
    exclude: string[] = [],
    sensitiveFields: string[] = []
  ): RequestHandler {
    const excludedRoutes = exclude
    const extraSensitive = sensitiveFields

    return (req, _res, next) => {
      // ── Always unblock the main request first ──────────────────────────────
      next()

      // ── Skip auditing for excluded routes ─────────────────────────────────
      if (excludedRoutes.some((r) => req.path.startsWith(r))) return

      // ── Skip entirely when there is no token (unauthenticated request) ─────
      const token = ctx.tokenExtractor(req)
      if (!token) return

      // ── Build the audit payload ────────────────────────────────────────────
      const payload = {
        method: req.method,
        path:   (req.baseUrl ?? '') + (req.path ?? ''),
        body:   sanitizeBody(req.body, extraSensitive)
      }

      // ── Fire-and-forget ────────────────────────────────────────────────────
      axios
        .post(
          `${ctx.authApiUrl}/api/v1/audit-logs`,
          payload,
          {
            headers:         { Cookie: `access_token=${token}` },
            withCredentials: true,
            timeout:         ctx.timeout
          }
        )
        .catch((err: unknown) => {
          // Intentionally silent in production to avoid log spam.
          if (ctx.debugMode) {
            ctx.logger.error('[rbac-node] auditMiddleware error:', err)
          } else {
            const message = err instanceof Error ? err.message : String(err)
            ctx.logger.warn(`[rbac-node] auditMiddleware: ${message}`)
          }
        })
    }
  }
}
