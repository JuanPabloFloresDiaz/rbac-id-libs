import { type App } from 'vue'
import { setRbacConfig, runSeeder } from '@oscardevpr/rbac-core'
import type { RbacSeedEntry } from '@oscardevpr/rbac-core'
import { vCan } from '../directives/vCan'
import CanAccess from '../components/CanAccess.vue'

export interface RbacPluginOptions {
  /** Base URL for the auth API. Required. */
  authApiUrl: string
  /** Application ID used to scope permissions. Required. */
  applicationId: string | number
  /** When `true`, all permission checks return `true`. Default: `false`. */
  debugMode?: boolean
  /** Route name to redirect to on session failure. Default: `'login'`. */
  loginRoute?: string
  /**
   * Optional seed payload produced by `defineRbacSeed()`.
   * When provided, `POST /rbac/seed` is called fire-and-forget on install.
   */
  seed?: RbacSeedEntry[]
}

/**
 * RbacPlugin — the main Vue plugin for `@oscardevpr/rbac-vue`.
 *
 * Install in `main.ts` **after** `app.use(pinia)`:
 * ```ts
 * import { RbacPlugin } from '@oscardevpr/rbac-vue'
 *
 * app.use(RbacPlugin, {
 *   authApiUrl:    import.meta.env.VITE_AUTH_API_URL,
 *   applicationId: import.meta.env.VITE_APPLICATION_ID,
 *   debugMode:     import.meta.env.VITE_APP_MODE === 'debugging',
 *   seed:          rbacSeed,   // optional
 * })
 * ```
 *
 * After installation the following are available globally:
 * - `v-can` directive
 * - `<CanAccess>` component
 */
export const RbacPlugin = {
  install(app: App, options: RbacPluginOptions = {} as RbacPluginOptions): void {
    const {
      authApiUrl,
      applicationId,
      debugMode = false,
      loginRoute = 'login',
      seed
    } = options

    if (!authApiUrl) {
      console.error('[rbac-vue] authApiUrl is required. Pass it via app.use(RbacPlugin, { authApiUrl }).')
      return
    }

    if (!applicationId) {
      console.error('[rbac-vue] applicationId is required. Pass it via app.use(RbacPlugin, { applicationId }).')
      return
    }

    // 1. Write runtime config into the shared singleton
    setRbacConfig({ authApiUrl, applicationId, debugMode, loginRoute })

    // 2. Fire-and-forget seed sync (no-op when seed is omitted)
    if (seed?.length) {
      runSeeder(seed)
    }

    // 3. Register global directive v-can
    app.directive('can', vCan)

    // 4. Register global component <CanAccess>
    app.component('CanAccess', CanAccess)
  }
}
