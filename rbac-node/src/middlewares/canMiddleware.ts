import type { RequestHandler } from 'express'
import { checkPermission } from '@oscardevpr/rbac-core'
import type { RbacNodeCtx } from '../types'

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Per-route permission guard — pure synchronous check, zero HTTP calls.
 *
 * Requires `rbac.loadPermissions()` to be mounted upstream so that
 * `req.rbac.permissions` is populated before this middleware runs.
 *
 * @param ctx      - Shared context from `createRbacNode`.
 * @param category - Permission category (e.g. `'Empleados'`).
 * @param action   - Required action inside the category (e.g. `'Agregar empleados'`).
 *
 * @example
 * ```ts
 * // mount loadPermissions once
 * app.use(rbac.loadPermissions())
 *
 * // guard individual routes
 * router.post('/empleados',       rbac.can('Empleados', 'Agregar empleados'), handler)
 * router.delete('/empleados/:id', rbac.can('Empleados', 'Eliminar'),          handler)
 * router.get('/planillas',        rbac.can('Planillas', 'Ver'),               handler)
 * ```
 */
export function makeCan(ctx: RbacNodeCtx) {
  return function can(category: string, action: string): RequestHandler {
    return (req, res, next) => {
      // debugMode bypass — consistent with all other middlewares in this package
      if (ctx.debugMode) return next()

      const permissions = req.rbac?.permissions

      if (!permissions) {
        // loadPermissions was not mounted upstream — hard error to catch misconfiguration
        const err = new Error(
          `[rbac-node] rbac.can('${category}', '${action}') was called but req.rbac is undefined. ` +
          'Make sure rbac.loadPermissions() is mounted before rbac.can().'
        )
        ;(err as any).status = 500
        return next(err)
      }

      const allowed = checkPermission(permissions, category, action, ctx.debugMode)

      if (allowed) return next()

      const err = new Error(
        `[rbac-node] Permission denied: '${action}' in '${category}'`
      )
      ;(err as any).status = 403
      next(err)
    }
  }
}
