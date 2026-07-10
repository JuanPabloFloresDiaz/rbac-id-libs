import type { RbacConfig, RbacConfigOptions } from '../types'

const rbacConfig: RbacConfig = {
  authApiUrl: '',
  appKey: null,
  applicationId: null,
  institutionId: null,
  debugMode: false,
  loginRoute: 'login'
}

export function setRbacConfig(options: RbacConfigOptions): void
export function setRbacConfig(
  authApiUrl: string,
  applicationId: string | number,
  debugMode?: boolean,
  loginRoute?: string
): void
export function setRbacConfig(
  optionsOrUrl: RbacConfigOptions | string,
  applicationId?: string | number,
  debugMode = false,
  loginRoute = 'login'
): void {
  const options: RbacConfigOptions = typeof optionsOrUrl === 'string'
    ? { authApiUrl: optionsOrUrl, appKey: applicationId, debugMode, loginRoute }
    : optionsOrUrl
  const appKey = options.appKey ?? options.applicationId ?? null
  rbacConfig.authApiUrl = options.authApiUrl ?? ''
  rbacConfig.appKey = appKey
  rbacConfig.applicationId = appKey
  rbacConfig.institutionId = options.institutionId ?? null
  rbacConfig.debugMode = options.debugMode ?? false
  rbacConfig.loginRoute = options.loginRoute ?? 'login'
}

export function setInstitutionId(institutionId: string | null): void {
  rbacConfig.institutionId = institutionId
}

export default rbacConfig
