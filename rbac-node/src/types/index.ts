import type { Request, RequestHandler, Router } from 'express'
export type TokenExtractor = (req: Request) => string | undefined
export type InstitutionResolver = (req: Request) => string | undefined | Promise<string | undefined>

export interface RbacNodeOptions {
  authApiUrl: string
  appKey: string | number
  institutionId?: string
  institutionResolver?: InstitutionResolver
  requireInstitution?: boolean
  publicRoutes?: string[]
  timeout?: number
  debugMode?: boolean
  tokenExtractor?: TokenExtractor
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
  permissionsTtl?: number
  webhookSecret?: string
}
export interface RbacNodeInstance {
  guard: RequestHandler
  audit: (exclude?: string[], sensitiveFields?: string[]) => RequestHandler
  sessionCheck: RequestHandler
  loadPermissions: () => RequestHandler
  can: (category: string, action: string) => RequestHandler
  cacheRouter: Router
}
export interface RbacNodeCtx {
  authApiUrl: string
  applicationId: string | number
  appKey: string | number
  publicRoutes: string[]
  timeout: number
  debugMode: boolean
  tokenExtractor: TokenExtractor
  institutionResolver: InstitutionResolver
  requireInstitution: boolean
  logger: Pick<Console, 'info' | 'warn' | 'error'>
  permissionsTtl: number
  webhookSecret?: string
}
