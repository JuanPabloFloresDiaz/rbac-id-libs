import { computed, type Ref } from 'vue'
import { useAuthStore } from '../store/useAuthStore'
import { rbacConfig } from '@oscardevpr/rbac-core'

export interface NavItem {
  /** Category name used to gate visibility via RBAC. */
  permission: string
  [key: string]: unknown
}

/**
 * Filters a navigation items array based on the current user's permissions.
 *
 * An item is shown when the user has at least one action in `item.permission`
 * (which maps to a category name). In `debugMode` all items are always shown.
 *
 * Usage:
 * ```ts
 * const items = [
 *   { icon: 'mdi-home', text: 'Inicio', value: '/admin/dashboard', permission: 'Inicio' },
 *   { icon: 'mdi-account', text: 'Usuarios', value: '/admin/users', permission: 'Gestión de usuarios' },
 * ]
 * const { filteredItems } = useNavItems(items)
 * // filteredItems is a ComputedRef — reactive to permission changes
 * ```
 *
 * @param items - Plain array or `Ref<NavItem[]>` of navigation items.
 * @returns       `{ filteredItems }` — a `ComputedRef` of the visible subset.
 */
export function useNavItems<T extends NavItem>(
  items: T[] | Ref<T[]>
) {
  const authStore = useAuthStore()

  const filteredItems = computed<T[]>(() => {
    const list = Array.isArray(items) ? items : (items.value ?? [])

    if (rbacConfig.debugMode) return list

    return list.filter(
      (item) => item.permission && authStore.getActionsByCategory(item.permission).length > 0
    )
  })

  return { filteredItems }
}
