// ─── Permission / Auth domain ────────────────────────────────────────────────

export interface Permission {
  category: string
  actions: string[]
}

export interface User {
  id: string | number
  email: string
  first_name: string
  last_name: string
  user_type?: string
  [key: string]: unknown
}

export interface UserType {
  id: string | number
  name: string
  [key: string]: unknown
}

export interface Application {
  id: string | number
  name: string
  [key: string]: unknown
}

// ─── Configuration ────────────────────────────────────────────────────────────

export interface RbacConfig {
  authApiUrl: string
  applicationId: string | number | null
  debugMode: boolean
  loginRoute: string
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface SessionResponse {
  user: User
}

export interface UserTypeActionsResponse {
  userType: UserType
  permissions: Permission[]
  application: Application
}

export interface LoginResponse {
  message: string
  user: User
}

export interface LogoutResponse {
  message: string
}

export interface ApiError {
  status?: number
  message: string
  originalError?: unknown
}

// ─── Seeder ───────────────────────────────────────────────────────────────────

export interface RbacSeedEntry {
  name: string
  actions: string[]
}

/** Map of category → actions used with defineRbacSeed() */
export type RbacSeedMap = Record<string, string[]>
