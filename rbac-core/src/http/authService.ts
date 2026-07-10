import { createAuthApi } from './createAuthApi'
import rbacConfig from '../config/rbacConfig'
import type {
  InstitutionsResponse, SessionResponse, UserTypeActionsResponse,
  MyPermissionsResponse, LoginResponse, LogoutResponse
} from '../types'

function getApi() {
  if (!rbacConfig.authApiUrl) throw new Error('[rbac-core] authApiUrl is not configured.')
  return createAuthApi(rbacConfig.authApiUrl)
}
function getRootApi() {
  const rootUrl = rbacConfig.authApiUrl.replace(/\/api\/v\d+\/?$/, '')
  return createAuthApi(rootUrl)
}
function getAppKey(): string | number {
  const appKey = rbacConfig.appKey ?? rbacConfig.applicationId
  if (!appKey) throw new Error('[rbac-core] appKey is not configured.')
  return appKey
}

export async function getAuthenticatedUserData(): Promise<SessionResponse> {
  return getApi().get<never, SessionResponse>('/user-sessions/verify-session')
}

export async function getMyInstitutions(): Promise<InstitutionsResponse> {
  return getRootApi().get<never, InstitutionsResponse>('/api/v2/institutions/me', {
    params: { appKey: getAppKey() }
  })
}

export async function getMyPermissions(institutionId = rbacConfig.institutionId): Promise<MyPermissionsResponse> {
  const params = { appKey: getAppKey(), ...(institutionId ? { institutionId } : {}) }
  const endpoint = institutionId ? '/api/v2/permissions/me' : '/api/v1/permissions/me'
  return getRootApi().get<never, MyPermissionsResponse>(endpoint, { params })
}

export async function getUserTypeAndActions(userId: string | number): Promise<UserTypeActionsResponse> {
  const appKey = getAppKey()
  return getApi().get<never, UserTypeActionsResponse>(
    `/users/${userId}/application/${appKey}/get-user-type-actions`,
    { params: rbacConfig.institutionId ? { institutionId: rbacConfig.institutionId } : undefined }
  )
}

export async function logInWithCredentials(user_name: string, password: string): Promise<LoginResponse> {
  return getApi().post<never, LoginResponse>('/user-sessions/login', { user_name, password })
}
export async function logInByCoreToken(token: string): Promise<LoginResponse> {
  return getApi().post<never, LoginResponse>('/user-sessions/login-by-core-token', { token })
}
export async function signOut(): Promise<LogoutResponse> {
  return getApi().post<never, LogoutResponse>('/user-sessions/logout')
}
