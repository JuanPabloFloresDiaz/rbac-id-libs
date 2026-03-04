import type { RbacConfig, RbacConfigInput } from '../types'

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
export function setRbacConfig(config: RbacConfigInput): void {
  rbacConfig.authApiUrl = config.authApiUrl ?? ''
  rbacConfig.applicationId = config.applicationId ?? null
  rbacConfig.debugMode = config.debugMode ?? false
  rbacConfig.loginRoute = config.loginRoute ?? 'login'
}

export default rbacConfig
