import type { Permission } from '@oscardevpr/rbac-core'
import { createHash } from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CacheEntry {
  userId:      string
  permissions: Permission[]
  expiresAt:   number
}

// ─── In-memory store ──────────────────────────────────────────────────────────

const store = new Map<string, CacheEntry>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a stable, non-reversible cache key from the raw token.
 * The plain token value is never stored in memory.
 */
function tokenKey(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns cached permissions for the given token, or `null` if missing/expired.
 */
export function getCached(token: string): Permission[] | null {
  const key   = tokenKey(token)
  const entry = store.get(key)

  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }

  return entry.permissions
}

/**
 * Stores permissions for the given token tagged with the userId so they can
 * be invalidated when the user's permissions change.
 *
 * @param token       - Raw access_token (will be hashed before storing).
 * @param userId      - Owner of the token — used for invalidation by userId.
 * @param permissions - Permissions to cache.
 * @param ttlSeconds  - Entry lifetime. Must match itr-authenticator's
 *                      PermissionCacheService TTL (default: 300 s).
 */
export function setCache(
  token: string,
  userId: string,
  permissions: Permission[],
  ttlSeconds = 300
): void {
  store.set(tokenKey(token), {
    userId,
    permissions,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

/**
 * Removes all cache entries belonging to the given userId.
 * Called by the webhook handler `POST /rbac/cache/invalidate { userId }` when
 * itr-authenticator signals that a user's permissions have changed.
 *
 * O(n) over current cache size — acceptable because permission-change operations
 * are infrequent administrative actions, not hot-path operations.
 *
 * @returns Number of entries removed.
 */
export function invalidateByUserId(userId: string): number {
  let removed = 0
  for (const [key, entry] of store) {
    if (entry.userId === userId) {
      store.delete(key)
      removed++
    }
  }
  return removed
}
