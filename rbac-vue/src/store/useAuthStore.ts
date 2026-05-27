import { defineStore } from 'pinia'
import {
  getAuthenticatedUserData,
  getUserTypeAndActions,
  logInWithCredentials,
  logInByCoreToken,
  signOut
} from '@oscardevpr/rbac-core'
import type {
  User,
  UserType,
  Application,
  Permission
} from '@oscardevpr/rbac-core'

export const useAuthStore = defineStore('rbac-auth', {
  state: () => ({
    isAuthenticated: false as boolean,
    userData: null as User | null,
    application: null as Application | null,
    userType: null as UserType | null,
    permissions: [] as Permission[]
  }),

  getters: {
    userEmail: (state): string | null => state.userData?.email ?? null,
    userId: (state): string | number | null => state.userData?.id ?? null
  },

  actions: {
    /**
     * Returns the list of allowed actions for a given category.
     * Single source of truth for category-scoped permission queries.
     */
    getActionsByCategory(category: string): string[] {
      if (!category) return []
      const entry = this.permissions.find((p) => p.category === category)
      return entry ? entry.actions : []
    },

    /**
     * Verifies the active session and loads the authenticated user's data.
     * Triggers `loadPermissions()` automatically when a user id is present.
     */
    async checkAuth() {
      const data = await getAuthenticatedUserData()
      this.userData = data.user
      this.isAuthenticated = true

      if (data.user?.id) {
        await this.loadPermissions(data.user.id)
      }

      return data
    },

    /**
     * Fetches `userType`, `application` and `permissions` for the given user
     * scoped to the configured `applicationId`.
     */
    async loadPermissions(userId: string | number) {
      const info = await getUserTypeAndActions(userId)
      this.application = info.application
      this.userType = info.userType
      this.permissions = info.permissions
    },

    /**
     * Login with username/password credentials.
     */
    async loginWithCredentials(user_name: string, password: string) {
      const data = await logInWithCredentials(user_name, password)
      this.isAuthenticated = true
      return data
    },

    /**
     * Login using a core SSO token.
     */
    async loginByCoreToken(coreToken: string) {
      const data = await logInByCoreToken(coreToken)
      this.isAuthenticated = true
      return data
    },

    /**
     * Signs out the current user and resets the store to its initial state.
     */
    async logOut() {
      const data = await signOut()
      this.$reset()
      return data
    },

    // ─── Manual setters (for layouts that hydrate the store directly) ─────────
    setUser(user: User) { this.userData = user },
    setUserType(userType: UserType) { this.userType = userType },
    setApplication(application: Application) { this.application = application },
    setPermissions(permissions: Permission[]) { this.permissions = permissions }
  }
})
