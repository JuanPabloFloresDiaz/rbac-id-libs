import type { Request } from 'express'
import type { RbacNodeCtx } from '../types'

export async function resolveInstitutionId(ctx: RbacNodeCtx, req: Request): Promise<string | undefined> {
  const institutionId = await ctx.institutionResolver(req)
  if (!institutionId && ctx.requireInstitution) {
    const error = new Error('[rbac-node] institutionId is required for tenant-aware authorization')
    ;(error as any).status = 400
    throw error
  }
  return institutionId
}
