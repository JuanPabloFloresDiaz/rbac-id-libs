import { createAuthApi } from './createAuthApi'
import rbacConfig from '../config/rbacConfig'
import type {
  SessionResponse,
  UserTypeActionsResponse,
  LoginResponse,
  LogoutResponse
} from '../types'

function getApi() {
  if (!rbacConfig.authApiUrl) {
    throw new Error(
      '[rbac-core] authApiUrl is not configured. Call setRbacConfig() or install RbacPlugin before making HTTP requests.'
    )
  }
  return createAuthApi(rbacConfig.authApiUrl)
}

/**
 * Verify the current session and return the authenticated user's data.
 * Maps to `GET /user-sessions/verify-session`.
 */
export async function getAuthenticatedUserData(): Promise<SessionResponse> {
  return getApi().get<never, SessionResponse>('/user-sessions/verify-session')
}

/**
 * Fetch the user type, application and permissions for a given user
 * scoped to the configured `applicationId`.
 * Maps to `GET /users/:id/application/:appId/get-user-type-actions`.
 */
export async function getUserTypeAndActions(
  userId: string | number
): Promise<UserTypeActionsResponse> {
  const appId = rbacConfig.applicationId
  return getApi().get<never, UserTypeActionsResponse>(
    `/users/${userId}/application/${appId}/get-user-type-actions`
  )
}

/**
 * Authenticate with username + password credentials.
 * Maps to `POST /user-sessions/login`.
 */
export async function logInWithCredentials(
  user_name: string,
  password: string
): Promise<LoginResponse> {
  return getApi().post<never, LoginResponse>('/user-sessions/login', {
    user_name,
    password
  })
}

/**
 * Authenticate using a core SSO token.
 * Maps to `POST /user-sessions/login-by-core-token`.
 */
export async function logInByCoreToken(token: string): Promise<LoginResponse> {
  return getApi().post<never, LoginResponse>('/user-sessions/login-by-core-token', { token })
}

/**
 * Sign out the current user.
 * Maps to `POST /user-sessions/logout`.
 */
export async function signOut(): Promise<LogoutResponse> {
  return getApi().post<never, LogoutResponse>('/user-sessions/logout')
}
