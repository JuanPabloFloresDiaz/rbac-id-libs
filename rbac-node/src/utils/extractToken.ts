import type { Request } from 'express'

/**
 * Default token extractor.
 *
 * Reads `access_token` from cookies first (standard cookie-based session),
 * then falls back to the `Authorization: Bearer <token>` header so the same
 * middleware stack can serve both browsers (cookie) and API clients (header).
 *
 * This is the default used by `createRbacNode()` when no custom
 * `tokenExtractor` is provided.
 */
export function defaultTokenExtractor(req: Request): string | undefined {
  // 1. Cookie (HttpOnly, browser-based auth)
  const cookieToken = req.cookies?.access_token as string | undefined
  if (cookieToken) return cookieToken

  // 2. Authorization Bearer header (API clients / mobile / microservices)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return undefined
}
