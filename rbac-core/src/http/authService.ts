import { createAuthApi } from './createAuthApi'
import rbacConfig from '../config/rbacConfig'
import type {
  SessionResponse,
  UserTypeActionsResponse,
  LoginResponse,
  LogoutResponse
} from '../types'

function getApi() {
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
export async function logInWithCredentials(credentials: {
  user_name: string
  password: string
}): Promise<LoginResponse> {
  return getApi().post<never, LoginResponse>('/user-sessions/login', credentials)
}

/**
 * Authenticate using a core SSO token.
 * Maps to `POST /user-sessions/login-by-core-token`.
 */
export async function logInByCoreToken(payload: {
  token: string
}): Promise<LoginResponse> {
  return getApi().post<never, LoginResponse>('/user-sessions/login-by-core-token', payload)
}

/**
 * Sign out the current user.
 * Maps to `POST /user-sessions/logout`.
 */
export async function signOut(): Promise<LogoutResponse> {
  return getApi().post<never, LogoutResponse>('/user-sessions/logout')
}
