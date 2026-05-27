import type { RbacConfig } from '../types'

/**
 * Global RBAC configuration singleton.
 *
 * Set once at plugin install time via `setRbacConfig()` and then read
 * by the engine, directives, composables and the seeder.
 *
 * Direct mutation is intentional — this is a module-level singleton, not
 * a reactive store. Reactivity is handled at the Pinia store / composable level.
 */
const rbacConfig: RbacConfig = {
  authApiUrl: '',
  applicationId: null,
  debugMode: false,
  loginRoute: 'login'
}

/**
 * Writes the runtime values into the singleton.
 * Called by `RbacPlugin.install()` before anything else runs.
 */
export function setRbacConfig(
  authApiUrl: string,
  applicationId: string | number,
  debugMode: boolean = false,
  loginRoute: string = 'login'
): void {
  rbacConfig.authApiUrl = authApiUrl ?? ''
  rbacConfig.applicationId = applicationId ?? null
  rbacConfig.debugMode = debugMode ?? false
  rbacConfig.loginRoute = loginRoute ?? 'login'
}

export default rbacConfig
