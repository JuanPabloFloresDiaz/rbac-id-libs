// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Permission,
  User,
  UserType,
  Application,
  RbacConfig,
  RbacSeedEntry,
  RbacSeedMap,
  SessionResponse,
  UserTypeActionsResponse,
  LoginResponse,
  LogoutResponse,
  ApiError
} from './types'

// ─── Config singleton ─────────────────────────────────────────────────────────
export { default as rbacConfig, setRbacConfig } from './config/rbacConfig'

// ─── Permission engine ────────────────────────────────────────────────────────
export { checkPermission, checkPermissionAny } from './engine/permissionEngine'

// ─── HTTP layer ───────────────────────────────────────────────────────────────
export { createAuthApi } from './http/createAuthApi'
export {
  getAuthenticatedUserData,
  getUserTypeAndActions,
  logInWithCredentials,
  logInByCoreToken,
  signOut
} from './http/authService'

// ─── Seeder ───────────────────────────────────────────────────────────────────
export { defineRbacSeed } from './seeder/defineRbacSeed'
export { runSeeder } from './seeder/runSeeder'
