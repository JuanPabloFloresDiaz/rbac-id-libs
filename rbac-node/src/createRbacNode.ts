import { setRbacConfig } from '@oscardevpr/rbac-core'
import type { Request } from 'express'
import type { RbacNodeCtx, RbacNodeInstance, RbacNodeOptions, TokenExtractor } from './types'
import { defaultTokenExtractor } from './utils/extractToken'
import { makeAuthGuard } from './middlewares/authGuard'
import { makeAuditMiddleware } from './middlewares/auditMiddleware'
import { makeSessionCheck } from './middlewares/sessionCheck'
import { makeLoadPermissions } from './middlewares/loadPermissions'
import { makeCan } from './middlewares/canMiddleware'
import { makeCacheRouter } from './middlewares/cacheRouter'

export function createRbacNode(options: RbacNodeOptions): RbacNodeInstance
export function createRbacNode(
  authApiUrl: string, applicationId: string | number, publicRoutes?: string[], timeout?: number,
  debugMode?: boolean, tokenExtractor?: TokenExtractor, logger?: Pick<Console, 'info' | 'warn' | 'error'>,
  permissionsTtl?: number, webhookSecret?: string
): RbacNodeInstance
export function createRbacNode(
  optionsOrUrl: RbacNodeOptions | string, applicationId?: string | number,
  publicRoutes: string[] = ['/health'], timeout = 3000, debugMode = false,
  tokenExtractor: TokenExtractor = defaultTokenExtractor,
  logger: Pick<Console, 'info' | 'warn' | 'error'> = console,
  permissionsTtl = 300, webhookSecret?: string
): RbacNodeInstance {
  const legacy = typeof optionsOrUrl === 'string'
  const options: RbacNodeOptions = legacy ? {
    authApiUrl: optionsOrUrl, appKey: applicationId!, publicRoutes, timeout, debugMode,
    tokenExtractor, logger, permissionsTtl, webhookSecret, requireInstitution: false,
  } : optionsOrUrl
  if (!options.authApiUrl) throw new Error('[rbac-node] authApiUrl is required')
  if (!options.appKey) throw new Error('[rbac-node] appKey is required')
  const fixedInstitutionId = options.institutionId
  const institutionResolver = options.institutionResolver ?? ((req: Request) => {
    if (fixedInstitutionId) return fixedInstitutionId
    const value = req.headers['x-institution-id']
    return Array.isArray(value) ? value[0] : value
  })
  setRbacConfig({ authApiUrl: options.authApiUrl, appKey: options.appKey,
    institutionId: fixedInstitutionId, debugMode: options.debugMode })
  const ctx: RbacNodeCtx = {
    authApiUrl: options.authApiUrl, applicationId: options.appKey, appKey: options.appKey,
    publicRoutes: options.publicRoutes ?? ['/health'], timeout: options.timeout ?? 3000,
    debugMode: options.debugMode ?? false, tokenExtractor: options.tokenExtractor ?? defaultTokenExtractor,
    institutionResolver, requireInstitution: options.requireInstitution ?? !legacy,
    logger: options.logger ?? console, permissionsTtl: options.permissionsTtl ?? 300,
    webhookSecret: options.webhookSecret,
  }
  const audit = makeAuditMiddleware(ctx)
  return {
    guard: makeAuthGuard(ctx), audit: (exclude, fields) => audit(exclude, fields),
    sessionCheck: makeSessionCheck(ctx), loadPermissions: () => makeLoadPermissions(ctx),
    can: makeCan(ctx), cacheRouter: makeCacheRouter(ctx),
  }
}
