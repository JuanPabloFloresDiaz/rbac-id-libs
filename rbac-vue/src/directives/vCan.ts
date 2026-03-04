import { type DirectiveBinding, type ObjectDirective } from 'vue'
import { useAuthStore } from '../store/useAuthStore'
import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'

interface CanBinding {
  category?: string
  action: string
}

/**
 * Parses the directive binding value into a `{ category?, action }` pair.
 *
 * Supported forms:
 * - Object:           `v-can="{ category: 'Empleados', action: 'Agregar empleados' }"`
 * - Object (no cat): `v-can="{ action: 'Agregar empleados' }"`
 * - String with sep: `v-can="'Empleados:Agregar empleados'"`
 * - String only:     `v-can="'Agregar empleados'"`
 */
function resolveBinding(value: unknown): CanBinding {
  if (typeof value === 'string') {
    const separatorIndex = value.indexOf(':')
    if (separatorIndex !== -1) {
      return {
        category: value.slice(0, separatorIndex).trim(),
        action: value.slice(separatorIndex + 1).trim()
      }
    }
    return { category: undefined, action: value.trim() }
  }
  return (value as CanBinding) ?? { action: '' }
}

function applyDirective(el: HTMLElement, binding: DirectiveBinding): void {
  const { category, action } = resolveBinding(binding.value)

  if (!action) {
    console.warn('[v-can] Missing required "action" in binding value.')
    return
  }

  const store = useAuthStore()
  const { permissions } = store

  const allowed = category
    ? checkPermission(permissions, category, action, rbacConfig.debugMode)
    : checkPermissionAny(permissions, action, rbacConfig.debugMode)

  el.style.display = allowed ? '' : 'none'
}

export const vCan: ObjectDirective<HTMLElement> = {
  mounted: applyDirective,
  updated: applyDirective
}
