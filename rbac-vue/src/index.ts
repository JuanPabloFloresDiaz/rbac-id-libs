// ─── Plugin ───────────────────────────────────────────────────────────────────
export { RbacPlugin } from './plugin/index'

// ─── Store ────────────────────────────────────────────────────────────────────
export { useAuthStore } from './store/useAuthStore'

// ─── Composables ──────────────────────────────────────────────────────────────
export { usePermission } from './composables/usePermission'
export { useSessionGuard } from './composables/useSessionGuard'
export { useNavItems } from './composables/useNavItems'
export type { NavItem } from './composables/useNavItems'
export { useLogout } from './composables/useLogout'
export { useUserDisplay } from './composables/useUserDisplay'

// ─── Directive (for manual registration) ─────────────────────────────────────
export { vCan } from './directives/vCan'

// ─── Component (for manual local registration) ────────────────────────────────
export { default as CanAccess } from './components/CanAccess.vue'

// ─── Core re-exports (advanced / testing use) ────────────────────────────────
export {
  checkPermission,
  checkPermissionAny,
  rbacConfig
} from '@oscardevpr/rbac-core'
export type {
  Permission,
  User,
  UserType,
  Application,
  RbacConfig,
  ApiError
} from '@oscardevpr/rbac-core'
