<template>
  <slot v-if="allowed" />
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useAuthStore } from '../store/useAuthStore'
import { checkPermission, checkPermissionAny, rbacConfig } from '@oscardevpr/rbac-core'
import { RBAC_CATEGORY_KEY } from '../composables/usePermission'

/**
 * CanAccess component
 *
 * Renders its slot only when the current user has the given permission.
 *
 * Usage — category inherited from usePermission() in the parent component:
 *   <CanAccess action="Agregar empleados">
 *     <v-btn>Agregar</v-btn>
 *   </CanAccess>
 *
 * Usage — explicit category prop (overrides injected value):
 *   <CanAccess category="Empleados" action="Agregar empleados">
 *     <v-btn>Agregar</v-btn>
 *   </CanAccess>
 *
 * Usage — without category and no parent usePermission() (searches all categories):
 *   <CanAccess action="Agregar empleados">
 *     <v-btn>Agregar</v-btn>
 *   </CanAccess>
 */

const props = defineProps({
  /**
   * The category to scope the permission check to.
   * Falls back to the category provided by the nearest usePermission(category) ancestor.
   * If neither is set, the action is searched across all categories.
   */
  category: {
    type: String,
    default: undefined
  },
  /**
   * The action name to check. Required.
   */
  action: {
    type: String,
    required: true
  }
})

const store = useAuthStore()

// Read category from the component tree (set by usePermission(category) in the parent).
const injectedCategory = inject(RBAC_CATEGORY_KEY, undefined)

const allowed = computed(() => {
  // Prop takes precedence, then injected value, then "any category" search.
  const resolvedCategory = props.category ?? injectedCategory

  if (resolvedCategory !== undefined) {
    return checkPermission(store.permissions, resolvedCategory, props.action, rbacConfig.debugMode)
  }
  return checkPermissionAny(store.permissions, props.action, rbacConfig.debugMode)
})
</script>
