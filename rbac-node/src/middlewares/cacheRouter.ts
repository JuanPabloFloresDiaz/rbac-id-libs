import type { RequestHandler, Router } from 'express'
import { Router as createRouter } from 'express'
import type { RbacNodeCtx } from '../types'
import { invalidateByUserId } from '../utils/permissionsCache'

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates an Express router that exposes the cache-invalidation webhook.
 *
 * itr-authenticator calls this endpoint when a user's permissions change
 * (e.g. a UserTypeAction or UserUserType is created/deleted), so this server
 * can evict stale entries from its in-memory cache immediately.
 *
 * Mount it once at server startup:
 * ```ts
 * app.use(rbac.cacheRouter)
 * // → POST /rbac/cache/invalidate
 * ```
 *
 * The endpoint is intentionally not protected by `rbac.guard` or session
 * checks — it receives calls from itr-authenticator (server-to-server).
 * Secure it via network policy / firewall so only itr-authenticator can reach it,
 * or add a shared-secret header check via the `webhookSecret` option.
 */
export function makeCacheRouter(ctx: RbacNodeCtx): Router {
  const router = createRouter()

  /**
   * POST /rbac/cache/invalidate
   *
   * Body: { userId: string, applicationId?: string }
   *
   * Called by itr-authenticator's CacheInvalidationService.
   * Removes all in-memory permission cache entries for the given userId.
   */
  router.post('/rbac/cache/invalidate', ((req, res) => {
    const { userId } = req.body as { userId?: string; applicationId?: string }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'userId is required' })
    }

    // Optional shared-secret guard (set webhookSecret in createRbacNode options)
    if (ctx.webhookSecret) {
      const provided = req.headers['x-rbac-secret']
      if (provided !== ctx.webhookSecret) {
        return res.status(401).json({ message: 'Invalid webhook secret' })
      }
    }

    const removed = invalidateByUserId(userId)

    ctx.logger.info(
      `[rbac-node] Cache invalidated for userId=${userId} — ${removed} entr${removed === 1 ? 'y' : 'ies'} removed`
    )

    res.json({ ok: true, removed })
  }) as RequestHandler)

  return router
}
