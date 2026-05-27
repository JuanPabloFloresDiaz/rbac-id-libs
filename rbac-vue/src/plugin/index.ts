import { type App } from 'vue'
import { setRbacConfig } from '@oscardevpr/rbac-core'
import { vCan } from '../directives/vCan'
import CanAccess from '../components/CanAccess.vue'

/**
 * RbacPlugin — the main Vue plugin for `@oscardevpr/rbac-vue`.
 *
 * Install in `main.ts` **after** `app.use(pinia)`:
 * ```ts
 * import { RbacPlugin } from '@oscardevpr/rbac-vue'
 *
 * app.use(
 *   RbacPlugin,
 *   import.meta.env.VITE_AUTH_API_URL,
 *   import.meta.env.VITE_APPLICATION_ID,
 *   import.meta.env.VITE_APP_MODE === 'debugging'
 * )
 * ```
 *
 * After installation the following are available globally:
 * - `v-can` directive
 * - `<CanAccess>` component
 */
export const RbacPlugin = {
  install(
    app: App,
    authApiUrl: string,
    applicationId: string | number,
    debugMode: boolean = false,
    loginRoute: string = 'login'
  ): void {
    if (!authApiUrl) {
      console.error('[rbac-vue] authApiUrl is required. Pass it via app.use(RbacPlugin, authApiUrl, applicationId).')
      return
    }

    if (!applicationId) {
      console.error('[rbac-vue] applicationId is required. Pass it via app.use(RbacPlugin, authApiUrl, applicationId).')
      return
    }

    // 1. Write runtime config into the shared singleton
    setRbacConfig(authApiUrl, applicationId, debugMode, loginRoute)

    // 2. Register global directive v-can
    app.directive('can', vCan)

    // 3. Register global component <CanAccess>
    app.component('CanAccess', CanAccess)
  }
}
