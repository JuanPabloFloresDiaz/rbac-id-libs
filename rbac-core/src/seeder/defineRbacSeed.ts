import type { RbacSeedEntry, RbacSeedMap } from '../types'

/**
 * Declares the RBAC categories and actions for a consumer project.
 *
 * The result is passed to `runSeeder(seed)` on the server so the
 * backend can ensure all entries exist in the database.
 *
 * Usage (`src/rbac.seed.ts` in the consumer project):
 *
 * ```ts
 * import { defineRbacSeed } from '@oscardevpr/rbac-vue'
 *
 * export default defineRbacSeed({
 *   Empleados: ['Agregar empleados', 'Editar datos de empleado', 'Eliminar'],
 *   Planillas:  ['Crear', 'Ver', 'Cerrar planilla'],
 *   Reportes:   ['Ver', 'Exportar'],
 * })
 * ```
 *
 * @param seedMap - An object whose keys are category names and values are
 *                  arrays of action strings.
 * @returns        An array of `{ name, actions }` entries ready for the API.
 */
export function defineRbacSeed(seedMap: RbacSeedMap): RbacSeedEntry[] {
  return Object.entries(seedMap).map(([name, actions]) => ({ name, actions }))
}
