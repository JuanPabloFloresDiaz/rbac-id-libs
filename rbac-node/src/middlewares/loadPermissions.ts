import type { RequestHandler } from 'express'
import axios from 'axios'
import type { Institution, InstitutionApplication, Permission, MyPermissionsResponse } from '@oscardevpr/rbac-core'
import type { RbacNodeCtx } from '../types'
import { getCached, setCache } from '../utils/permissionsCache'
import { resolveInstitutionId } from '../utils/institutionContext'
declare global { namespace Express { interface Request { rbac?: {
  userId: string; appKey: string | number; institutionId?: string;
  institutionApplicationId?: string; institution?: Institution;
  institutionApplication?: InstitutionApplication; permissions: Permission[]
} } } }
function isPublicRoute(path: string, routes: string[]) { return routes.some((route) => path.startsWith(route)) }
export function makeLoadPermissions(ctx: RbacNodeCtx): RequestHandler {
  return async (req, _res, next) => {
    if (ctx.debugMode) { req.rbac = { userId: 'debug', appKey: ctx.appKey, permissions: [] }; return next() }
    if (isPublicRoute(req.path, ctx.publicRoutes)) return next()
    const token = ctx.tokenExtractor(req)
    if (!token) return next()
    try {
      const institutionId = await resolveInstitutionId(ctx, req)
      const appKey = String(ctx.appKey)
      const cached = getCached(token, appKey, institutionId)
      if (cached) {
        req.rbac = {
          userId: cached.userId,
          appKey: ctx.appKey,
          institutionId,
          institutionApplicationId: cached.institutionApplicationId,
          institution: cached.institution,
          institutionApplication: cached.institutionApplication,
          permissions: cached.permissions,
        }
        return next()
      }
      const endpoint = institutionId ? '/api/v2/permissions/me' : '/api/v1/permissions/me'
      const response = await axios.get<MyPermissionsResponse>(`${ctx.authApiUrl}${endpoint}`, {
        params: { appKey: ctx.appKey, ...(institutionId ? { institutionId } : {}) },
        headers: { Cookie: `access_token=${token}` }, withCredentials: true, timeout: ctx.timeout,
      })
      const data = response.data
      const userId = String(data.user.id)
      const institutionApplicationId = data.institutionApplication?.id
      setCache(token, userId, data.permissions, ctx.permissionsTtl, appKey, institutionId, {
        institutionApplicationId,
        institution: data.institution,
        institutionApplication: data.institutionApplication,
      })
      req.rbac = {
        userId, appKey: ctx.appKey, institutionId,
        institutionApplicationId,
        institution: data.institution,
        institutionApplication: data.institutionApplication,
        permissions: data.permissions,
      }
      next()
    } catch (err) { next(err) }
  }
}
