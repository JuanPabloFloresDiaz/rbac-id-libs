import { type App } from 'vue'
import { setRbacConfig, type RbacConfigOptions } from '@oscardevpr/rbac-core'
import { vCan } from '../directives/vCan'
import CanAccess from '../components/CanAccess.vue'
export const RbacPlugin = {
  install(app: App, optionsOrUrl: RbacConfigOptions | string, applicationId?: string | number,
    debugMode = false, loginRoute = 'login'): void {
    const options: RbacConfigOptions = typeof optionsOrUrl === 'string'
      ? { authApiUrl: optionsOrUrl, appKey: applicationId, debugMode, loginRoute }
      : optionsOrUrl
    if (!options.authApiUrl || !(options.appKey ?? options.applicationId)) {
      console.error('[rbac-vue] authApiUrl and appKey are required')
      return
    }
    setRbacConfig(options)
    app.directive('can', vCan)
    app.component('CanAccess', CanAccess)
  }
}
