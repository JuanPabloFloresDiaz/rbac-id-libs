import { provide } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../store/useAuthStore'
import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'

/** Injection key used to share the active category down the component tree. */
export const RBAC_CATEGORY_KEY = 'rbac:category'

/**
 * Main RBAC composable.
 *
 * Usage — scoped to a category:
 * ```ts
 * const { hasAccess } = usePermission('Empleados')
 * hasAccess('Agregar empleados') // checks only inside 'Empleados'
 * ```
 * When a `category` is provided, the composable also calls `provide()` so that
 * `<CanAccess>` descendants can omit the `category` prop.
 *
 * Usage — without category (checks all categories):
 * ```ts
 * const { hasAccess } = usePermission()
 * hasAccess('Agregar empleados') // finds the action in any category
 * ```
 *
 * @param category - Optional module/category to scope permission checks.
 */
export function usePermission(category?: string) {
  const authStore = useAuthStore()
  const { userData, userType, permissions, isAuthenticated, userEmail, userId } =
    storeToRefs(authStore)

  if (category !== undefined) {
    provide(RBAC_CATEGORY_KEY, category)
  }

  /**
   * Returns `true` if the current user has the given `action`.
   * When no `category` was passed to `usePermission()`, all categories are searched.
   */
  const hasAccess = (action: string): boolean => {
    if (category !== undefined) {
      return checkPermission(permissions.value, category, action, rbacConfig.debugMode)
    }
    return checkPermissionAny(permissions.value, action, rbacConfig.debugMode)
  }

  return {
    hasAccess,
    userData,
    userType,
    permissions,
    isAuthenticated,
    userEmail,
    userId
  }
}
