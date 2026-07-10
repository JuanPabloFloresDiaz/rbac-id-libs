export interface Permission {
  category: string
  actions: string[]
  requires_reauthentication_actions?: string[]
}

export interface User {
  id: string | number
  email: string
  first_name: string
  last_name: string
  user_type?: string
  [key: string]: unknown
}

export interface UserType { id: string | number; name: string; [key: string]: unknown }
export interface Application { id: string | number; name: string; key_identifier?: string; [key: string]: unknown }

export interface Institution {
  id: string
  code: string
  name: string
  country_code: string
  currency_code: string
  timezone: string
  locale: string
  is_active: boolean
}

export interface InstitutionApplication {
  id: string
  institution_id: string
  application_id: string | number
  installed_template_version: string | null
  settings?: Record<string, unknown>
  is_active?: boolean
}

export interface InstitutionSummary extends Institution {
  institution_application_id: string
  application_id: string | number
  installed_template_version: string | null
}

export interface RbacConfigOptions {
  authApiUrl: string
  appKey?: string | number
  /** @deprecated Use appKey. */
  applicationId?: string | number
  institutionId?: string | null
  debugMode?: boolean
  loginRoute?: string
}

export interface RbacConfig {
  authApiUrl: string
  appKey: string | number | null
  /** @deprecated Alias kept for v1 consumers. */
  applicationId: string | number | null
  institutionId: string | null
  debugMode: boolean
  loginRoute: string
}

export interface SessionResponse { user: User }
export interface InstitutionsResponse { institutions: InstitutionSummary[] }
export interface UserTypeActionsResponse {
  user: User
  userType: UserType | null
  userTypes: UserType[]
  permissions: Permission[]
  application: Application
  institution?: Institution
  institutionApplication?: InstitutionApplication
}
export type MyPermissionsResponse = UserTypeActionsResponse
export interface LoginResponse { message: string; user: User }
export interface LogoutResponse { message: string }
export interface ApiError { status?: number; message: string; originalError?: unknown }
export interface RbacSeedEntry { name: string; actions: string[] }
export type RbacSeedMap = Record<string, string[]>
