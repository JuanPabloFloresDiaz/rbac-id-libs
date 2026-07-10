import { defineStore } from 'pinia'
import {
  getAuthenticatedUserData, getMyInstitutions, getMyPermissions,
  logInWithCredentials, logInByCoreToken, signOut, rbacConfig, setInstitutionId
} from '@oscardevpr/rbac-core'
import type {
  User, UserType, Application, Permission, Institution,
  InstitutionApplication, InstitutionSummary
} from '@oscardevpr/rbac-core'

export const useAuthStore = defineStore('rbac-auth', {
  state: () => ({
    isAuthenticated: false as boolean,
    userData: null as User | null,
    application: null as Application | null,
    userType: null as UserType | null,
    userTypes: [] as UserType[],
    permissions: [] as Permission[],
    institutions: [] as InstitutionSummary[],
    institution: null as Institution | null,
    institutionApplication: null as InstitutionApplication | null,
  }),
  getters: {
    userEmail: (state): string | null => state.userData?.email ?? null,
    userId: (state): string | number | null => state.userData?.id ?? null,
    institutionId: (state): string | null => state.institution?.id ?? null,
    needsInstitutionSelection: (state): boolean => state.institutions.length > 1 && !state.institution,
  },
  actions: {
    getActionsByCategory(category: string): string[] {
      return this.permissions.find((p) => p.category === category)?.actions ?? []
    },
    clearAuthorizationContext() {
      this.application = null; this.userType = null; this.userTypes = []
      this.permissions = []; this.institution = null; this.institutionApplication = null
    },
    async loadInstitutions() {
      const data = await getMyInstitutions()
      this.institutions = data.institutions
      return data.institutions
    },
    async selectInstitution(institutionId: string) {
      const selected = this.institutions.find((item) => item.id === institutionId)
      if (!selected) throw new Error(`[rbac-vue] Institution ${institutionId} is not available`)
      this.clearAuthorizationContext()
      setInstitutionId(institutionId)
      await this.loadPermissions()
    },
    async checkAuth() {
      const data = await getAuthenticatedUserData()
      this.userData = data.user; this.isAuthenticated = true
      const institutions = await this.loadInstitutions()
      const configured = rbacConfig.institutionId
      if (configured && institutions.some(({ id }) => id === configured)) await this.selectInstitution(configured)
      else if (institutions.length === 1) await this.selectInstitution(institutions[0].id)
      else if (institutions.length === 0) await this.loadPermissions()
      return data
    },
    async loadPermissions(_userId?: string | number) {
      const info = await getMyPermissions()
      this.application = info.application; this.userType = info.userType
      this.userTypes = info.userTypes ?? (info.userType ? [info.userType] : [])
      this.permissions = info.permissions
      this.institution = info.institution ?? null
      this.institutionApplication = info.institutionApplication ?? null
    },
    async loginWithCredentials(user_name: string, password: string) {
      const data = await logInWithCredentials(user_name, password); this.isAuthenticated = true; return data
    },
    async loginByCoreToken(coreToken: string) {
      const data = await logInByCoreToken(coreToken); this.isAuthenticated = true; return data
    },
    async logOut() { const data = await signOut(); setInstitutionId(null); this.$reset(); return data },
    setUser(user: User) { this.userData = user },
    setUserType(userType: UserType) { this.userType = userType },
    setApplication(application: Application) { this.application = application },
    setPermissions(permissions: Permission[]) { this.permissions = permissions },
  }
})
