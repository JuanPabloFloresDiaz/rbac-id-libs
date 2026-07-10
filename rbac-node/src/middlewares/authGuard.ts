import type { RequestHandler } from 'express'
import axios from 'axios'
import type { RbacNodeCtx } from '../types'
import { resolveInstitutionId } from '../utils/institutionContext'
function isPublicRoute(path: string, routes: string[]) { return routes.some((route) => path.startsWith(route)) }
export function makeAuthGuard(ctx: RbacNodeCtx): RequestHandler {
  return async (req, _res, next) => {
    if (ctx.debugMode || isPublicRoute(req.path, ctx.publicRoutes)) return next()
    try {
      const token = ctx.tokenExtractor(req)
      const institutionId = await resolveInstitutionId(ctx, req)
      await axios.post(`${ctx.authApiUrl}/api/v1/permissions/check`, {
        appKey: ctx.appKey,
        ...(institutionId ? { institutionId } : {}),
        method: req.method,
        path: (req.baseUrl ?? '') + (req.path ?? '')
      }, { headers: { Cookie: `access_token=${token ?? ''}` }, withCredentials: true, timeout: ctx.timeout })
      next()
    } catch (err) { next(err) }
  }
}
